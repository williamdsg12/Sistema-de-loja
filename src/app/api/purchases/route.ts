import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { generateCode } from '@/lib/utils';
import { z } from 'zod';

const purchaseItemSchema = z.object({
  variantId: z.string().min(1, 'Selecione a variação'),
  quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  unitCost: z.number().min(0, 'Custo unitário inválido'),
  updateVariantCost: z.boolean().optional().default(true),
});

const createPurchaseSchema = z.object({
  supplierId: z.string().min(1, 'Selecione o fornecedor'),
  status: z.enum(['PENDENTE', 'RECEBIDO']).default('RECEBIDO'),
  items: z.array(purchaseItemSchema).min(1, 'Adicione pelo menos um item'),
  shippingCost: z.number().min(0).optional().default(0),
  discountAmount: z.number().min(0).optional().default(0),
  notes: z.string().optional().nullable(),
  generatePayable: z.boolean().optional().default(true),
  installmentsCount: z.number().int().min(1).max(24).optional().default(1),
  firstDueDate: z.string().optional().nullable(),
  payablePaymentMethod: z.string().optional().default('BOLETO'),
});

// GET: Listar Compras com Filtros e KPIs
export async function GET(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const supplierId = searchParams.get('supplierId') || '';

    const where: any = {
      storeId: session.storeId,
    };

    if (status) {
      where.status = status;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { notes: { contains: search } },
        { supplier: { name: { contains: search } } },
        { supplier: { corporateName: { contains: search } } },
      ];
    }

    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, corporateName: true, documentNumber: true, phone: true } },
        user: { select: { id: true, name: true } },
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
              },
            },
          },
        },
        accountsPayable: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // KPIs
    let totalPurchasesAmount = 0;
    let receivedCount = 0;
    let pendingCount = 0;

    purchases.forEach((p) => {
      if (p.status === 'RECEBIDO') {
        totalPurchasesAmount += p.totalAmount;
        receivedCount += 1;
      } else if (p.status === 'PENDENTE') {
        pendingCount += 1;
      }
    });

    return NextResponse.json({
      purchases,
      summary: {
        totalPurchasesAmount,
        totalPurchasesCount: purchases.length,
        receivedCount,
        pendingCount,
      },
    });
  } catch (error: any) {
    console.error('Erro ao listar compras:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao listar compras.' },
      { status: 500 }
    );
  }
}

// POST: Criar Pedido de Compra / Entrada de Mercadoria
export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const result = createPurchaseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = result.data;

    // Calcula Subtotal e Total Geral
    const itemsSubtotal = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0
    );
    const shipping = data.shippingCost || 0;
    const discount = data.discountAmount || 0;
    const totalAmount = Math.max(0, itemsSubtotal + shipping - discount);

    const purchaseCode = generateCode('COM', 5);

    // Transação ACID
    const completedPurchase = await prisma.$transaction(async (tx) => {
      // 1. Cria o registro da Compra
      const purchase = await tx.purchase.create({
        data: {
          storeId: session.storeId,
          supplierId: data.supplierId,
          userId: session.userId,
          code: purchaseCode,
          status: data.status,
          totalAmount,
          shippingCost: shipping,
          discountAmount: discount,
          notes: data.notes || null,
          receivedAt: data.status === 'RECEBIDO' ? new Date() : null,
        },
      });

      // 2. Cria os Itens da Compra e, se RECEBIDO, dá entrada no estoque
      for (const item of data.items) {
        const itemTotal = item.quantity * item.unitCost;

        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            variantId: item.variantId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: itemTotal,
          },
        });

        // Se o status for RECEBIDO, atualiza estoque e custo
        if (data.status === 'RECEBIDO') {
          // Atualiza custo na variação
          if (item.updateVariantCost) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { costPrice: item.unitCost },
            });
          }

          // Busca estoque atual
          const stock = await tx.stock.findUnique({
            where: { variantId: item.variantId },
          });

          const prevStock = stock ? stock.quantity : 0;
          const newStock = prevStock + item.quantity;

          if (stock) {
            await tx.stock.update({
              where: { variantId: item.variantId },
              data: { quantity: newStock },
            });
          } else {
            await tx.stock.create({
              data: {
                variantId: item.variantId,
                quantity: newStock,
              },
            });
          }

          // Grava Log Imutável de Movimentação de Entrada
          await tx.stockMovement.create({
            data: {
              variantId: item.variantId,
              userId: session.userId,
              type: 'ENTRADA',
              quantity: item.quantity,
              previousStock: prevStock,
              newStock,
              reason: `Entrada Compra ${purchaseCode} - Recebimento de Fornecedor`,
              referenceId: purchase.id,
            },
          });
        }
      }

      // 3. Gera Contas a Pagar se solicitado
      if (data.generatePayable && totalAmount > 0) {
        const installments = data.installmentsCount || 1;
        const installmentAmount = Math.round((totalAmount / installments) * 100) / 100;
        const baseDate = data.firstDueDate ? new Date(data.firstDueDate) : new Date();

        for (let i = 0; i < installments; i++) {
          const dueDate = new Date(baseDate);
          dueDate.setMonth(dueDate.getMonth() + i);

          // Ajuste de centavos na última parcela
          const currentAmount =
            i === installments - 1
              ? totalAmount - installmentAmount * (installments - 1)
              : installmentAmount;

          await tx.accountPayable.create({
            data: {
              storeId: session.storeId,
              supplierId: data.supplierId,
              purchaseId: purchase.id,
              description: `Compra ${purchaseCode} (${i + 1}/${installments})`,
              amount: currentAmount,
              dueDate,
              status: 'PENDENTE',
              paymentMethod: data.payablePaymentMethod || 'BOLETO',
            },
          });
        }
      }

      return purchase;
    });

    // 4. Auditoria
    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: data.status === 'RECEBIDO' ? 'COMPRA_RECEBIDA' : 'COMPRA_CRIADA',
      entity: 'Purchase',
      entityId: completedPurchase.id,
      newValue: {
        code: completedPurchase.code,
        supplierId: completedPurchase.supplierId,
        totalAmount: completedPurchase.totalAmount,
        itemsCount: data.items.length,
        status: completedPurchase.status,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        data.status === 'RECEBIDO'
          ? `Compra ${purchaseCode} registrada e estoque abastecido com sucesso!`
          : `Pedido de compra ${purchaseCode} salvo como Pendente.`,
      purchase: completedPurchase,
    });
  } catch (error: any) {
    console.error('Erro ao registrar compra:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao registrar compra e entrada de mercadoria.' },
      { status: 500 }
    );
  }
}

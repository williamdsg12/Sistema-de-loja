import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateCode } from '@/lib/utils';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const saleItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1, 'Quantidade deve ser de no mínimo 1 unidade'),
  unitPrice: z.number().min(0),
  costPrice: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  totalPrice: z.number().min(0),
});

const paymentItemSchema = z.object({
  method: z.enum(['DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'OUTROS']),
  amount: z.number().min(0.01, 'Valor de pagamento inválido'),
  installments: z.number().int().min(1).default(1),
  receivedAmount: z.number().optional().nullable(),
  changeAmount: z.number().optional().nullable(),
});

const checkoutSchema = z.object({
  customerId: z.string().optional().nullable(),
  subtotal: z.number().min(0),
  discountAmount: z.number().min(0).default(0),
  totalAmount: z.number().min(0.01, 'O valor total da venda deve ser maior que zero'),
  notes: z.string().optional().nullable(),
  items: z.array(saleItemSchema).min(1, 'O carrinho não pode estar vazio'),
  payments: z.array(paymentItemSchema).min(1, 'Informe ao menos uma forma de pagamento'),
});

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const result = checkoutSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const data = result.data;

    // 1. Validação da soma dos pagamentos
    const totalPaid = data.payments.reduce((acc, p) => acc + p.amount, 0);
    const diffPayment = Math.abs(totalPaid - data.totalAmount);
    if (diffPayment > 0.05) {
      return NextResponse.json(
        {
          error: `A soma dos pagamentos (${totalPaid.toFixed(2)}) não confere com o total da venda (${data.totalAmount.toFixed(2)}).`,
        },
        { status: 400 }
      );
    }

    // 2. Busca caixa aberto na loja
    const activeCash = await prisma.cashRegister.findFirst({
      where: {
        storeId: session.storeId,
        status: 'ABERTO',
      },
      orderBy: { openedAt: 'desc' },
    });

    const saleCode = generateCode('V', 6);

    // 3. Execução da Transação ACID
    const completedSale = await prisma.$transaction(async (tx) => {
      // 3.1. Cria o registro de Venda
      const sale = await tx.sale.create({
        data: {
          storeId: session.storeId,
          cashRegisterId: activeCash ? activeCash.id : null,
          userId: session.userId,
          customerId: data.customerId || null,
          code: saleCode,
          status: 'CONCLUIDA',
          subtotal: data.subtotal,
          discountAmount: data.discountAmount,
          totalAmount: data.totalAmount,
          notes: data.notes || null,
        },
      });

      // 3.2. Processa cada item e dá baixa atômica no estoque
      for (const item of data.items) {
        const stock = await tx.stock.findUnique({
          where: { variantId: item.variantId },
          include: {
            variant: {
              include: { product: true },
            },
          },
        });

        if (!stock) {
          throw new Error(`Estoque não encontrado para a variação ${item.variantId}`);
        }

        const prevStock = stock.quantity;
        const newStock = prevStock - item.quantity;

        // Cria o item da venda
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice,
            discount: item.discount,
            totalPrice: item.totalPrice,
          },
        });

        // Baixa no saldo físico
        await tx.stock.update({
          where: { variantId: item.variantId },
          data: { quantity: newStock },
        });

        // Registro no Histórico de Movimentações
        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            userId: session.userId,
            type: 'SAIDA_PDV',
            quantity: -item.quantity,
            previousStock: prevStock,
            newStock,
            reason: `Venda PDV ${saleCode} - Balcão`,
            referenceId: sale.id,
          },
        });
      }

      // 3.3. Processa cada pagamento
      for (const payment of data.payments) {
        await tx.payment.create({
          data: {
            saleId: sale.id,
            method: payment.method,
            amount: payment.amount,
            installments: payment.installments,
            receivedAmount: payment.receivedAmount || null,
            changeAmount: payment.changeAmount || null,
          },
        });

        // Registra a entrada no caixa se houver caixa aberto
        if (activeCash) {
          await tx.cashMovement.create({
            data: {
              cashRegisterId: activeCash.id,
              userId: session.userId,
              type: 'VENDA',
              amount: payment.amount,
              paymentMethod: payment.method,
              reason: `Venda ${saleCode}`,
            },
          });
        }
      }

      // 3.4. Atualiza métricas acumuladas do cliente
      if (data.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
        if (customer) {
          await tx.customer.update({
            where: { id: data.customerId },
            data: {
              totalSpent: customer.totalSpent + data.totalAmount,
              totalOrders: customer.totalOrders + 1,
              lastOrderAt: new Date(),
            },
          });
        }
      }

      return sale;
    });

    // 4. Registra Auditoria
    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'VENDA_PDV_CONCLUIDA',
      entity: 'Sale',
      entityId: completedSale.id,
      newValue: {
        code: completedSale.code,
        totalAmount: completedSale.totalAmount,
        itemsCount: data.items.length,
        paymentsCount: data.payments.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Venda realizada com sucesso!',
      saleId: completedSale.id,
      code: completedSale.code,
      totalAmount: completedSale.totalAmount,
    });
  } catch (error: any) {
    console.error('Erro ao processar checkout PDV:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao finalizar venda no PDV.' },
      { status: 500 }
    );
  }
}

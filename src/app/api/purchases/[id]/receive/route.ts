import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const purchase = await prisma.purchase.findFirst({
      where: {
        id,
        storeId: session.storeId,
      },
      include: {
        items: true,
        supplier: true,
      },
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Compra não encontrada' }, { status: 404 });
    }

    if (purchase.status === 'RECEBIDO') {
      return NextResponse.json(
        { error: 'Esta compra já foi recebida anteriormente.' },
        { status: 400 }
      );
    }

    if (purchase.status === 'CANCELADO') {
      return NextResponse.json(
        { error: 'Não é possível receber uma compra cancelada.' },
        { status: 400 }
      );
    }

    // Transação ACID para receber mercadorias e atualizar estoque
    const updatedPurchase = await prisma.$transaction(async (tx) => {
      // 1. Atualiza status da Compra
      const p = await tx.purchase.update({
        where: { id: purchase.id },
        data: {
          status: 'RECEBIDO',
          receivedAt: new Date(),
        },
      });

      // 2. Abastece estoque físico e atualiza custo da variação
      for (const item of purchase.items) {
        // Atualiza preço de custo
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { costPrice: item.unitCost },
        });

        // Atualiza saldo em Stock
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

        // Gera registro imutável em StockMovement
        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            userId: session.userId,
            type: 'ENTRADA',
            quantity: item.quantity,
            previousStock: prevStock,
            newStock,
            reason: `Recebimento Pedido Compra ${purchase.code} - ${purchase.supplier.name}`,
            referenceId: purchase.id,
          },
        });
      }

      return p;
    });

    // 3. Auditoria
    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'COMPRA_RECEBIDA',
      entity: 'Purchase',
      entityId: updatedPurchase.id,
      newValue: {
        code: updatedPurchase.code,
        status: 'RECEBIDO',
        receivedAt: updatedPurchase.receivedAt,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Pedido de Compra ${purchase.code} recebido com sucesso! Estoque físico abastecido.`,
      purchase: updatedPurchase,
    });
  } catch (error: any) {
    console.error('Erro ao receber compra:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar recebimento da compra.' },
      { status: 500 }
    );
  }
}

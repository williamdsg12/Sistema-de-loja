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
    const body = await request.json().catch(() => ({}));
    const reason = body?.reason || 'Cancelamento solicitado pelo usuário';

    const purchase = await prisma.purchase.findFirst({
      where: {
        id,
        storeId: session.storeId,
      },
      include: {
        items: true,
        supplier: true,
        accountsPayable: true,
      },
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Compra não encontrada' }, { status: 404 });
    }

    if (purchase.status === 'CANCELADO') {
      return NextResponse.json(
        { error: 'Esta compra já está cancelada.' },
        { status: 400 }
      );
    }

    // Transação ACID para cancelar compra
    const cancelledPurchase = await prisma.$transaction(async (tx) => {
      // 1. Atualiza status da compra
      const p = await tx.purchase.update({
        where: { id: purchase.id },
        data: {
          status: 'CANCELADO',
          notes: purchase.notes
            ? `${purchase.notes}\n[Cancelamento]: ${reason}`
            : `[Cancelamento]: ${reason}`,
        },
      });

      // 2. Se a compra havia sido RECEBIDA, estorna os itens do estoque físico
      if (purchase.status === 'RECEBIDO') {
        for (const item of purchase.items) {
          const stock = await tx.stock.findUnique({
            where: { variantId: item.variantId },
          });

          if (stock) {
            const prevStock = stock.quantity;
            const newStock = Math.max(0, prevStock - item.quantity);

            await tx.stock.update({
              where: { variantId: item.variantId },
              data: { quantity: newStock },
            });

            // Log de estorno em StockMovement
            await tx.stockMovement.create({
              data: {
                variantId: item.variantId,
                userId: session.userId,
                type: 'DEVOLUCAO',
                quantity: -item.quantity,
                previousStock: prevStock,
                newStock,
                reason: `Estorno Compra Cancelada ${purchase.code} - ${reason}`,
                referenceId: purchase.id,
              },
            });
          }
        }
      }

      // 3. Cancela contas a pagar vinculadas que ainda estejam PENDENTES
      await tx.accountPayable.updateMany({
        where: {
          purchaseId: purchase.id,
          status: 'PENDENTE',
        },
        data: {
          status: 'CANCELADO',
          notes: `Cancelado devido ao cancelamento da Compra ${purchase.code}`,
        },
      });

      return p;
    });

    // 4. Auditoria
    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'COMPRA_CANCELADA',
      entity: 'Purchase',
      entityId: cancelledPurchase.id,
      newValue: {
        code: cancelledPurchase.code,
        status: 'CANCELADO',
        reason,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Compra ${purchase.code} cancelada com sucesso! ${
        purchase.status === 'RECEBIDO' ? 'Itens estornados do estoque e contas a pagar canceladas.' : ''
      }`,
      purchase: cancelledPurchase,
    });
  } catch (error: any) {
    console.error('Erro ao cancelar compra:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao cancelar compra.' },
      { status: 500 }
    );
  }
}

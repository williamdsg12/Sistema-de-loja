import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'Cancelamento solicitado pelo operador de caixa';

    const sale = await prisma.sale.findFirst({
      where: { id, storeId: session.storeId },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });
    }

    if (sale.status === 'CANCELADA') {
      return NextResponse.json({ error: 'Esta venda já está cancelada.' }, { status: 400 });
    }

    // Executa cancelamento e estorno atômico
    await prisma.$transaction(async (tx) => {
      // 1. Altera status da venda
      await tx.sale.update({
        where: { id },
        data: { status: 'CANCELADA', notes: `${sale.notes || ''} | Cancelada: ${reason}` },
      });

      // 2. Estorna cada item para o estoque físico
      for (const item of sale.items) {
        const stock = await tx.stock.findUnique({ where: { variantId: item.variantId } });
        if (stock) {
          const prev = stock.quantity;
          const next = prev + item.quantity;

          await tx.stock.update({
            where: { variantId: item.variantId },
            data: { quantity: next },
          });

          await tx.stockMovement.create({
            data: {
              variantId: item.variantId,
              userId: session.userId,
              type: 'DEVOLUCAO',
              quantity: item.quantity,
              previousStock: prev,
              newStock: next,
              reason: `Estorno de cancelamento da venda ${sale.code}: ${reason}`,
              referenceId: sale.id,
            },
          });
        }
      }

      // 3. Estorna o caixa se houver caixa aberto
      if (sale.cashRegisterId) {
        for (const p of sale.payments) {
          await tx.cashMovement.create({
            data: {
              cashRegisterId: sale.cashRegisterId,
              userId: session.userId,
              type: 'SANGRIA',
              amount: p.amount,
              paymentMethod: p.method,
              reason: `Estorno cancelamento venda ${sale.code}`,
            },
          });
        }
      }

      // 4. Estorna métricas do cliente se houver
      if (sale.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: sale.customerId } });
        if (customer) {
          await tx.customer.update({
            where: { id: sale.customerId },
            data: {
              totalSpent: Math.max(0, customer.totalSpent - sale.totalAmount),
              totalOrders: Math.max(0, customer.totalOrders - 1),
            },
          });
        }
      }
    });

    // Registra Auditoria
    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'CANCELAMENTO_VENDA',
      entity: 'Sale',
      entityId: id,
      previousValue: { code: sale.code, status: 'CONCLUIDA', totalAmount: sale.totalAmount },
      newValue: { status: 'CANCELADA', motivo: reason },
    });

    return NextResponse.json({
      success: true,
      message: `Venda ${sale.code} cancelada com sucesso e itens estornados ao estoque.`,
    });
  } catch (error) {
    console.error('Erro ao cancelar venda:', error);
    return NextResponse.json({ error: 'Erro ao processar cancelamento da venda.' }, { status: 500 });
  }
}

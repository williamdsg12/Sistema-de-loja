import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.enum([
    'NOVO',
    'AGUARDANDO_PAGAMENTO',
    'PAGO',
    'EM_PREPARACAO',
    'PRONTO_RETIRADA',
    'ENVIADO',
    'CONCLUIDO',
    'CANCELADO',
  ]),
  notes: z.string().optional().nullable(),
});

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
    const body = await request.json();
    const result = updateStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { status: newStatus, notes } = result.data;

    const order = await prisma.order.findFirst({
      where: {
        id,
        storeId: session.storeId,
      },
      include: {
        items: true,
        reservations: true,
        customer: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    const oldStatus = order.status;
    if (oldStatus === newStatus) {
      return NextResponse.json({ message: 'O pedido já está neste status.', order });
    }

    // Transação ACID de Transição de Estado
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Atualiza Status do Pedido
      const o = await tx.order.update({
        where: { id: order.id },
        data: {
          status: newStatus,
          notes: notes
            ? (order.notes ? `${order.notes}\n[Status ${newStatus}]: ${notes}` : `[Status ${newStatus}]: ${notes}`)
            : order.notes,
        },
      });

      // 2. CONCLUSAO / EXPEDICAO DO PEDIDO: Baixa física do estoque e liberação de reserva
      const isFinishing = (newStatus === 'CONCLUIDO' || newStatus === 'ENVIADO') && oldStatus !== 'CONCLUIDO' && oldStatus !== 'ENVIADO';

      if (isFinishing) {
        for (const item of order.items) {
          const stock = await tx.stock.findUnique({
            where: { variantId: item.variantId },
          });

          if (stock) {
            const prevPhysical = stock.quantity;
            const newPhysical = Math.max(0, prevPhysical - item.quantity);
            const newReserved = Math.max(0, stock.reservedQuantity - item.quantity);

            // Atualiza saldos físico e reservado
            await tx.stock.update({
              where: { variantId: item.variantId },
              data: {
                quantity: newPhysical,
                reservedQuantity: newReserved,
              },
            });

            // Log de Saída Online
            await tx.stockMovement.create({
              data: {
                variantId: item.variantId,
                userId: session.userId,
                type: 'SAIDA_ONLINE',
                quantity: -item.quantity,
                previousStock: prevPhysical,
                newStock: newPhysical,
                reason: `Pedido Online ${order.orderNumber} - Entrega Concluída`,
                referenceId: order.id,
              },
            });
          }
        }

        // Remove reservas de estoque
        await tx.stockReservation.deleteMany({
          where: { orderId: order.id },
        });

        // Atualiza métricas do cliente
        if (order.customerId) {
          const customer = await tx.customer.findUnique({
            where: { id: order.customerId },
          });
          if (customer) {
            await tx.customer.update({
              where: { id: customer.id },
              data: {
                totalSpent: customer.totalSpent + order.totalAmount,
                totalOrders: customer.totalOrders + 1,
                lastOrderAt: new Date(),
              },
            });
          }
        }
      }

      // 3. CANCELAMENTO DO PEDIDO: Libera reserva de estoque
      if (newStatus === 'CANCELADO' && oldStatus !== 'CANCELADO') {
        // Se ainda não havia sido concluído (estava reservado), libera a reserva
        if (oldStatus !== 'CONCLUIDO' && oldStatus !== 'ENVIADO') {
          for (const item of order.items) {
            const stock = await tx.stock.findUnique({
              where: { variantId: item.variantId },
            });

            if (stock) {
              const newReserved = Math.max(0, stock.reservedQuantity - item.quantity);
              await tx.stock.update({
                where: { variantId: item.variantId },
                data: { reservedQuantity: newReserved },
              });
            }
          }

          // Remove reservas
          await tx.stockReservation.deleteMany({
            where: { orderId: order.id },
          });
        }
      }

      return o;
    });

    // 4. Auditoria
    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'PEDIDO_ONLINE_STATUS',
      entity: 'Order',
      entityId: updatedOrder.id,
      newValue: {
        orderNumber: updatedOrder.orderNumber,
        oldStatus,
        newStatus,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Status do pedido ${updatedOrder.orderNumber} atualizado para ${newStatus}!`,
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('Erro ao atualizar status do pedido:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao alterar status do pedido.' },
      { status: 500 }
    );
  }
}

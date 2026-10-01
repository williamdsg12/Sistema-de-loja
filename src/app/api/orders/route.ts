import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const deliveryType = searchParams.get('deliveryType') || '';

    const where: any = {
      storeId: session.storeId,
    };

    if (status) {
      where.status = status;
    }

    if (deliveryType) {
      where.deliveryType = deliveryType;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { customerEmail: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
              },
            },
          },
        },
        payments: true,
        reservations: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    // KPIs
    let totalOnlineRevenue = 0;
    let newCount = 0;
    let inPrepCount = 0;
    let completedCount = 0;

    orders.forEach((o) => {
      if (o.status !== 'CANCELADO') {
        totalOnlineRevenue += o.totalAmount;
      }
      if (o.status === 'NOVO' || o.status === 'AGUARDANDO_PAGAMENTO') {
        newCount += 1;
      } else if (o.status === 'EM_PREPARACAO' || o.status === 'PAGO') {
        inPrepCount += 1;
      } else if (o.status === 'CONCLUIDO' || o.status === 'ENVIADO') {
        completedCount += 1;
      }
    });

    return NextResponse.json({
      orders,
      summary: {
        totalOrdersCount: orders.length,
        totalOnlineRevenue,
        newCount,
        inPrepCount,
        completedCount,
      },
    });
  } catch (error: any) {
    console.error('Erro ao listar pedidos online:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao listar pedidos.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: {
        id,
        storeId: session.storeId,
      },
      include: {
        customer: true,
        items: {
          include: {
            variant: {
              include: {
                product: true,
                stock: true,
              },
            },
          },
        },
        payments: true,
        reservations: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error('Erro ao buscar pedido:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar pedido.' },
      { status: 500 }
    );
  }
}

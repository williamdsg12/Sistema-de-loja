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

    const purchase = await prisma.purchase.findFirst({
      where: {
        id,
        storeId: session.storeId,
      },
      include: {
        supplier: true,
        user: { select: { id: true, name: true, username: true } },
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
        accountsPayable: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Compra não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ purchase });
  } catch (error: any) {
    console.error('Erro ao buscar compra:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar compra.' },
      { status: 500 }
    );
  }
}

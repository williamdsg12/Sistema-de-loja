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
    const type = searchParams.get('type') || '';
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {
      variant: {
        product: {
          storeId: session.storeId,
        },
      },
    };

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { reason: { contains: search } },
        { variant: { sku: { contains: search } } },
        { variant: { color: { contains: search } } },
        { variant: { size: { contains: search } } },
        { variant: { product: { name: { contains: search } } } },
      ];
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, username: true } },
        variant: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ movements });
  } catch (error) {
    console.error('Erro ao listar histórico de movimentações:', error);
    return NextResponse.json({ error: 'Erro ao carregar histórico.' }, { status: 500 });
  }
}

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
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {
      storeId: session.storeId,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { documentNumber: { contains: search } } },
        { user: { name: { contains: search } } },
      ];
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true, documentNumber: true } },
        user: { select: { id: true, name: true, username: true } },
        payments: true,
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const totalSalesAmount = sales
      .filter((s) => s.status === 'CONCLUIDA')
      .reduce((acc, s) => acc + s.totalAmount, 0);

    const totalSalesCount = sales.filter((s) => s.status === 'CONCLUIDA').length;

    return NextResponse.json({
      sales,
      summary: {
        totalSalesAmount,
        totalSalesCount,
        averageTicket: totalSalesCount > 0 ? totalSalesAmount / totalSalesCount : 0,
      },
    });
  } catch (error) {
    console.error('Erro ao listar vendas:', error);
    return NextResponse.json({ error: 'Erro ao buscar histórico de vendas.' }, { status: 500 });
  }
}

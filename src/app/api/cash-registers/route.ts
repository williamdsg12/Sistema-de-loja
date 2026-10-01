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
    const status = searchParams.get('status') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {
      storeId: session.storeId,
    };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.openedAt = {};
      if (startDate) {
        where.openedAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.openedAt.lte = end;
      }
    }

    const registers = await prisma.cashRegister.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, username: true } },
        _count: {
          select: {
            sales: true,
            movements: true,
          },
        },
      },
      orderBy: { openedAt: 'desc' },
      take: 50,
    });

    // Calcula KPIs dos caixas fechados
    let totalExpectedSum = 0;
    let totalCountedSum = 0;
    let totalDifferenceSum = 0;
    let closedCount = 0;

    registers.forEach((r) => {
      if (r.status === 'FECHADO') {
        totalExpectedSum += r.finalExpected || 0;
        totalCountedSum += r.finalCounted || 0;
        totalDifferenceSum += r.difference || 0;
        closedCount += 1;
      }
    });

    return NextResponse.json({
      registers,
      summary: {
        totalRegisters: registers.length,
        closedCount,
        openCount: registers.length - closedCount,
        totalExpectedSum,
        totalCountedSum,
        totalDifferenceSum,
      },
    });
  } catch (error: any) {
    console.error('Erro ao listar caixas:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao listar histórico de caixas.' },
      { status: 500 }
    );
  }
}

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
    const entity = searchParams.get('entity') || '';
    const action = searchParams.get('action') || '';
    const userId = searchParams.get('userId') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {
      storeId: session.storeId,
    };

    if (entity) {
      where.entity = entity;
    }

    if (action) {
      where.action = { contains: action };
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(`${startDate}T00:00:00`),
        lte: new Date(`${endDate}T23:59:59`),
      };
    }

    if (search) {
      where.OR = [
        { action: { contains: search } },
        { entity: { contains: search } },
        { entityId: { contains: search } },
        { userName: { contains: search } },
        { previousValue: { contains: search } },
        { newValue: { contains: search } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Calcula KPIs gerais de auditoria
    const totalLogsCount = await prisma.auditLog.count({ where: { storeId: session.storeId } });
    const criticalActionsCount = await prisma.auditLog.count({
      where: {
        storeId: session.storeId,
        OR: [
          { action: { contains: 'CANCELAMENTO' } },
          { action: { contains: 'EXCLUSAO' } },
          { action: { contains: 'PERDA' } },
        ],
      },
    });

    const priceChangesCount = await prisma.auditLog.count({
      where: {
        storeId: session.storeId,
        action: { contains: 'PRECO' },
      },
    });

    const cashEventsCount = await prisma.auditLog.count({
      where: {
        storeId: session.storeId,
        OR: [
          { entity: 'CashRegister' },
          { action: { contains: 'SANGRIA' } },
          { action: { contains: 'FECHAMENTO' } },
        ],
      },
    });

    const usersList = await prisma.user.findMany({
      where: { storeId: session.storeId },
      select: { id: true, name: true, role: { select: { name: true } } },
    });

    // Formata valores JSON salvos
    const parsedLogs = logs.map((log) => {
      let parsedPrev = null;
      let parsedNew = null;

      try {
        if (log.previousValue) parsedPrev = JSON.parse(log.previousValue);
      } catch (e) {}

      try {
        if (log.newValue) parsedNew = JSON.parse(log.newValue);
      } catch (e) {}

      return {
        ...log,
        parsedPrevious: parsedPrev,
        parsedNew: parsedNew,
      };
    });

    return NextResponse.json({
      logs: parsedLogs,
      summary: {
        totalLogsCount,
        criticalActionsCount,
        priceChangesCount,
        cashEventsCount,
      },
      usersList,
    });
  } catch (error: any) {
    console.error('Erro ao listar logs de auditoria:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar trilha de auditoria.' },
      { status: 500 }
    );
  }
}

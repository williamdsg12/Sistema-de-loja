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
    const period = searchParams.get('period') || 'hoje';

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    // Filtros de Data
    if (period === 'hoje') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'ontem') {
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === '7dias') {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === '30dias') {
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'mes_atual') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'mes_anterior') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }

    // 1. Total de Vendas Concluídas no Período
    const sales = await prisma.sale.findMany({
      where: {
        storeId: session.storeId,
        status: 'CONCLUIDA',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: true,
        payments: true,
      },
    });

    const totalRevenue = sales.reduce((acc, sale) => acc + sale.totalAmount, 0);
    const totalSalesCount = sales.length;
    const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
    const totalItemsSold = sales.reduce(
      (acc, sale) => acc + sale.items.reduce((sum, item) => sum + item.quantity, 0),
      0
    );

    // 2. Lucro Bruto Estimado
    let totalCost = 0;
    for (const sale of sales) {
      for (const item of sale.items) {
        totalCost += (item.costPrice || 0) * item.quantity;
      }
    }
    const grossProfit = totalRevenue - totalCost;

    // 3. Saldo do Caixa Aberto Mais Recente
    const activeCashRegister = await prisma.cashRegister.findFirst({
      where: {
        storeId: session.storeId,
        status: 'ABERTO',
      },
      include: {
        movements: true,
      },
    });

    let cashBalance = 0;
    if (activeCashRegister) {
      const movementsSum = activeCashRegister.movements.reduce((acc, mov) => {
        if (mov.type === 'SUPRIMENTO' || mov.type === 'ENTRADA' || mov.type === 'VENDA') return acc + mov.amount;
        if (mov.type === 'SANGRIA' || mov.type === 'DESPESA') return acc - mov.amount;
        return acc;
      }, 0);
      cashBalance = activeCashRegister.initialBalance + movementsSum;
    }

    // 4. Pedidos Online Pendentes
    const onlineOrdersPending = await prisma.order.count({
      where: {
        storeId: session.storeId,
        status: { in: ['NOVO', 'AGUARDANDO_PAGAMENTO', 'EM_PREPARACAO'] },
      },
    });

    // 5. Itens com Estoque Baixo (Físico <= Estoque Mínimo do Produto)
    const lowStockVariants = await prisma.productVariant.findMany({
      where: {
        product: {
          storeId: session.storeId,
          isActive: true,
        },
      },
      include: {
        product: true,
        stock: true,
      },
    });

    const lowStockCount = lowStockVariants.filter(
      (v) => (v.stock?.quantity ?? 0) <= (v.product.minStock ?? 5)
    ).length;

    // 6. Formas de Pagamento no Período
    const paymentBreakdown: Record<string, number> = {};
    sales.forEach((sale) => {
      sale.payments.forEach((p) => {
        paymentBreakdown[p.method] = (paymentBreakdown[p.method] || 0) + p.amount;
      });
    });

    // 7. Últimas Vendas
    const recentSales = await prisma.sale.findMany({
      where: { storeId: session.storeId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        customer: true,
        user: { select: { name: true } },
      },
    });

    return NextResponse.json({
      period,
      stats: {
        totalRevenue,
        totalSalesCount,
        averageTicket,
        totalItemsSold,
        grossProfit,
        cashBalance,
        onlineOrdersPending,
        lowStockCount,
      },
      paymentBreakdown,
      recentSales,
    });
  } catch (error) {
    console.error('Erro ao obter métricas do dashboard:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar dados do dashboard' },
      { status: 500 }
    );
  }
}

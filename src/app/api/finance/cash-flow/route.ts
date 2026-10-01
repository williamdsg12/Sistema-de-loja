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
    const period = searchParams.get('period') || 'mes';
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (customStart && customEnd) {
      startDate = new Date(customStart);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    } else {
      switch (period) {
        case 'hoje':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'semana':
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Segunda-feira
          startDate = new Date(now.setDate(diff));
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'ano':
          startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
          break;
        case 'mes':
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          break;
      }
    }

    // 1. Vendas Concluídas no período
    const sales = await prisma.sale.findMany({
      where: {
        storeId: session.storeId,
        status: 'CONCLUIDA',
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { payments: true },
    });

    const totalSalesAmount = sales.reduce((sum, s) => sum + s.totalAmount, 0);

    // 2. Contas a Receber baixadas no período
    const settledReceivables = await prisma.accountReceivable.findMany({
      where: {
        storeId: session.storeId,
        status: 'RECEBIDO',
        receivedDate: { gte: startDate, lte: endDate },
      },
      include: { category: true },
    });

    const totalSettledReceivables = settledReceivables.reduce((sum, r) => sum + r.amount, 0);

    // 3. Contas a Pagar baixadas no período
    const settledPayables = await prisma.accountPayable.findMany({
      where: {
        storeId: session.storeId,
        status: 'PAGO',
        paymentDate: { gte: startDate, lte: endDate },
      },
      include: { category: true },
    });

    const totalSettledPayables = settledPayables.reduce((sum, p) => sum + p.amount, 0);

    // 4. Movimentações de Caixa (Sangrias e Suprimentos)
    const cashMovements = await prisma.cashMovement.findMany({
      where: {
        cashRegister: { storeId: session.storeId },
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    let totalSuprimentos = 0;
    let totalSangrias = 0;

    cashMovements.forEach((m) => {
      if (m.type === 'SUPRIMENTO' || m.type === 'ENTRADA') {
        if (m.reason !== 'Fundo de troco de abertura') totalSuprimentos += m.amount;
      } else if (m.type === 'SANGRIA' || m.type === 'DESPESA') {
        totalSangrias += m.amount;
      }
    });

    // 5. Previsão Futura / Pendências
    const pendingPayables = await prisma.accountPayable.findMany({
      where: {
        storeId: session.storeId,
        status: 'PENDENTE',
        dueDate: { gte: startDate, lte: endDate },
      },
    });
    const totalPendingPayables = pendingPayables.reduce((sum, p) => sum + p.amount, 0);

    const pendingReceivables = await prisma.accountReceivable.findMany({
      where: {
        storeId: session.storeId,
        status: 'PENDENTE',
        dueDate: { gte: startDate, lte: endDate },
      },
    });
    const totalPendingReceivables = pendingReceivables.reduce((sum, r) => sum + r.amount, 0);

    // Totais Consolidados
    const totalEntradas = totalSalesAmount + totalSettledReceivables;
    const totalSaidas = totalSettledPayables + totalSangrias;
    const saldoLiquido = totalEntradas - totalSaidas;

    // 6. Agrupamento por Categoria (DRE)
    const dreMap: Record<string, { name: string; type: string; total: number }> = {};

    // Receitas de Vendas
    dreMap['Vendas PDV & Balcão'] = {
      name: 'Vendas PDV & Balcão',
      type: 'RECEITA',
      total: totalSalesAmount,
    };

    // Receitas de Contas a Receber
    settledReceivables.forEach((r) => {
      const catName = r.category?.name || 'Outras Receitas';
      if (!dreMap[catName]) {
        dreMap[catName] = { name: catName, type: 'RECEITA', total: 0 };
      }
      dreMap[catName].total += r.amount;
    });

    // Despesas de Contas a Pagar
    settledPayables.forEach((p) => {
      const catName = p.category?.name || 'Fornecedores & Despesas Operacionais';
      if (!dreMap[catName]) {
        dreMap[catName] = { name: catName, type: 'DESPESA', total: 0 };
      }
      dreMap[catName].total += p.amount;
    });

    // Sangrias avulsas
    if (totalSangrias > 0) {
      dreMap['Sangrias / Retiradas de Caixa'] = {
        name: 'Sangrias / Retiradas de Caixa',
        type: 'DESPESA',
        total: totalSangrias,
      };
    }

    const dreBreakdown = Object.values(dreMap);

    // 7. Timeline Diária
    const dailyMap: Record<string, { date: string; entradas: number; saidas: number }> = {};

    sales.forEach((s) => {
      const dayKey = new Date(s.createdAt).toISOString().split('T')[0];
      if (!dailyMap[dayKey]) dailyMap[dayKey] = { date: dayKey, entradas: 0, saidas: 0 };
      dailyMap[dayKey].entradas += s.totalAmount;
    });

    settledReceivables.forEach((r) => {
      const dayKey = new Date(r.receivedDate || r.createdAt).toISOString().split('T')[0];
      if (!dailyMap[dayKey]) dailyMap[dayKey] = { date: dayKey, entradas: 0, saidas: 0 };
      dailyMap[dayKey].entradas += r.amount;
    });

    settledPayables.forEach((p) => {
      const dayKey = new Date(p.paymentDate || p.createdAt).toISOString().split('T')[0];
      if (!dailyMap[dayKey]) dailyMap[dayKey] = { date: dayKey, entradas: 0, saidas: 0 };
      dailyMap[dayKey].saidas += p.amount;
    });

    const dailyTimeline = Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({
        ...item,
        saldo: item.entradas - item.saidas,
      }));

    return NextResponse.json({
      period: {
        startDate,
        endDate,
        label: period,
      },
      summary: {
        totalEntradas,
        totalSaidas,
        saldoLiquido,
        lucroOperacional: saldoLiquido,
        totalSalesAmount,
        salesCount: sales.length,
        totalSettledReceivables,
        totalSettledPayables,
        totalSuprimentos,
        totalSangrias,
        projected: {
          pendingReceivables: totalPendingReceivables,
          pendingPayables: totalPendingPayables,
          projectedBalance: totalPendingReceivables - totalPendingPayables,
        },
      },
      dreBreakdown,
      dailyTimeline,
    });
  } catch (error: any) {
    console.error('Erro ao gerar fluxo de caixa:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar relatório de fluxo de caixa.' },
      { status: 500 }
    );
  }
}

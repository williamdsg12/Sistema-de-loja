import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Busca o caixa atualmente ABERTO na loja do usuário
    const activeRegister = await prisma.cashRegister.findFirst({
      where: {
        storeId: session.storeId,
        status: 'ABERTO',
      },
      include: {
        user: { select: { id: true, name: true, username: true } },
        movements: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        sales: {
          where: { status: 'CONCLUIDA' },
          include: {
            customer: { select: { id: true, name: true, documentNumber: true } },
            user: { select: { name: true } },
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
        },
      },
      orderBy: { openedAt: 'desc' },
    });

    if (!activeRegister) {
      return NextResponse.json({
        hasOpenRegister: false,
        message: 'Nenhum caixa aberto no momento.',
      });
    }

    // 1. Apuração de Vendas por Forma de Pagamento
    let cashInSales = 0;
    let pixInSales = 0;
    let debitInSales = 0;
    let creditInSales = 0;
    let otherInSales = 0;

    activeRegister.sales.forEach((sale) => {
      sale.payments.forEach((payment) => {
        switch (payment.method) {
          case 'DINHEIRO':
            cashInSales += payment.amount;
            break;
          case 'PIX':
            pixInSales += payment.amount;
            break;
          case 'CARTAO_DEBITO':
            debitInSales += payment.amount;
            break;
          case 'CARTAO_CREDITO':
            creditInSales += payment.amount;
            break;
          default:
            otherInSales += payment.amount;
            break;
        }
      });
    });

    // 2. Apuração de Movimentações Manuais (Suprimentos e Sangrias)
    let totalSuprimentos = 0;
    let totalSangrias = 0;

    activeRegister.movements.forEach((mov) => {
      if (mov.type === 'SUPRIMENTO' || mov.type === 'ENTRADA') {
        // Ignora a movimentação inicial de abertura se já estiver contabilizada em initialBalance
        if (mov.reason !== 'Fundo de troco de abertura') {
          totalSuprimentos += mov.amount;
        }
      } else if (mov.type === 'SANGRIA' || mov.type === 'DESPESA') {
        totalSangrias += mov.amount;
      }
    });

    // 3. Totais Consolidados
    const initialBalance = activeRegister.initialBalance;
    const currentDrawerCash = initialBalance + cashInSales + totalSuprimentos - totalSangrias;
    const totalSalesAmount = cashInSales + pixInSales + debitInSales + creditInSales + otherInSales;
    const currentTotalExpected = initialBalance + totalSalesAmount + totalSuprimentos - totalSangrias;

    const summary = {
      initialBalance,
      cashInSales,
      pixInSales,
      debitInSales,
      creditInSales,
      otherInSales,
      totalSalesAmount,
      totalSalesCount: activeRegister.sales.length,
      totalSuprimentos,
      totalSangrias,
      currentDrawerCash: Math.max(0, currentDrawerCash),
      currentTotalExpected,
    };

    return NextResponse.json({
      hasOpenRegister: true,
      register: {
        id: activeRegister.id,
        storeId: activeRegister.storeId,
        userId: activeRegister.userId,
        userName: activeRegister.user.name,
        status: activeRegister.status,
        openedAt: activeRegister.openedAt,
        initialBalance: activeRegister.initialBalance,
        notes: activeRegister.notes,
      },
      summary,
      movements: activeRegister.movements,
      sales: activeRegister.sales,
    });
  } catch (error: any) {
    console.error('Erro ao buscar caixa atual:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar status do caixa.' },
      { status: 500 }
    );
  }
}

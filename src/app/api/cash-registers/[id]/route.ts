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

    const register = await prisma.cashRegister.findFirst({
      where: {
        id,
        storeId: session.storeId,
      },
      include: {
        user: { select: { id: true, name: true, username: true } },
        movements: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
        sales: {
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
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!register) {
      return NextResponse.json({ error: 'Caixa não encontrado' }, { status: 404 });
    }

    // Calcula apuração por forma de pagamento
    let cashInSales = 0;
    let pixInSales = 0;
    let debitInSales = 0;
    let creditInSales = 0;
    let otherInSales = 0;

    register.sales.forEach((sale) => {
      if (sale.status === 'CONCLUIDA') {
        sale.payments.forEach((p) => {
          switch (p.method) {
            case 'DINHEIRO':
              cashInSales += p.amount;
              break;
            case 'PIX':
              pixInSales += p.amount;
              break;
            case 'CARTAO_DEBITO':
              debitInSales += p.amount;
              break;
            case 'CARTAO_CREDITO':
              creditInSales += p.amount;
              break;
            default:
              otherInSales += p.amount;
              break;
          }
        });
      }
    });

    let totalSuprimentos = 0;
    let totalSangrias = 0;

    register.movements.forEach((m) => {
      if (m.type === 'SUPRIMENTO' || m.type === 'ENTRADA') {
        if (m.reason !== 'Fundo de troco de abertura') totalSuprimentos += m.amount;
      } else if (m.type === 'SANGRIA' || m.type === 'DESPESA') {
        totalSangrias += m.amount;
      }
    });

    const initialBalance = register.initialBalance;
    const drawerCash = initialBalance + cashInSales + totalSuprimentos - totalSangrias;
    const totalSalesAmount = cashInSales + pixInSales + debitInSales + creditInSales + otherInSales;

    return NextResponse.json({
      register,
      summary: {
        initialBalance,
        cashInSales,
        pixInSales,
        debitInSales,
        creditInSales,
        otherInSales,
        totalSalesAmount,
        totalSalesCount: register.sales.filter((s) => s.status === 'CONCLUIDA').length,
        totalSuprimentos,
        totalSangrias,
        drawerCash,
      },
    });
  } catch (error: any) {
    console.error('Erro ao buscar detalhes do caixa:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar detalhes do caixa.' },
      { status: 500 }
    );
  }
}

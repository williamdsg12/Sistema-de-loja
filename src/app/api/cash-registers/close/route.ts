import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const closeCashSchema = z.object({
  countedCash: z.number().min(0, 'Valor em dinheiro não pode ser negativo'),
  countedPix: z.number().min(0, 'Valor em PIX não pode ser negativo').default(0),
  countedDebit: z.number().min(0, 'Valor em Débito não pode ser negativo').default(0),
  countedCredit: z.number().min(0, 'Valor em Crédito não pode ser negativo').default(0),
  countedOther: z.number().min(0, 'Valor em Outros não pode ser negativo').default(0),
  notes: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const result = closeCashSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const {
      countedCash,
      countedPix,
      countedDebit,
      countedCredit,
      countedOther,
      notes,
    } = result.data;

    // 1. Busca caixa aberto
    const activeRegister = await prisma.cashRegister.findFirst({
      where: {
        storeId: session.storeId,
        status: 'ABERTO',
      },
      include: {
        user: { select: { id: true, name: true } },
        movements: true,
        sales: {
          where: { status: 'CONCLUIDA' },
          include: {
            payments: true,
            customer: { select: { name: true } },
            items: true,
          },
        },
      },
      orderBy: { openedAt: 'desc' },
    });

    if (!activeRegister) {
      return NextResponse.json(
        { error: 'Não há nenhum caixa aberto para fechar.' },
        { status: 400 }
      );
    }

    // 2. Apuração do Sistema (Valores Esperados)
    let expectedCashInSales = 0;
    let expectedPix = 0;
    let expectedDebit = 0;
    let expectedCredit = 0;
    let expectedOther = 0;

    activeRegister.sales.forEach((sale) => {
      sale.payments.forEach((p) => {
        switch (p.method) {
          case 'DINHEIRO':
            expectedCashInSales += p.amount;
            break;
          case 'PIX':
            expectedPix += p.amount;
            break;
          case 'CARTAO_DEBITO':
            expectedDebit += p.amount;
            break;
          case 'CARTAO_CREDITO':
            expectedCredit += p.amount;
            break;
          default:
            expectedOther += p.amount;
            break;
        }
      });
    });

    let totalSuprimentos = 0;
    let totalSangrias = 0;

    activeRegister.movements.forEach((m) => {
      if (m.type === 'SUPRIMENTO' || m.type === 'ENTRADA') {
        if (m.reason !== 'Fundo de troco de abertura') {
          totalSuprimentos += m.amount;
        }
      } else if (m.type === 'SANGRIA' || m.type === 'DESPESA') {
        totalSangrias += m.amount;
      }
    });

    // Dinheiro esperado na gaveta = Fundo inicial + Vendas Dinheiro + Suprimentos - Sangrias
    const initialBalance = activeRegister.initialBalance;
    const expectedDrawerCash = initialBalance + expectedCashInSales + totalSuprimentos - totalSangrias;
    const totalSalesExpected = expectedCashInSales + expectedPix + expectedDebit + expectedCredit + expectedOther;
    
    // Total Geral Esperado = Gaveta + Demais Meios Eletrônicos
    const totalExpected = expectedDrawerCash + expectedPix + expectedDebit + expectedCredit + expectedOther;

    // Valores Contados pelo Operador
    const totalCounted = countedCash + countedPix + countedDebit + countedCredit + countedOther;
    const difference = totalCounted - totalExpected;
    const cashDifference = countedCash - expectedDrawerCash;

    // 3. Atualiza o status do Caixa para FECHADO
    const closedRegister = await prisma.cashRegister.update({
      where: { id: activeRegister.id },
      data: {
        status: 'FECHADO',
        closedAt: new Date(),
        finalExpected: totalExpected,
        finalCounted: totalCounted,
        difference: difference,
        notes: notes ? (activeRegister.notes ? `${activeRegister.notes}\n[Fechamento]: ${notes}` : notes) : activeRegister.notes,
      },
    });

    // 4. Auditoria do Fechamento
    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'CAIXA_FECHADO',
      entity: 'CashRegister',
      entityId: closedRegister.id,
      newValue: {
        finalExpected: totalExpected,
        finalCounted: totalCounted,
        difference: difference,
        cashDifference: cashDifference,
        countedCash,
        countedPix,
        countedDebit,
        countedCredit,
      },
    });

    // 5. Retorna o Relatório Completo de Fechamento
    return NextResponse.json({
      success: true,
      message: 'Caixa fechado com sucesso!',
      closingReport: {
        registerId: closedRegister.id,
        openedAt: activeRegister.openedAt,
        closedAt: closedRegister.closedAt,
        operatorName: activeRegister.user.name,
        closedByName: session.name,
        initialBalance,
        totalSalesCount: activeRegister.sales.length,
        totalSalesAmount: totalSalesExpected,
        totalSuprimentos,
        totalSangrias,
        breakdown: {
          cash: {
            expected: expectedDrawerCash,
            counted: countedCash,
            difference: cashDifference,
          },
          pix: {
            expected: expectedPix,
            counted: countedPix,
            difference: countedPix - expectedPix,
          },
          debit: {
            expected: expectedDebit,
            counted: countedDebit,
            difference: countedDebit - expectedDebit,
          },
          credit: {
            expected: expectedCredit,
            counted: countedCredit,
            difference: countedCredit - expectedCredit,
          },
          other: {
            expected: expectedOther,
            counted: countedOther,
            difference: countedOther - expectedOther,
          },
        },
        totalExpected,
        totalCounted,
        difference,
        differenceStatus:
          Math.abs(difference) < 0.01
            ? 'EXATO'
            : difference > 0
            ? 'SOBRA'
            : 'FALTA',
        notes: closedRegister.notes,
      },
    });
  } catch (error: any) {
    console.error('Erro ao fechar caixa:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao realizar fechamento de caixa.' },
      { status: 500 }
    );
  }
}

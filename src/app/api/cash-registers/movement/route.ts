import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const movementSchema = z.object({
  type: z.enum(['SANGRIA', 'SUPRIMENTO', 'DESPESA', 'ENTRADA']),
  amount: z.number().positive('O valor deve ser maior que zero'),
  paymentMethod: z.string().default('DINHEIRO'),
  reason: z.string().min(3, 'Informe um motivo claro para a movimentação'),
});

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const result = movementSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { type, amount, paymentMethod, reason } = result.data;

    // 1. Verifica se há caixa aberto
    const activeRegister = await prisma.cashRegister.findFirst({
      where: {
        storeId: session.storeId,
        status: 'ABERTO',
      },
      include: {
        movements: true,
        sales: {
          where: { status: 'CONCLUIDA' },
          include: { payments: true },
        },
      },
      orderBy: { openedAt: 'desc' },
    });

    if (!activeRegister) {
      return NextResponse.json(
        { error: 'Não há caixa aberto no momento para lançar movimentações.' },
        { status: 400 }
      );
    }

    // 2. Se for SANGRIA ou DESPESA em DINHEIRO, valida saldo físico disponível na gaveta
    if ((type === 'SANGRIA' || type === 'DESPESA') && paymentMethod === 'DINHEIRO') {
      let cashInSales = 0;
      activeRegister.sales.forEach((s) => {
        s.payments.forEach((p) => {
          if (p.method === 'DINHEIRO') cashInSales += p.amount;
        });
      });

      let suprimentos = 0;
      let sangrias = 0;
      activeRegister.movements.forEach((m) => {
        if (m.type === 'SUPRIMENTO' || m.type === 'ENTRADA') {
          if (m.reason !== 'Fundo de troco de abertura') suprimentos += m.amount;
        } else if (m.type === 'SANGRIA' || m.type === 'DESPESA') {
          sangrias += m.amount;
        }
      });

      const currentDrawerCash = activeRegister.initialBalance + cashInSales + suprimentos - sangrias;

      if (amount > currentDrawerCash) {
        return NextResponse.json(
          {
            error: `Saldo insuficiente na gaveta para sangria. Saldo atual disponível: R$ ${currentDrawerCash.toFixed(2)}. Valor solicitado: R$ ${amount.toFixed(2)}.`,
          },
          { status: 400 }
        );
      }
    }

    // 3. Cria a movimentação
    const movement = await prisma.cashMovement.create({
      data: {
        cashRegisterId: activeRegister.id,
        userId: session.userId,
        type,
        amount,
        paymentMethod,
        reason,
      },
      include: {
        user: { select: { name: true } },
      },
    });

    // 4. Auditoria
    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: type === 'SANGRIA' ? 'CAIXA_SANGRIA' : 'CAIXA_SUPRIMENTO',
      entity: 'CashMovement',
      entityId: movement.id,
      newValue: {
        cashRegisterId: activeRegister.id,
        type,
        amount,
        reason,
        paymentMethod,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${type === 'SANGRIA' ? 'Sangria' : 'Suprimento'} registrado com sucesso!`,
      movement,
    });
  } catch (error: any) {
    console.error('Erro ao registrar movimentação de caixa:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao registrar movimentação no caixa.' },
      { status: 500 }
    );
  }
}

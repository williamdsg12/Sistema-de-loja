import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const openCashSchema = z.object({
  initialBalance: z.number().min(0, 'O fundo inicial não pode ser negativo'),
  notes: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const result = openCashSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { initialBalance, notes } = result.data;

    // 1. Verifica se já existe um caixa aberto para a loja
    const existingOpen = await prisma.cashRegister.findFirst({
      where: {
        storeId: session.storeId,
        status: 'ABERTO',
      },
      include: {
        user: { select: { name: true } },
      },
    });

    if (existingOpen) {
      return NextResponse.json(
        {
          error: `Já existe um caixa aberto pelo operador ${existingOpen.user.name}. Feche o caixa anterior antes de abrir um novo.`,
        },
        { status: 400 }
      );
    }

    // 2. Criação do Caixa e movimentação de abertura em transação ACID
    const newRegister = await prisma.$transaction(async (tx) => {
      const register = await tx.cashRegister.create({
        data: {
          storeId: session.storeId,
          userId: session.userId,
          status: 'ABERTO',
          openedAt: new Date(),
          initialBalance: initialBalance || 0,
          notes: notes || null,
        },
      });

      // Se houver saldo inicial em dinheiro, cria a movimentação correspondente
      if (initialBalance > 0) {
        await tx.cashMovement.create({
          data: {
            cashRegisterId: register.id,
            userId: session.userId,
            type: 'SUPRIMENTO',
            amount: initialBalance,
            paymentMethod: 'DINHEIRO',
            reason: 'Fundo de troco de abertura',
          },
        });
      }

      return register;
    });

    // 3. Auditoria
    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'CAIXA_ABERTO',
      entity: 'CashRegister',
      entityId: newRegister.id,
      newValue: {
        initialBalance: newRegister.initialBalance,
        notes: newRegister.notes,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Caixa aberto com sucesso!',
      register: newRegister,
    });
  } catch (error: any) {
    console.error('Erro ao abrir caixa:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao abrir caixa.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const settlePayableSchema = z.object({
  paymentDate: z.string().optional(),
  paymentMethod: z.string().default('BOLETO'),
  notes: z.string().optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const result = settlePayableSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { paymentDate, paymentMethod, notes } = result.data;

    const payable = await prisma.accountPayable.findFirst({
      where: {
        id,
        storeId: session.storeId,
      },
      include: {
        supplier: true,
      },
    });

    if (!payable) {
      return NextResponse.json({ error: 'Conta a pagar não encontrada' }, { status: 404 });
    }

    if (payable.status === 'PAGO') {
      return NextResponse.json(
        { error: 'Esta conta já foi marcada como paga.' },
        { status: 400 }
      );
    }

    if (payable.status === 'CANCELADO') {
      return NextResponse.json(
        { error: 'Não é possível baixar uma conta cancelada.' },
        { status: 400 }
      );
    }

    // Se o pagamento for em Dinheiro e houver caixa aberto, lança saída no caixa
    const activeCash = await prisma.cashRegister.findFirst({
      where: {
        storeId: session.storeId,
        status: 'ABERTO',
      },
    });

    const updatedPayable = await prisma.$transaction(async (tx) => {
      const p = await tx.accountPayable.update({
        where: { id: payable.id },
        data: {
          status: 'PAGO',
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMethod,
          notes: notes
            ? (payable.notes ? `${payable.notes}\n[Baixa]: ${notes}` : notes)
            : payable.notes,
        },
      });

      // Se pago em dinheiro com caixa aberto, registra movimento de DESPESA no caixa
      if (paymentMethod === 'DINHEIRO' && activeCash) {
        await tx.cashMovement.create({
          data: {
            cashRegisterId: activeCash.id,
            userId: session.userId,
            type: 'DESPESA',
            amount: payable.amount,
            paymentMethod: 'DINHEIRO',
            reason: `Pagamento: ${payable.description}`,
          },
        });
      }

      return p;
    });

    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'CONTA_PAGAR_BAIXADA',
      entity: 'AccountPayable',
      entityId: updatedPayable.id,
      newValue: {
        description: updatedPayable.description,
        amount: updatedPayable.amount,
        status: 'PAGO',
        paymentMethod,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Conta "${updatedPayable.description}" baixada como Paga com sucesso!`,
      payable: updatedPayable,
    });
  } catch (error: any) {
    console.error('Erro ao baixar conta a pagar:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao registrar pagamento.' },
      { status: 500 }
    );
  }
}

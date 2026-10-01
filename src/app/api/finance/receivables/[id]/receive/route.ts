import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const settleReceivableSchema = z.object({
  receivedDate: z.string().optional(),
  paymentMethod: z.string().default('PIX'),
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
    const result = settleReceivableSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { receivedDate, paymentMethod, notes } = result.data;

    const receivable = await prisma.accountReceivable.findFirst({
      where: {
        id,
        storeId: session.storeId,
      },
      include: {
        customer: true,
      },
    });

    if (!receivable) {
      return NextResponse.json({ error: 'Conta a receber não encontrada' }, { status: 404 });
    }

    if (receivable.status === 'RECEBIDO') {
      return NextResponse.json(
        { error: 'Esta conta já foi marcada como recebida.' },
        { status: 400 }
      );
    }

    if (receivable.status === 'CANCELADO') {
      return NextResponse.json(
        { error: 'Não é possível baixar uma conta cancelada.' },
        { status: 400 }
      );
    }

    // Se o recebimento for em Dinheiro e houver caixa aberto, lança entrada no caixa
    const activeCash = await prisma.cashRegister.findFirst({
      where: {
        storeId: session.storeId,
        status: 'ABERTO',
      },
    });

    const updatedReceivable = await prisma.$transaction(async (tx) => {
      const r = await tx.accountReceivable.update({
        where: { id: receivable.id },
        data: {
          status: 'RECEBIDO',
          receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
          paymentMethod,
          notes: notes
            ? (receivable.notes ? `${receivable.notes}\n[Recebimento]: ${notes}` : notes)
            : receivable.notes,
        },
      });

      // Se recebido em dinheiro com caixa aberto, registra movimento de ENTRADA no caixa
      if (paymentMethod === 'DINHEIRO' && activeCash) {
        await tx.cashMovement.create({
          data: {
            cashRegisterId: activeCash.id,
            userId: session.userId,
            type: 'ENTRADA',
            amount: receivable.amount,
            paymentMethod: 'DINHEIRO',
            reason: `Recebimento: ${receivable.description}`,
          },
        });
      }

      return r;
    });

    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'CONTA_RECEBER_BAIXADA',
      entity: 'AccountReceivable',
      entityId: updatedReceivable.id,
      newValue: {
        description: updatedReceivable.description,
        amount: updatedReceivable.amount,
        status: 'RECEBIDO',
        paymentMethod,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Recebível "${updatedReceivable.description}" baixado como Recebido com sucesso!`,
      receivable: updatedReceivable,
    });
  } catch (error: any) {
    console.error('Erro ao baixar conta a receber:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao registrar recebimento.' },
      { status: 500 }
    );
  }
}

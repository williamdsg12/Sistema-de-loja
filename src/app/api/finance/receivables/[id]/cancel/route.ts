import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

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
    const reason = body?.reason || 'Cancelamento manual';

    const receivable = await prisma.accountReceivable.findFirst({
      where: {
        id,
        storeId: session.storeId,
      },
    });

    if (!receivable) {
      return NextResponse.json({ error: 'Conta a receber não encontrada' }, { status: 404 });
    }

    if (receivable.status === 'CANCELADO') {
      return NextResponse.json(
        { error: 'Esta conta já está cancelada.' },
        { status: 400 }
      );
    }

    const updatedReceivable = await prisma.accountReceivable.update({
      where: { id: receivable.id },
      data: {
        status: 'CANCELADO',
        notes: receivable.notes
          ? `${receivable.notes}\n[Cancelamento]: ${reason}`
          : `[Cancelamento]: ${reason}`,
      },
    });

    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'CONTA_RECEBER_CANCELADA',
      entity: 'AccountReceivable',
      entityId: updatedReceivable.id,
      newValue: {
        description: updatedReceivable.description,
        amount: updatedReceivable.amount,
        status: 'CANCELADO',
        reason,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Recebível "${updatedReceivable.description}" cancelado com sucesso!`,
      receivable: updatedReceivable,
    });
  } catch (error: any) {
    console.error('Erro ao cancelar conta a receber:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao cancelar conta.' },
      { status: 500 }
    );
  }
}

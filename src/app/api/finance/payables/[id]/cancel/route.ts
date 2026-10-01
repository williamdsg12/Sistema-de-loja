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

    const payable = await prisma.accountPayable.findFirst({
      where: {
        id,
        storeId: session.storeId,
      },
    });

    if (!payable) {
      return NextResponse.json({ error: 'Conta a pagar não encontrada' }, { status: 404 });
    }

    if (payable.status === 'CANCELADO') {
      return NextResponse.json(
        { error: 'Esta conta já está cancelada.' },
        { status: 400 }
      );
    }

    const updatedPayable = await prisma.accountPayable.update({
      where: { id: payable.id },
      data: {
        status: 'CANCELADO',
        notes: payable.notes
          ? `${payable.notes}\n[Cancelamento]: ${reason}`
          : `[Cancelamento]: ${reason}`,
      },
    });

    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'CONTA_PAGAR_CANCELADA',
      entity: 'AccountPayable',
      entityId: updatedPayable.id,
      newValue: {
        description: updatedPayable.description,
        amount: updatedPayable.amount,
        status: 'CANCELADO',
        reason,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Conta "${updatedPayable.description}" cancelada com sucesso!`,
      payable: updatedPayable,
    });
  } catch (error: any) {
    console.error('Erro ao cancelar conta a pagar:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao cancelar conta.' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: {
        storeId: session.storeId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, message: 'Todas as notificações foram marcadas como lidas.' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao marcar notificações.' },
      { status: 500 }
    );
  }
}

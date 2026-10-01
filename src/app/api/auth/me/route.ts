import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      phone: true,
      avatarUrl: true,
      role: {
        select: {
          name: true,
          description: true,
        },
      },
      store: {
        select: {
          id: true,
          name: true,
          tradeName: true,
          documentNumber: true,
          phone: true,
          whatsapp: true,
          isConfigured: true,
          logoUrl: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ user, permissions: session.permissions });
}

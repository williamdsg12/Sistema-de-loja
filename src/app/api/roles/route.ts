import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });

    const allPermissions = await prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({
      roles,
      permissions: allPermissions,
    });
  } catch (error: any) {
    console.error('Erro ao listar perfis e permissões:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar permissões.' },
      { status: 500 }
    );
  }
}

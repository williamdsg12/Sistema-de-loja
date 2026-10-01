import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  roleId: z.string().min(1, 'Selecione um perfil de acesso'),
  isActive: z.boolean().default(true),
});

export async function GET(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: { storeId: session.storeId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
    });

    const sanitizedUsers = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      roleId: u.roleId,
      roleName: u.role.name,
      roleDescription: u.role.description,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));

    return NextResponse.json({
      users: sanitizedUsers,
      roles,
    });
  } catch (error: any) {
    console.error('Erro ao listar usuários:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar usuários.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const result = createUserSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = result.data;

    // Verifica se e-mail já existe
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um usuário cadastrado com este e-mail.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const username = data.email.split('@')[0] + Math.floor(Math.random() * 1000);

    const newUser = await prisma.user.create({
      data: {
        storeId: session.storeId,
        roleId: data.roleId,
        name: data.name.trim(),
        username: username,
        email: data.email.toLowerCase().trim(),
        passwordHash: hashedPassword,
        isActive: data.isActive,
      },
      include: { role: true },
    });

    // Auditoria
    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'CRIACAO_USUARIO',
      entity: 'User',
      entityId: newUser.id,
      newValue: {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role.name,
        isActive: newUser.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Usuário cadastrado com sucesso!',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        roleName: newUser.role.name,
        isActive: newUser.isActive,
      },
    });
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar usuário.' },
      { status: 500 }
    );
  }
}

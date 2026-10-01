import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional().nullable(),
  roleId: z.string().min(1, 'Selecione um perfil de acesso'),
  isActive: z.boolean(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = updateUserSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = result.data;

    const existingUser = await prisma.user.findFirst({
      where: { id, storeId: session.storeId },
      include: { role: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Previne auto-desativação do único admin
    if (session.userId === id && !data.isActive) {
      return NextResponse.json(
        { error: 'Você não pode desativar seu próprio usuário logado.' },
        { status: 400 }
      );
    }

    const updateData: any = {
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      roleId: data.roleId,
      isActive: data.isActive,
    };

    if (data.password && data.password.trim().length >= 6) {
      updateData.passwordHash = await bcrypt.hash(data.password.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });

    // Auditoria
    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'ALTERACAO_USUARIO',
      entity: 'User',
      entityId: updatedUser.id,
      previousValue: {
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role.name,
        isActive: existingUser.isActive,
      },
      newValue: {
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role.name,
        isActive: updatedUser.isActive,
        passwordChanged: !!data.password,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Usuário atualizado com sucesso!',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        roleName: updatedUser.role.name,
        isActive: updatedUser.isActive,
      },
    });
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao alterar dados do usuário.' },
      { status: 500 }
    );
  }
}

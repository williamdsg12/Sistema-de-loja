import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Informe seu e-mail ou nome de usuário'),
  password: z.string().min(1, 'Informe sua senha'),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { identifier, password, rememberMe } = result.data;

    // Busca usuário por email ou username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase().trim() },
          { username: identifier.trim() },
        ],
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        store: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas. Verifique seu e-mail/usuário e senha.' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Este usuário está inativo. Contate o administrador.' },
        { status: 403 }
      );
    }

    // Valida a senha criptografada com bcrypt
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Credenciais inválidas. Verifique seu e-mail/usuário e senha.' },
        { status: 401 }
      );
    }

    // Extrai códigos de permissões
    const permissions = user.role.permissions.map((rp) => rp.permission.code);

    // Gera o Token JWT assinado
    const token = await createSessionToken(
      {
        userId: user.id,
        storeId: user.storeId,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role.name,
        permissions,
      },
      rememberMe
    );

    // Atualiza último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Registra Auditoria
    await createAuditLog({
      storeId: user.storeId,
      userId: user.id,
      userName: user.name,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      newValue: { status: 'SUCESSO', ip: request.headers.get('x-forwarded-for') || '127.0.0.1' },
    });

    // Cria a resposta com cookie HttpOnly
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 dias ou 1 dia
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        store: {
          id: user.store.id,
          name: user.store.name,
          isConfigured: user.store.isConfigured,
        },
      },
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Erro na rota de login:', error);
    return NextResponse.json(
      { error: 'Erro interno ao realizar autenticação. Tente novamente.' },
      { status: 500 }
    );
  }
}

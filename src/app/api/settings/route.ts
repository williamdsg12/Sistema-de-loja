import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  name: z.string().min(2, 'Nome/Razão Social obrigatório'),
  tradeName: z.string().optional().nullable(),
  documentNumber: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('E-mail inválido').optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const store = await prisma.store.findUnique({
      where: { id: session.storeId },
      include: {
        onlineSettings: true,
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'Loja não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ store });
  } catch (error: any) {
    console.error('Erro ao buscar configurações da loja:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar configurações.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const result = updateSettingsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = result.data;

    const previousStore = await prisma.store.findUnique({
      where: { id: session.storeId },
    });

    const updatedStore = await prisma.store.update({
      where: { id: session.storeId },
      data: {
        name: data.name,
        tradeName: data.tradeName || null,
        documentNumber: data.documentNumber || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
      },
    });

    // Auditoria
    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'ALTERACAO_CONFIGURACOES',
      entity: 'Store',
      entityId: updatedStore.id,
      previousValue: previousStore,
      newValue: updatedStore,
    });

    return NextResponse.json({
      success: true,
      message: 'Dados da loja atualizados com sucesso!',
      store: updatedStore,
    });
  } catch (error: any) {
    console.error('Erro ao atualizar configurações da loja:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar alterações.' },
      { status: 500 }
    );
  }
}

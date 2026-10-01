import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const onboardingSchema = z.object({
  name: z.string().min(2, 'O nome da loja é obrigatório'),
  tradeName: z.string().optional(),
  documentNumber: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  zipCode: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  initialCashBalance: z.number().min(0).default(100),
  defaultMinStock: z.number().min(0).default(5),
});

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const result = onboardingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = result.data;

    // Atualiza a loja
    const updatedStore = await prisma.store.update({
      where: { id: session.storeId },
      data: {
        name: data.name,
        tradeName: data.tradeName || data.name,
        documentNumber: data.documentNumber,
        phone: data.phone,
        whatsapp: data.whatsapp,
        email: data.email || null,
        zipCode: data.zipCode,
        address: data.address,
        number: data.number,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        isConfigured: true,
      },
    });

    // Se não houver caixa aberto, cria/abre o caixa inicial com o valor configurado
    const existingCash = await prisma.cashRegister.findFirst({
      where: { storeId: session.storeId, status: 'ABERTO' },
    });

    if (!existingCash && data.initialCashBalance > 0) {
      await prisma.cashRegister.create({
        data: {
          storeId: session.storeId,
          userId: session.userId,
          status: 'ABERTO',
          initialBalance: data.initialCashBalance,
          notes: 'Abertura automática via assistente de primeiro acesso',
        },
      });
    }

    // Registra auditoria
    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'ONBOARDING_CONCLUIDO',
      entity: 'Store',
      entityId: session.storeId,
      newValue: { name: data.name, configuredAt: new Date() },
    });

    return NextResponse.json({ success: true, store: updatedStore });
  } catch (error) {
    console.error('Erro no onboarding:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar configurações iniciais da loja.' },
      { status: 500 }
    );
  }
}

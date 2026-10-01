import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const supplierSchema = z.object({
  name: z.string().min(2, 'O nome / responsável do fornecedor é obrigatório'),
  corporateName: z.string().optional().or(z.literal('')),
  documentNumber: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  whatsapp: z.string().optional().or(z.literal('')),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  zipCode: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  number: z.string().optional().or(z.literal('')),
  neighborhood: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export async function GET(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const where: any = {
      storeId: session.storeId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { corporateName: { contains: search } },
        { documentNumber: { contains: search } },
        { phone: { contains: search } },
        { whatsapp: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        _count: {
          select: { purchases: true, accountsPayable: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error('Erro ao buscar fornecedores:', error);
    return NextResponse.json({ error: 'Erro ao carregar lista de fornecedores.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const result = supplierSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const data = result.data;

    const supplier = await prisma.supplier.create({
      data: {
        storeId: session.storeId,
        name: data.name,
        corporateName: data.corporateName || null,
        documentNumber: data.documentNumber || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        zipCode: data.zipCode || null,
        address: data.address || null,
        number: data.number || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        notes: data.notes || null,
        isActive: data.isActive,
      },
    });

    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'CRIACAO_FORNECEDOR',
      entity: 'Supplier',
      entityId: supplier.id,
      newValue: { name: supplier.name, corporateName: supplier.corporateName },
    });

    return NextResponse.json({ success: true, supplier });
  } catch (error) {
    console.error('Erro ao cadastrar fornecedor:', error);
    return NextResponse.json({ error: 'Erro ao salvar fornecedor.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const customerSchema = z.object({
  name: z.string().min(2, 'O nome do cliente é obrigatório'),
  documentNumber: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  whatsapp: z.string().optional().or(z.literal('')),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')),
  zipCode: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  number: z.string().optional().or(z.literal('')),
  complement: z.string().optional().or(z.literal('')),
  neighborhood: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export async function GET(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const birthdayMonth = searchParams.get('birthdayMonth'); // 1 a 12

    const where: any = {
      storeId: session.storeId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { documentNumber: { contains: search } },
        { phone: { contains: search } },
        { whatsapp: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: { sales: true, orders: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calcula KPIs
    const totalCustomers = customers.length;
    const totalSpentAll = customers.reduce((acc, c) => acc + c.totalSpent, 0);
    const totalSalesAll = customers.reduce((acc, c) => acc + c.totalOrders, 0);
    const averageTicketAll = totalSalesAll > 0 ? totalSpentAll / totalSalesAll : 0;

    // Aniversariantes do Mês Atual
    const currentMonth = new Date().getMonth() + 1;
    const birthdaysThisMonth = customers.filter((c) => {
      if (!c.birthDate) return false;
      const bMonth = new Date(c.birthDate).getUTCMonth() + 1;
      return bMonth === (birthdayMonth ? parseInt(birthdayMonth) : currentMonth);
    }).length;

    return NextResponse.json({
      customers,
      summary: {
        totalCustomers,
        totalSpentAll,
        averageTicketAll,
        birthdaysThisMonth,
      },
    });
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const result = customerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const data = result.data;

    // Converte data de nascimento
    let parsedBirthDate: Date | null = null;
    if (data.birthDate) {
      parsedBirthDate = new Date(data.birthDate);
    }

    // Verifica se CPF já foi cadastrado na mesma loja
    if (data.documentNumber && data.documentNumber.trim()) {
      const cleanDoc = data.documentNumber.replace(/\D/g, '');
      const existing = await prisma.customer.findFirst({
        where: {
          storeId: session.storeId,
          documentNumber: { contains: cleanDoc },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Já existe um cliente cadastrado com este CPF/Documento.' },
          { status: 400 }
        );
      }
    }

    const customer = await prisma.customer.create({
      data: {
        storeId: session.storeId,
        name: data.name,
        documentNumber: data.documentNumber || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        birthDate: parsedBirthDate,
        zipCode: data.zipCode || null,
        address: data.address || null,
        number: data.number || null,
        complement: data.complement || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        notes: data.notes || null,
      },
    });

    // Registra Auditoria
    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'CRIACAO_CLIENTE',
      entity: 'Customer',
      entityId: customer.id,
      newValue: { name: customer.name, phone: customer.phone, doc: customer.documentNumber },
    });

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Erro ao cadastrar cliente:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar cliente.' }, { status: 500 });
  }
}

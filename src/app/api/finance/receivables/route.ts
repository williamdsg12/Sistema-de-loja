import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const createReceivableSchema = z.object({
  description: z.string().min(2, 'Informe uma descrição para o recebível'),
  amount: z.number().positive('O valor deve ser maior que zero'),
  dueDate: z.string().min(1, 'Informe a data de vencimento'),
  customerId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  paymentMethod: z.string().optional().default('PIX'),
  notes: z.string().optional().nullable(),
  installmentsCount: z.number().int().min(1).max(24).optional().default(1),
});

// GET: Listar Contas a Receber com filtros e cálculo de status dinâmico (VENCIDO)
export async function GET(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const customerId = searchParams.get('customerId') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {
      storeId: session.storeId,
    };

    if (customerId) where.customerId = customerId;
    if (categoryId) where.categoryId = categoryId;

    if (search) {
      where.OR = [
        { description: { contains: search } },
        { notes: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }

    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) where.dueDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.dueDate.lte = end;
      }
    }

    const receivables = await prisma.accountReceivable.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true, documentNumber: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 100,
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let totalPendingAmount = 0;
    let totalOverdueAmount = 0;
    let totalReceivedAmount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let receivedCount = 0;

    const formattedReceivables = receivables.map((r) => {
      let dynamicStatus = r.status;
      const due = new Date(r.dueDate);
      due.setHours(0, 0, 0, 0);

      if (r.status === 'PENDENTE' && due < now) {
        dynamicStatus = 'VENCIDO';
      }

      if (dynamicStatus === 'PENDENTE') {
        totalPendingAmount += r.amount;
        pendingCount += 1;
      } else if (dynamicStatus === 'VENCIDO') {
        totalOverdueAmount += r.amount;
        overdueCount += 1;
      } else if (r.status === 'RECEBIDO') {
        totalReceivedAmount += r.amount;
        receivedCount += 1;
      }

      return {
        ...r,
        computedStatus: dynamicStatus,
      };
    });

    const filteredList = status
      ? formattedReceivables.filter((r) => r.computedStatus === status || r.status === status)
      : formattedReceivables;

    return NextResponse.json({
      receivables: filteredList,
      summary: {
        totalPendingAmount,
        totalOverdueAmount,
        totalReceivedAmount,
        totalCount: receivables.length,
        pendingCount,
        overdueCount,
        receivedCount,
      },
    });
  } catch (error: any) {
    console.error('Erro ao listar contas a receber:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao listar contas a receber.' },
      { status: 500 }
    );
  }
}

// POST: Criar Conta a Receber Manual (Crediário, Aluguel, etc.)
export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const result = createReceivableSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const {
      description,
      amount,
      dueDate,
      customerId,
      categoryId,
      paymentMethod,
      notes,
      installmentsCount,
    } = result.data;

    const installments = installmentsCount || 1;
    const installmentAmount = Math.round((amount / installments) * 100) / 100;
    const baseDate = new Date(dueDate);

    const createdRecords = await prisma.$transaction(async (tx) => {
      const records = [];
      for (let i = 0; i < installments; i++) {
        const itemDueDate = new Date(baseDate);
        itemDueDate.setMonth(itemDueDate.getMonth() + i);

        const currentAmount =
          i === installments - 1
            ? amount - installmentAmount * (installments - 1)
            : installmentAmount;

        const currentDescription =
          installments > 1 ? `${description} (${i + 1}/${installments})` : description;

        const record = await tx.accountReceivable.create({
          data: {
            storeId: session.storeId,
            customerId: customerId || null,
            categoryId: categoryId || null,
            description: currentDescription,
            amount: currentAmount,
            dueDate: itemDueDate,
            status: 'PENDENTE',
            paymentMethod: paymentMethod || 'PIX',
            notes: notes || null,
          },
        });
        records.push(record);
      }
      return records;
    });

    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'CONTA_RECEBER_CRIADA',
      entity: 'AccountReceivable',
      entityId: createdRecords[0].id,
      newValue: {
        description,
        totalAmount: amount,
        installments,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${installments > 1 ? `${installments} parcelas a receber criadas` : 'Conta a receber criada'} com sucesso!`,
      records: createdRecords,
    });
  } catch (error: any) {
    console.error('Erro ao cadastrar conta a receber:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao registrar conta a receber.' },
      { status: 500 }
    );
  }
}

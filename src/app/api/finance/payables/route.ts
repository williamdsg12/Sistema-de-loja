import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const createPayableSchema = z.object({
  description: z.string().min(2, 'Informe uma descrição para a conta'),
  amount: z.number().positive('O valor deve ser maior que zero'),
  dueDate: z.string().min(1, 'Informe a data de vencimento'),
  supplierId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  paymentMethod: z.string().optional().default('BOLETO'),
  notes: z.string().optional().nullable(),
  installmentsCount: z.number().int().min(1).max(24).optional().default(1),
});

// GET: Listar Contas a Pagar com filtros e cálculo de status dinâmico (VENCIDO)
export async function GET(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const supplierId = searchParams.get('supplierId') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {
      storeId: session.storeId,
    };

    if (supplierId) where.supplierId = supplierId;
    if (categoryId) where.categoryId = categoryId;

    if (search) {
      where.OR = [
        { description: { contains: search } },
        { notes: { contains: search } },
        { supplier: { name: { contains: search } } },
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

    const payables = await prisma.accountPayable.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, corporateName: true, phone: true } },
        category: { select: { id: true, name: true } },
        purchase: { select: { id: true, code: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 100,
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Ajusta status dinâmico (se PENDENTE e dueDate < hoje -> VENCIDO) e calcula KPIs
    let totalPendingAmount = 0;
    let totalOverdueAmount = 0;
    let totalPaidAmount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let paidCount = 0;

    const formattedPayables = payables.map((p) => {
      let dynamicStatus = p.status;
      const due = new Date(p.dueDate);
      due.setHours(0, 0, 0, 0);

      if (p.status === 'PENDENTE' && due < now) {
        dynamicStatus = 'VENCIDO';
      }

      if (dynamicStatus === 'PENDENTE') {
        totalPendingAmount += p.amount;
        pendingCount += 1;
      } else if (dynamicStatus === 'VENCIDO') {
        totalOverdueAmount += p.amount;
        overdueCount += 1;
      } else if (p.status === 'PAGO') {
        totalPaidAmount += p.amount;
        paidCount += 1;
      }

      return {
        ...p,
        computedStatus: dynamicStatus,
      };
    });

    // Se houver filtro de status, filtra pelo computedStatus
    const filteredList = status
      ? formattedPayables.filter((p) => p.computedStatus === status || p.status === status)
      : formattedPayables;

    return NextResponse.json({
      payables: filteredList,
      summary: {
        totalPendingAmount,
        totalOverdueAmount,
        totalPaidAmount,
        totalCount: payables.length,
        pendingCount,
        overdueCount,
        paidCount,
      },
    });
  } catch (error: any) {
    console.error('Erro ao listar contas a pagar:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao listar contas a pagar.' },
      { status: 500 }
    );
  }
}

// POST: Criar Conta a Pagar / Despesa Manual
export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const result = createPayableSchema.safeParse(body);

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
      supplierId,
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

        const record = await tx.accountPayable.create({
          data: {
            storeId: session.storeId,
            supplierId: supplierId || null,
            categoryId: categoryId || null,
            description: currentDescription,
            amount: currentAmount,
            dueDate: itemDueDate,
            status: 'PENDENTE',
            paymentMethod: paymentMethod || 'BOLETO',
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
      action: 'CONTA_PAGAR_CRIADA',
      entity: 'AccountPayable',
      entityId: createdRecords[0].id,
      newValue: {
        description,
        totalAmount: amount,
        installments,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${installments > 1 ? `${installments} parcelas criadas` : 'Conta a pagar criada'} com sucesso!`,
      records: createdRecords,
    });
  } catch (error: any) {
    console.error('Erro ao cadastrar conta a pagar:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao registrar conta a pagar.' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: { id, storeId: session.storeId },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                variant: {
                  include: { product: true },
                },
              },
            },
            payments: true,
          },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                variant: {
                  include: { product: true },
                },
              },
            },
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    // Calcula ticket médio
    const totalSalesCount = customer.sales.length + customer.orders.length;
    const totalSpent =
      customer.sales.reduce((acc, s) => acc + s.totalAmount, 0) +
      customer.orders.reduce((acc, o) => acc + o.totalAmount, 0);
    const averageTicket = totalSalesCount > 0 ? totalSpent / totalSalesCount : 0;

    return NextResponse.json({
      customer: {
        ...customer,
        totalSalesCount,
        calculatedTotalSpent: totalSpent,
        averageTicket,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados do cliente' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.customer.findFirst({
      where: { id, storeId: session.storeId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        documentNumber: body.documentNumber ?? existing.documentNumber,
        phone: body.phone ?? existing.phone,
        whatsapp: body.whatsapp ?? existing.whatsapp,
        email: body.email ?? existing.email,
        birthDate: body.birthDate ? new Date(body.birthDate) : existing.birthDate,
        zipCode: body.zipCode ?? existing.zipCode,
        address: body.address ?? existing.address,
        number: body.number ?? existing.number,
        complement: body.complement ?? existing.complement,
        neighborhood: body.neighborhood ?? existing.neighborhood,
        city: body.city ?? existing.city,
        state: body.state ?? existing.state,
        notes: body.notes ?? existing.notes,
      },
    });

    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'EDICAO_CLIENTE',
      entity: 'Customer',
      entityId: id,
      newValue: { name: updated.name, phone: updated.phone },
    });

    return NextResponse.json({ success: true, customer: updated });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    return NextResponse.json({ error: 'Erro ao salvar alterações do cliente.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: { id, storeId: session.storeId },
      include: {
        sales: true,
        orders: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    if (customer.sales.length > 0 || customer.orders.length > 0) {
      return NextResponse.json(
        {
          error:
            'Não é possível excluir este cliente pois existem vendas e pedidos registrados em seu histórico.',
        },
        { status: 400 }
      );
    }

    await prisma.customer.delete({ where: { id } });

    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'EXCLUSAO_CLIENTE',
      entity: 'Customer',
      entityId: id,
      previousValue: { name: customer.name },
    });

    return NextResponse.json({ success: true, message: 'Cliente excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    return NextResponse.json({ error: 'Erro ao remover cliente.' }, { status: 500 });
  }
}

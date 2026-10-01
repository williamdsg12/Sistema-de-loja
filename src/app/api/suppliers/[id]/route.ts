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

    const supplier = await prisma.supplier.findFirst({
      where: { id, storeId: session.storeId },
      include: {
        purchases: {
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
        accountsPayable: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 });
    }

    const totalPurchased = supplier.purchases.reduce((acc, p) => acc + p.totalAmount, 0);
    const pendingPayables = supplier.accountsPayable
      .filter((a) => a.status === 'PENDENTE')
      .reduce((acc, a) => acc + a.amount, 0);

    return NextResponse.json({
      supplier: {
        ...supplier,
        totalPurchased,
        pendingPayables,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar fornecedor:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados do fornecedor' }, { status: 500 });
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

    const existing = await prisma.supplier.findFirst({
      where: { id, storeId: session.storeId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 });
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        corporateName: body.corporateName ?? existing.corporateName,
        documentNumber: body.documentNumber ?? existing.documentNumber,
        phone: body.phone ?? existing.phone,
        whatsapp: body.whatsapp ?? existing.whatsapp,
        email: body.email ?? existing.email,
        zipCode: body.zipCode ?? existing.zipCode,
        address: body.address ?? existing.address,
        number: body.number ?? existing.number,
        neighborhood: body.neighborhood ?? existing.neighborhood,
        city: body.city ?? existing.city,
        state: body.state ?? existing.state,
        notes: body.notes ?? existing.notes,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
      },
    });

    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'EDICAO_FORNECEDOR',
      entity: 'Supplier',
      entityId: id,
      newValue: { name: updated.name, corporateName: updated.corporateName },
    });

    return NextResponse.json({ success: true, supplier: updated });
  } catch (error) {
    console.error('Erro ao atualizar fornecedor:', error);
    return NextResponse.json({ error: 'Erro ao salvar alterações do fornecedor.' }, { status: 500 });
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

    const supplier = await prisma.supplier.findFirst({
      where: { id, storeId: session.storeId },
      include: { purchases: true },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 });
    }

    if (supplier.purchases.length > 0) {
      await prisma.supplier.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        message: 'O fornecedor possui compras vinculadas e foi inativado.',
      });
    }

    await prisma.supplier.delete({ where: { id } });

    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'EXCLUSAO_FORNECEDOR',
      entity: 'Supplier',
      entityId: id,
      previousValue: { name: supplier.name },
    });

    return NextResponse.json({ success: true, message: 'Fornecedor removido com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir fornecedor:', error);
    return NextResponse.json({ error: 'Erro ao remover fornecedor.' }, { status: 500 });
  }
}

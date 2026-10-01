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

    const product = await prisma.product.findFirst({
      where: {
        id,
        storeId: session.storeId,
      },
      include: {
        category: true,
        brand: true,
        variants: {
          include: {
            stock: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados do produto' }, { status: 500 });
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

    const existingProduct = await prisma.product.findFirst({
      where: { id, storeId: session.storeId },
      include: { variants: true },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Atualiza o produto pai
      const product = await tx.product.update({
        where: { id },
        data: {
          name: body.name ?? existingProduct.name,
          barcode: body.barcode ?? existingProduct.barcode,
          description: body.description ?? existingProduct.description,
          imageUrl: body.imageUrl ?? existingProduct.imageUrl,
          categoryId: body.categoryId !== undefined ? body.categoryId : existingProduct.categoryId,
          brandId: body.brandId !== undefined ? body.brandId : existingProduct.brandId,
          gender: body.gender ?? existingProduct.gender,
          ageGroup: body.ageGroup ?? existingProduct.ageGroup,
          costPrice: body.costPrice !== undefined ? body.costPrice : existingProduct.costPrice,
          sellPrice: body.sellPrice !== undefined ? body.sellPrice : existingProduct.sellPrice,
          minStock: body.minStock !== undefined ? body.minStock : existingProduct.minStock,
          showInOnline: body.showInOnline !== undefined ? body.showInOnline : existingProduct.showInOnline,
          isActive: body.isActive !== undefined ? body.isActive : existingProduct.isActive,
        },
      });

      // Atualiza / Cria variações enviadas
      if (body.variants && Array.isArray(body.variants)) {
        for (const v of body.variants) {
          if (v.id) {
            // Atualiza variação existente
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                size: v.size,
                color: v.color,
                colorHex: v.colorHex || null,
                sku: v.sku,
                barcode: v.barcode || null,
                costPrice: v.costPrice ?? null,
                sellPrice: v.sellPrice ?? null,
                isActive: v.isActive !== undefined ? v.isActive : true,
              },
            });
          } else {
            // Nova variação adicionada na edição
            const newVar = await tx.productVariant.create({
              data: {
                productId: id,
                size: v.size,
                color: v.color,
                colorHex: v.colorHex || null,
                sku: v.sku,
                barcode: v.barcode || null,
                costPrice: v.costPrice ?? null,
                sellPrice: v.sellPrice ?? null,
                isActive: v.isActive ?? true,
                stock: {
                  create: {
                    quantity: v.initialStock || 0,
                    reservedQuantity: 0,
                  },
                },
              },
            });

            if (v.initialStock && v.initialStock > 0) {
              await tx.stockMovement.create({
                data: {
                  variantId: newVar.id,
                  userId: session.userId,
                  type: 'ENTRADA',
                  quantity: v.initialStock,
                  previousStock: 0,
                  newStock: v.initialStock,
                  reason: 'Entrada de nova variação adicionada na edição',
                  referenceId: id,
                },
              });
            }
          }
        }
      }

      return product;
    });

    // Detecção de Alteração Crítica de Preço para Auditoria
    if (body.sellPrice !== undefined && body.sellPrice !== existingProduct.sellPrice) {
      await createAuditLog({
        storeId: session.storeId,
        userId: session.userId,
        userName: session.name,
        action: 'ALTERACAO_PRECO',
        entity: 'Product',
        entityId: id,
        previousValue: { sellPrice: existingProduct.sellPrice },
        newValue: { sellPrice: body.sellPrice },
      });
    }

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    return NextResponse.json({ error: 'Erro ao salvar alterações do produto.' }, { status: 500 });
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

    const product = await prisma.product.findFirst({
      where: { id, storeId: session.storeId },
      include: {
        variants: {
          include: {
            saleItems: true,
            orderItems: true,
            purchaseItems: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Verifica se possui histórico transacional
    const hasSales = product.variants.some(
      (v) => v.saleItems.length > 0 || v.orderItems.length > 0 || v.purchaseItems.length > 0
    );

    if (hasSales) {
      // Exclusão Lógica para preservar histórico
      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      await createAuditLog({
        storeId: session.storeId,
        userId: session.userId,
        userName: session.name,
        action: 'INATIVACAO_PRODUTO_COM_HISTORICO',
        entity: 'Product',
        entityId: id,
        previousValue: { isActive: true },
        newValue: { isActive: false, motivo: 'Preservação de histórico de vendas/compras' },
      });

      return NextResponse.json({
        success: true,
        message: 'O produto possui histórico de movimentações e foi inativado com segurança.',
      });
    }

    // Exclusão Física se for um produto sem histórico
    await prisma.product.delete({
      where: { id },
    });

    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'EXCLUSAO_FISICA_PRODUTO',
      entity: 'Product',
      entityId: id,
      previousValue: { name: product.name, sku: product.sku },
    });

    return NextResponse.json({ success: true, message: 'Produto excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    return NextResponse.json({ error: 'Erro ao remover produto.' }, { status: 500 });
  }
}

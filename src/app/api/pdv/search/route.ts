import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';

    if (!q) {
      // Se não houver termo, retorna os produtos mais recentes
      const products = await prisma.product.findMany({
        where: { storeId: session.storeId, isActive: true },
        include: {
          variants: {
            where: { isActive: true },
            include: { stock: true },
          },
          category: { select: { name: true } },
          brand: { select: { name: true } },
        },
        take: 20,
      });

      return NextResponse.json({ products });
    }

    // 1. Busca exata por Código de Barras ou SKU da Variação (prioridade máxima para leitor de código de barras)
    const exactVariant = await prisma.productVariant.findFirst({
      where: {
        product: { storeId: session.storeId, isActive: true },
        isActive: true,
        OR: [
          { barcode: q },
          { sku: q },
        ],
      },
      include: {
        product: {
          include: { category: true, brand: true },
        },
        stock: true,
      },
    });

    if (exactVariant) {
      return NextResponse.json({
        exactMatch: true,
        variant: {
          id: exactVariant.id,
          productId: exactVariant.productId,
          productName: exactVariant.product.name,
          productSku: exactVariant.product.sku,
          size: exactVariant.size,
          color: exactVariant.color,
          colorHex: exactVariant.colorHex,
          sku: exactVariant.sku,
          barcode: exactVariant.barcode,
          sellPrice: exactVariant.sellPrice ?? exactVariant.product.sellPrice,
          costPrice: exactVariant.costPrice ?? exactVariant.product.costPrice,
          stock: exactVariant.stock?.quantity ?? 0,
          availableStock: (exactVariant.stock?.quantity ?? 0) - (exactVariant.stock?.reservedQuantity ?? 0),
        },
      });
    }

    // 2. Busca abrangente por Nome de Produto, SKU Base, Categoria, Marca ou Cor
    const products = await prisma.product.findMany({
      where: {
        storeId: session.storeId,
        isActive: true,
        OR: [
          { name: { contains: q } },
          { sku: { contains: q } },
          { barcode: { contains: q } },
          {
            variants: {
              some: {
                OR: [
                  { sku: { contains: q } },
                  { barcode: { contains: q } },
                  { color: { contains: q } },
                  { size: { contains: q } },
                ],
              },
            },
          },
        ],
      },
      include: {
        variants: {
          where: { isActive: true },
          include: { stock: true },
        },
        category: { select: { name: true } },
        brand: { select: { name: true } },
      },
      take: 20,
    });

    return NextResponse.json({ exactMatch: false, products });
  } catch (error) {
    console.error('Erro na busca rápida do PDV:', error);
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
  }
}

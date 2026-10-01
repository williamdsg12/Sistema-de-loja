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
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const status = searchParams.get('status') || ''; // todos, normal, baixo, zerado

    const where: any = {
      product: {
        storeId: session.storeId,
        isActive: true,
      },
    };

    if (search) {
      where.OR = [
        { sku: { contains: search } },
        { barcode: { contains: search } },
        { color: { contains: search } },
        { size: { contains: search } },
        { product: { name: { contains: search } } },
        { product: { sku: { contains: search } } },
      ];
    }

    if (categoryId) {
      where.product.categoryId = categoryId;
    }

    const variants = await prisma.productVariant.findMany({
      where,
      include: {
        product: {
          include: {
            category: true,
            brand: true,
          },
        },
        stock: true,
      },
      orderBy: [{ product: { name: 'asc' } }, { size: 'asc' }],
    });

    let totalPhysicalStock = 0;
    let totalReservedStock = 0;
    let totalStockCost = 0;
    let totalStockSellValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const formattedVariants = variants.map((v) => {
      const physical = v.stock?.quantity || 0;
      const reserved = v.stock?.reservedQuantity || 0;
      const available = physical - reserved;
      const minStock = v.product.minStock ?? 5;
      const costPrice = v.costPrice ?? v.product.costPrice ?? 0;
      const sellPrice = v.sellPrice ?? v.product.sellPrice ?? 0;

      totalPhysicalStock += physical;
      totalReservedStock += reserved;
      totalStockCost += physical * costPrice;
      totalStockSellValue += physical * sellPrice;

      if (physical === 0) outOfStockCount++;
      else if (physical <= minStock) lowStockCount++;

      const isOutOfStock = physical === 0;
      const isLowStock = physical > 0 && physical <= minStock;

      return {
        id: v.id,
        productId: v.productId,
        productName: v.product.name,
        productSku: v.product.sku,
        categoryName: v.product.category?.name || 'Sem Categoria',
        brandName: v.product.brand?.name || 'Sem Marca',
        gender: v.product.gender,
        size: v.size,
        color: v.color,
        colorHex: v.colorHex,
        sku: v.sku,
        barcode: v.barcode,
        costPrice,
        sellPrice,
        minStock,
        physical,
        reserved,
        available,
        isOutOfStock,
        isLowStock,
        updatedAt: v.stock?.updatedAt || v.updatedAt,
      };
    });

    // Filtro pós-cálculo de status se requisitado
    let filteredList = formattedVariants;
    if (status === 'baixo') {
      filteredList = formattedVariants.filter((v) => v.isLowStock);
    } else if (status === 'zerado') {
      filteredList = formattedVariants.filter((v) => v.isOutOfStock);
    } else if (status === 'normal') {
      filteredList = formattedVariants.filter((v) => !v.isLowStock && !v.isOutOfStock);
    }

    return NextResponse.json({
      variants: filteredList,
      summary: {
        totalVariants: variants.length,
        totalPhysicalStock,
        totalReservedStock,
        totalAvailableStock: totalPhysicalStock - totalReservedStock,
        totalStockCost,
        totalStockSellValue,
        potentialProfit: totalStockSellValue - totalStockCost,
        lowStockCount,
        outOfStockCount,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar posição de estoque:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados de estoque.' }, { status: 500 });
  }
}

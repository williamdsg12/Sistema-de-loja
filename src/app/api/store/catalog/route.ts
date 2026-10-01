import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET: Catálogo público da loja online (sem autenticação)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const categorySlug = searchParams.get('category') || '';
    const brandId = searchParams.get('brand') || '';
    const gender = searchParams.get('gender') || '';
    const ageGroup = searchParams.get('ageGroup') || '';
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
    const size = searchParams.get('size') || '';
    const color = searchParams.get('color') || '';
    const sort = searchParams.get('sort') || 'newest';

    // Loja padrão
    const store = await prisma.store.findFirst();
    if (!store) {
      return NextResponse.json({ error: 'Loja não configurada' }, { status: 404 });
    }

    // Banners ativos
    const banners = await prisma.banner.findMany({
      where: { storeId: store.id, isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    // Categorias e Marcas com contagem
    const [categories, brands] = await Promise.all([
      prisma.category.findMany({
        where: { storeId: store.id, isActive: true },
        orderBy: { name: 'asc' },
      }),
      prisma.brand.findMany({
        where: { storeId: store.id, isActive: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Filtros de produtos
    const where: any = {
      storeId: store.id,
      isActive: true,
      isOnline: true,
    };

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    if (brandId) {
      where.brandId = brandId;
    }

    if (gender) {
      where.gender = gender;
    }

    if (ageGroup) {
      where.ageGroup = ageGroup;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.sellPrice = {};
      if (minPrice !== undefined) where.sellPrice.gte = minPrice;
      if (maxPrice !== undefined) where.sellPrice.lte = maxPrice;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    // Filtro por variação (Tamanho ou Cor)
    if (size || color) {
      where.variants = {
        some: {
          isActive: true,
          ...(size ? { size } : {}),
          ...(color ? { color } : {}),
        },
      };
    }

    // Ordenação
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { sellPrice: 'asc' };
    if (sort === 'price_desc') orderBy = { sellPrice: 'desc' };
    if (sort === 'name') orderBy = { name: 'asc' };

    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true } },
        variants: {
          where: { isActive: true },
          include: {
            stock: true,
          },
        },
      },
      orderBy,
      take: 60,
    });

    // Mapeia produtos calculando estoque disponível por variação
    const mappedProducts = products.map((p) => {
      const activeVariants = p.variants.map((v) => {
        const physical = v.stock?.quantity || 0;
        const reserved = v.stock?.reservedQuantity || 0;
        const available = Math.max(0, physical - reserved);
        return {
          id: v.id,
          size: v.size,
          color: v.color,
          colorHex: v.colorHex,
          sku: v.sku,
          sellPrice: v.sellPrice ?? p.sellPrice,
          availableStock: available,
        };
      });

      const totalAvailable = activeVariants.reduce((sum, v) => sum + v.availableStock, 0);

      return {
        id: p.id,
        name: p.name,
        slug: p.sku, // ou slug
        sku: p.sku,
        description: p.description,
        sellPrice: p.sellPrice,
        gender: p.gender,
        ageGroup: p.ageGroup,
        imageUrl: p.imageUrl,
        category: p.category,
        brand: p.brand,
        totalAvailableStock: totalAvailable,
        variants: activeVariants,
        hasStock: totalAvailable > 0,
      };
    });

    return NextResponse.json({
      store: {
        id: store.id,
        name: store.name,
        phone: store.phone,
        whatsapp: store.phone,
        address: `${store.city} - ${store.state}`,
      },
      banners,
      categories,
      brands,
      products: mappedProducts,
      totalCount: mappedProducts.length,
    });
  } catch (error: any) {
    console.error('Erro ao buscar catálogo da loja online:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar vitrine online.' },
      { status: 500 }
    );
  }
}

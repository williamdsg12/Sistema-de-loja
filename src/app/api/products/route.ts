import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const variantSchema = z.object({
  id: z.string().optional(),
  size: z.string().min(1, 'Informe o tamanho'),
  color: z.string().min(1, 'Informe a cor'),
  colorHex: z.string().optional(),
  sku: z.string().min(1, 'SKU da variação é obrigatório'),
  barcode: z.string().optional().or(z.literal('')),
  costPrice: z.number().optional().nullable(),
  sellPrice: z.number().optional().nullable(),
  initialStock: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

const productSchema = z.object({
  name: z.string().min(2, 'O nome do produto é obrigatório'),
  sku: z.string().min(2, 'O SKU base é obrigatório'),
  barcode: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  imageUrl: z.string().optional().or(z.literal('')),
  categoryId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  gender: z.string().optional().nullable(), // INFANTIL_MENINO, INFANTIL_MENINA, UNISSEX, TEEN_MASC, TEEN_FEM
  ageGroup: z.string().optional().nullable(), // BEBE, PRIMEIROS_PASSOS, INFANTIL, JUVENIL_TEEN
  costPrice: z.number().min(0, 'Preço de custo inválido').default(0),
  sellPrice: z.number().min(0, 'Preço de venda inválido').default(0),
  minStock: z.number().int().min(0).default(5),
  showInOnline: z.boolean().default(false),
  isActive: z.boolean().default(true),
  variants: z.array(variantSchema).min(1, 'Cadastre pelo menos uma variação (tamanho/cor) para o produto'),
});

export async function GET(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const brandId = searchParams.get('brandId') || '';
    const gender = searchParams.get('gender') || '';
    const status = searchParams.get('status') || '';

    const where: any = {
      storeId: session.storeId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
        {
          variants: {
            some: {
              OR: [
                { sku: { contains: search } },
                { barcode: { contains: search } },
                { color: { contains: search } },
                { size: { contains: search } },
              ],
            },
          },
        },
      ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (gender) where.gender = gender;
    if (status === 'ativo') where.isActive = true;
    if (status === 'inativo') where.isActive = false;

    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        variants: {
          include: {
            stock: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcula estoque consolidado e dados adicionais
    const formattedProducts = products.map((p) => {
      const totalStock = p.variants.reduce((acc, v) => acc + (v.stock?.quantity || 0), 0);
      const totalReserved = p.variants.reduce((acc, v) => acc + (v.stock?.reservedQuantity || 0), 0);
      const availableStock = totalStock - totalReserved;
      const isLowStock = totalStock <= (p.minStock ?? 5);

      return {
        ...p,
        totalStock,
        totalReserved,
        availableStock,
        isLowStock,
        variantsCount: p.variants.length,
      };
    });

    return NextResponse.json({ products: formattedProducts });
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    return NextResponse.json({ error: 'Erro ao buscar catálogo de produtos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const result = productSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const data = result.data;

    // Verifica unicidade de SKU Base na loja
    const existingSku = await prisma.product.findUnique({
      where: {
        storeId_sku: {
          storeId: session.storeId,
          sku: data.sku,
        },
      },
    });

    if (existingSku) {
      return NextResponse.json({ error: `O SKU base '${data.sku}' já está em uso.` }, { status: 400 });
    }

    // Gera slug amigável
    const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;

    // Transação Atômica: Produto + Variações + Estoque + Movimentação Inicial
    const createdProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          storeId: session.storeId,
          name: data.name,
          sku: data.sku,
          slug,
          barcode: data.barcode || null,
          description: data.description || null,
          imageUrl: data.imageUrl || null,
          categoryId: data.categoryId || null,
          brandId: data.brandId || null,
          gender: data.gender || null,
          ageGroup: data.ageGroup || null,
          costPrice: data.costPrice,
          sellPrice: data.sellPrice,
          minStock: data.minStock,
          showInOnline: data.showInOnline,
          isActive: data.isActive,
        },
      });

      for (const variant of data.variants) {
        const createdVariant = await tx.productVariant.create({
          data: {
            productId: product.id,
            size: variant.size,
            color: variant.color,
            colorHex: variant.colorHex || null,
            sku: variant.sku,
            barcode: variant.barcode || null,
            costPrice: variant.costPrice ?? null,
            sellPrice: variant.sellPrice ?? null,
            isActive: variant.isActive,
            stock: {
              create: {
                quantity: variant.initialStock,
                reservedQuantity: 0,
              },
            },
          },
        });

        // Se houver estoque inicial, registra a movimentação de entrada
        if (variant.initialStock > 0) {
          await tx.stockMovement.create({
            data: {
              variantId: createdVariant.id,
              userId: session.userId,
              type: 'ENTRADA',
              quantity: variant.initialStock,
              previousStock: 0,
              newStock: variant.initialStock,
              reason: 'Saldo inicial no cadastro de produto',
              referenceId: product.id,
            },
          });
        }
      }

      return product;
    });

    // Registra Auditoria
    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'CRIACAO_PRODUTO',
      entity: 'Product',
      entityId: createdProduct.id,
      newValue: {
        name: createdProduct.name,
        sku: createdProduct.sku,
        sellPrice: createdProduct.sellPrice,
        variantsCount: data.variants.length,
      },
    });

    return NextResponse.json({ success: true, product: createdProduct });
  } catch (error: any) {
    console.error('Erro ao cadastrar produto:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Um dos SKUs ou Códigos de Barras das variações já existe.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno ao salvar produto e variações.' }, { status: 500 });
  }
}

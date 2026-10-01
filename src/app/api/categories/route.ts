import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(2, 'O nome da categoria é obrigatório'),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      where: { storeId: session.storeId },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const result = categorySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { name, description, imageUrl, isActive } = result.data;
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existing = await prisma.category.findUnique({
      where: {
        storeId_slug: {
          storeId: session.storeId,
          slug,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Já existe uma categoria com este nome.' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        storeId: session.storeId,
        name,
        slug,
        description,
        imageUrl,
        isActive,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar categoria' }, { status: 500 });
  }
}

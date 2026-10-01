import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const brandSchema = z.object({
  name: z.string().min(2, 'O nome da marca é obrigatório'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const brands = await prisma.brand.findMany({
      where: { storeId: session.storeId },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ brands });
  } catch (error) {
    console.error('Erro ao listar marcas:', error);
    return NextResponse.json({ error: 'Erro ao buscar marcas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const result = brandSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { name, description, isActive } = result.data;

    const brand = await prisma.brand.create({
      data: {
        storeId: session.storeId,
        name,
        description,
        isActive,
      },
    });

    return NextResponse.json({ success: true, brand });
  } catch (error) {
    console.error('Erro ao cadastrar marca:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar marca' }, { status: 500 });
  }
}

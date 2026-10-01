import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const DEFAULT_CATEGORIES = [
  { name: 'Fornecedores de Mercadorias', type: 'DESPESA' },
  { name: 'Aluguel & Condomínio', type: 'DESPESA' },
  { name: 'Energia, Água & Internet', type: 'DESPESA' },
  { name: 'Salários, Pró-Labore & Comissões', type: 'DESPESA' },
  { name: 'Impostos, Taxas & Tributos', type: 'DESPESA' },
  { name: 'Embalagens & Sacolas', type: 'DESPESA' },
  { name: 'Marketing & Publicidade', type: 'DESPESA' },
  { name: 'Manutenção & Material de Consumo', type: 'DESPESA' },
  { name: 'Tarifas Bancárias & Maquininhas', type: 'DESPESA' },
  { name: 'Vendas de Roupas & Acessórios', type: 'RECEITA' },
  { name: 'Vendas na Loja Online', type: 'RECEITA' },
  { name: 'Outras Receitas Operacionais', type: 'RECEITA' },
];

const categorySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  type: z.enum(['RECEITA', 'DESPESA']),
});

// GET: Listar Categorias Financeiras (auto-seeding se vazio)
export async function GET(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';

    let categories = await prisma.financialCategory.findMany({
      where: {
        storeId: session.storeId,
        ...(type ? { type } : {}),
      },
      orderBy: { name: 'asc' },
    });

    // Se a loja não possui nenhuma categoria cadastrada, inicializa o plano de contas padrão
    if (categories.length === 0 && !type) {
      await prisma.financialCategory.createMany({
        data: DEFAULT_CATEGORIES.map((cat) => ({
          storeId: session.storeId,
          name: cat.name,
          type: cat.type,
        })),
      });

      categories = await prisma.financialCategory.findMany({
        where: { storeId: session.storeId },
        orderBy: { name: 'asc' },
      });
    }

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error('Erro ao buscar categorias financeiras:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar categorias.' },
      { status: 500 }
    );
  }
}

// POST: Criar Categoria Financeira
export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const result = categorySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, type } = result.data;

    const category = await prisma.financialCategory.create({
      data: {
        storeId: session.storeId,
        name: name.trim(),
        type,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Categoria financeira criada com sucesso!',
      category,
    });
  } catch (error: any) {
    console.error('Erro ao criar categoria financeira:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar categoria.' },
      { status: 500 }
    );
  }
}

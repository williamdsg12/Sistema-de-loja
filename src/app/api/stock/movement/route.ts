import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { moveStock, StockMovementType } from '@/lib/stock';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const movementSchema = z.object({
  variantId: z.string().min(1, 'Selecione a variação do produto'),
  type: z.enum([
    'ENTRADA',
    'SAIDA_PDV',
    'SAIDA_ONLINE',
    'AJUSTE_INVENTARIO',
    'DEVOLUCAO',
    'PERDA',
    'TRANSFERENCIA',
  ]),
  quantity: z.number().int('A quantidade deve ser um número inteiro'),
  reason: z.string().min(3, 'Informe o motivo detalhado da movimentação'),
});

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const result = movementSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { variantId, type, quantity, reason } = result.data;

    // Verifica se a variação pertence à loja da sessão
    const variant = await prisma.productVariant.findFirst({
      where: {
        id: variantId,
        product: { storeId: session.storeId },
      },
      include: {
        product: true,
        stock: true,
      },
    });

    if (!variant) {
      return NextResponse.json({ error: 'Variação de produto não encontrada.' }, { status: 404 });
    }

    // Executa a movimentação com o motor de estoque
    const resultMovement = await moveStock({
      variantId,
      userId: session.userId,
      type: type as StockMovementType,
      quantity,
      reason,
    });

    // Registra na Trilha de Auditoria
    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: `MOVIMENTACAO_ESTOQUE_${type}`,
      entity: 'Stock',
      entityId: variantId,
      previousValue: { quantity: resultMovement.previousStock },
      newValue: {
        quantity: resultMovement.newStock,
        delta: resultMovement.delta,
        reason,
        product: variant.product.name,
        size: variant.size,
        color: variant.color,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Movimentação de estoque realizada com sucesso.',
      movement: resultMovement.movement,
      previousStock: resultMovement.previousStock,
      newStock: resultMovement.newStock,
    });
  } catch (error: any) {
    console.error('Erro na movimentação de estoque:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar movimentação de estoque.' },
      { status: 500 }
    );
  }
}

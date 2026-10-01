import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const inventoryItemSchema = z.object({
  variantId: z.string().min(1),
  countedStock: z.number().int().min(0),
});

const inventoryBatchSchema = z.object({
  items: z.array(inventoryItemSchema).min(1, 'Nenhum item informado para conciliação'),
  generalReason: z.string().min(3, 'Informe a justificativa do balanço'),
});

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const result = inventoryBatchSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { items, generalReason } = result.data;

    let adjustedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const stock = await tx.stock.findUnique({
          where: { variantId: item.variantId },
          include: {
            variant: {
              include: { product: true },
            },
          },
        });

        if (!stock || stock.variant.product.storeId !== session.storeId) {
          continue;
        }

        const previousStock = stock.quantity;
        const newStock = item.countedStock;
        const delta = newStock - previousStock;

        // Se houver divergência, aplica o ajuste e grava movimentação
        if (delta !== 0) {
          await tx.stock.update({
            where: { variantId: item.variantId },
            data: { quantity: newStock },
          });

          await tx.stockMovement.create({
            data: {
              variantId: item.variantId,
              userId: session.userId,
              type: 'AJUSTE_INVENTARIO',
              quantity: delta,
              previousStock,
              newStock,
              reason: `Balanço de Inventário: ${generalReason}`,
            },
          });

          adjustedCount++;
        }
      }
    });

    // Registra Auditoria
    await createAuditLog({
      storeId: session.storeId,
      userId: session.userId,
      userName: session.name,
      action: 'BALANCO_INVENTARIO_PROCESSADO',
      entity: 'Stock',
      entityId: session.storeId,
      newValue: {
        totalContados: items.length,
        totalAjustados: adjustedCount,
        justificativa: generalReason,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Balanço de inventário concluído. ${adjustedCount} variações tiveram seus saldos atualizados.`,
      adjustedCount,
    });
  } catch (error) {
    console.error('Erro ao processar inventário:', error);
    return NextResponse.json({ error: 'Erro ao processar ajuste de inventário.' }, { status: 500 });
  }
}

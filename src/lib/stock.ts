import { prisma } from './db';
import { Prisma } from '@prisma/client';

export type StockMovementType =
  | 'ENTRADA'
  | 'SAIDA_PDV'
  | 'SAIDA_ONLINE'
  | 'AJUSTE_INVENTARIO'
  | 'DEVOLUCAO'
  | 'PERDA'
  | 'TRANSFERENCIA';

export interface MoveStockParams {
  variantId: string;
  userId?: string | null;
  type: StockMovementType;
  quantity: number; // Quantidade absoluta ou com sinal
  reason: string;
  referenceId?: string | null;
  tx?: Prisma.TransactionClient; // Transação externa opcional
}

/**
 * Movimenta o estoque físico de uma variação com integridade ACID
 * e registra o histórico imutável em StockMovement.
 */
export async function moveStock({
  variantId,
  userId,
  type,
  quantity,
  reason,
  referenceId,
  tx,
}: MoveStockParams) {
  const runner = tx || prisma;

  // Busca o estoque atual da variação
  const stock = await runner.stock.findUnique({
    where: { variantId },
  });

  if (!stock) {
    throw new Error(`Registro de estoque não encontrado para a variação ${variantId}`);
  }

  const currentQuantity = stock.quantity;
  let delta = 0;

  // Determina se soma ou subtrai
  if (type === 'ENTRADA' || type === 'DEVOLUCAO') {
    delta = Math.abs(quantity);
  } else if (type === 'SAIDA_PDV' || type === 'SAIDA_ONLINE' || type === 'PERDA') {
    delta = -Math.abs(quantity);
  } else if (type === 'AJUSTE_INVENTARIO') {
    // Para ajuste direto: a quantidade informada é a nova quantidade absoluta
    delta = quantity - currentQuantity;
  }

  const newQuantity = currentQuantity + delta;

  if (newQuantity < 0 && (type === 'SAIDA_PDV' || type === 'SAIDA_ONLINE')) {
    throw new Error('Estoque insuficiente para realizar esta operação de saída.');
  }

  // 1. Atualiza o saldo físico
  await runner.stock.update({
    where: { variantId },
    data: {
      quantity: newQuantity,
    },
  });

  // 2. Cria o registro imutável no histórico
  const movement = await runner.stockMovement.create({
    data: {
      variantId,
      userId: userId || null,
      type,
      quantity: delta,
      previousStock: currentQuantity,
      newStock: newQuantity,
      reason,
      referenceId: referenceId || null,
    },
  });

  return { previousStock: currentQuantity, newStock: newQuantity, delta, movement };
}

/**
 * Reserva estoque temporariamente para um pedido online.
 */
export async function reserveStock(
  variantId: string,
  orderId: string,
  quantity: number,
  minutesToExpire = 30,
  tx?: Prisma.TransactionClient
) {
  const runner = tx || prisma;

  const stock = await runner.stock.findUnique({
    where: { variantId },
  });

  if (!stock) throw new Error('Estoque não encontrado');

  const available = stock.quantity - stock.reservedQuantity;
  if (available < quantity) {
    throw new Error(`Estoque disponível insuficiente (${available} un disponíveis)`);
  }

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + minutesToExpire);

  // Incrementa quantidade reservada
  await runner.stock.update({
    where: { variantId },
    data: {
      reservedQuantity: stock.reservedQuantity + quantity,
    },
  });

  // Cria registro da reserva
  const reservation = await runner.stockReservation.create({
    data: {
      variantId,
      orderId,
      quantity,
      expiresAt,
    },
  });

  return reservation;
}

/**
 * Libera a reserva quando um pedido online for cancelado.
 */
export async function releaseReservation(
  reservationId: string,
  tx?: Prisma.TransactionClient
) {
  const runner = tx || prisma;

  const reservation = await runner.stockReservation.findUnique({
    where: { id: reservationId },
  });

  if (!reservation) return;

  const stock = await runner.stock.findUnique({
    where: { variantId: reservation.variantId },
  });

  if (stock) {
    await runner.stock.update({
      where: { variantId: reservation.variantId },
      data: {
        reservedQuantity: Math.max(0, stock.reservedQuantity - reservation.quantity),
      },
    });
  }

  await runner.stockReservation.delete({
    where: { id: reservationId },
  });
}

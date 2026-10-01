import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // 1. Sincronização Inteligente de Alertas do Sistema
    // 1.1 Verifica se há produtos com estoque zerado ou crítico
    const criticalVariants = await prisma.productVariant.findMany({
      where: {
        product: { storeId: session.storeId, isActive: true },
        stock: { quantity: { lte: 2 } },
      },
      include: { product: true, stock: true },
      take: 5,
    });

    for (const v of criticalVariants) {
      const exists = await prisma.notification.findFirst({
        where: {
          storeId: session.storeId,
          type: 'ALERTA_ESTOQUE',
          linkUrl: '/estoque',
          message: { contains: v.sku },
        },
      });

      if (!exists) {
        await prisma.notification.create({
          data: {
            storeId: session.storeId,
            title: 'Estoque Baixo / Crítico',
            message: `A peça "${v.product.name} (${v.size} - ${v.color})" SKU: ${v.sku} está com apenas ${v.stock?.quantity || 0} un em estoque.`,
            type: 'ALERTA_ESTOQUE',
            linkUrl: '/estoque',
          },
        });
      }
    }

    // 1.2 Verifica se há pedidos online novos pendentes
    const newOnlineOrdersCount = await prisma.order.count({
      where: {
        storeId: session.storeId,
        status: 'NOVO',
      },
    });

    if (newOnlineOrdersCount > 0) {
      const exists = await prisma.notification.findFirst({
        where: {
          storeId: session.storeId,
          type: 'NOVO_PEDIDO',
          isRead: false,
        },
      });

      if (!exists) {
        await prisma.notification.create({
          data: {
            storeId: session.storeId,
            title: 'Novo Pedido Online',
            message: `Você possui ${newOnlineOrdersCount} pedido(s) da Loja Virtual aguardando separação e atendimento.`,
            type: 'NOVO_PEDIDO',
            linkUrl: '/pedidos',
          },
        });
      }
    }

    // 2. Busca Notificações Recentes
    const notifications = await prisma.notification.findMany({
      where: { storeId: session.storeId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        storeId: session.storeId,
        isRead: false,
      },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Erro ao listar notificações:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar notificações.' },
      { status: 500 }
    );
  }
}

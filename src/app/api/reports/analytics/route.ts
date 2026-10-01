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
    const period = searchParams.get('period') || 'month'; // 'today', '7days', 'month', 'lastMonth', 'year', 'custom'
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (period === '7days') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (period === 'lastMonth') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else if (period === 'custom' && customStart && customEnd) {
      startDate = new Date(`${customStart}T00:00:00`);
      endDate = new Date(`${customEnd}T23:59:59`);
    } else {
      // Default: últimos 30 dias
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
    }

    // 1. Busca Vendas Físicas (PDV) concluídas no período
    const sales = await prisma.sale.findMany({
      where: {
        storeId: session.storeId,
        status: 'CONCLUIDA',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    category: true,
                    brand: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 2. Busca Pedidos Online concluídos no período
    const onlineOrders = await prisma.order.findMany({
      where: {
        storeId: session.storeId,
        status: { in: ['CONCLUIDO', 'ENVIADO'] },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    category: true,
                    brand: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 3. Consolidação de Métricas Gerais e KPIs
    let grossRevenue = 0;
    let discounts = 0;
    let netRevenue = 0;
    let totalCmv = 0;
    let totalPieces = 0;
    const totalTransactions = sales.length + onlineOrders.length;

    // Mapa para agregação de produtos (Curva ABC)
    const productAggregation: Record<
      string,
      {
        productId: string;
        name: string;
        sku: string;
        category: string;
        brand: string;
        gender: string;
        ageGroup: string;
        qtySold: number;
        revenue: number;
        cost: number;
      }
    > = {};

    // Mapa para agregação por Vendedor
    const sellerAggregation: Record<
      string,
      {
        userId: string;
        name: string;
        salesCount: number;
        itemsSold: number;
        revenue: number;
      }
    > = {};

    // Mapa por Marca
    const brandAggregation: Record<string, { name: string; qty: number; revenue: number }> = {};

    // Mapa por Categoria
    const categoryAggregation: Record<string, { name: string; qty: number; revenue: number }> = {};

    // Mapa por Faixa Etária
    const ageGroupAggregation: Record<string, { name: string; qty: number; revenue: number }> = {};

    // Mapa por Gênero
    const genderAggregation: Record<string, { name: string; qty: number; revenue: number }> = {};

    // 3.1 Processa Vendas Físicas
    sales.forEach((sale) => {
      grossRevenue += sale.subtotal;
      discounts += sale.discountAmount;
      netRevenue += sale.totalAmount;

      // Vendedor
      const sellerId = sale.userId;
      const sellerName = sale.user.name;
      if (!sellerAggregation[sellerId]) {
        sellerAggregation[sellerId] = {
          userId: sellerId,
          name: sellerName,
          salesCount: 0,
          itemsSold: 0,
          revenue: 0,
        };
      }
      sellerAggregation[sellerId].salesCount += 1;
      sellerAggregation[sellerId].revenue += sale.totalAmount;

      sale.items.forEach((item) => {
        totalPieces += item.quantity;
        sellerAggregation[sellerId].itemsSold += item.quantity;

        const prod = item.variant.product;
        const itemCost = (item.costPrice > 0 ? item.costPrice : (prod.costPrice || 0)) * item.quantity;
        totalCmv += itemCost;

        // Agregação de Produto
        const pId = prod.id;
        if (!productAggregation[pId]) {
          productAggregation[pId] = {
            productId: pId,
            name: prod.name,
            sku: prod.sku,
            category: prod.category?.name || 'Geral',
            brand: prod.brand?.name || 'Sem Marca',
            gender: prod.gender || 'Unissex',
            ageGroup: prod.ageGroup || 'Infantil',
            qtySold: 0,
            revenue: 0,
            cost: 0,
          };
        }
        productAggregation[pId].qtySold += item.quantity;
        productAggregation[pId].revenue += item.totalPrice;
        productAggregation[pId].cost += itemCost;

        // Marca
        const bName = prod.brand?.name || 'Sem Marca';
        if (!brandAggregation[bName]) brandAggregation[bName] = { name: bName, qty: 0, revenue: 0 };
        brandAggregation[bName].qty += item.quantity;
        brandAggregation[bName].revenue += item.totalPrice;

        // Categoria
        const cName = prod.category?.name || 'Geral';
        if (!categoryAggregation[cName]) categoryAggregation[cName] = { name: cName, qty: 0, revenue: 0 };
        categoryAggregation[cName].qty += item.quantity;
        categoryAggregation[cName].revenue += item.totalPrice;

        // Faixa Etária
        const aName = prod.ageGroup || 'Infantil';
        if (!ageGroupAggregation[aName]) ageGroupAggregation[aName] = { name: aName, qty: 0, revenue: 0 };
        ageGroupAggregation[aName].qty += item.quantity;
        ageGroupAggregation[aName].revenue += item.totalPrice;

        // Gênero
        const gName = prod.gender || 'Unissex';
        if (!genderAggregation[gName]) genderAggregation[gName] = { name: gName, qty: 0, revenue: 0 };
        genderAggregation[gName].qty += item.quantity;
        genderAggregation[gName].revenue += item.totalPrice;
      });
    });

    // 3.2 Processa Pedidos Online Concluídos
    onlineOrders.forEach((order) => {
      grossRevenue += order.subtotal;
      discounts += order.discountAmount;
      netRevenue += order.totalAmount;

      order.items.forEach((item) => {
        totalPieces += item.quantity;
        const prod = item.variant.product;
        const itemCost = (prod.costPrice || 0) * item.quantity;
        totalCmv += itemCost;

        const pId = prod.id;
        if (!productAggregation[pId]) {
          productAggregation[pId] = {
            productId: pId,
            name: prod.name,
            sku: prod.sku,
            category: prod.category?.name || 'Geral',
            brand: prod.brand?.name || 'Sem Marca',
            gender: prod.gender || 'Unissex',
            ageGroup: prod.ageGroup || 'Infantil',
            qtySold: 0,
            revenue: 0,
            cost: 0,
          };
        }
        productAggregation[pId].qtySold += item.quantity;
        productAggregation[pId].revenue += item.totalPrice;
        productAggregation[pId].cost += itemCost;

        const bName = prod.brand?.name || 'Sem Marca';
        if (!brandAggregation[bName]) brandAggregation[bName] = { name: bName, qty: 0, revenue: 0 };
        brandAggregation[bName].qty += item.quantity;
        brandAggregation[bName].revenue += item.totalPrice;

        const cName = prod.category?.name || 'Geral';
        if (!categoryAggregation[cName]) categoryAggregation[cName] = { name: cName, qty: 0, revenue: 0 };
        categoryAggregation[cName].qty += item.quantity;
        categoryAggregation[cName].revenue += item.totalPrice;

        const aName = prod.ageGroup || 'Infantil';
        if (!ageGroupAggregation[aName]) ageGroupAggregation[aName] = { name: aName, qty: 0, revenue: 0 };
        ageGroupAggregation[aName].qty += item.quantity;
        ageGroupAggregation[aName].revenue += item.totalPrice;

        const gName = prod.gender || 'Unissex';
        if (!genderAggregation[gName]) genderAggregation[gName] = { name: gName, qty: 0, revenue: 0 };
        genderAggregation[gName].qty += item.quantity;
        genderAggregation[gName].revenue += item.totalPrice;
      });
    });

    // 4. Lucro Bruto e Margens
    const grossProfit = netRevenue - totalCmv;
    const profitMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
    const averageTicket = totalTransactions > 0 ? netRevenue / totalTransactions : 0;
    const itemsPerSale = totalTransactions > 0 ? totalPieces / totalTransactions : 0;

    // 5. Construção da Curva ABC de Produtos (Princípio de Pareto)
    const productList = Object.values(productAggregation).sort((a, b) => b.revenue - a.revenue);
    let cumulativeSum = 0;
    const totalCatalogRevenue = productList.reduce((acc, p) => acc + p.revenue, 0);

    const curvaABC = productList.map((p) => {
      const profit = p.revenue - p.cost;
      const margin = p.revenue > 0 ? (profit / p.revenue) * 100 : 0;
      const share = totalCatalogRevenue > 0 ? (p.revenue / totalCatalogRevenue) * 100 : 0;

      cumulativeSum += p.revenue;
      const cumulativePercent = totalCatalogRevenue > 0 ? (cumulativeSum / totalCatalogRevenue) * 100 : 100;

      let classification: 'A' | 'B' | 'C' = 'C';
      if (cumulativePercent <= 70 || (cumulativePercent > 70 && cumulativeSum - p.revenue <= totalCatalogRevenue * 0.7)) {
        classification = 'A';
      } else if (cumulativePercent <= 90 || (cumulativePercent > 90 && cumulativeSum - p.revenue <= totalCatalogRevenue * 0.9)) {
        classification = 'B';
      } else {
        classification = 'C';
      }

      return {
        ...p,
        profit,
        margin,
        share,
        cumulativePercent,
        classification,
      };
    });

    // 6. Ranking de Vendedores
    const sellersRanking = Object.values(sellerAggregation)
      .map((s) => ({
        ...s,
        averageTicket: s.salesCount > 0 ? s.revenue / s.salesCount : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // 7. Agrupamentos Ordenados
    const brandsRanking = Object.values(brandAggregation)
      .map((b) => ({
        ...b,
        share: netRevenue > 0 ? (b.revenue / netRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const categoriesRanking = Object.values(categoryAggregation)
      .map((c) => ({
        ...c,
        share: netRevenue > 0 ? (c.revenue / netRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const ageGroupsRanking = Object.values(ageGroupAggregation)
      .map((a) => ({
        ...a,
        share: netRevenue > 0 ? (a.revenue / netRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const gendersRanking = Object.values(genderAggregation)
      .map((g) => ({
        ...g,
        share: netRevenue > 0 ? (g.revenue / netRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // 8. Inteligência de Giro de Estoque & Alertas
    const allVariants = await prisma.productVariant.findMany({
      where: {
        product: { storeId: session.storeId, isActive: true },
      },
      include: {
        product: { select: { name: true, sku: true, minStock: true, costPrice: true, sellPrice: true } },
        stock: true,
      },
    });

    const soldVariantIds = new Set<string>();
    sales.forEach((s) => s.items.forEach((i) => soldVariantIds.add(i.variantId)));
    onlineOrders.forEach((o) => o.items.forEach((i) => soldVariantIds.add(i.variantId)));

    // Alerta 1: Estoque Parado (peças com estoque físico > 0 e 0 vendas no período)
    const stagnantStock = allVariants
      .filter((v) => (v.stock?.quantity || 0) > 0 && !soldVariantIds.has(v.id))
      .map((v) => ({
        variantId: v.id,
        productName: v.product.name,
        sku: v.sku,
        size: v.size,
        color: v.color,
        quantity: v.stock?.quantity || 0,
        costValue: (v.costPrice || v.product.costPrice || 0) * (v.stock?.quantity || 0),
        sellValue: (v.sellPrice || v.product.sellPrice || 0) * (v.stock?.quantity || 0),
      }))
      .sort((a, b) => b.costValue - a.costValue)
      .slice(0, 30);

    // Alerta 2: Risco de Ruptura (peças com estoque físico <= estoque mínimo configurado)
    const lowStockRisk = allVariants
      .filter((v) => (v.stock?.quantity || 0) <= v.product.minStock)
      .map((v) => ({
        variantId: v.id,
        productName: v.product.name,
        sku: v.sku,
        size: v.size,
        color: v.color,
        quantity: v.stock?.quantity || 0,
        minStock: v.product.minStock,
        status: (v.stock?.quantity || 0) === 0 ? 'ESGOTADO' : 'CRITICO',
      }))
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 30);

    return NextResponse.json({
      period: {
        type: period,
        startDate,
        endDate,
      },
      kpis: {
        grossRevenue,
        discounts,
        netRevenue,
        cmv: totalCmv,
        grossProfit,
        profitMargin,
        totalTransactions,
        totalPieces,
        averageTicket,
        itemsPerSale,
      },
      curvaABC,
      curvaABCSummary: {
        totalProducts: curvaABC.length,
        countClassA: curvaABC.filter((p) => p.classification === 'A').length,
        countClassB: curvaABC.filter((p) => p.classification === 'B').length,
        countClassC: curvaABC.filter((p) => p.classification === 'C').length,
      },
      sellersRanking,
      brandsRanking,
      categoriesRanking,
      ageGroupsRanking,
      gendersRanking,
      stagnantStock,
      lowStockRisk,
    });
  } catch (error: any) {
    console.error('Erro ao gerar relatório gerencial:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar dados analíticos.' },
      { status: 500 }
    );
  }
}

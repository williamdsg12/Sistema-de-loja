import { prisma } from './db';

async function testSprint2() {
  console.log('=== TESTE DE VALIDAÇÃO SPRINT 2: PRODUTOS, CATEGORIAS & MATRIZ TAMANHO X COR ===\n');

  try {
    // 1. Obter ou criar Loja padrão
    let store = await prisma.store.findFirst();
    if (!store) {
      store = await prisma.store.create({
        data: {
          name: 'Kids & Teens Boutique Matriz',
          tradeName: 'Kids & Teens Boutique',
          cnpj: '12.345.678/0001-90',
        },
      });
      console.log('✔ Loja inicializada:', store.name);
    }

    // 2. Criar Categoria Especializada de Moda Infantil
    let category = await prisma.category.findFirst({
      where: { name: 'Vestidos de Festa Infantil', storeId: store.id },
    });
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'Vestidos de Festa Infantil',
          slug: 'vestidos-de-festa-infantil',
          storeId: store.id,
        },
      });
    }
    console.log('✔ Categoria especializada validada:', category.name);

    // 3. Criar Marca Especializada
    let brand = await prisma.brand.findFirst({
      where: { name: 'Petit Chérie & Teens', storeId: store.id },
    });
    if (!brand) {
      brand = await prisma.brand.create({
        data: {
          name: 'Petit Chérie & Teens',
          description: 'Grife infantil de alta costura e vestidos de festa.',
          storeId: store.id,
        },
      });
    }
    console.log('✔ Marca especializada validada:', brand.name);

    // 4. Teste de Criação de Produto com Matriz Tamanho x Cor e Precificação
    const baseSku = `VEST-LUXO-${Date.now().toString().slice(-4)}`;
    const costPrice = 50.0;
    const sellPrice = 129.9;
    const profitMargin = ((sellPrice - costPrice) / sellPrice) * 100;
    const markup = ((sellPrice - costPrice) / costPrice) * 100;

    console.log(`\n--- Cálculo de Precificação ---`);
    console.log(`Preço de Custo: R$ ${costPrice.toFixed(2)}`);
    console.log(`Preço de Venda: R$ ${sellPrice.toFixed(2)}`);
    console.log(`Margem de Lucro Real: ${profitMargin.toFixed(2)}%`);
    console.log(`Markup sobre Custo: ${markup.toFixed(2)}%`);

    // Matriz de Variações: Tamanhos (4, 6, 8) x Cores (Rosa Bebê, Azul Marinho)
    const sizes = ['4', '6', '8'];
    const colors = [
      { name: 'Rosa Bebê', hex: '#FBCFE8', code: 'ROSA' },
      { name: 'Azul Marinho', hex: '#1E3A8A', code: 'AZUL' },
    ];

    const matrixVariants: any[] = [];
    let counter = 100;

    for (const s of sizes) {
      for (const c of colors) {
        counter++;
        matrixVariants.push({
          size: s,
          color: c.name,
          colorHex: c.hex,
          sku: `${baseSku}-${s}-${c.code}`,
          barcode: `789${Date.now().toString().slice(-7)}${counter}`,
          costPrice: costPrice,
          sellPrice: sellPrice,
          stockQty: 10,
        });
      }
    }

    console.log(`\n✔ Matriz gerada: ${matrixVariants.length} variações (${sizes.length} tamanhos x ${colors.length} cores)`);

    // 5. Persistência no SQLite em Transação
    const createdProduct = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.create({
        data: {
          name: 'Vestido Infantil Floral Festa com Laço',
          slug: `vestido-infantil-floral-festa-${Date.now()}`,
          sku: baseSku,
          barcode: `789${Date.now().toString().slice(-9)}`,
          description: 'Vestido confeccionado em microfibra acetinada e tule francês bordado.',
          gender: 'INFANTIL_MENINA',
          ageGroup: 'INFANTIL',
          costPrice,
          sellPrice,
          minStock: 6,
          showInOnline: true,
          isActive: true,
          storeId: store.id,
          categoryId: category.id,
          brandId: brand.id,
        },
      });

      for (const v of matrixVariants) {
        const variant = await tx.productVariant.create({
          data: {
            productId: prod.id,
            size: v.size,
            color: v.color,
            colorHex: v.colorHex,
            sku: v.sku,
            barcode: v.barcode,
            costPrice: v.costPrice,
            sellPrice: v.sellPrice,
            isActive: true,
          },
        });

        await tx.stock.create({
          data: {
            productVariantId: variant.id,
            quantity: v.stockQty,
            reservedQuantity: 0,
          },
        });
      }

      return prod;
    });

    console.log(`✔ Produto Criado com Sucesso! ID: ${createdProduct.id} | SKU Base: ${createdProduct.sku}`);

    // 6. Teste de Busca e Rastreamento por Código de Barras e SKU
    const sampleVariant = matrixVariants[0];
    const foundByBarcode = await prisma.productVariant.findFirst({
      where: { barcode: sampleVariant.barcode },
      include: {
        product: { include: { category: true, brand: true } },
        stock: true,
      },
    });

    if (!foundByBarcode) {
      throw new Error(`Falha ao localizar variação pelo código de barras: ${sampleVariant.barcode}`);
    }

    console.log(`\n✔ Rastreabilidade por Código de Barras Testada com Sucesso:`);
    console.log(`   - Código de Barras: ${foundByBarcode.barcode}`);
    console.log(`   - SKU da Variação: ${foundByBarcode.sku}`);
    console.log(`   - Produto: ${foundByBarcode.product.name} (Tam: ${foundByBarcode.size}, Cor: ${foundByBarcode.color})`);
    console.log(`   - Estoque Local: ${foundByBarcode.stock?.quantity} unidades`);
    console.log(`   - Preço de Venda: R$ ${foundByBarcode.sellPrice?.toFixed(2)}`);

    console.log('\n================================================================');
    console.log(' TODOS OS TESTES DA SPRINT 2 FORAM CONCLUÍDOS COM 100% DE SUCESSO! ');
    console.log('================================================================\n');
  } catch (error) {
    console.error('❌ Erro no teste da Sprint 2:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testSprint2();

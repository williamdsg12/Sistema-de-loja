import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Seed do Banco de Dados ---');

  // 1. Criar Loja Padrão
  const store = await prisma.store.upsert({
    where: { id: 'default-store-id' },
    update: {},
    create: {
      id: 'default-store-id',
      name: 'Pequenos & Cia Moda Infantil',
      tradeName: 'Pequenos & Cia',
      documentNumber: '12.345.678/0001-90',
      phone: '(11) 3456-7890',
      whatsapp: '(11) 98765-4321',
      email: 'contato@pequenosecia.com.br',
      address: 'Av. Paulista',
      number: '1000',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
      isConfigured: true,
      storeSettings: {
        create: {
          enablePdvDiscount: true,
          maxDiscountPercent: 15.0,
          requireCustomerOnSale: false,
          autoPrintReceipt: false,
        },
      },
      onlineStoreSettings: {
        create: {
          storeName: 'Pequenos & Cia Online',
          description: 'A melhor moda infantil e adolescente da web.',
          primaryColor: '#0f766e',
          secondaryColor: '#0d9488',
          whatsappNumber: '11987654321',
          allowPickup: true,
          allowDelivery: true,
        },
      },
    },
  });

  console.log('Loja criada:', store.name);

  // 2. Perfis de Acesso (Roles)
  const roles = [
    { name: 'ADMINISTRADOR', description: 'Acesso total irrestrito a todos os módulos do sistema' },
    { name: 'GERENTE', description: 'Gestão operacional, vendas, estoque, compras e relatórios' },
    { name: 'CAIXA', description: 'Operação de frente de caixa (PDV), abertura e fechamento' },
    { name: 'VENDEDOR', description: 'Realização de vendas no PDV e consulta de estoque/clientes' },
    { name: 'ESTOQUISTA', description: 'Entrada de mercadorias, movimentações e inventário' },
  ];

  const createdRoles: Record<string, any> = {};

  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: {
        name: r.name,
        description: r.description,
        isSystem: true,
      },
    });
    createdRoles[r.name] = role;
  }

  console.log('Perfis criados:', Object.keys(createdRoles).length);

  // 3. Permissões
  const permissionsList = [
    // Vendas & PDV
    { code: 'pdv.access', name: 'Acessar Frente de Caixa (PDV)', category: 'VENDAS' },
    { code: 'pdv.discount', name: 'Aplicar Descontos no PDV', category: 'VENDAS' },
    { code: 'sales.view', name: 'Visualizar Histórico de Vendas', category: 'VENDAS' },
    { code: 'sales.cancel', name: 'Cancelar Vendas Realizadas', category: 'VENDAS' },
    // Produtos & Catálogo
    { code: 'products.view', name: 'Visualizar Catálogo de Produtos', category: 'PRODUTOS' },
    { code: 'products.create', name: 'Cadastrar Novos Produtos', category: 'PRODUTOS' },
    { code: 'products.edit', name: 'Editar Produtos e Preços', category: 'PRODUTOS' },
    { code: 'products.delete', name: 'Excluir/Inativar Produtos', category: 'PRODUTOS' },
    // Estoque
    { code: 'stock.view', name: 'Consultar Níveis de Estoque', category: 'ESTOQUE' },
    { code: 'stock.movement', name: 'Realizar Entradas e Saídas Manuais', category: 'ESTOQUE' },
    { code: 'stock.inventory', name: 'Realizar Ajustes de Inventário', category: 'ESTOQUE' },
    // Caixa
    { code: 'cash.open_close', name: 'Abrir e Fechar Caixa', category: 'CAIXA' },
    { code: 'cash.bleed', name: 'Realizar Sangria e Suprimento', category: 'CAIXA' },
    // Financeiro
    { code: 'finance.view', name: 'Visualizar Contas a Pagar/Receber', category: 'FINANCEIRO' },
    { code: 'finance.manage', name: 'Baixar e Criar Lançamentos Financeiros', category: 'FINANCEIRO' },
    // Usuários e Configurações
    { code: 'users.manage', name: 'Gerenciar Usuários e Permissões', category: 'SISTEMA' },
    { code: 'settings.manage', name: 'Alterar Configurações da Loja', category: 'SISTEMA' },
  ];

  for (const p of permissionsList) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, category: p.category },
      create: {
        code: p.code,
        name: p.name,
        category: p.category,
      },
    });

    // Vincular todas ao Administrador
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: createdRoles['ADMINISTRADOR'].id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: createdRoles['ADMINISTRADOR'].id,
        permissionId: perm.id,
      },
    });
  }

  // 4. Usuário Administrador Inicial
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin123', salt);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash,
      roleId: createdRoles['ADMINISTRADOR'].id,
      storeId: store.id,
    },
    create: {
      storeId: store.id,
      roleId: createdRoles['ADMINISTRADOR'].id,
      name: 'Administrador do Sistema',
      username: 'admin',
      email: 'admin@pequenosecia.com.br',
      passwordHash,
      phone: '(11) 99999-8888',
      isActive: true,
    },
  });

  console.log('Usuário Admin criado: admin / admin123 (email: admin@pequenosecia.com.br)');

  // 5. Categorias e Marcas Exemplo
  const cat1 = await prisma.category.upsert({
    where: { storeId_slug: { storeId: store.id, slug: 'conjuntos-infantis' } },
    update: {},
    create: {
      storeId: store.id,
      name: 'Conjuntos Infantis',
      slug: 'conjuntos-infantis',
      description: 'Conjuntos confortáveis para o dia a dia e festas',
    },
  });

  const cat2 = await prisma.category.upsert({
    where: { storeId_slug: { storeId: store.id, slug: 'vestidos-e-saias' } },
    update: {},
    create: {
      storeId: store.id,
      name: 'Vestidos & Saias',
      slug: 'vestidos-e-saias',
      description: 'Vestidos casuais e de gala infantil e teen',
    },
  });

  const cat3 = await prisma.category.upsert({
    where: { storeId_slug: { storeId: store.id, slug: 'camisetas-e-polos' } },
    update: {},
    create: {
      storeId: store.id,
      name: 'Camisetas & Polos',
      slug: 'camisetas-e-polos',
      description: 'Camisetas 100% algodão para meninos e meninas',
    },
  });

  const brand1 = await prisma.brand.create({
    data: {
      storeId: store.id,
      name: 'Malu Kids',
      description: 'Moda infantil sustentável e confortável',
    },
  });

  // 6. Categorias Financeiras Iniciais
  await prisma.financialCategory.createMany({
    data: [
      { storeId: store.id, name: 'Venda de Mercadorias', type: 'RECEITA' },
      { storeId: store.id, name: 'Fornecedores de Roupas', type: 'DESPESA' },
      { storeId: store.id, name: 'Aluguel e Condomínio', type: 'DESPESA' },
      { storeId: store.id, name: 'Energia, Água e Internet', type: 'DESPESA' },
      { storeId: store.id, name: 'Salários e Comissões', type: 'DESPESA' },
      { storeId: store.id, name: 'Marketing e Banners', type: 'DESPESA' },
    ],
  });

  console.log('--- Seed Concluído com Sucesso! ---');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

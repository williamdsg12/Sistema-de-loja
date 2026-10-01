export type PlanoTipo = 'gratis' | 'premium' | 'fiscal';

export interface PlanoInfo {
  id: PlanoTipo;
  nome: string;
  badge: string;
  preco: string;
  periodo: string;
  descricao: string;
  destaque?: boolean;
  corBadge: string;
  corGradiente: string;
  recursos: string[];
}

export const PLANOS_INFO: Record<PlanoTipo, PlanoInfo> = {
  gratis: {
    id: 'gratis',
    nome: 'Plano Grátis',
    badge: 'Básico',
    preco: 'R$ 0',
    periodo: 'sempre gratuito',
    descricao: 'Ideal para quem está começando e precisa de um PDV simples e ágil.',
    corBadge: 'bg-slate-100 text-slate-700 border-slate-300',
    corGradiente: 'from-slate-700 to-slate-900',
    recursos: [
      'PDV de Balcão (Nova Venda)',
      'Cadastro de Produtos e Clientes',
      'Controle de Estoque e Compras',
      'Abertura e Fechamento de Caixa',
      'Trocas e Devoluções',
      'Catálogo Online (Vitrine Básica)',
      'Relatórios Básicos de Vendas'
    ]
  },
  premium: {
    id: 'premium',
    nome: 'Plano Premium',
    badge: 'Recomendado ⭐',
    preco: 'R$ 79,90',
    periodo: '/mês',
    descricao: 'Para lojas que querem vender sob encomenda, gerir financeiro e delivery.',
    destaque: true,
    corBadge: 'bg-amber-100 text-amber-800 border-amber-300',
    corGradiente: 'from-amber-500 to-orange-600',
    recursos: [
      'Tudo do Plano Grátis',
      'Vendas por Pedidos (Delivery / Encomendas)',
      'Geração e Gestão de Orçamentos',
      'Módulo Contas a Pagar Completo',
      'Pedidos pelo Catálogo Online no PDV',
      'Relatório de Lucro Estimado e Margem Real',
      'Controle de Fiado e Crédito em Conta',
      'Etiquetas com Código de Barras'
    ]
  },
  fiscal: {
    id: 'fiscal',
    nome: 'Plano Fiscal',
    badge: 'Completo 🛡️',
    preco: 'R$ 149,90',
    periodo: '/mês',
    descricao: 'Emissão fiscal ilimitada e automação para empresas em crescimento.',
    corBadge: 'bg-purple-100 text-purple-800 border-purple-300',
    corGradiente: 'from-purple-600 to-indigo-700',
    recursos: [
      'Tudo do Plano Premium',
      'Emissão de NFC-e (Consumidor Final)',
      'Emissão de NF-e Modelo 55 (Revenda / PJ)',
      'Inutilização de Numeração de NF',
      'Exportação SPED Fiscal & Sintegra',
      'Importação de XML de Fornecedores',
      'Estrutura Pronta para TEF (Maquininha)'
    ]
  }
};

/**
 * Mapeamento central de permissões de acesso por funcionalidade.
 */
export const RECURSOS_PERMISSOES: Record<string, { planosPermitidos: PlanoTipo[]; nomeAmigavel: string; planoMinimo: PlanoTipo }> = {
  venda_pedidos: {
    planosPermitidos: ['premium', 'fiscal'],
    nomeAmigavel: 'Venda por Pedidos & Delivery',
    planoMinimo: 'premium'
  },
  venda_orcamentos: {
    planosPermitidos: ['premium', 'fiscal'],
    nomeAmigavel: 'Novo Orçamento & Cotações',
    planoMinimo: 'premium'
  },
  contas_pagar: {
    planosPermitidos: ['premium', 'fiscal'],
    nomeAmigavel: 'Contas a Pagar & Despesas',
    planoMinimo: 'premium'
  },
  pedidos_catalogo: {
    planosPermitidos: ['premium', 'fiscal'],
    nomeAmigavel: 'Recebimento de Pedidos do Catálogo Online',
    planoMinimo: 'premium'
  },
  relatorios_lucro: {
    planosPermitidos: ['premium', 'fiscal'],
    nomeAmigavel: 'Relatório de Lucro Estimado e Margem',
    planoMinimo: 'premium'
  },
  nota_fiscal: {
    planosPermitidos: ['fiscal'],
    nomeAmigavel: 'Módulo de Nota Fiscal (NFC-e & NF-e)',
    planoMinimo: 'fiscal'
  },
  tef: {
    planosPermitidos: ['fiscal'],
    nomeAmigavel: 'Integração TEF (Transferência Eletrônica de Fundos)',
    planoMinimo: 'fiscal'
  },
  sped: {
    planosPermitidos: ['fiscal'],
    nomeAmigavel: 'Exportação SPED Fiscal & Sintegra',
    planoMinimo: 'fiscal'
  },
  importacao_xml: {
    planosPermitidos: ['fiscal'],
    nomeAmigavel: 'Importação de XML de Fornecedores',
    planoMinimo: 'fiscal'
  }
};

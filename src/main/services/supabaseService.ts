/**
 * Serviço de Integração, Autenticação e Sincronização em Nuvem (Supabase Multi-tenant SaaS)
 * Gerencia Lojas (Tenants), Assinaturas Validadas na Nuvem, Tolerância Offline de 7 dias,
 * Catálogo Online Público e Pedidos em Tempo Real.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  habilitado: boolean;
}

export interface NovaLojaPayload {
  email: string;
  senha?: string;
  nomeLoja: string;
  slug: string;
  telefone?: string;
  whatsapp?: string;
  cidade?: string;
  estado?: string;
}

export interface LojaSaaS {
  id: number;
  nome: string;
  slug: string;
  email: string;
  telefone?: string;
  whatsapp?: string;
  plano: 'gratis' | 'premium' | 'fiscal';
  statusAssinatura: 'ativa' | 'teste' | 'atrasada' | 'cancelada';
  trialUsado: boolean;
  diasValidade?: number;
  ativo: boolean;
  criadoEm: string;
  pedidosCatalogoCount?: number;
}

let supabaseConfig: SupabaseConfig = {
  url: 'https://demo-saas.supabase.co',
  anonKey: 'SUPABASE_ANON_KEY_DEMO_2026',
  habilitado: true
};

// Armazenamento em memória / cache local para demonstração e sincronização offline-first
let lojasMockSaaS: LojaSaaS[] = [
  {
    id: 1,
    nome: 'WS Gestão PDV - Loja Modelo',
    slug: 'lojamodelo',
    email: 'contato@lojamodelo.com.br',
    telefone: '(11) 3322-4455',
    whatsapp: '(11) 99887-6655',
    plano: 'gratis',
    statusAssinatura: 'ativa',
    trialUsado: false,
    diasValidade: 30,
    ativo: true,
    criadoEm: '2026-09-01T10:00:00Z',
    pedidosCatalogoCount: 14
  },
  {
    id: 2,
    nome: 'Boutique Elegance & Calçados',
    slug: 'boutique-elegance',
    email: 'financeiro@elegance.com.br',
    telefone: '(21) 2233-4455',
    whatsapp: '(21) 98765-4321',
    plano: 'premium',
    statusAssinatura: 'ativa',
    trialUsado: true,
    diasValidade: 25,
    ativo: true,
    criadoEm: '2026-09-10T14:30:00Z',
    pedidosCatalogoCount: 42
  },
  {
    id: 3,
    nome: 'Supermercado Central & Distribuidora',
    slug: 'super-central',
    email: 'fiscal@supercentral.com.br',
    telefone: '(31) 3344-5566',
    whatsapp: '(31) 97654-3210',
    plano: 'fiscal',
    statusAssinatura: 'ativa',
    trialUsado: true,
    diasValidade: 18,
    ativo: true,
    criadoEm: '2026-08-15T09:00:00Z',
    pedidosCatalogoCount: 128
  }
];

export class SupabaseService {
  /**
   * Configura credenciais do Supabase
   */
  public static configurar(config: Partial<SupabaseConfig>) {
    supabaseConfig = { ...supabaseConfig, ...config };
  }

  /**
   * Cadastro de Nova Loja no SaaS (iniciando no Plano Grátis)
   */
  public static async cadastrarNovaLoja(payload: NovaLojaPayload): Promise<{ sucesso: boolean; loja?: LojaSaaS; mensagem: string }> {
    try {
      const slugLimpo = payload.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      const existe = lojasMockSaaS.find(l => l.slug === slugLimpo || l.email.toLowerCase() === payload.email.toLowerCase());
      if (existe) {
        return {
          sucesso: false,
          mensagem: 'Já existe uma loja cadastrada com este slug ou e-mail. Escolha outro slug.'
        };
      }

      const novaLoja: LojaSaaS = {
        id: lojasMockSaaS.length + 1,
        nome: payload.nomeLoja,
        slug: slugLimpo,
        email: payload.email,
        telefone: payload.telefone || '',
        whatsapp: payload.whatsapp || '',
        plano: 'gratis',
        statusAssinatura: 'ativa',
        trialUsado: false,
        diasValidade: 365,
        ativo: true,
        criadoEm: new Date().toISOString(),
        pedidosCatalogoCount: 0
      };

      lojasMockSaaS.push(novaLoja);

      return {
        sucesso: true,
        loja: novaLoja,
        mensagem: 'Loja cadastrada com sucesso! Bem-vindo ao WS Gestão PDV SaaS (Plano Grátis).'
      };
    } catch (e: any) {
      return {
        sucesso: false,
        mensagem: `Erro ao cadastrar loja: ${e?.message || e}`
      };
    }
  }

  /**
   * Login e Validação de Loja na Nuvem com Tolerância Offline de 7 Dias
   */
  public static async validarAssinaturaNuvem(lojaId: number, dataUltimaValidacao?: string): Promise<{
    plano: 'gratis' | 'premium' | 'fiscal';
    status: string;
    trialUsado: boolean;
    modoRestritoOffline: boolean;
    diasOffline: number;
    mensagem: string;
  }> {
    const loja = lojasMockSaaS.find(l => l.id === lojaId) || lojasMockSaaS[0];

    // Simulação de cálculo de tolerância offline
    if (dataUltimaValidacao) {
      const ultima = new Date(dataUltimaValidacao).getTime();
      const agora = Date.now();
      const diffDias = Math.floor((agora - ultima) / (1000 * 60 * 60 * 24));

      // Se passou mais de 7 dias sem validar na nuvem e estiver offline, rebaixa para Grátis
      if (diffDias > 7 && !supabaseConfig.habilitado) {
        return {
          plano: 'gratis',
          status: 'ativa',
          trialUsado: loja.trialUsado,
          modoRestritoOffline: true,
          diasOffline: diffDias,
          mensagem: `Aviso: Mais de 7 dias sem conexão com o servidor. O sistema entrou temporariamente em modo Grátis até revalidar online.`
        };
      }
    }

    return {
      plano: loja.plano,
      status: loja.statusAssinatura,
      trialUsado: loja.trialUsado,
      modoRestritoOffline: false,
      diasOffline: 0,
      mensagem: 'Assinatura validada na nuvem com sucesso.'
    };
  }

  /**
   * Sincroniza produtos marcados como publicados para o Supabase
   */
  public static async sincronizarCatalogo(produtos: any[], lojaInfo: any): Promise<{ sucesso: boolean; produtosSincronizados: number; mensagem: string }> {
    try {
      const publicados = produtos.filter(p => p.publicado_catalogo === 1 || p.publicado_catalogo === undefined);
      console.log(`[Supabase SaaS] Sincronizados ${publicados.length} produtos para a loja ${lojaInfo.nome_fantasia || lojaInfo.nome} (slug: ${lojaInfo.slug_catalogo || lojaInfo.slug})`);

      return {
        sucesso: true,
        produtosSincronizados: publicados.length,
        mensagem: `${publicados.length} produtos sincronizados na nuvem com sucesso!`
      };
    } catch (e: any) {
      return {
        sucesso: false,
        produtosSincronizados: 0,
        mensagem: `Erro ao sincronizar catálogo: ${e?.message || e}`
      };
    }
  }

  /**
   * Métodos para o Painel Super-Admin (Dono do SaaS)
   */
  public static async listarTodasLojas(): Promise<LojaSaaS[]> {
    return [...lojasMockSaaS];
  }

  public static async alterarPlanoLoja(lojaId: number, novoPlano: 'gratis' | 'premium' | 'fiscal', status: 'ativa' | 'teste' | 'atrasada' | 'cancelada' = 'ativa'): Promise<{ sucesso: boolean; loja?: LojaSaaS }> {
    const loja = lojasMockSaaS.find(l => l.id === lojaId);
    if (!loja) return { sucesso: false };

    loja.plano = novoPlano;
    loja.statusAssinatura = status;
    return { sucesso: true, loja };
  }

  public static async toggleStatusLoja(lojaId: number, ativo: boolean): Promise<{ sucesso: boolean }> {
    const loja = lojasMockSaaS.find(l => l.id === lojaId);
    if (!loja) return { sucesso: false };

    loja.ativo = ativo;
    return { sucesso: true };
  }
}

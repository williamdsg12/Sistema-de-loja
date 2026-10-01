/**
 * Gateway de Assinatura e Cobrança Recorrente para o SaaS
 * Interface padrão compatível com Asaas, Mercado Pago, Stripe ou Mock.
 */

export interface DadosCriarAssinatura {
  lojaId: number;
  planoId: 'gratis' | 'premium' | 'fiscal';
  nomeLojista: string;
  email: string;
  cpfCnpj?: string;
  formaPagamento: 'pix' | 'cartao_credito' | 'boleto';
  tokenCartao?: string;
}

export interface RespostaAssinatura {
  sucesso: boolean;
  assinaturaId: string;
  status: 'ativa' | 'teste' | 'atrasada' | 'cancelada' | 'pendente';
  planoId: string;
  proximoVencimento?: string;
  linkPagamento?: string;
  qrcodePix?: string;
  mensagem: string;
}

export interface GatewayAssinatura {
  nome: string;
  criarAssinatura(dados: DadosCriarAssinatura): Promise<RespostaAssinatura>;
  consultarStatus(assinaturaId: string): Promise<RespostaAssinatura>;
  cancelarAssinatura(assinaturaId: string): Promise<RespostaAssinatura>;
  trocarPlano(assinaturaId: string, novoPlanoId: string): Promise<RespostaAssinatura>;
}

/**
 * Implementação Mock do Gateway de Assinatura (Simulação pronta para testes)
 */
export class MockGatewayAssinatura implements GatewayAssinatura {
  nome = 'Gateway Mock / Simulação Integrada';

  async criarAssinatura(dados: DadosCriarAssinatura): Promise<RespostaAssinatura> {
    const assinaturaId = `SUB-MOCK-${dados.lojaId}-${Date.now()}`;
    const hoje = new Date();
    const proximoVenc = new Date(hoje.setDate(hoje.getDate() + 30)).toISOString();

    return {
      sucesso: true,
      assinaturaId,
      status: 'ativa',
      planoId: dados.planoId,
      proximoVencimento: proximoVenc,
      linkPagamento: `https://checkout.nexpdv.com.br/pay/${assinaturaId}`,
      qrcodePix: `00020126580014BR.GOV.BCB.PIX0136mock-pix-${assinaturaId}520400005303986540549.905802BR5913NEXPDV SAAS6009SAO PAULO62070503***6304ABCD`,
      mensagem: `Assinatura do ${dados.planoId.toUpperCase()} ativada com sucesso!`
    };
  }

  async consultarStatus(assinaturaId: string): Promise<RespostaAssinatura> {
    return {
      sucesso: true,
      assinaturaId,
      status: 'ativa',
      planoId: 'premium',
      mensagem: 'Assinatura ativa e em dia.'
    };
  }

  async cancelarAssinatura(assinaturaId: string): Promise<RespostaAssinatura> {
    return {
      sucesso: true,
      assinaturaId,
      status: 'cancelada',
      planoId: 'gratis',
      mensagem: 'Assinatura cancelada com sucesso.'
    };
  }

  async trocarPlano(assinaturaId: string, novoPlanoId: string): Promise<RespostaAssinatura> {
    return {
      sucesso: true,
      assinaturaId,
      status: 'ativa',
      planoId: novoPlanoId,
      mensagem: `Plano alterado para ${novoPlanoId.toUpperCase()} com sucesso.`
    };
  }
}

/**
 * Gerenciador central de gateways
 */
export class GatewayManager {
  private gateway: GatewayAssinatura;

  constructor() {
    this.gateway = new MockGatewayAssinatura();
  }

  public setGateway(gateway: GatewayAssinatura) {
    this.gateway = gateway;
  }

  public getGateway(): GatewayAssinatura {
    return this.gateway;
  }
}

export const gatewayManager = new GatewayManager();

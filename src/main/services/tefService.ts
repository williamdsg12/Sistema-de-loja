/**
 * Módulo TEF (Transferência Eletrônica de Fundos)
 * Estrutura pronta para integração com SiTEF, Cappta, Stone ou PayGo.
 */

export interface RespostaTEF {
  sucesso: boolean;
  transacaoId: string;
  codigoAutorizacao?: string;
  nsu?: string;
  bandeira?: string;
  tipoCartao?: 'credito' | 'debito' | 'voucher';
  valor: number;
  mensagem: string;
  status: 'aprovado' | 'pendente' | 'negado' | 'cancelado';
  dataHora: string;
  comprovanteViaCliente?: string;
  comprovanteViaEstabelecimento?: string;
}

export interface SolicitacaoTEF {
  valor: number;
  tipoCartao: 'credito' | 'debito' | 'voucher';
  parcelas?: number;
  identificadorVenda: string;
}

export interface ProvedorTEF {
  nome: string;
  iniciarPagamento(solicitacao: SolicitacaoTEF): Promise<RespostaTEF>;
  consultarStatus(transacaoId: string): Promise<RespostaTEF>;
  cancelar(transacaoId: string): Promise<RespostaTEF>;
}

/**
 * Provedor Mock para testes e simulação de aprovação no PDV
 */
export class MockTEFProvider implements ProvedorTEF {
  nome = 'TEF Mock / Simulador Integrado';

  async iniciarPagamento(solicitacao: SolicitacaoTEF): Promise<RespostaTEF> {
    const transacaoId = `TEF-MOCK-${Date.now()}`;
    const nsu = Math.floor(100000 + Math.random() * 900000).toString();
    const codigoAutorizacao = Math.floor(100000 + Math.random() * 900000).toString();

    // Simula uma resposta de aprovação instantânea
    return {
      sucesso: true,
      transacaoId,
      codigoAutorizacao,
      nsu,
      bandeira: 'MASTERCARD',
      tipoCartao: solicitacao.tipoCartao,
      valor: solicitacao.valor,
      mensagem: 'TRANSACAO APROVADA COM SUCESSO',
      status: 'aprovado',
      dataHora: new Date().toISOString(),
      comprovanteViaCliente: `=== COMPROVANTE VIA CLIENTE ===\nNSU: ${nsu}\nAUTH: ${codigoAutorizacao}\nVALOR: R$ ${solicitacao.valor.toFixed(2)}\nAPROVADO`,
      comprovanteViaEstabelecimento: `=== COMPROVANTE ESTABELECIMENTO ===\nNSU: ${nsu}\nAUTH: ${codigoAutorizacao}\nVALOR: R$ ${solicitacao.valor.toFixed(2)}`
    };
  }

  async consultarStatus(transacaoId: string): Promise<RespostaTEF> {
    return {
      sucesso: true,
      transacaoId,
      valor: 0,
      mensagem: 'TRANSACAO LOCALIZADA E FINALIZADA',
      status: 'aprovado',
      dataHora: new Date().toISOString()
    };
  }

  async cancelar(transacaoId: string): Promise<RespostaTEF> {
    return {
      sucesso: true,
      transacaoId,
      valor: 0,
      mensagem: 'TRANSACAO ESTORNADA COM SUCESSO',
      status: 'cancelado',
      dataHora: new Date().toISOString()
    };
  }
}

export class TEFManager {
  private provedor: ProvedorTEF;

  constructor() {
    this.provedor = new MockTEFProvider();
  }

  public setProvedor(provedor: ProvedorTEF) {
    this.provedor = provedor;
  }

  public getProvedor(): ProvedorTEF {
    return this.provedor;
  }

  public async processarPagamento(solicitacao: SolicitacaoTEF): Promise<RespostaTEF> {
    return this.provedor.iniciarPagamento(solicitacao);
  }

  public async consultar(transacaoId: string): Promise<RespostaTEF> {
    return this.provedor.consultarStatus(transacaoId);
  }

  public async estornar(transacaoId: string): Promise<RespostaTEF> {
    return this.provedor.cancelar(transacaoId);
  }
}

export const tefManager = new TEFManager();

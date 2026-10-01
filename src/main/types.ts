export interface CrediarioConfig {
  id: number;
  loja_id: number;
  juros_mensal_percentual: number;
  multa_atraso_percentual: number;
  dias_carencia: number;
  max_parcelas: number;
  intervalo_dias_parcelas: number;
  dias_para_bloquear_cliente: number;
  exige_aprovacao_gerente_acima_do_limite: number;
  entrada_minima_percentual: number;
  msg_lembrete_dias_antes?: number;
  msg_atraso_1_dias?: number;
  msg_atraso_2_dias?: number;
  msg_atraso_3_dias?: number;
  regua_texto_lembrete?: string;
  regua_texto_atraso_1?: string;
  regua_texto_atraso_2?: string;
  regua_texto_atraso_3?: string;
}

export interface CrediarioContrato {
  id: number;
  loja_id: number;
  venda_id?: number;
  cliente_id: number;
  cliente_nome?: string;
  valor_total: number;
  valor_entrada: number;
  valor_financiado: number;
  qtd_parcelas: number;
  taxa_juros_mensal: number;
  total_com_juros: number;
  data_primeira_parcela: string;
  status: 'ativo' | 'quitado' | 'cancelado' | 'renegociado';
  usuario_id: number;
  aprovado_por_usuario_id?: number;
  motivo_aprovacao?: string;
  criado_em: string;
}

export interface CrediarioParcela {
  id: number;
  loja_id: number;
  contrato_id: number;
  numero_parcela: number;
  data_vencimento: string;
  valor_original: number;
  valor_pago: number;
  saldo_restante: number;
  status: 'pendente' | 'pago' | 'paga' | 'parcial' | 'atrasado' | 'atrasada' | 'aberta' | 'cancelado' | 'cancelada';
  data_pagamento?: string;
  dias_atraso?: number;
  juros_estimado?: number;
  multa_estimada?: number;
  cliente_id?: number;
  cliente_nome?: string;
  cliente_telefone?: string;
}

export interface CrediarioPagamento {
  id: number;
  loja_id: number;
  parcela_id: number;
  valor_pago: number;
  valor?: number;
  juros_cobrado: number;
  multa_cobrada: number;
  desconto: number;
  forma_pagamento: string;
  data_pagamento: string;
  caixa_sessao_id?: number;
  usuario_id: number;
  observacao?: string;
  estornado: number;
}

export interface CrediarioHistoricoCliente {
  cliente: {
    id: number;
    nome: string;
    cpf_cnpj?: string;
    telefone?: string;
    limite_credito: number;
    status_crediario: string;
  };
  limiteDisponivel: number;
  totalDevedor: number;
  totalAtrasado: number;
  qtdParcelasAtrasadas: number;
  contratos: CrediarioContrato[];
  parcelas: CrediarioParcela[];
  pagamentos: CrediarioPagamento[];
}

export interface SimulacaoCrediario {
  valorTotal?: number;
  valorFinanciado: number;
  valorEntrada: number;
  taxaJurosMensal: number;
  qtdParcelas: number;
  valorParcela: number;
  totalComJuros: number;
  totalJuros: number;
  parcelas: { numero: number; dataVencimento: string; valor: number }[];
}

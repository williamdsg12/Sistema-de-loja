export interface Usuario {
  id: number;
  nome: string;
  login: string;
  perfil: 'admin' | 'gerente' | 'vendedor';
  ativo: number;
  criado_em: string;
}

export interface Fornecedor {
  id: number;
  nome: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  criado_em: string;
}

export interface Cliente {
  id: number;
  loja_id?: number;
  nome: string;
  cpf_cnpj?: string;
  cpf?: string;
  telefone?: string;
  telefone_whatsapp?: string;
  email?: string;
  endereco?: string;
  endereco_completo?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  limite_credito?: number;
  status_crediario?: 'ativo' | 'bloqueado';
  referencia_nome?: string;
  referencia_telefone?: string;
  saldo_credito?: number;
  saldo_devedor?: number;
  criado_em: string;
}

export interface Produto {
  id: number;
  codigo?: string;
  codigo_extra?: string;
  ean_gtin?: string;
  nome: string;
  descricao?: string;
  categoria?: string;
  subcategoria?: string;
  marca?: string;
  peso_liquido?: number;
  peso_bruto?: number;
  localizacao?: string;
  unidade_medida: string;
  tamanho?: string;
  cor?: string;
  imagem_url?: string;
  preco_custo: number;
  preco_venda: number;
  preco_venda_automatico?: number;
  preco_alteravel_venda?: number;
  controlar_estoque?: number;
  estoque_atual: number;
  estoque_minimo: number;
  estoque_maximo: number;
  permite_fracionamento?: number;
  observacao?: string;
  is_kit?: number;
  kit_itens?: string;
  ncm?: string;
  cest?: string;
  cfop?: string;
  origem?: number;
  csosn_cst?: string;
  aliquota_icms?: number;
  aliquota_pis?: number;
  aliquota_cofins?: number;
  codigo_fornecedor?: string;
  comissao_percentual?: number;
  pontos_fidelidade?: number;
  lote?: string;
  data_fabricacao?: string;
  data_validade?: string;
  dias_aviso_vencimento?: number;
  fornecedor_id?: number;
  fornecedor_nome?: string;
  publicado_catalogo?: number;
  descricao_catalogo?: string;
  ativo: number;
  criado_em: string;
}

export interface CaixaSessao {
  id: number;
  usuario_id: number;
  usuario_nome?: string;
  data_abertura: string;
  valor_abertura: number;
  data_fechamento?: string;
  valor_fechamento_informado?: number;
  valor_fechamento_sistema?: number;
  diferenca?: number;
  status: 'aberto' | 'fechado';
}

export interface ResumoFechamentoCaixa {
  caixa_id: number;
  valor_abertura: number;
  total_vendas: number;
  vendas_por_forma: { [forma: string]: number };
  total_sistema: number;
  qtd_vendas: number;
}

export interface ItemVendaCarrinho {
  produto_id: number;
  produto_nome: string;
  produto_codigo?: string;
  unidade_medida: string;
  tamanho?: string;
  cor?: string;
  imagem_url?: string;
  quantidade: number;
  preco_unitario: number;
  desconto_unitario?: number;
  subtotal: number;
  estoque_atual: number;
}

export interface Venda {
  id: number;
  cliente_id?: number;
  cliente_nome?: string;
  usuario_id: number;
  usuario_nome?: string;
  caixa_sessao_id: number;
  tipo_operacao: 'venda' | 'pedido' | 'orcamento' | 'devolucao';
  status_pedido?: 'concluida' | 'aberto' | 'em_separacao' | 'entregue' | 'cancelado' | 'orcamento';
  data_venda: string;
  subtotal: number;
  desconto: number;
  total: number;
  forma_pagamento: string;
  valor_pago?: number;
  troco?: number;
  salvar_troco_credito?: number;
  observacoes?: string;
  dados_entrega_json?: string;
  status: 'concluida' | 'cancelada';
  nota_fiscal_id?: number;
}

export interface ItemVenda {
  id: number;
  venda_id: number;
  produto_id: number;
  produto_nome: string;
  produto_codigo?: string;
  unidade_medida: string;
  tamanho?: string;
  cor?: string;
  imagem_url?: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

export interface EstoqueMovimentacao {
  id: number;
  produto_id: number;
  produto_nome?: string;
  produto_codigo?: string;
  tipo: 'entrada' | 'saida' | 'ajuste' | 'venda' | 'cancelamento_venda' | 'devolucao';
  quantidade: number;
  motivo?: string;
  referencia_tipo?: string;
  referencia_id?: number;
  data_movimentacao: string;
}

export interface ContaPagar {
  id: number;
  fornecedor_id?: number;
  fornecedor_nome?: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'pendente' | 'pago' | 'atrasado';
}

export interface ContaReceber {
  id: number;
  cliente_id: number;
  cliente_nome?: string;
  venda_id?: number;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'pendente' | 'pago' | 'atrasado';
  criado_em: string;
}

export interface CreditoCliente {
  id: number;
  cliente_id: number;
  cliente_nome?: string;
  venda_id?: number;
  tipo: 'credito' | 'debito';
  valor: number;
  motivo?: string;
  criado_em: string;
}

export interface TrocaDevolucaoItem {
  id?: number;
  produto_id: number;
  produto_nome: string;
  produto_codigo?: string;
  quantidade_original: number;
  quantidade_devolucao: number;
  preco_unitario: number;
  desconto_rateado: number;
  subtotal_devolucao: number;
}

export interface TrocaDevolucao {
  id: number;
  venda_origem_id: number;
  usuario_id: number;
  usuario_nome?: string;
  cliente_id?: number;
  cliente_nome?: string;
  total_devolvido: number;
  forma_reembolso: 'credito' | 'dinheiro' | 'estorno' | 'troca';
  motivo?: string;
  data_devolucao: string;
  itens?: TrocaDevolucaoItem[];
}

export interface TributacaoPerfil {
  id: number;
  codigo: string;
  nome: string;
  origem: number;
  monofasico: number;
  ncm_padrao?: string;
  cfop_padrao?: string;
  csosn_cst?: string;
  aliquota_icms: number;
  aliquota_pis: number;
  aliquota_cofins: number;
}

export interface CatalogoPedido {
  id: number;
  cliente_nome: string;
  cliente_telefone: string;
  cliente_endereco?: string;
  itens_json: string;
  subtotal: number;
  taxa_entrega: number;
  total: number;
  forma_pagamento: string;
  status: 'pendente' | 'aprovado' | 'recusado' | 'concluido';
  criado_em: string;
}

export interface NfInutilizacao {
  id: number;
  modelo: string;
  serie: string;
  numero_inicial: number;
  numero_final: number;
  justificativa: string;
  protocolo?: string;
  status: string;
  criado_em: string;
}

export interface NotaFiscal {
  id: number;
  venda_id?: number;
  cliente_nome?: string;
  total?: number;
  numero?: string;
  serie?: string;
  chave_acesso?: string;
  status: 'pendente' | 'autorizada' | 'rejeitada' | 'cancelada';
  xml_url?: string;
  danfe_url?: string;
  mensagem_erro?: string;
  criado_em: string;
}

export interface ResumoDashboard {
  faturamentoHoje: number;
  vendasHoje: number;
  ticketMedioHoje: number;
  contasPendentesValor: number;
  contasAtrasadasQtd: number;
  produtosEstoqueBaixoQtd: number;
  produtosValidadeProximaQtd: number;
  caixaAberto: boolean;
}

export interface Assinatura {
  id: number;
  plano_atual: 'gratis' | 'premium' | 'fiscal';
  status: 'ativo' | 'trial' | 'expirado' | 'cancelado';
  data_inicio: string;
  data_fim?: string;
  trial_usado: number;
  dias_restantes_trial?: number;
}

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
  regua_texto_lembrete?: string;
  regua_texto_atraso_1?: string;
  regua_texto_atraso_2?: string;
  regua_texto_atraso_3?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface CrediarioContrato {
  id: number;
  loja_id: number;
  cliente_id: number;
  cliente_nome?: string;
  cliente_cpf?: string;
  cliente_telefone?: string;
  venda_id?: number;
  numero_contrato?: string;
  valor_total: number;
  valor_entrada: number;
  valor_financiado: number;
  taxa_juros_mensal: number;
  total_com_juros: number;
  qtd_parcelas: number;
  data_primeira_parcela: string;
  status: 'ativo' | 'quitado' | 'cancelado' | 'renegociado';
  contrato_origem_renegociacao_id?: number;
  aprovado_por_usuario_id?: number;
  aprovado_por_nome?: string;
  motivo_aprovacao?: string;
  criado_por: number;
  criado_por_nome?: string;
  criado_em: string;
  parcelas?: CrediarioParcela[];
}

export interface CrediarioParcela {
  id: number;
  loja_id: number;
  contrato_id: number;
  cliente_id?: number;
  cliente_nome?: string;
  cliente_telefone?: string;
  cliente_cpf?: string;
  venda_id?: number;
  numero: number;
  valor: number;
  valor_pago: number;
  saldo_restante: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'aberta' | 'paga' | 'parcial' | 'atrasada' | 'cancelada';
  juros_estimado?: number;
  multa_estimada?: number;
  dias_atraso?: number;
  criado_em: string;
}

export interface CrediarioPagamento {
  id: number;
  loja_id: number;
  parcela_id: number;
  caixa_sessao_id?: number;
  valor: number;
  forma_pagamento: 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'transferencia' | 'credito_cliente';
  data: string;
  recebido_por: number;
  recebido_por_nome?: string;
  juros_cobrado: number;
  multa_cobrada: number;
  desconto: number;
  observacao?: string;
  criado_em: string;
}

export interface CrediarioHistoricoCliente {
  cliente_id: number;
  loja_id: number;
  cliente_nome?: string;
  total_comprado: number;
  total_pago: number;
  saldo_devedor_atual: number;
  qtd_contratos: number;
  qtd_parcelas_pagas: number;
  qtd_atrasos: number;
  maior_atraso_dias: number;
  ultimo_atraso_em?: string;
  score_calculado: number;
  status_score?: 'verde' | 'amarelo' | 'vermelho';
  atualizado_em: string;
}

export interface CrediarioCobrancasLog {
  id: number;
  loja_id: number;
  parcela_id: number;
  cliente_id: number;
  cliente_nome?: string;
  tipo_mensagem: 'lembrete' | 'atraso_1' | 'atraso_2' | 'atraso_3';
  canal: 'whatsapp' | 'sms' | 'email';
  telefone_ou_email?: string;
  mensagem_enviada: string;
  enviada_em: string;
  status_envio: 'pendente' | 'enviado' | 'falha';
}

export interface AuditoriaCrediario {
  id: number;
  loja_id: number;
  usuario_id: number;
  usuario_nome?: string;
  acao: string;
  entidade_tipo: string;
  entidade_id: number;
  detalhes_json?: string;
  justificativa?: string;
  criado_em: string;
}

export interface SimulacaoCrediario {
  valorFinanciado: number;
  valorEntrada: number;
  taxaJurosMensal: number;
  qtdParcelas: number;
  valorParcela: number;
  totalComJuros: number;
  totalJuros: number;
  parcelas: {
    numero: number;
    dataVencimento: string;
    valor: number;
  }[];
}

export interface Loja {
  id: number;
  nome_fantasia: string;
  razao_social?: string;
  cnpj_cpf?: string;
  email?: string;
  telefone?: string;
  whatsapp?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  logo_url?: string;
  slogan?: string;
  slug_catalogo?: string;
  bio?: string;
  plano: string;
  chave_api_sync?: string;
  ativo: number;
  criado_em: string;
  atualizado_em?: string;
}

// Global Electron Window API
declare global {
  interface Window {
    api: {
      crediario: {
        getConfig: (lojaId?: number) => Promise<CrediarioConfig>;
        salvarConfig: (dados: Partial<CrediarioConfig>, lojaId?: number) => Promise<void>;
        simular: (valorTotal: number, valorEntrada: number, qtdParcelas: number, taxaJuros?: number, dataPrimeira?: string, lojaId?: number) => Promise<SimulacaoCrediario>;
        verificarLimite: (clienteId: number, valorDesejado: number, lojaId?: number) => Promise<{
          permitido: boolean;
          limiteTotal: number;
          saldoDevedor: number;
          limiteDisponivel: number;
          statusCrediario: string;
          temParcelasAtrasadas: boolean;
          qtdAtrasadas: number;
          exigeAprovacaoGerente: boolean;
          mensagem?: string;
        }>;
        criarContrato: (dados: {
          clienteId: number;
          vendaId?: number;
          valorTotal: number;
          valorEntrada: number;
          qtdParcelas: number;
          dataPrimeiraParcela: string;
          taxaJurosMensal?: number;
          usuarioId: number;
          aprovadoPorUsuarioId?: number;
          motivoAprovacao?: string;
          lojaId?: number;
        }) => Promise<{ contratoId: number; contrato: CrediarioContrato; parcelas: CrediarioParcela[] }>;
        listarContratos: (filtros?: { clienteId?: number; status?: string; dataInicio?: string; dataFim?: string; lojaId?: number }) => Promise<CrediarioContrato[]>;
        getContratoDetalhes: (contratoId: number, lojaId?: number) => Promise<{ contrato: CrediarioContrato; parcelas: CrediarioParcela[]; pagamentos: CrediarioPagamento[] }>;
        listarParcelas: (filtros?: { status?: string; clienteId?: number; contratoId?: number; dataInicio?: string; dataFim?: string; apenasVencidas?: boolean; lojaId?: number }) => Promise<CrediarioParcela[]>;
        baixarParcela: (dados: {
          parcelaId: number;
          valorPago: number;
          formaPagamento: string;
          dataPagamento?: string;
          caixaSessaoId?: number;
          usuarioId: number;
          jurosCobrado?: number;
          multaCobrada?: number;
          desconto?: number;
          observacao?: string;
          lojaId?: number;
        }) => Promise<{ pagamentoId: number; parcelaAtualizada: CrediarioParcela; contratoQuitado: boolean }>;
        estornarPagamento: (pagamentoId: number, usuarioId: number, justificativa: string, lojaId?: number) => Promise<void>;
        renegociarContrato: (dados: {
          contratoOrigemId: number;
          parcelasIds: number[];
          novoValorEntrada: number;
          novaQtdParcelas: number;
          novaDataPrimeiraParcela: string;
          novaTaxaJuros?: number;
          usuarioId: number;
          justificativa: string;
          lojaId?: number;
        }) => Promise<{ novoContratoId: number }>;
        getHistoricoCliente: (clienteId: number, lojaId?: number) => Promise<CrediarioHistoricoCliente>;
        executarJobDiario: (lojaId?: number) => Promise<{
          parcelasAtrasadasMarcadas: number;
          clientesBloqueados: number;
          mensagensEnviadas: number;
        }>;
        getDashboard: (lojaId?: number) => Promise<{
          totalReceber: number;
          recebidoMes: number;
          totalAtraso: number;
          taxaInadimplencia: number;
          qtdClientesInadimplentes: number;
          vencimentosProximos7Dias: CrediarioParcela[];
        }>;
        gerarLinkWhatsApp: (parcelaId: number, tipoMensagem: string, lojaId?: number) => Promise<{
          telefone: string;
          mensagem: string;
          linkWhatsApp: string;
          clienteNome: string;
        }>;
        registrarEnvioCobranca: (dados: {
          lojaId?: number;
          parcelaId: number;
          clienteId: number;
          tipoMensagem: 'lembrete' | 'atraso_1' | 'atraso_2' | 'atraso_3';
          canal?: 'whatsapp' | 'sms' | 'email';
          telefoneOuEmail?: string;
          mensagem: string;
          statusEnvio?: 'pendente' | 'enviado' | 'falha';
        }) => Promise<number>;
        listarLogsCobranca: (filtros?: {
          clienteId?: number;
          parcelaId?: number;
          tipoMensagem?: string;
          limite?: number;
          lojaId?: number;
        }) => Promise<any[]>;
        obterDadosDocumento: (contratoId: number, parcelasIds?: number[], lojaId?: number) => Promise<any>;
        gerarHtmlDocumento: (tipo: 'carne' | 'duplicata' | 'promissoria', dados: any) => Promise<string>;
        abrirPdf: (tipo: 'carne' | 'duplicata' | 'promissoria', dados: any) => Promise<{ sucesso: boolean; caminho?: string; erro?: string }>;
        salvarPdfComDialogo: (tipo: 'carne' | 'duplicata' | 'promissoria', dados: any, nomeSugerido?: string) => Promise<{ sucesso: boolean; caminho?: string; cancelado?: boolean; erro?: string }>;
        imprimirDireto: (tipo: 'carne' | 'duplicata' | 'promissoria', dados: any) => Promise<{ sucesso: boolean; erro?: string }>;
        buscarParcelaPorCodigoBarras: (codigo: string, lojaId?: number) => Promise<any | null>;
      };
      auth: {
        login: (login: string, senha: string) => Promise<Usuario | null>;
        autorizarGerente: (usuarioId: number, senhaPlana: string, dadosAuditoria: any) => Promise<{
          sucesso: boolean;
          erro?: 'USUARIO_NAO_ENCONTRADO' | 'SENHA_INCORRETA' | 'PERFIL_INVALIDO' | 'USUARIO_INATIVO' | 'BLOQUEADO_TENTATIVAS';
          mensagem: string;
          usuario?: { id: number; nome: string; perfil: string };
          tentativasRestantes?: number;
          tempoBloqueioRestante?: number;
        }>;
        listarAuditorias: (limit?: number) => Promise<any[]>;
        listarUsuarios: () => Promise<Usuario[]>;
        criarUsuario: (nome: string, login: string, senha: string, perfil: string) => Promise<number>;
        atualizarUsuario: (id: number, nome: string, perfil: string, ativo: number, novaSenha?: string) => Promise<void>;
      };
      produtos: {
        listar: (termo?: string, apenasAtivos?: boolean) => Promise<Produto[]>;
        buscarPorCodigoOuNome: (busca: string) => Promise<Produto | null>;
        criar: (dados: any) => Promise<number>;
        atualizar: (id: number, dados: any) => Promise<void>;
        excluir: (id: number) => Promise<void>;
      };
      clientes: {
        listar: (termo?: string) => Promise<Cliente[]>;
        obterPorId: (id: number) => Promise<Cliente | null>;
        criar: (dados: any) => Promise<number>;
        atualizar: (id: number, dados: any) => Promise<void>;
        excluir: (id: number) => Promise<void>;
        getSaldoCredito: (clienteId: number) => Promise<number>;
        getSaldoCreditoDetalhes: (clienteId: number) => Promise<any>;
      };
      fornecedores: {
        listar: (termo?: string) => Promise<Fornecedor[]>;
        criar: (dados: any) => Promise<number>;
        atualizar: (id: number, dados: any) => Promise<void>;
        excluir: (id: number) => Promise<void>;
      };
      caixa: {
        getAberto: (usuarioId?: number) => Promise<CaixaSessao | null>;
        abrir: (usuarioId: number, valorAbertura: number) => Promise<number>;
        suprimento: (caixaId: number, usuarioId: number, valor: number, motivo: string) => Promise<void>;
        sangria: (caixaId: number, usuarioId: number, valor: number, motivo: string) => Promise<void>;
        listarMovimentacoes: (caixaId: number) => Promise<any[]>;
        getResumo: (caixaId: number) => Promise<ResumoFechamentoCaixa>;
        fechar: (caixaId: number, valorInformado: number) => Promise<CaixaSessao>;
        listarSessoes: (limit?: number) => Promise<CaixaSessao[]>;
      };
      vendas: {
        criarVenda: (payload: any) => Promise<{ vendaId: number; venda: Venda; itens: ItemVenda[] }>;
        cancelarVenda: (vendaId: number, usuarioId: number) => Promise<void>;
        listar: (filtros?: any) => Promise<Venda[]>;
        getDetalhes: (vendaId: number) => Promise<{ venda: Venda; itens: ItemVenda[] }>;
        atualizarStatusPedido: (vendaId: number, novoStatus: string) => Promise<void>;
      };
      devolucoes: {
        buscarVendas: (criterio: string, valor: string) => Promise<any[]>;
        processarDevolucao: (payload: {
          vendaOrigemId: number;
          usuarioId: number;
          clienteId?: number;
          formaReembolso: string;
          motivo: string;
          itens: { produtoId: number; quantidade: number; valorUnitario: number; subtotal: number }[];
          totalDevolvido: number;
        }) => Promise<{ devolucaoId: number }>;
        listar: () => Promise<TrocaDevolucao[]>;
      };
      contasReceber: {
        listar: (status?: string, clienteId?: number) => Promise<ContaReceber[]>;
        criar: (dados: any) => Promise<number>;
        receber: (id: number, dataPagamento?: string) => Promise<void>;
        excluir: (id: number) => Promise<void>;
      };
      creditos: {
        listarPorCliente: (clienteId: number) => Promise<CreditoCliente[]>;
        adicionar: (clienteId: number, valor: number, motivo: string, vendaId?: number) => Promise<void>;
        usar: (clienteId: number, valor: number, motivo: string, vendaId?: number) => Promise<void>;
      };
      tributacao: {
        listarPerfis: () => Promise<TributacaoPerfil[]>;
        criarPerfil: (dados: any) => Promise<number>;
        atualizarPerfil: (id: number, dados: any) => Promise<void>;
        excluirPerfil: (id: number) => Promise<void>;
      };
      catalogo: {
        obterConfig: () => Promise<any>;
        salvarConfig: (dados: any) => Promise<void>;
        listarPedidos: () => Promise<CatalogoPedido[]>;
        atualizarStatusPedido: (id: number, status: string) => Promise<void>;
        togglePublicacao: (produtoId: number, publicado: boolean) => Promise<void>;
      };
      inutilizacao: {
        listar: () => Promise<NfInutilizacao[]>;
        inutilizar: (dados: any) => Promise<number>;
      };
      estoque: {
        entrada: (produtoId: number, quantidade: number, motivo?: string, novoPrecoCusto?: number, fornecedorId?: number) => Promise<void>;
        ajuste: (produtoId: number, novoEstoque: number, motivo: string) => Promise<void>;
        historico: (produtoId?: number, limit?: number) => Promise<EstoqueMovimentacao[]>;
        alertas: () => Promise<{ estoqueBaixo: Produto[]; validadeProxima: Produto[] }>;
      };
      contasPagar: {
        listar: (status?: string) => Promise<ContaPagar[]>;
        criar: (dados: any) => Promise<number>;
        pagar: (id: number, dataPagamento?: string) => Promise<void>;
        excluir: (id: number) => Promise<void>;
      };
      relatorios: {
        dashboard: () => Promise<ResumoDashboard>;
        faturamento: (dataInicio: string, dataFim: string) => Promise<{
          faturamentoTotal: number;
          totalVendas: number;
          descontoTotal: number;
          porDia: { data: string; total: number; qtd: number }[];
          porFormaPagamento: { forma: string; total: number; qtd: number }[];
        }>;
        maisVendidos: (dataInicio: string, dataFim: string, limit?: number) => Promise<any[]>;
        lucroEstimado: (dataInicio: string, dataFim: string) => Promise<any>;
      };
      fiscal: {
        listarNotas: (limit?: number) => Promise<NotaFiscal[]>;
        montarPayload: (vendaId: number) => Promise<any>;
        emitirNota: (vendaId: number) => Promise<any>;
      };
      tef: {
        iniciarPagamento: (solicitacao: any) => Promise<any>;
        consultarStatus: (transacaoId: string) => Promise<any>;
        cancelar: (transacaoId: string) => Promise<any>;
      };
      config: {
        obter: () => Promise<{ [key: string]: string }>;
        salvar: (chave: string, valor: string) => Promise<void>;
      };
      loja: {
        obter: () => Promise<Loja>;
        atualizar: (dados: Partial<Loja>) => Promise<Loja>;
        vincularContaWeb: (email: string, tokenOuSenha?: string) => Promise<Loja>;
      };
      planos: {
        obter: () => Promise<Assinatura>;
        alterar: (plano: string, diasDuracao?: number, status?: string) => Promise<Assinatura>;
        iniciarTrial: () => Promise<{ sucesso: boolean; mensagem: string; assinatura?: Assinatura }>;
      };
      supabase: {
        cadastrarLoja: (payload: any) => Promise<{ sucesso: boolean; loja?: any; mensagem: string }>;
        validarAssinatura: (lojaId: number, dataUltimaValidacao?: string) => Promise<{
          plano: 'gratis' | 'premium' | 'fiscal';
          status: string;
          trialUsado: boolean;
          modoRestritoOffline: boolean;
          diasOffline: number;
          mensagem: string;
        }>;
        listarLojas: () => Promise<any[]>;
        alterarPlanoLoja: (lojaId: number, plano: string, status?: string) => Promise<{ sucesso: boolean; loja?: any }>;
        toggleStatusLoja: (lojaId: number, ativo: boolean) => Promise<{ sucesso: boolean }>;
        sincronizarCatalogo: (produtos: any[], lojaInfo: any) => Promise<{ sucesso: boolean; produtosSincronizados: number; mensagem: string }>;
      };
      gateway: {
        criarAssinatura: (dados: any) => Promise<any>;
        consultarStatus: (assinaturaId: string) => Promise<any>;
        cancelar: (assinaturaId: string) => Promise<any>;
      };
      window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        close: () => Promise<void>;
      };
    };
  }
}

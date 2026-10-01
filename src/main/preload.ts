import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // Autenticação & Usuários
  auth: {
    login: (login: string, senha: string) => ipcRenderer.invoke('auth:login', login, senha),
    autorizarGerente: (usuarioId: number, senhaPlana: string, dadosAuditoria: any) =>
      ipcRenderer.invoke('auth:autorizarGerente', usuarioId, senhaPlana, dadosAuditoria),
    listarAuditorias: (limit?: number) => ipcRenderer.invoke('auth:listarAuditorias', limit),
    listarUsuarios: () => ipcRenderer.invoke('auth:listarUsuarios'),
    criarUsuario: (nome: string, login: string, senha: string, perfil: string) =>
      ipcRenderer.invoke('auth:criarUsuario', nome, login, senha, perfil),
    atualizarUsuario: (id: number, nome: string, perfil: string, ativo: number, novaSenha?: string) =>
      ipcRenderer.invoke('auth:atualizarUsuario', id, nome, perfil, ativo, novaSenha),
  },

  // Produtos
  produtos: {
    listar: (termo?: string, apenasAtivos?: boolean) => ipcRenderer.invoke('produtos:listar', termo, apenasAtivos),
    buscarPorCodigoOuNome: (busca: string) => ipcRenderer.invoke('produtos:buscar', busca),
    criar: (dados: any) => ipcRenderer.invoke('produtos:criar', dados),
    atualizar: (id: number, dados: any) => ipcRenderer.invoke('produtos:atualizar', id, dados),
    excluir: (id: number) => ipcRenderer.invoke('produtos:excluir', id),
  },

  // Clientes
  clientes: {
    listar: (termo?: string) => ipcRenderer.invoke('clientes:listar', termo),
    obterPorId: (id: number) => ipcRenderer.invoke('clientes:obterPorId', id),
    criar: (dados: any) => ipcRenderer.invoke('clientes:criar', dados),
    atualizar: (id: number, dados: any) => ipcRenderer.invoke('clientes:atualizar', id, dados),
    excluir: (id: number) => ipcRenderer.invoke('clientes:excluir', id),
    getSaldoCredito: (clienteId: number, lojaId?: number) => ipcRenderer.invoke('clientes:getSaldoCredito', clienteId, lojaId),
    getSaldoCreditoDetalhes: (clienteId: number, lojaId?: number) => ipcRenderer.invoke('clientes:getSaldoCreditoDetalhes', clienteId, lojaId),
  },

  // Fornecedores
  fornecedores: {
    listar: (termo?: string) => ipcRenderer.invoke('fornecedores:listar', termo),
    criar: (dados: any) => ipcRenderer.invoke('fornecedores:criar', dados),
    atualizar: (id: number, dados: any) => ipcRenderer.invoke('fornecedores:atualizar', id, dados),
    excluir: (id: number) => ipcRenderer.invoke('fornecedores:excluir', id),
  },

  // Caixa
  caixa: {
    getAberto: (usuarioId?: number) => ipcRenderer.invoke('caixa:getAberto', usuarioId),
    abrir: (usuarioId: number, valorAbertura: number) => ipcRenderer.invoke('caixa:abrir', usuarioId, valorAbertura),
    suprimento: (caixaId: number, usuarioId: number, valor: number, motivo: string) =>
      ipcRenderer.invoke('caixa:suprimento', caixaId, usuarioId, valor, motivo),
    sangria: (caixaId: number, usuarioId: number, valor: number, motivo: string) =>
      ipcRenderer.invoke('caixa:sangria', caixaId, usuarioId, valor, motivo),
    listarMovimentacoes: (caixaId: number) => ipcRenderer.invoke('caixa:movimentacoes', caixaId),
    getResumo: (caixaId: number) => ipcRenderer.invoke('caixa:getResumo', caixaId),
    fechar: (caixaId: number, valorInformado: number) => ipcRenderer.invoke('caixa:fechar', caixaId, valorInformado),
    listarSessoes: (limit?: number) => ipcRenderer.invoke('caixa:listarSessoes', limit),
  },

  // PDV & Vendas
  vendas: {
    criarVenda: (payload: any) => ipcRenderer.invoke('vendas:criarVenda', payload),
    cancelarVenda: (vendaId: number, usuarioId: number) => ipcRenderer.invoke('vendas:cancelarVenda', vendaId, usuarioId),
    listar: (filtros?: any) => ipcRenderer.invoke('vendas:listar', filtros),
    getDetalhes: (vendaId: number) => ipcRenderer.invoke('vendas:getDetalhes', vendaId),
    atualizarStatusPedido: (vendaId: number, novoStatus: string) => ipcRenderer.invoke('vendas:atualizarStatusPedido', vendaId, novoStatus),
  },

  // Trocas e Devoluções
  devolucoes: {
    buscarVendas: (criterio: string, valor: string) => ipcRenderer.invoke('devolucoes:buscarVendas', criterio, valor),
    processarDevolucao: (payload: any) => ipcRenderer.invoke('devolucoes:processar', payload),
    listar: () => ipcRenderer.invoke('devolucoes:listar'),
  },

  // Créditos de Clientes
  creditos: {
    getSaldo: (clienteId: number) => ipcRenderer.invoke('creditos:getSaldo', clienteId),
    adicionar: (clienteId: number, valor: number, motivo: string, vendaId?: number) =>
      ipcRenderer.invoke('creditos:adicionar', clienteId, valor, motivo, vendaId),
    usar: (clienteId: number, valor: number, motivo: string, vendaId?: number) =>
      ipcRenderer.invoke('creditos:usar', clienteId, valor, motivo, vendaId),
    listarPorCliente: (clienteId: number) => ipcRenderer.invoke('creditos:listarPorCliente', clienteId),
  },

  // Contas a Receber (Fiado)
  contasReceber: {
    listar: (status?: string, clienteId?: number) => ipcRenderer.invoke('contasReceber:listar', status, clienteId),
    criar: (dados: any) => ipcRenderer.invoke('contasReceber:criar', dados),
    receber: (id: number, data?: string) => ipcRenderer.invoke('contasReceber:receber', id, data),
    excluir: (id: number) => ipcRenderer.invoke('contasReceber:excluir', id),
  },

  // Perfis Tributários
  tributacao: {
    listarPerfis: () => ipcRenderer.invoke('tributacao:listarPerfis'),
    criarPerfil: (dados: any) => ipcRenderer.invoke('tributacao:criarPerfil', dados),
    atualizarPerfil: (id: number, dados: any) => ipcRenderer.invoke('tributacao:atualizarPerfil', id, dados),
    excluirPerfil: (id: number) => ipcRenderer.invoke('tributacao:excluirPerfil', id),
  },

  // Catálogo Online
  catalogo: {
    obterConfig: () => ipcRenderer.invoke('config:obter'),
    salvarConfig: (dados: any) => ipcRenderer.invoke('config:salvar', 'catalogo_config', JSON.stringify(dados)),
    listarPedidos: () => ipcRenderer.invoke('catalogo:listarPedidos'),
    atualizarStatusPedido: (id: number, status: string) => ipcRenderer.invoke('catalogo:atualizarStatusPedido', id, status),
    togglePublicacao: (produtoId: number, publicado: boolean) => ipcRenderer.invoke('catalogo:togglePublicacao', produtoId, publicado),
  },

  // Inutilização de NF
  inutilizacao: {
    listar: () => ipcRenderer.invoke('inutilizacao:listar'),
    inutilizar: (dados: any) => ipcRenderer.invoke('inutilizacao:criar', dados),
  },

  // Estoque
  estoque: {
    entrada: (produtoId: number, quantidade: number, motivo?: string, novoPrecoCusto?: number, fornecedorId?: number) =>
      ipcRenderer.invoke('estoque:entrada', produtoId, quantidade, motivo, novoPrecoCusto, fornecedorId),
    ajuste: (produtoId: number, novoEstoque: number, motivo: string) =>
      ipcRenderer.invoke('estoque:ajuste', produtoId, novoEstoque, motivo),
    historico: (produtoId?: number, limit?: number) => ipcRenderer.invoke('estoque:historico', produtoId, limit),
    alertas: () => ipcRenderer.invoke('estoque:alertas'),
  },

  // Contas a Pagar
  contasPagar: {
    listar: (status?: string) => ipcRenderer.invoke('contasPagar:listar', status),
    criar: (dados: any) => ipcRenderer.invoke('contasPagar:criar', dados),
    atualizar: (id: number, dados: any) => ipcRenderer.invoke('contasPagar:atualizar', id, dados),
    pagar: (id: number, dataPagamento?: string) => ipcRenderer.invoke('contasPagar:pagar', id, dataPagamento),
    baixar: (id: number, valorPago?: number, dataPagamento?: string, formaPagamento?: string, caixaSessaoId?: number) =>
      ipcRenderer.invoke('contasPagar:baixar', id, valorPago, dataPagamento, formaPagamento, caixaSessaoId),
    excluir: (id: number) => ipcRenderer.invoke('contasPagar:excluir', id),
  },

  // Relatórios
  relatorios: {
    dashboard: () => ipcRenderer.invoke('relatorios:dashboard'),
    faturamento: (dataInicio: string, dataFim: string) => ipcRenderer.invoke('relatorios:faturamento', dataInicio, dataFim),
    maisVendidos: (dataInicio: string, dataFim: string, limit?: number) =>
      ipcRenderer.invoke('relatorios:maisVendidos', dataInicio, dataFim, limit),
    lucroEstimado: (dataInicio: string, dataFim: string) =>
      ipcRenderer.invoke('relatorios:lucroEstimado', dataInicio, dataFim),
  },

  // Fiscal
  fiscal: {
    listarNotas: (limit?: number) => ipcRenderer.invoke('fiscal:listarNotas', limit),
    montarPayload: (vendaId: number) => ipcRenderer.invoke('fiscal:montarPayload', vendaId),
    emitirNota: (vendaId: number) => ipcRenderer.invoke('fiscal:emitirNota', vendaId),
  },

  // TEF
  tef: {
    iniciarPagamento: (solicitacao: any) => ipcRenderer.invoke('tef:iniciarPagamento', solicitacao),
    consultarStatus: (transacaoId: string) => ipcRenderer.invoke('tef:consultarStatus', transacaoId),
    cancelar: (transacaoId: string) => ipcRenderer.invoke('tef:cancelar', transacaoId),
  },

  // Configurações
  config: {
    obter: () => ipcRenderer.invoke('config:obter'),
    salvar: (chave: string, valor: string) => ipcRenderer.invoke('config:salvar', chave, valor),
  },

  // Gestão e Vinculação de Loja (Multi-loja & Cadastro Web)
  loja: {
    obter: () => ipcRenderer.invoke('loja:obter'),
    atualizar: (dados: any) => ipcRenderer.invoke('loja:atualizar', dados),
    vincularContaWeb: (email: string, tokenOuSenha?: string) => ipcRenderer.invoke('loja:vincularContaWeb', email, tokenOuSenha),
  },

  // Gestão de Planos e Assinatura
  planos: {
    obter: () => ipcRenderer.invoke('planos:obter'),
    alterar: (plano: string, diasDuracao?: number, status?: string) => ipcRenderer.invoke('planos:alterar', plano, diasDuracao, status),
    iniciarTrial: () => ipcRenderer.invoke('planos:iniciarTrial'),
  },

  // Supabase Multi-tenant SaaS
  supabase: {
    cadastrarLoja: (payload: any) => ipcRenderer.invoke('supabase:cadastrarLoja', payload),
    validarAssinatura: (lojaId: number, dataUltimaValidacao?: string) => ipcRenderer.invoke('supabase:validarAssinatura', lojaId, dataUltimaValidacao),
    listarLojas: () => ipcRenderer.invoke('supabase:listarLojas'),
    alterarPlanoLoja: (lojaId: number, plano: string, status?: string) => ipcRenderer.invoke('supabase:alterarPlanoLoja', lojaId, plano, status),
    toggleStatusLoja: (lojaId: number, ativo: boolean) => ipcRenderer.invoke('supabase:toggleStatusLoja', lojaId, ativo),
    sincronizarCatalogo: (produtos: any[], lojaInfo: any) => ipcRenderer.invoke('supabase:sincronizarCatalogo', produtos, lojaInfo),
  },

  // Gateway de Assinaturas
  gateway: {
    criarAssinatura: (dados: any) => ipcRenderer.invoke('gateway:criarAssinatura', dados),
    consultarStatus: (assinaturaId: string) => ipcRenderer.invoke('gateway:consultarStatus', assinaturaId),
    cancelar: (assinaturaId: string) => ipcRenderer.invoke('gateway:cancelar', assinaturaId),
  },

  // Crediário & Carnê
  crediario: {
    getConfig: (lojaId?: number) => ipcRenderer.invoke('crediario:getConfig', lojaId),
    salvarConfig: (dados: any, lojaId?: number) => ipcRenderer.invoke('crediario:salvarConfig', dados, lojaId),
    simular: (valorTotal: number, valorEntrada: number, qtdParcelas: number, taxaJuros?: number, dataPrimeira?: string, lojaId?: number) =>
      ipcRenderer.invoke('crediario:simular', valorTotal, valorEntrada, qtdParcelas, taxaJuros, dataPrimeira, lojaId),
    verificarLimite: (clienteId: number, valorDesejado: number, lojaId?: number) =>
      ipcRenderer.invoke('crediario:verificarLimite', clienteId, valorDesejado, lojaId),
    criarContrato: (dados: any) => ipcRenderer.invoke('crediario:criarContrato', dados),
    listarContratos: (filtros?: any) => ipcRenderer.invoke('crediario:listarContratos', filtros),
    getContratoDetalhes: (contratoId: number, lojaId?: number) => ipcRenderer.invoke('crediario:getContratoDetalhes', contratoId, lojaId),
    listarParcelas: (filtros?: any) => ipcRenderer.invoke('crediario:listarParcelas', filtros),
    baixarParcela: (dados: any) => ipcRenderer.invoke('crediario:baixarParcela', dados),
    estornarPagamento: (pagamentoId: number, usuarioId: number, justificativa: string, lojaId?: number) =>
      ipcRenderer.invoke('crediario:estornarPagamento', pagamentoId, usuarioId, justificativa, lojaId),
    renegociarContrato: (dados: any) => ipcRenderer.invoke('crediario:renegociarContrato', dados),
    getHistoricoCliente: (clienteId: number, lojaId?: number) => ipcRenderer.invoke('crediario:getHistoricoCliente', clienteId, lojaId),
    executarJobDiario: (lojaId?: number) => ipcRenderer.invoke('crediario:executarJobDiario', lojaId),
    getDashboard: (lojaId?: number) => ipcRenderer.invoke('crediario:getDashboard', lojaId),
    gerarLinkWhatsApp: (parcelaId: number, tipoMensagem: string, lojaId?: number) =>
      ipcRenderer.invoke('crediario:gerarLinkWhatsApp', parcelaId, tipoMensagem, lojaId),
    registrarEnvioCobranca: (dados: any) => ipcRenderer.invoke('crediario:registrarEnvioCobranca', dados),
    listarLogsCobranca: (filtros?: any) => ipcRenderer.invoke('crediario:listarLogsCobranca', filtros),
    obterDadosDocumento: (contratoId: number, parcelasIds?: number[], lojaId?: number) =>
      ipcRenderer.invoke('crediario:obterDadosDocumento', contratoId, parcelasIds, lojaId),
    gerarHtmlDocumento: (tipo: 'carne' | 'duplicata' | 'promissoria', dados: any) =>
      ipcRenderer.invoke('crediario:gerarHtmlDocumento', tipo, dados),
    abrirPdf: (tipo: 'carne' | 'duplicata' | 'promissoria', dados: any) =>
      ipcRenderer.invoke('crediario:abrirPdf', tipo, dados),
    salvarPdfComDialogo: (tipo: 'carne' | 'duplicata' | 'promissoria', dados: any, nomeSugerido?: string) =>
      ipcRenderer.invoke('crediario:salvarPdfComDialogo', tipo, dados, nomeSugerido),
    imprimirDireto: (tipo: 'carne' | 'duplicata' | 'promissoria', dados: any) =>
      ipcRenderer.invoke('crediario:imprimirDireto', tipo, dados),
    buscarParcelaPorCodigoBarras: (codigo: string, lojaId?: number) =>
      ipcRenderer.invoke('crediario:buscarParcelaPorCodigoBarras', codigo, lojaId),
  },

  // Controle de Janela
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  }
};

contextBridge.exposeInMainWorld('api', api);

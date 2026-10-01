import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'path';
import { initDatabase } from './db/database';
import * as queries from './db/queries';
import * as fiscalService from './services/fiscalService';
import { tefManager } from './services/tefService';
import { SupabaseService } from './services/supabaseService';
import { gatewayManager } from './services/gatewayAssinatura';
import * as crediarioService from './services/crediarioService';
import { iniciarAgendadorCrediario } from './services/crediarioScheduler';
import { gerarHtmlDocumento, DadosDocumentoCrediario } from '../shared/documentosCrediarioGenerator';
import * as pdfService from './services/pdfService';

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 700,
    title: 'WS Gestão PDV - Sistema de Gestão para Loja (Windows Offline)',
    icon: path.join(__dirname, '../../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    autoHideMenuBar: false,
  });

  // Em desenvolvimento, carrega o Vite dev server; em produção, carrega dist/index.html
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers() {
  // Autenticação & Usuários
  ipcMain.handle('auth:login', async (_, login, senha) => {
    return queries.autenticarUsuario(login, senha);
  });
  ipcMain.handle('auth:autorizarGerente', async (_, usuarioId, senhaPlana, dadosAuditoria) => {
    return queries.autorizarGerente(usuarioId, senhaPlana, dadosAuditoria);
  });
  ipcMain.handle('auth:listarAuditorias', async (_, limit) => {
    return queries.listarAuditorias(limit);
  });
  ipcMain.handle('auth:listarUsuarios', async () => {
    return queries.listarUsuarios();
  });
  ipcMain.handle('auth:criarUsuario', async (_, nome, login, senha, perfil) => {
    return queries.criarUsuario(nome, login, senha, perfil);
  });
  ipcMain.handle('auth:atualizarUsuario', async (_, id, nome, perfil, ativo, novaSenha) => {
    return queries.atualizarUsuario(id, nome, perfil, ativo, novaSenha);
  });

  // Produtos
  ipcMain.handle('produtos:listar', async (_, termo, apenasAtivos) => {
    return queries.listarProdutos(termo, apenasAtivos);
  });
  ipcMain.handle('produtos:buscar', async (_, busca) => {
    return queries.buscarProdutoPorCodigoOuNome(busca);
  });
  ipcMain.handle('produtos:criar', async (_, dados) => {
    return queries.criarProduto(dados);
  });
  ipcMain.handle('produtos:atualizar', async (_, id, dados) => {
    return queries.atualizarProduto(id, dados);
  });
  ipcMain.handle('produtos:excluir', async (_, id) => {
    return queries.excluirProduto(id);
  });

  // Clientes
  ipcMain.handle('clientes:listar', async (_, termo) => {
    return queries.listarClientes(termo);
  });
  ipcMain.handle('clientes:obterPorId', async (_, id) => {
    return queries.obterClientePorId(id);
  });
  ipcMain.handle('clientes:criar', async (_, dados) => {
    return queries.criarCliente(dados);
  });
  ipcMain.handle('clientes:atualizar', async (_, id, dados) => {
    return queries.atualizarCliente(id, dados);
  });
  ipcMain.handle('clientes:excluir', async (_, id) => {
    return queries.excluirCliente(id);
  });
  ipcMain.handle('clientes:getSaldoCredito', async (_, clienteId, lojaId) => {
    if (!clienteId) return 0;
    const res = crediarioService.getSaldoCreditoCompleto(Number(clienteId), Number(lojaId) || 1);
    return res ? res.disponivel : 0;
  });
  ipcMain.handle('clientes:getSaldoCreditoDetalhes', async (_, clienteId, lojaId) => {
    if (!clienteId) return null;
    return crediarioService.getSaldoCreditoCompleto(Number(clienteId), Number(lojaId) || 1);
  });

  // Fornecedores
  ipcMain.handle('fornecedores:listar', async (_, termo) => {
    return queries.listarFornecedores(termo);
  });
  ipcMain.handle('fornecedores:criar', async (_, dados) => {
    return queries.criarFornecedor(dados);
  });
  ipcMain.handle('fornecedores:atualizar', async (_, id, dados) => {
    return queries.atualizarFornecedor(id, dados);
  });
  ipcMain.handle('fornecedores:excluir', async (_, id) => {
    return queries.excluirFornecedor(id);
  });

  // Caixa
  ipcMain.handle('caixa:getAberto', async (_, usuarioId) => {
    return queries.getCaixaAberto(usuarioId);
  });
  ipcMain.handle('caixa:abrir', async (_, usuarioId, valorAbertura) => {
    return queries.abrirCaixa(usuarioId, valorAbertura);
  });
  ipcMain.handle('caixa:suprimento', async (_, caixaId, usuarioId, valor, motivo) => {
    return queries.registrarSuprimento(caixaId, usuarioId, valor, motivo);
  });
  ipcMain.handle('caixa:sangria', async (_, caixaId, usuarioId, valor, motivo) => {
    return queries.registrarSangria(caixaId, usuarioId, valor, motivo);
  });
  ipcMain.handle('caixa:movimentacoes', async (_, caixaId) => {
    return queries.listarMovimentacoesCaixa(caixaId);
  });
  ipcMain.handle('caixa:getResumo', async (_, caixaId) => {
    return queries.getResumoFechamento(caixaId);
  });
  ipcMain.handle('caixa:fechar', async (_, caixaId, valorInformado) => {
    return queries.fecharCaixa(caixaId, valorInformado);
  });
  ipcMain.handle('caixa:listarSessoes', async (_, limit) => {
    return queries.listarSessoesCaixa(limit);
  });

  // PDV & Vendas
  ipcMain.handle('vendas:criarVenda', async (_, payload) => {
    return queries.criarVenda(payload);
  });
  ipcMain.handle('vendas:cancelarVenda', async (_, vendaId, usuarioId) => {
    return queries.cancelarVenda(vendaId, usuarioId);
  });
  ipcMain.handle('vendas:listar', async (_, filtros) => {
    return queries.listarVendas(filtros);
  });
  ipcMain.handle('vendas:getDetalhes', async (_, vendaId) => {
    return queries.getVendaDetalhes(vendaId);
  });

  // Estoque
  ipcMain.handle('estoque:entrada', async (_, produtoId, quantidade, motivo, precoCusto, fornecedorId) => {
    return queries.registrarEntradaEstoque(produtoId, quantidade, motivo, precoCusto, fornecedorId);
  });
  ipcMain.handle('estoque:ajuste', async (_, produtoId, novoEstoque, motivo) => {
    return queries.registrarAjusteEstoque(produtoId, novoEstoque, motivo);
  });
  ipcMain.handle('estoque:historico', async (_, produtoId, limit) => {
    return queries.listarHistoricoEstoque(produtoId, limit);
  });
  ipcMain.handle('estoque:alertas', async () => {
    return queries.getAlertasEstoque();
  });

  // Contas a Pagar
  ipcMain.handle('contasPagar:listar', async (_, status) => {
    return queries.listarContasPagar(status);
  });
  ipcMain.handle('contasPagar:criar', async (_, dados) => {
    return queries.criarContaPagar(dados);
  });
  ipcMain.handle('contasPagar:atualizar', async (_, id, dados) => {
    return queries.atualizarContaPagar(id, dados);
  });
  ipcMain.handle('contasPagar:pagar', async (_, id, data) => {
    return queries.pagarConta(id, data);
  });
  ipcMain.handle('contasPagar:baixar', async (_, id, valorPago, dataPagamento, formaPagamento, caixaSessaoId) => {
    return queries.baixarContaPagar(id, valorPago, dataPagamento, formaPagamento, caixaSessaoId);
  });
  ipcMain.handle('contasPagar:excluir', async (_, id) => {
    return queries.excluirContaPagar(id);
  });

  // Relatórios
  ipcMain.handle('relatorios:dashboard', async () => {
    return queries.getResumoDashboard();
  });
  ipcMain.handle('relatorios:faturamento', async (_, dataInicio, dataFim) => {
    return queries.getRelatorioFaturamento(dataInicio, dataFim);
  });
  ipcMain.handle('relatorios:maisVendidos', async (_, dataInicio, dataFim, limit) => {
    return queries.getProdutosMaisVendidos(dataInicio, dataFim, limit);
  });
  ipcMain.handle('relatorios:lucroEstimado', async (_, dataInicio, dataFim) => {
    return queries.getLucroEstimado(dataInicio, dataFim);
  });

  // Fiscal
  ipcMain.handle('fiscal:listarNotas', async (_, limit) => {
    return queries.listarNotasFiscais(limit);
  });
  ipcMain.handle('fiscal:montarPayload', async (_, vendaId) => {
    return fiscalService.montarPayloadFiscal(vendaId);
  });
  ipcMain.handle('fiscal:emitirNota', async (_, vendaId) => {
    return fiscalService.emitirNotaFiscal(vendaId);
  });

  // TEF (Transferência Eletrônica de Fundos)
  ipcMain.handle('tef:iniciarPagamento', async (_, solicitacao) => {
    return tefManager.processarPagamento(solicitacao);
  });
  ipcMain.handle('tef:consultarStatus', async (_, transacaoId) => {
    return tefManager.consultar(transacaoId);
  });
  ipcMain.handle('tef:cancelar', async (_, transacaoId) => {
    return tefManager.estornar(transacaoId);
  });

  // Trocas e Devoluções
  ipcMain.handle('devolucoes:buscarVendas', async (_, criterio, valor) => {
    return queries.buscarVendasParaDevolucao(criterio, valor);
  });
  ipcMain.handle('devolucoes:processar', async (_, payload) => {
    return queries.processarDevolucao(payload);
  });
  ipcMain.handle('devolucoes:listar', async () => {
    return queries.listarDevolucoes();
  });

  // Créditos de Clientes
  ipcMain.handle('creditos:getSaldo', async (_, clienteId) => {
    return queries.getSaldoCreditoCliente(clienteId);
  });
  ipcMain.handle('creditos:adicionar', async (_, clienteId, valor, motivo, vendaId) => {
    return queries.adicionarCreditoCliente(clienteId, valor, motivo, vendaId);
  });
  ipcMain.handle('creditos:usar', async (_, clienteId, valor, motivo, vendaId) => {
    return queries.usarCreditoCliente(clienteId, valor, motivo, vendaId);
  });
  ipcMain.handle('creditos:listarPorCliente', async (_, clienteId) => {
    return queries.listarCreditosPorCliente(clienteId);
  });

  // Contas a Receber (Fiado)
  ipcMain.handle('contasReceber:listar', async (_, status, clienteId) => {
    return queries.listarContasReceber(status, clienteId);
  });
  ipcMain.handle('contasReceber:criar', async (_, dados) => {
    return queries.criarContaReceber(dados);
  });
  ipcMain.handle('contasReceber:receber', async (_, id, data) => {
    return queries.receberConta(id, data);
  });
  ipcMain.handle('contasReceber:excluir', async (_, id) => {
    return queries.excluirContaReceber(id);
  });

  // Pedidos & Status
  ipcMain.handle('vendas:atualizarStatusPedido', async (_, vendaId, novoStatus) => {
    return queries.atualizarStatusPedido(vendaId, novoStatus);
  });

  // Perfis Tributários
  ipcMain.handle('tributacao:listarPerfis', async () => {
    return queries.listarPerfisTributacao();
  });
  ipcMain.handle('tributacao:criarPerfil', async (_, dados) => {
    return queries.criarPerfilTributacao(dados);
  });
  ipcMain.handle('tributacao:atualizarPerfil', async (_, id, dados) => {
    return queries.atualizarPerfilTributacao(id, dados);
  });
  ipcMain.handle('tributacao:excluirPerfil', async (_, id) => {
    return queries.excluirPerfilTributacao(id);
  });

  // Catálogo Online
  ipcMain.handle('catalogo:listarPedidos', async () => {
    return queries.listarPedidosCatalogo();
  });
  ipcMain.handle('catalogo:atualizarStatusPedido', async (_, id, status) => {
    return queries.atualizarStatusPedidoCatalogo(id, status);
  });
  ipcMain.handle('catalogo:togglePublicacao', async (_, produtoId, publicado) => {
    return queries.togglePublicacaoProduto(produtoId, publicado);
  });

  // Inutilização de NF
  ipcMain.handle('inutilizacao:listar', async () => {
    return queries.listarInutilizacoes();
  });
  ipcMain.handle('inutilizacao:criar', async (_, dados) => {
    return queries.criarInutilizacao(dados);
  });

  // Configurações
  ipcMain.handle('config:obter', async () => {
    return queries.getConfiguracoes();
  });
  ipcMain.handle('config:salvar', async (_, chave, valor) => {
    return queries.salvarConfiguracao(chave, valor);
  });

  // Gestão e Vinculação de Loja (Multi-loja & Cadastro Web)
  ipcMain.handle('loja:obter', async () => {
    return queries.obterDadosLoja();
  });
  ipcMain.handle('loja:atualizar', async (_, dados) => {
    return queries.atualizarDadosLoja(dados);
  });
  ipcMain.handle('loja:vincularContaWeb', async (_, email, tokenOuSenha) => {
    return queries.vincularContaWeb(email, tokenOuSenha);
  });

  // Gestão de Planos & Assinatura (Grátis, Premium, Fiscal)
  ipcMain.handle('planos:obter', async () => {
    return queries.obterAssinatura();
  });
  ipcMain.handle('planos:alterar', async (_, plano, diasDuracao, status) => {
    return queries.alterarPlano(plano, diasDuracao, status);
  });
  ipcMain.handle('planos:iniciarTrial', async () => {
    return queries.iniciarTrial7Dias();
  });

  // Supabase Multi-tenant SaaS & Nuvem
  ipcMain.handle('supabase:cadastrarLoja', async (_, payload) => {
    return SupabaseService.cadastrarNovaLoja(payload);
  });
  ipcMain.handle('supabase:validarAssinatura', async (_, lojaId, dataUltimaValidacao) => {
    return SupabaseService.validarAssinaturaNuvem(lojaId, dataUltimaValidacao);
  });
  ipcMain.handle('supabase:listarLojas', async () => {
    return SupabaseService.listarTodasLojas();
  });
  ipcMain.handle('supabase:alterarPlanoLoja', async (_, lojaId, plano, status) => {
    return SupabaseService.alterarPlanoLoja(lojaId, plano, status);
  });
  ipcMain.handle('supabase:toggleStatusLoja', async (_, lojaId, ativo) => {
    return SupabaseService.toggleStatusLoja(lojaId, ativo);
  });
  ipcMain.handle('supabase:sincronizarCatalogo', async (_, produtos, lojaInfo) => {
    return SupabaseService.sincronizarCatalogo(produtos, lojaInfo);
  });

  // Gateway de Pagamento de Assinaturas
  ipcMain.handle('gateway:criarAssinatura', async (_, dados) => {
    return gatewayManager.getGateway().criarAssinatura(dados);
  });
  ipcMain.handle('gateway:consultarStatus', async (_, assinaturaId) => {
    return gatewayManager.getGateway().consultarStatus(assinaturaId);
  });
  ipcMain.handle('gateway:cancelar', async (_, assinaturaId) => {
    return gatewayManager.getGateway().cancelarAssinatura(assinaturaId);
  });

  // Crediário & Carnê
  ipcMain.handle('crediario:getConfig', async (_, lojaId) => {
    return crediarioService.getCrediarioConfig(lojaId);
  });
  ipcMain.handle('crediario:salvarConfig', async (_, dados, lojaId) => {
    return crediarioService.salvarCrediarioConfig(dados, lojaId);
  });
  ipcMain.handle('crediario:simular', async (_, valorTotal, valorEntrada, qtdParcelas, taxaJuros, dataPrimeira, lojaId) => {
    return crediarioService.simularCrediario(valorTotal, valorEntrada, qtdParcelas, taxaJuros, dataPrimeira, lojaId);
  });
  ipcMain.handle('crediario:verificarLimite', async (_, clienteId, valorDesejado, lojaId) => {
    return crediarioService.verificarLimiteCliente(clienteId, valorDesejado, lojaId);
  });
  ipcMain.handle('crediario:criarContrato', async (_, dados) => {
    return crediarioService.criarContratoCrediario(dados);
  });
  ipcMain.handle('crediario:listarContratos', async (_, filtros) => {
    return crediarioService.listarContratosCrediario(filtros);
  });
  ipcMain.handle('crediario:getContratoDetalhes', async (_, contratoId, lojaId) => {
    return crediarioService.getContratoDetalhes(contratoId, lojaId);
  });
  ipcMain.handle('crediario:listarParcelas', async (_, filtros) => {
    return crediarioService.listarParcelasCrediario(filtros);
  });
  ipcMain.handle('crediario:baixarParcela', async (_, dados) => {
    return crediarioService.baixarParcelaCrediario(dados);
  });
  ipcMain.handle('crediario:estornarPagamento', async (_, pagamentoId, usuarioId, justificativa, lojaId) => {
    return crediarioService.estornarPagamentoCrediario(pagamentoId, usuarioId, justificativa, lojaId);
  });
  ipcMain.handle('crediario:renegociarContrato', async (_, dados) => {
    return crediarioService.renegociarContratoCrediario(dados);
  });
  ipcMain.handle('crediario:getHistoricoCliente', async (_, clienteId, lojaId) => {
    return crediarioService.atualizarHistoricoCliente(clienteId, lojaId);
  });
  ipcMain.handle('crediario:executarJobDiario', async (_, lojaId) => {
    return crediarioService.executarJobDiarioCrediario(lojaId);
  });
  ipcMain.handle('crediario:getDashboard', async (_, lojaId) => {
    return crediarioService.getCrediarioDashboard(lojaId);
  });
  ipcMain.handle('crediario:gerarLinkWhatsApp', async (_, parcelaId, tipoMensagem, lojaId) => {
    return crediarioService.gerarLinkWhatsAppCobranca(parcelaId, tipoMensagem, lojaId);
  });
  ipcMain.handle('crediario:registrarEnvioCobranca', async (_, dados) => {
    return crediarioService.registrarEnvioCobrancaLog(dados);
  });
  ipcMain.handle('crediario:listarLogsCobranca', async (_, filtros) => {
    return crediarioService.listarLogsCobranca(filtros);
  });

  // Impressão & Geração de Documentos de Crediário (Carnê, Duplicata, Promissória)
  ipcMain.handle('crediario:obterDadosDocumento', async (_, contratoId, parcelasIds, lojaId) => {
    return crediarioService.obterDadosDocumentoCrediario(contratoId, parcelasIds, lojaId);
  });
  ipcMain.handle('crediario:gerarHtmlDocumento', async (_, tipo: 'carne' | 'duplicata' | 'promissoria', dados: DadosDocumentoCrediario) => {
    return gerarHtmlDocumento(tipo, dados);
  });
  ipcMain.handle('crediario:abrirPdf', async (_, tipo: 'carne' | 'duplicata' | 'promissoria', dados: DadosDocumentoCrediario) => {
    const html = gerarHtmlDocumento(tipo, dados);
    return pdfService.abrirPdfVisualizacao(html, `crediario_${tipo}`);
  });
  ipcMain.handle('crediario:salvarPdfComDialogo', async (_, tipo: 'carne' | 'duplicata' | 'promissoria', dados: DadosDocumentoCrediario, nomeSugerido?: string) => {
    const html = gerarHtmlDocumento(tipo, dados);
    const fileName = nomeSugerido || `crediario_${tipo}_contrato_${dados.contrato.id}.pdf`;
    return pdfService.salvarPdfComDialogo(html, fileName);
  });
  ipcMain.handle('crediario:imprimirDireto', async (_, tipo: 'carne' | 'duplicata' | 'promissoria', dados: DadosDocumentoCrediario) => {
    const html = gerarHtmlDocumento(tipo, dados);
    return pdfService.imprimirHtmlDireto(html);
  });
  ipcMain.handle('crediario:buscarParcelaPorCodigoBarras', async (_, codigo, lojaId) => {
    return crediarioService.buscarParcelaPorCodigoBarras(codigo, lojaId);
  });

  // Janela
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle('window:close', () => mainWindow?.close());
}

app.whenReady().then(async () => {
  try {
    await initDatabase();
    console.log('[Main] Banco de dados SQLite pronto.');
    iniciarAgendadorCrediario();
  } catch (err) {
    console.error('[Main] Falha ao inicializar o banco ou agendador:', err);
  }

  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

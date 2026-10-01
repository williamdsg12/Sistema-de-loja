import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCaixa } from '../context/CaixaContext';
import { usePlanos } from '../context/PlanosContext';
import { 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  DollarSign, 
  CreditCard, 
  QrCode, 
  UserCheck, 
  Percent, 
  ShoppingBag, 
  Check, 
  AlertCircle,
  ArrowRight,
  Layers,
  Printer,
  Image as ImageIcon,
  Tag,
  Store,
  Grid,
  List,
  Scale,
  Truck,
  FileText,
  Clock,
  RotateCcw,
  BookOpen,
  Calendar,
  X,
  Wallet,
  CheckCircle2,
  PhoneCall,
  User,
  Barcode,
  ShieldCheck,
  Lock,
  BadgeCheck,
  BadgeAlert,
  ChevronDown,
  Settings,
  MoreHorizontal,
  Package,
  Eye,
  RefreshCw,
  Boxes,
  AlertTriangle
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { ReceiptModal } from '../components/ReceiptModal';
import { 
  Produto, 
  Cliente, 
  ItemVendaCarrinho, 
  Venda, 
  ItemVenda, 
  TrocaDevolucaoItem,
  CrediarioConfig,
  CrediarioContrato,
  CrediarioParcela,
  SimulacaoCrediario,
  Usuario
} from '../types';
import { getTodaySaoPauloDate, formatarMoedaBR, formatarDataBR } from '../utils/datetime';
import { formatarCpfCnpj, formatarTelefone, formatarCep } from '../utils/validators';
import { safeApiCall } from '../utils/safeApi';

interface PdvViewProps {
  onOpenCaixaModal: () => void;
}

type TipoOperacao = 'venda' | 'pedido' | 'orcamento' | 'devolucao';
type AbaVendasHub = 'historico' | 'pedidos_abertos' | 'pedidos_aceitar' | 'orcamentos';

const somarMesesLocal = (dataBase: string, meses: number): string => {
  try {
    const partes = dataBase.split('-');
    const ano = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const dia = parseInt(partes[2], 10);
    const dataAlvo = new Date(ano, mes + meses, dia);
    if (dataAlvo.getDate() !== dia) dataAlvo.setDate(0);
    const y = dataAlvo.getFullYear();
    const m = String(dataAlvo.getMonth() + 1).padStart(2, '0');
    const d = String(dataAlvo.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch (e) {
    return dataBase;
  }
};

export const PdvView: React.FC<PdvViewProps> = ({ onOpenCaixaModal }) => {
  const { usuario } = useAuth();
  const { caixaAberto, verificarCaixa } = useCaixa();
  const { exigirRecurso } = usePlanos();

  // Configurações da Loja
  const [logoLoja, setLogoLoja] = useState<string>('');
  const [nomeLoja, setNomeLoja] = useState<string>('WS Gestão PDV');
  const [mostrarLogoFundo, setMostrarLogoFundo] = useState<boolean>(true);

  // MODO ATIVO: Hub de Vendas (false) vs Tela de Venda Aberta (true)
  const [modoVendaAtivo, setModoVendaAtivo] = useState<boolean>(false);
  const [tipoOperacao, setTipoOperacao] = useState<TipoOperacao>('venda');

  // HUB DE VENDAS (Aba Vendas Principal)
  const [abaVendasHub, setAbaVendasHub] = useState<AbaVendasHub>('historico');
  const [tipoVisualizacao, setTipoVisualizacao] = useState<'resumida' | 'produto'>('resumida');
  const [filtroCaixaAtual, setFiltroCaixaAtual] = useState<boolean>(false);
  const [filtroHistorico, setFiltroHistorico] = useState<string>('');
  const [historicoVendas, setHistoricoVendas] = useState<Venda[]>([]);
  const [pedidosEmAberto, setPedidosEmAberto] = useState<Venda[]>([]);
  const [orcamentosLista, setOrcamentosLista] = useState<Venda[]>([]);

  // TELA DE VENDA (PDV)
  const [carrinho, setCarrinho] = useState<ItemVendaCarrinho[]>([]);
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [quantidadeInput, setQuantidadeInput] = useState<number>(1);
  const [itemSelecionadoIdx, setItemSelecionadoIdx] = useState<number>(0);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [buscaClienteF5, setBuscaClienteF5] = useState<string>('');
  const [saldoCreditoCliente, setSaldoCreditoCliente] = useState<number>(0);
  const [descontoValor, setDescontoValor] = useState<number>(0);
  const [descontoTipo, setDescontoTipo] = useState<'reais' | 'porcentagem'>('reais');
  const [observacoesVenda, setObservacoesVenda] = useState<string>('');
  const [ultimoProdutoAdicionado, setUltimoProdutoAdicionado] = useState<Produto | null>(null);
  const [dataHoraAtual, setDataHoraAtual] = useState<string>('');

  // Dropdown Instantâneo de Autocomplete com Prévia de Imagem
  const [todosProdutos, setTodosProdutos] = useState<Produto[]>([]);
  const [dropdownBuscaAberto, setDropdownBuscaAberto] = useState<boolean>(false);
  const [produtosSugeridos, setProdutosSugeridos] = useState<Produto[]>([]);
  const [sugestaoSelecionadaIdx, setSugestaoSelecionadaIdx] = useState<number>(0);

  // Dados de Entrega (Aba Pedido / Atalho F9)
  const [dadosEntrega, setDadosEntrega] = useState<{
    endereco: string;
    taxaEntrega: number;
    entregador: string;
    previsao: string;
  }>({
    endereco: '',
    taxaEntrega: 0,
    entregador: '',
    previsao: ''
  });

  // Modais de Atalhos
  const [modalBalancaAberto, setModalBalancaAberto] = useState<boolean>(false);
  const [pesoBalancaSimulado, setPesoBalancaSimulado] = useState<number>(0.500);
  const [modalDescontoAberto, setModalDescontoAberto] = useState<boolean>(false);
  const [modalObsAberto, setModalObsAberto] = useState<boolean>(false);
  const [modalClienteAberto, setModalClienteAberto] = useState<boolean>(false);
  const [clientesLista, setClientesLista] = useState<Cliente[]>([]);
  const [modalEntregaAberto, setModalEntregaAberto] = useState<boolean>(false);
  const [modalEditarItemAberto, setModalEditarItemAberto] = useState<boolean>(false);
  const [itemEditando, setItemEditando] = useState<{ index: number; preco: number; qtd: number; desconto: number } | null>(null);
  const [modalQtdAberto, setModalQtdAberto] = useState<boolean>(false);

  // Catálogo F2 Modal
  const [modalBuscaAberto, setModalBuscaAberto] = useState<boolean>(false);
  const [produtosCatalogo, setProdutosCatalogo] = useState<Produto[]>([]);
  const [viewCatalogoModo, setViewCatalogoModo] = useState<'grid' | 'lista'>('grid');
  const [filtroCategoriaCatalogo, setFiltroCategoriaCatalogo] = useState<string>('todas');

  // Modal de Pagamento
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState<boolean>(false);
  const [formaPagamento, setFormaPagamento] = useState<string>('dinheiro');
  const [valorRecebidoDinheiro, setValorRecebidoDinheiro] = useState<number>(0);
  const [salvarTrocoComoCredito, setSalvarTrocoComoCredito] = useState<boolean>(false);
  const [imprimirComprovante, setImprimirComprovante] = useState<boolean>(true);
  const [processandoVenda, setProcessandoVenda] = useState<boolean>(false);

  // Estados do Crediário no PDV
  const [crediarioConfig, setCrediarioConfig] = useState<CrediarioConfig | null>(null);
  const [crediarioEntrada, setCrediarioEntrada] = useState<number>(0);
  const [crediarioParcelasQtd, setCrediarioParcelasQtd] = useState<number>(1);
  const [crediarioDataPrimeira, setCrediarioDataPrimeira] = useState<string>(somarMesesLocal(getTodaySaoPauloDate(), 1));
  const [crediarioTaxaJuros, setCrediarioTaxaJuros] = useState<number>(2.5);
  const [crediarioSemJuros, setCrediarioSemJuros] = useState<boolean>(false);
  const [crediarioSimulacao, setCrediarioSimulacao] = useState<SimulacaoCrediario | null>(null);
  const [crediarioLimiteInfo, setCrediarioLimiteInfo] = useState<{
    permitido: boolean;
    limiteTotal: number;
    saldoDevedor: number;
    limiteDisponivel: number;
    statusCrediario: string;
    temParcelasAtrasadas: boolean;
    qtdAtrasadas: number;
    exigeAprovacaoGerente: boolean;
    mensagem?: string;
  } | null>(null);
  const [saldoCreditoDetalhes, setSaldoCreditoDetalhes] = useState<{
    limite: number;
    utilizado: number;
    disponivel: number;
    emAtraso: number;
    diasMaiorAtraso: number;
    bloqueado: boolean;
    saldoHaver?: number;
  } | null>(null);
  
  // Liberação do Gerente
  const [modalLiberacaoGerenteAberto, setModalLiberacaoGerenteAberto] = useState<boolean>(false);
  const [usuariosGerentes, setUsuariosGerentes] = useState<Usuario[]>([]);
  const [gerenteSelecionadoId, setGerenteSelecionadoId] = useState<number | null>(null);
  const [gerenteSenha, setGerenteSenha] = useState<string>('');
  const [gerenteMotivo, setGerenteMotivo] = useState<string>('Autorização de compra no Crediário acima do limite');
  const [gerenteAprovado, setGerenteAprovado] = useState<boolean>(false);
  const [gerenteAprovadoPorNome, setGerenteAprovadoPorNome] = useState<string>('');
  const [gerenteErroMensagem, setGerenteErroMensagem] = useState<string>('');
  const [gerenteBloqueadoSegundos, setGerenteBloqueadoSegundos] = useState<number>(0);

  // Contrato pós-venda
  const [contratoCrediarioCriado, setContratoCrediarioCriado] = useState<CrediarioContrato | null>(null);
  const [parcelasCrediarioCriadas, setParcelasCrediarioCriadas] = useState<CrediarioParcela[]>([]);

  // Pós-Venda / Comprovante
  const [modalComprovanteAberto, setModalComprovanteAberto] = useState<boolean>(false);
  const [ultimaVenda, setUltimaVenda] = useState<Venda | null>(null);
  const [ultimosItens, setUltimosItens] = useState<ItemVenda[]>([]);
  const [emitindoNFCe, setEmitindoNFCe] = useState<boolean>(false);

  // Módulo de Troca e Devolução
  const [criterioBuscaDevolucao, setCriterioBuscaDevolucao] = useState<'numero' | 'cliente' | 'data' | 'produto'>('numero');
  const [termoBuscaDevolucao, setTermoBuscaDevolucao] = useState<string>('');
  const [vendasEncontradasDevolucao, setVendasEncontradasDevolucao] = useState<any[]>([]);
  const [vendaSelecionadaDevolucao, setVendaSelecionadaDevolucao] = useState<any | null>(null);
  const [itensDevolucaoState, setItensDevolucaoState] = useState<{
    [itemId: number]: { selecionado: boolean; qtdDevolver: number; subtotalDevolver: number }
  }>({});
  const [formaReembolsoDevolucao, setFormaReembolsoDevolucao] = useState<string>('credito');
  const [motivoDevolucao, setMotivoDevolucao] = useState<string>('Troca/Devolução de mercadoria');
  const [processandoDevolucao, setProcessandoDevolucao] = useState<boolean>(false);

  // Refs de Foco
  const inputBuscaRef = useRef<HTMLInputElement>(null);
  const inputRecebidoRef = useRef<HTMLInputElement>(null);
  const inputSenhaGerenteRef = useRef<HTMLInputElement>(null);

  // Foco automático ao abrir modal de liberação do gerente
  useEffect(() => {
    if (modalLiberacaoGerenteAberto) {
      const timer = setTimeout(() => {
        inputSenhaGerenteRef.current?.focus();
        inputSenhaGerenteRef.current?.select();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [modalLiberacaoGerenteAberto]);

  // Atualização do Relógio em Tempo Real
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setDataHoraAtual(now.toLocaleString('pt-BR'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Carregar rascunho de venda salva localmente (recuperação pós-crash / refresh)
  useEffect(() => {
    try {
      const draft = localStorage.getItem('ws_pdv_draft_sale');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.carrinho && parsed.carrinho.length > 0) {
          setCarrinho(parsed.carrinho);
          if (parsed.clienteSelecionado) setClienteSelecionado(parsed.clienteSelecionado);
          if (parsed.descontoValor) setDescontoValor(parsed.descontoValor);
          if (parsed.descontoTipo) setDescontoTipo(parsed.descontoTipo);
          if (parsed.observacoesVenda) setObservacoesVenda(parsed.observacoesVenda);
          if (parsed.tipoOperacao) setTipoOperacao(parsed.tipoOperacao);
          setModoVendaAtivo(true);
        }
      }
    } catch (e) {
      console.warn('Erro ao restaurar rascunho de venda:', e);
    }
  }, []);

  // Salvar rascunho sempre que houver alteração
  useEffect(() => {
    try {
      if (carrinho.length > 0) {
        localStorage.setItem('ws_pdv_draft_sale', JSON.stringify({
          carrinho,
          clienteSelecionado,
          descontoValor,
          descontoTipo,
          observacoesVenda,
          tipoOperacao
        }));
      } else {
        localStorage.removeItem('ws_pdv_draft_sale');
      }
    } catch (e) {}
  }, [carrinho, clienteSelecionado, descontoValor, descontoTipo, observacoesVenda, tipoOperacao]);

  // Carregar Configurações e Produtos
  useEffect(() => {
    const carregarConfig = async () => {
      try {
        const configs = await safeApiCall(() => window.api.config.obter(), {}, 'config.obter');
        if (configs?.logo_url) setLogoLoja(configs.logo_url);
        if (configs?.nome_loja) setNomeLoja(configs.nome_loja);
        setMostrarLogoFundo(configs?.mostrar_logo_fundo_pdv !== '0');
      } catch (e) {
        console.error(e);
      }
    };

    const carregarProdutos = async () => {
      try {
        const prods = await safeApiCall(() => window.api.produtos.listar('', true), [], 'produtos.listar');
        setTodosProdutos(prods || []);
        setProdutosCatalogo(prods || []);
      } catch (e) {
        console.error(e);
      }
    };

    carregarConfig();
    carregarProdutos();
    carregarListasVendas();
  }, []);

  const carregarListasVendas = async () => {
    try {
      const lista = await safeApiCall(() => window.api.vendas.listar(), [], 'vendas.listar');
      setHistoricoVendas(lista || []);
      setPedidosEmAberto((lista || []).filter((v) => v.tipo_operacao === 'pedido' || v.status_pedido === 'aberto'));
      setOrcamentosLista((lista || []).filter((v) => v.tipo_operacao === 'orcamento'));
    } catch (e) {
      console.error(e);
    }
  };

  // Recarrega saldo e limite do cliente selecionado de forma ultra segura
  useEffect(() => {
    if (clienteSelecionado) {
      safeApiCall(
        () => window.api.clientes.getSaldoCreditoDetalhes(clienteSelecionado.id),
        null,
        'clientes.getSaldoCreditoDetalhes'
      ).then((res) => {
        if (res) {
          setSaldoCreditoDetalhes(res);
          setSaldoCreditoCliente(res.disponivel);
        } else {
          setSaldoCreditoDetalhes(null);
          setSaldoCreditoCliente(0);
        }
      });

      safeApiCall(
        () => window.api.crediario.verificarLimite(clienteSelecionado.id, 0),
        null,
        'crediario.verificarLimite'
      ).then(setCrediarioLimiteInfo);
    } else {
      setSaldoCreditoCliente(0);
      setSaldoCreditoDetalhes(null);
      setCrediarioLimiteInfo(null);
    }
  }, [clienteSelecionado]);

  // Filtragem de produtos para autocomplete instantâneo com imagem (fica escondido até digitar ou acionar)
  useEffect(() => {
    if (!termoBusca.trim()) {
      setProdutosSugeridos([]);
      setDropdownBuscaAberto(false);
      setSugestaoSelecionadaIdx(0);
      return;
    }

    const t = termoBusca.toLowerCase().trim();
    const filtrados = todosProdutos.filter(
      (p) =>
        (p.nome && p.nome.toLowerCase().includes(t)) ||
        (p.codigo && p.codigo.toLowerCase().includes(t)) ||
        ((p as any).codigo_barras && (p as any).codigo_barras.toLowerCase().includes(t))
    );
    setProdutosSugeridos(filtrados.slice(0, 30));
    setSugestaoSelecionadaIdx(0);
    setDropdownBuscaAberto(true);
  }, [termoBusca, todosProdutos]);

  // =========================================================================
  // ATALHOS DE TECLADO GLOBAIS NO PDV
  // =========================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (modalComprovanteAberto) return;

      const target = e.target as HTMLElement | null;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );

      // Se o modal de liberação de gerente estiver aberto, apenas ESC fecha o modal
      if (modalLiberacaoGerenteAberto) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setModalLiberacaoGerenteAberto(false);
        }
        return;
      }

      // Se o usuário estiver focado e digitando em qualquer campo de entrada e não for Escape, não interceptar
      if (isInput && e.key !== 'Escape') {
        return;
      }

      // Atalhos quando NÃO está em modo de venda (Hub de Vendas)
      if (!modoVendaAtivo) {
        if (e.key === 'F3') {
          e.preventDefault();
          iniciarNovaVenda('venda');
        } else if (e.key === 'F4') {
          e.preventDefault();
          iniciarNovaVenda('pedido');
        } else if (e.key === 'F5') {
          e.preventDefault();
          iniciarNovaVenda('orcamento');
        }
        return;
      }

      // Atalhos quando ESTÁ em modo de venda (PDV aberto)
      if (e.key === 'F1') {
        e.preventDefault();
        setModalBalancaAberto(true);
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (carrinho.length > 0) {
          abrirModalPagamento();
        } else {
          setProdutosSugeridos(todosProdutos.slice(0, 30));
          setDropdownBuscaAberto(true);
          inputBuscaRef.current?.focus();
        }
      } else if (e.key === 'F3') {
        e.preventDefault();
        setModalDescontoAberto(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        setModalObsAberto(true);
      } else if (e.key === 'F5') {
        e.preventDefault();
        abrirModalClientes();
      } else if (e.key === 'F9') {
        e.preventDefault();
        setModalEntregaAberto(true);
      } else if (e.key === 'F10') {
        e.preventDefault();
        if (carrinho.length > 0 && carrinho[itemSelecionadoIdx]) {
          const it = carrinho[itemSelecionadoIdx];
          setItemEditando({
            index: itemSelecionadoIdx,
            preco: it.preco_unitario,
            qtd: it.quantidade,
            desconto: it.desconto_unitario || 0
          });
          setModalEditarItemAberto(true);
        }
      } else if (e.key === 'F12') {
        e.preventDefault();
        setModalQtdAberto(true);
      } else if (e.key === 'Escape') {
        if (dropdownBuscaAberto) {
          setDropdownBuscaAberto(false);
        } else if (
          modalBalancaAberto || modalDescontoAberto || modalObsAberto || 
          modalClienteAberto || modalEntregaAberto || modalEditarItemAberto || 
          modalQtdAberto || modalPagamentoAberto || modalBuscaAberto
        ) {
          fecharTodosModais();
        } else {
          // Fecha tela de venda e volta ao Hub
          setModoVendaAtivo(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    modoVendaAtivo,
    carrinho,
    itemSelecionadoIdx,
    modalComprovanteAberto,
    dropdownBuscaAberto,
    modalBalancaAberto,
    modalDescontoAberto,
    modalObsAberto,
    modalClienteAberto,
    modalEntregaAberto,
    modalEditarItemAberto,
    modalQtdAberto,
    modalPagamentoAberto,
    modalBuscaAberto
  ]);

  const fecharTodosModais = () => {
    setModalLiberacaoGerenteAberto(false);
    setModalBalancaAberto(false);
    setModalBuscaAberto(false);
    setModalDescontoAberto(false);
    setModalObsAberto(false);
    setModalClienteAberto(false);
    setModalEntregaAberto(false);
    setModalEditarItemAberto(false);
    setModalQtdAberto(false);
    setModalPagamentoAberto(false);
  };

  const iniciarNovaVenda = (tipo: TipoOperacao) => {
    setTipoOperacao(tipo);
    setModoVendaAtivo(true);
    setCarrinho([]);
    setClienteSelecionado(null);
    setDescontoValor(0);
    setObservacoesVenda('');
    setDadosEntrega({ endereco: '', taxaEntrega: 0, entregador: '', previsao: '' });
    setTermoBusca('');
    setDropdownBuscaAberto(false);
    setTimeout(() => inputBuscaRef.current?.focus(), 150);
  };

  // Cálculos do Carrinho
  const subtotal = carrinho.reduce((acc, item) => acc + item.subtotal, 0);
  const totalQtd = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  const valorDescontoCalculado = descontoTipo === 'porcentagem'
    ? (subtotal * (descontoValor / 100))
    : descontoValor;
  const taxaEntregaTotal = dadosEntrega.taxaEntrega || 0;
  const totalGeral = Math.max(0, subtotal - valorDescontoCalculado + taxaEntregaTotal);
  const trocoDinheiro = Math.max(0, valorRecebidoDinheiro - totalGeral);

  // Adicionar Item ao Carrinho
  const adicionarAoCarrinho = (produto: Produto, qtd: number = 1) => {
    setCarrinho((prev) => {
      const idxExistente = prev.findIndex((item) => item.produto_id === produto.id);
      if (idxExistente >= 0) {
        const novoCarrinho = [...prev];
        const itemAtual = novoCarrinho[idxExistente];
        const novaQtd = itemAtual.quantidade + qtd;
        novoCarrinho[idxExistente] = {
          ...itemAtual,
          quantidade: novaQtd,
          subtotal: novaQtd * itemAtual.preco_unitario - (itemAtual.desconto_unitario || 0) * novaQtd
        };
        setItemSelecionadoIdx(idxExistente);
        return novoCarrinho;
      } else {
        const novoItem: ItemVendaCarrinho = {
          produto_id: produto.id,
          produto_nome: produto.nome,
          produto_codigo: produto.codigo,
          unidade_medida: produto.unidade_medida,
          tamanho: produto.tamanho,
          cor: produto.cor,
          imagem_url: produto.imagem_url,
          quantidade: qtd,
          preco_unitario: produto.preco_venda,
          desconto_unitario: 0,
          subtotal: qtd * produto.preco_venda,
          estoque_atual: produto.estoque_atual
        };
        const novo = [...prev, novoItem];
        setItemSelecionadoIdx(novo.length - 1);
        return novo;
      }
    });

    setUltimoProdutoAdicionado(produto);
    setTermoBusca('');
    setDropdownBuscaAberto(false);
    setQuantidadeInput(1);
    inputBuscaRef.current?.focus();
  };

  // Navegação no dropdown instantâneo com Setas e Enter
  const handleBuscaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownBuscaAberto || produtosSugeridos.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSugestaoSelecionadaIdx((prev) => (prev + 1) % produtosSugeridos.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSugestaoSelecionadaIdx((prev) => (prev - 1 + produtosSugeridos.length) % produtosSugeridos.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const p = produtosSugeridos[sugestaoSelecionadaIdx];
      if (p) {
        adicionarAoCarrinho(p, quantidadeInput);
      }
    } else if (e.key === 'Escape') {
      setDropdownBuscaAberto(false);
    }
  };

  const handleBuscaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dropdownBuscaAberto && produtosSugeridos.length > 0) {
      const p = produtosSugeridos[sugestaoSelecionadaIdx] || produtosSugeridos[0];
      adicionarAoCarrinho(p, quantidadeInput);
      return;
    }

    if (!termoBusca.trim()) return;

    try {
      const produto = await window.api.produtos.buscarPorCodigoOuNome(termoBusca.trim());
      if (produto) {
        adicionarAoCarrinho(produto, quantidadeInput);
      } else {
        alert(`Produto não encontrado com o termo: "${termoBusca}"`);
      }
    } catch (err: any) {
      alert(`Erro na busca de produtos: ${err?.message || err}`);
    }
  };

  const abrirModalClientes = async () => {
    try {
      const clis = await window.api.clientes.listar();
      setClientesLista(clis);
      setModalClienteAberto(true);
    } catch (e) {
      console.error(e);
    }
  };

  // Carregar Configurações do Crediário ao iniciar
  useEffect(() => {
    if (window.api?.crediario) {
      window.api.crediario.getConfig().then((cfg) => {
        setCrediarioConfig(cfg);
        if (cfg?.juros_mensal_percentual !== undefined) {
          setCrediarioTaxaJuros(cfg.juros_mensal_percentual);
        }
      }).catch(console.error);
    }
  }, []);

  // Efeito de contagem regressiva para bloqueio temporário de tentativas
  useEffect(() => {
    let interval: any;
    if (gerenteBloqueadoSegundos > 0) {
      interval = setInterval(() => {
        setGerenteBloqueadoSegundos((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gerenteBloqueadoSegundos]);

  // Recalcula simulação do Crediário e valida limite com total COM JUROS (soma das parcelas)
  useEffect(() => {
    if (formaPagamento === 'crediario' && totalGeral > 0) {
      const taxa = crediarioSemJuros ? 0 : crediarioTaxaJuros;
      safeApiCall(
        () => window.api.crediario.simular(
          totalGeral,
          Number(crediarioEntrada) || 0,
          crediarioParcelasQtd,
          taxa,
          crediarioDataPrimeira
        ),
        null,
        'crediario.simular'
      ).then((sim) => {
        setCrediarioSimulacao(sim);
        if (clienteSelecionado) {
          // Total financiado COM JUROS (soma exata de todas as parcelas simuladas)
          const valorFinanciadoComJuros = sim?.parcelas?.reduce((acc: number, p: any) => acc + (Number(p.valor) || 0), 0) ?? Math.max(0, totalGeral - (Number(crediarioEntrada) || 0));
          safeApiCall(
            () => window.api.crediario.verificarLimite(clienteSelecionado.id, valorFinanciadoComJuros),
            null,
            'crediario.verificarLimite'
          ).then(setCrediarioLimiteInfo);
        }
      });
    } else {
      setCrediarioLimiteInfo(null);
    }
  }, [formaPagamento, totalGeral, crediarioEntrada, crediarioParcelasQtd, crediarioTaxaJuros, crediarioSemJuros, crediarioDataPrimeira, clienteSelecionado]);

  // Carrega detalhes de limite/dívida do cliente selecionado
  useEffect(() => {
    if (clienteSelecionado?.id) {
      safeApiCall(
        () => window.api.clientes.getSaldoCreditoDetalhes(clienteSelecionado.id),
        null,
        'clientes.getSaldoCreditoDetalhes'
      ).then(setSaldoCreditoDetalhes);
    } else {
      setSaldoCreditoDetalhes(null);
    }
  }, [clienteSelecionado]);

  const abrirModalLiberacaoGerente = async () => {
    setGerenteErroMensagem('');
    setGerenteSenha('');
    try {
      const users = await window.api.auth.listarUsuarios();
      const gerentes = users.filter((u: Usuario) => (u.perfil === 'admin' || u.perfil === 'gerente') && u.ativo === 1);
      setUsuariosGerentes(gerentes);
      if (gerentes.length > 0) {
        setGerenteSelecionadoId(gerentes[0].id);
      }
      setModalLiberacaoGerenteAberto(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAprovarGerente = async () => {
    setGerenteErroMensagem('');
    if (!gerenteSelecionadoId) {
      setGerenteErroMensagem('Selecione o usuário autorizador.');
      return;
    }
    if (!gerenteSenha.trim()) {
      setGerenteErroMensagem('Informe a senha do gerente/administrador.');
      return;
    }

    try {
      const gUser = usuariosGerentes.find(u => u.id === gerenteSelecionadoId);
      if (!gUser) {
        setGerenteErroMensagem('Usuário não encontrado.');
        return;
      }

      const valorFinanciadoComJuros = crediarioSimulacao?.parcelas?.reduce((acc: number, p: any) => acc + (Number(p.valor) || 0), 0) ?? Math.max(0, totalGeral - (Number(crediarioEntrada) || 0));

      const resAuth = await window.api.auth.autorizarGerente(gerenteSelecionadoId, gerenteSenha, {
        usuario_operador_id: usuario?.id,
        usuario_operador_nome: usuario?.nome,
        cliente_id: clienteSelecionado?.id,
        cliente_nome: clienteSelecionado?.nome,
        valor_venda: valorFinanciadoComJuros,
        motivo: gerenteMotivo || 'Limite de crédito excedido no Crediário'
      });

      if (!resAuth.sucesso) {
        setGerenteErroMensagem(resAuth.mensagem);
        if (resAuth.tempoBloqueioRestante) {
          setGerenteBloqueadoSegundos(resAuth.tempoBloqueioRestante);
        }
        setGerenteSenha('');
        inputSenhaGerenteRef.current?.focus();
        return;
      }

      setGerenteAprovado(true);
      setGerenteAprovadoPorNome(resAuth.usuario?.nome || gUser.nome);
      setModalLiberacaoGerenteAberto(false);
      setGerenteSenha('');
      setGerenteErroMensagem('');
    } catch (e: any) {
      setGerenteErroMensagem(`Erro na validação do gerente: ${e?.message || e}`);
    }
  };

  const abrirModalPagamento = () => {
    if (!caixaAberto && tipoOperacao !== 'orcamento') {
      alert('O Caixa está fechado! Abra o caixa antes de realizar vendas.');
      onOpenCaixaModal();
      return;
    }
    setValorRecebidoDinheiro(totalGeral);
    setGerenteAprovado(false);
    setGerenteAprovadoPorNome('');
    setModalPagamentoAberto(true);
    setTimeout(() => inputRecebidoRef.current?.select(), 100);
  };

  // Finalizar Operação (Venda / Pedido / Orçamento)
  const handleFinalizarOperacao = async () => {
    if (carrinho.length === 0) return;

    if (formaPagamento === 'crediario') {
      if (!clienteSelecionado) {
        alert('Selecione um cliente cadastrado para realizar venda no Crediário!');
        abrirModalClientes();
        return;
      }

      if (crediarioLimiteInfo && !crediarioLimiteInfo.permitido && !gerenteAprovado) {
        alert(crediarioLimiteInfo.mensagem || 'Limite de crédito não aprovado para esta operação. Solicite autorização de um gerente.');
        abrirModalLiberacaoGerente();
        return;
      }
    }

    setProcessandoVenda(true);

    try {
      const payload = {
        cliente_id: clienteSelecionado?.id,
        usuario_id: usuario?.id || 1,
        caixa_sessao_id: caixaAberto?.id || 1,
        tipo_operacao: tipoOperacao,
        status_pedido: tipoOperacao === 'orcamento' ? 'orcamento' : (tipoOperacao === 'pedido' ? 'aberto' : 'concluida'),
        subtotal,
        desconto: valorDescontoCalculado,
        total: totalGeral,
        forma_pagamento: formaPagamento,
        valor_pago: formaPagamento === 'crediario' ? (Number(crediarioEntrada) || 0) : (Number(valorRecebidoDinheiro) || totalGeral),
        troco: formaPagamento === 'crediario' ? 0 : trocoDinheiro,
        salvar_troco_credito: salvarTrocoComoCredito ? 1 : 0,
        observacoes: observacoesVenda || undefined,
        dados_entrega_json: tipoOperacao === 'pedido' ? JSON.stringify(dadosEntrega) : undefined,
        itens: carrinho.map((i) => ({
          produto_id: i.produto_id,
          quantidade: i.quantidade,
          preco_unitario: i.preco_unitario - (i.desconto_unitario || 0),
          subtotal: i.subtotal
        }))
      };

      const resultado = await window.api.vendas.criarVenda(payload);
      setUltimaVenda(resultado.venda);
      setUltimosItens(resultado.itens);

      // Se for Crediário, cria o contrato mestre e cronograma de parcelas
      if (formaPagamento === 'crediario' && clienteSelecionado) {
        const resContrato = await window.api.crediario.criarContrato({
          clienteId: clienteSelecionado.id,
          vendaId: resultado.vendaId,
          valorTotal: totalGeral,
          valorEntrada: Number(crediarioEntrada) || 0,
          qtdParcelas: crediarioParcelasQtd,
          dataPrimeiraParcela: crediarioDataPrimeira,
          taxaJurosMensal: crediarioSemJuros ? 0 : crediarioTaxaJuros,
          usuarioId: usuario?.id || 1,
          aprovadoPorUsuarioId: gerenteAprovado && gerenteSelecionadoId ? gerenteSelecionadoId : undefined,
          motivoAprovacao: gerenteAprovado ? gerenteMotivo : undefined,
          lojaId: 1
        });
        setContratoCrediarioCriado(resContrato.contrato);
        setParcelasCrediarioCriadas(resContrato.parcelas);
      } else {
        setContratoCrediarioCriado(null);
        setParcelasCrediarioCriadas([]);
      }

      // Limpa carrinho e encerra tela de venda
      setCarrinho([]);
      setDescontoValor(0);
      setObservacoesVenda('');
      setDadosEntrega({ endereco: '', taxaEntrega: 0, entregador: '', previsao: '' });
      setModalPagamentoAberto(false);
      setGerenteAprovado(false);
      setGerenteAprovadoPorNome('');
      carregarListasVendas();

      if (imprimirComprovante) {
        setModalComprovanteAberto(true);
      } else {
        alert(`${tipoOperacao === 'orcamento' ? 'Orçamento gerado' : (tipoOperacao === 'pedido' ? 'Pedido registrado' : 'Venda concluída')} com sucesso! #${resultado.vendaId}`);
        setModoVendaAtivo(false);
      }
    } catch (err: any) {
      alert(`Erro ao finalizar: ${err?.message || err}`);
    } finally {
      setProcessandoVenda(false);
    }
  };

  // Retomar Pedido ou Orçamento no PDV
  const retomarVendaNoPdv = async (venda: Venda) => {
    try {
      const detalhes = await window.api.vendas.getDetalhes(venda.id);
      const novosItens: ItemVendaCarrinho[] = detalhes.itens.map((it) => ({
        produto_id: it.produto_id,
        produto_nome: it.produto_nome,
        produto_codigo: it.produto_codigo,
        unidade_medida: it.unidade_medida,
        tamanho: it.tamanho,
        cor: it.cor,
        imagem_url: it.imagem_url,
        quantidade: it.quantidade,
        preco_unitario: it.preco_unitario,
        desconto_unitario: 0,
        subtotal: it.subtotal,
        estoque_atual: 99
      }));

      setCarrinho(novosItens);
      if (venda.cliente_id) {
        const clientes = await window.api.clientes.listar();
        const cli = clientes.find((c) => c.id === venda.cliente_id);
        if (cli) setClienteSelecionado(cli);
      }
      setTipoOperacao('venda');
      setModoVendaAtivo(true);
    } catch (e: any) {
      alert(`Erro ao carregar: ${e?.message || e}`);
    }
  };

  const visualizarComprovanteVenda = async (venda: Venda) => {
    try {
      const detalhes = await window.api.vendas.getDetalhes(venda.id);
      setUltimaVenda(venda);
      setUltimosItens(detalhes.itens);

      if (venda.forma_pagamento === 'crediario' && window.api?.crediario) {
        const contratos = await window.api.crediario.listarContratos({ clienteId: venda.cliente_id });
        const contrato = contratos && contratos.length > 0 ? contratos.find((c: any) => c.venda_id === venda.id) || contratos[0] : null;
        if (contrato) {
          setContratoCrediarioCriado(contrato);
          const parcs = await window.api.crediario.listarParcelas({ contratoId: contrato.id });
          setParcelasCrediarioCriadas(parcs);
        } else {
          setContratoCrediarioCriado(null);
          setParcelasCrediarioCriadas([]);
        }
      } else {
        setContratoCrediarioCriado(null);
        setParcelasCrediarioCriadas([]);
      }

      setModalComprovanteAberto(true);
    } catch (e: any) {
      alert(`Erro ao carregar comprovante: ${e?.message || e}`);
    }
  };

  // Troca e Devolução
  const handleBuscarVendaDevolucao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termoBuscaDevolucao.trim()) return;

    try {
      const vendas = await window.api.devolucoes.buscarVendas(criterioBuscaDevolucao, termoBuscaDevolucao.trim());
      setVendasEncontradasDevolucao(vendas);
      if (vendas.length === 1) {
        selecionarVendaParaDevolver(vendas[0]);
      } else if (vendas.length === 0) {
        alert('Nenhuma venda encontrada com os critérios informados.');
      }
    } catch (err: any) {
      alert(`Erro na busca: ${err?.message || err}`);
    }
  };

  const selecionarVendaParaDevolver = (venda: any) => {
    setVendaSelecionadaDevolucao(venda);
    const novoEstado: any = {};
    for (const it of venda.itens) {
      novoEstado[it.id] = {
        selecionado: false,
        qtdDevolver: it.quantidade,
        subtotalDevolver: it.subtotal
      };
    }
    setItensDevolucaoState(novoEstado);
  };

  const toggleItemDevolucao = (itemId: number, it: any) => {
    setItensDevolucaoState((prev) => {
      const atual = prev[itemId] || { selecionado: false, qtdDevolver: it.quantidade, subtotalDevolver: it.subtotal };
      const novoSel = !atual.selecionado;
      return {
        ...prev,
        [itemId]: {
          ...atual,
          selecionado: novoSel,
          subtotalDevolver: novoSel ? (atual.qtdDevolver * it.preco_unitario) : 0
        }
      };
    });
  };

  const alterarQtdDevolver = (itemId: number, it: any, novaQtd: number) => {
    const qtdValida = Math.min(it.quantidade, Math.max(1, novaQtd));
    setItensDevolucaoState((prev) => ({
      ...prev,
      [itemId]: {
        selecionado: true,
        qtdDevolver: qtdValida,
        subtotalDevolver: qtdValida * it.preco_unitario
      }
    }));
  };

  const selecionarTodosDevolucao = () => {
    if (!vendaSelecionadaDevolucao) return;
    const novo: any = {};
    for (const it of vendaSelecionadaDevolucao.itens) {
      novo[it.id] = {
        selecionado: true,
        qtdDevolver: it.quantidade,
        subtotalDevolver: it.subtotal
      };
    }
    setItensDevolucaoState(novo);
  };

  const totalDevolucaoCalculado = vendaSelecionadaDevolucao?.itens?.reduce((acc: number, it: any) => {
    const state = itensDevolucaoState[it.id];
    return acc + (state?.selecionado ? state.subtotalDevolver : 0);
  }, 0) || 0;

  const handleProcessarDevolucaoFinal = async () => {
    if (!vendaSelecionadaDevolucao || totalDevolucaoCalculado <= 0) {
      alert('Selecione ao menos um item para devolução.');
      return;
    }

    setProcessandoDevolucao(true);
    try {
      const itensFiltrados = vendaSelecionadaDevolucao.itens
        .filter((it: any) => itensDevolucaoState[it.id]?.selecionado)
        .map((it: any) => {
          const st = itensDevolucaoState[it.id];
          return {
            produtoId: it.produto_id,
            quantidade: st.qtdDevolver,
            valorUnitario: it.preco_unitario,
            subtotal: st.subtotalDevolver
          };
        });

      const res = await window.api.devolucoes.processarDevolucao({
        vendaOrigemId: vendaSelecionadaDevolucao.id,
        usuarioId: usuario?.id || 1,
        clienteId: vendaSelecionadaDevolucao.cliente_id,
        formaReembolso: formaReembolsoDevolucao,
        motivo: motivoDevolucao,
        itens: itensFiltrados,
        totalDevolvido: totalDevolucaoCalculado
      });

      alert(`Devolução #${res.devolucaoId} concluída com sucesso! Valor devolvido: R$ ${totalDevolucaoCalculado.toFixed(2)}.`);
      setVendaSelecionadaDevolucao(null);
      setVendasEncontradasDevolucao([]);
      setTermoBuscaDevolucao('');
      setModoVendaAtivo(false);
      carregarListasVendas();
    } catch (e: any) {
      alert(`Erro na devolução: ${e?.message || e}`);
    } finally {
      setProcessandoDevolucao(false);
    }
  };

  const formatCurrency = (v?: number | string | null) => {
    const num = typeof v === 'number' ? (isNaN(v) ? 0 : v) : Number(v) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const produtoSugeridoHover = produtosSugeridos[sugestaoSelecionadaIdx] || produtosSugeridos[0] || null;

  // =========================================================================
  // RENDERIZAÇÃO: 1. HUB DE VENDAS (EXATAMENTE COMO NO PRIMEIRO PRINT)
  // =========================================================================
  if (!modoVendaAtivo) {
    const listaExibicao = (abaVendasHub === 'pedidos_abertos' 
      ? pedidosEmAberto 
      : abaVendasHub === 'orcamentos' 
      ? orcamentosLista 
      : historicoVendas
    ).filter((v) => {
      if (filtroHistorico) {
        const t = filtroHistorico.toLowerCase();
        const bateNome = v.cliente_nome && v.cliente_nome.toLowerCase().includes(t);
        const bateId = v.id.toString().includes(t);
        if (!bateNome && !bateId) return false;
      }
      if (filtroCaixaAtual && caixaAberto) {
        if (v.caixa_sessao_id !== caixaAberto.id) return false;
      }
      return true;
    });

    return (
      <div className="h-full flex flex-col bg-white text-slate-800 overflow-hidden font-sans select-text">
        {/* Top Header Hub */}
        <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Vendas</h1>
          <div className="flex items-center gap-3">
            {caixaAberto ? (
              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-bold">
                Caixa Aberto #{caixaAberto.id}
              </span>
            ) : (
              <button
                type="button"
                onClick={onOpenCaixaModal}
                className="text-xs bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-full font-bold hover:bg-rose-100 transition-colors cursor-pointer"
              >
                Caixa Fechado (Clique para abrir)
              </button>
            )}
          </div>
        </div>

        {/* Linha de Botões de Ação Principais (Pill Buttons) */}
        <div className="px-6 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => iniciarNovaVenda('venda')}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-full text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Venda - F3</span>
          </button>

          <button
            type="button"
            onClick={() => iniciarNovaVenda('pedido')}
            className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <Truck className="w-4 h-4 text-slate-500" />
            <span>Novo Pedido - F4</span>
          </button>

          <button
            type="button"
            onClick={() => iniciarNovaVenda('orcamento')}
            className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Novo Orçamento - F5</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTipoOperacao('devolucao');
              setModoVendaAtivo(true);
            }}
            className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Troca ou Devolução</span>
          </button>
        </div>

        {/* Abas de Navegação (Histórico, Pedido em Aberto, Pedido a Aceitar, Orçamentos) */}
        <div className="px-6 flex items-center gap-6 border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setAbaVendasHub('historico')}
            className={`py-2.5 border-b-2 transition-all cursor-pointer ${
              abaVendasHub === 'historico'
                ? 'border-sky-600 text-sky-700 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Histórico
          </button>
          <button
            type="button"
            onClick={() => setAbaVendasHub('pedidos_abertos')}
            className={`py-2.5 border-b-2 transition-all cursor-pointer ${
              abaVendasHub === 'pedidos_abertos'
                ? 'border-sky-600 text-sky-700 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Pedido em Aberto ({pedidosEmAberto.length})
          </button>
          <button
            type="button"
            onClick={() => setAbaVendasHub('pedidos_aceitar')}
            className={`py-2.5 border-b-2 transition-all cursor-pointer ${
              abaVendasHub === 'pedidos_aceitar'
                ? 'border-sky-600 text-sky-700 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Pedido a Aceitar (0)
          </button>
          <button
            type="button"
            onClick={() => setAbaVendasHub('orcamentos')}
            className={`py-2.5 border-b-2 transition-all cursor-pointer ${
              abaVendasHub === 'orcamentos'
                ? 'border-sky-600 text-sky-700 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Orçamentos ({orcamentosLista.length})
          </button>
        </div>

        {/* Linha de Sub-Filtros (Visualização: Resumida | por Produto | Vendas do caixa atual) */}
        <div className="px-6 py-2 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Visualização:</span>
              <button
                type="button"
                onClick={() => setTipoVisualizacao('resumida')}
                className={`font-semibold cursor-pointer ${tipoVisualizacao === 'resumida' ? 'text-slate-900 font-bold underline' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Resumida
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => setTipoVisualizacao('produto')}
                className={`font-semibold cursor-pointer ${tipoVisualizacao === 'produto' ? 'text-slate-900 font-bold underline' : 'text-slate-500 hover:text-slate-800'}`}
              >
                por Produto
              </button>
            </div>

            <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={filtroCaixaAtual}
                  onChange={(e) => setFiltroCaixaAtual(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Vendas do caixa atual</span>
              </label>
            </div>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={filtroHistorico}
              onChange={(e) => setFiltroHistorico(e.target.value)}
              placeholder="Pesquisar por cliente, nº venda..."
              className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Faixa de Agrupamento Cinza Estilo Nex */}
        <div className="bg-stone-400 text-white text-[11px] font-bold px-6 py-1.5 shadow-inner">
          Arraste aqui o cabeçalho de uma coluna para agrupar por esta coluna
        </div>

        {/* Grid de Dados de Vendas */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
              <tr>
                <th className="py-2.5 px-3 text-center w-24">Ação</th>
                <th className="py-2.5 px-3 w-16">Número</th>
                <th className="py-2.5 px-3">Resumo</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Hora</th>
                <th className="py-2.5 px-3">Origem</th>
                <th className="py-2.5 px-3 text-center">Itens</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Observações</th>
                <th className="py-2.5 px-3">Vendedor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {listaExibicao.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ShoppingBag className="w-10 h-10 stroke-1 text-slate-300" />
                      <span className="text-xs font-bold text-slate-600">Nenhum registro encontrado nesta exibição.</span>
                      <p className="text-[11px] text-slate-400">
                        Clique em <strong className="text-sky-600 font-bold">Nova Venda - F3</strong> para iniciar uma venda no balcão.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                listaExibicao.map((v) => {
                  const dataObj = new Date(v.data_venda);
                  const dataStr = dataObj.toLocaleDateString('pt-BR');
                  const horaStr = dataObj.toLocaleTimeString('pt-BR');

                  return (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => visualizarComprovanteVenda(v)}
                            title="Ver / Imprimir Comprovante e Carnê"
                            className="p-1 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => retomarVendaNoPdv(v)}
                            title="Abrir / Retomar Venda"
                            className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-sky-700">#{v.id}</td>
                      <td className="py-2 px-3 font-bold text-slate-900 font-mono">
                        {formatCurrency(v.total)}
                        <span className="text-[10px] text-slate-400 ml-1.5 font-normal uppercase">({v.forma_pagamento})</span>
                      </td>
                      <td className="py-2 px-3 uppercase text-[10px] font-bold text-slate-600">
                        {v.tipo_operacao === 'orcamento' ? 'Orçamento' : (v.tipo_operacao === 'pedido' ? 'Pedido' : 'Venda')}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-mono">{dataStr}</td>
                      <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{horaStr}</td>
                      <td className="py-2 px-3 text-slate-600">Balcão</td>
                      <td className="py-2 px-3 text-center font-bold text-slate-800">
                        {(v as any).itens_count || '1'}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900">{v.cliente_nome || 'Consumidor Final'}</td>
                      <td className="py-2 px-3 text-slate-500 truncate max-w-[150px]">{v.observacoes || '—'}</td>
                      <td className="py-2 px-3 text-slate-600">{v.usuario_nome || 'Administrador'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal do Comprovante & Carnê */}
        {ultimaVenda && (
          <ReceiptModal
            isOpen={modalComprovanteAberto}
            onClose={() => setModalComprovanteAberto(false)}
            venda={ultimaVenda}
            itens={ultimosItens}
            contratoCrediario={contratoCrediarioCriado}
            parcelasCrediario={parcelasCrediarioCriadas}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // RENDERIZAÇÃO: 2. TELA DE TROCA E DEVOLUÇÃO (QUANDO tipoOperacao === 'devolucao')
  // =========================================================================
  if (tipoOperacao === 'devolucao') {
    return (
      <div className="h-full flex flex-col bg-white text-slate-800 overflow-hidden font-sans select-text">
        {/* Header Devolução */}
        <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setModoVendaAtivo(false)}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-bold text-slate-900">Troca ou Devolução</h2>
              <p className="text-xs text-slate-500">Localize a venda original e selecione os itens a serem devolvidos ou trocados.</p>
            </div>
          </div>
        </div>

        {/* Corpo Devolução */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50 space-y-4">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs max-w-5xl mx-auto space-y-4">
            <form onSubmit={handleBuscarVendaDevolucao} className="grid grid-cols-12 gap-3">
              <div className="col-span-4">
                <label className="text-xs text-slate-600 font-bold block mb-1">Critério de Busca:</label>
                <select
                  value={criterioBuscaDevolucao}
                  onChange={(e: any) => setCriterioBuscaDevolucao(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="numero">1. Número da Venda / Cupom</option>
                  <option value="cliente">2. Nome ou CPF do Cliente</option>
                  <option value="data">3. Data da Venda (AAAA-MM-DD)</option>
                  <option value="produto">4. Nome ou Código do Produto</option>
                </select>
              </div>

              <div className="col-span-6">
                <label className="text-xs text-slate-600 font-bold block mb-1">Termo de Pesquisa:</label>
                <input
                  type="text"
                  value={termoBuscaDevolucao}
                  onChange={(e) => setTermoBuscaDevolucao(e.target.value)}
                  placeholder="Digite para pesquisar..."
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="col-span-2 flex items-end">
                <button
                  type="submit"
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Buscar</span>
                </button>
              </div>
            </form>

            {/* Vendas Encontradas */}
            {vendasEncontradasDevolucao.length > 1 && !vendaSelecionadaDevolucao && (
              <div className="space-y-2 border-t border-slate-200 pt-3">
                <span className="text-xs font-bold text-slate-700">Selecione a venda:</span>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                  {vendasEncontradasDevolucao.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => selecionarVendaParaDevolver(v)}
                      className="bg-slate-50 hover:bg-sky-50 p-3 rounded-xl border border-slate-200 cursor-pointer flex justify-between items-center transition-colors"
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-xs">Venda #{v.id} - {v.cliente_nome || 'Consumidor Final'}</div>
                        <div className="text-[11px] text-slate-500">{new Date(v.data_venda).toLocaleString('pt-BR')} • {v.forma_pagamento}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-700 text-xs">{formatCurrency(v.total)}</div>
                        <span className="text-[10px] text-sky-600 font-semibold">Selecionar</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabela de Devolução */}
            {vendaSelecionadaDevolucao && (
              <div className="space-y-4 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Venda #{vendaSelecionadaDevolucao.id} • Cliente: {vendaSelecionadaDevolucao.cliente_nome || 'Consumidor Final'}
                    </h4>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selecionarTodosDevolucao}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Devolução Total
                    </button>
                    <button
                      type="button"
                      onClick={() => setVendaSelecionadaDevolucao(null)}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium cursor-pointer"
                    >
                      Trocar Venda
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-8 text-center">Sel.</th>
                        <th className="py-2.5 px-3">Código</th>
                        <th className="py-2.5 px-3">Produto</th>
                        <th className="py-2.5 px-3 text-center">Qtd. Venda</th>
                        <th className="py-2.5 px-3 text-right">Vl. Unitário</th>
                        <th className="py-2.5 px-3 text-right">Vl. Total</th>
                        <th className="py-2.5 px-3 text-center w-28">Qtd. Devolver</th>
                        <th className="py-2.5 px-3 text-right">Valor Devolução</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {vendaSelecionadaDevolucao.itens.map((it: any) => {
                        const state = itensDevolucaoState[it.id] || { selecionado: false, qtdDevolver: it.quantidade, subtotalDevolver: it.subtotal };
                        return (
                          <tr key={it.id} className={`hover:bg-slate-50 ${state.selecionado ? 'bg-sky-50/50' : ''}`}>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={state.selecionado}
                                onChange={() => toggleItemDevolucao(it.id, it)}
                                className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{it.produto_codigo || '—'}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{it.produto_nome}</td>
                            <td className="py-2.5 px-3 text-center">{it.quantidade} {it.unidade_medida}</td>
                            <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(it.preco_unitario)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(it.subtotal)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min="1"
                                max={it.quantidade}
                                value={state.qtdDevolver}
                                disabled={!state.selecionado}
                                onChange={(e) => alterarQtdDevolver(it.id, it, parseFloat(e.target.value) || 1)}
                                className="w-16 bg-white border border-slate-300 text-slate-900 text-center rounded px-1.5 py-1 disabled:opacity-30 font-bold"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                              {formatCurrency(state.selecionado ? state.subtotalDevolver : 0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-3 gap-4 items-center">
                  <div>
                    <label className="text-xs text-slate-700 font-bold block mb-1">Destino / Reembolso:</label>
                    <select
                      value={formaReembolsoDevolucao}
                      onChange={(e) => setFormaReembolsoDevolucao(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="credito">Salvar como Crédito do Cliente</option>
                      <option value="dinheiro">Devolver em Dinheiro (Saída Caixa)</option>
                      <option value="estorno">Estorno Cartão / Pix</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-bold block mb-1">Motivo da Devolução:</label>
                    <input
                      type="text"
                      value={motivoDevolucao}
                      onChange={(e) => setMotivoDevolucao(e.target.value)}
                      placeholder="Ex: Troca de tamanho / produto com avaria"
                      className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-500">Total a Devolver / Creditar:</div>
                    <div className="text-xl font-extrabold text-emerald-700">{formatCurrency(totalDevolucaoCalculado)}</div>
                    <button
                      type="button"
                      disabled={totalDevolucaoCalculado <= 0 || processandoDevolucao}
                      onClick={handleProcessarDevolucaoFinal}
                      className="mt-2 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-6 rounded-xl text-xs transition-colors shadow-xs disabled:opacity-40 cursor-pointer"
                    >
                      {processandoDevolucao ? 'Processando...' : 'Confirmar Devolução'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDERIZAÇÃO: 3. TELA DE VENDA DO PDV (EXATAMENTE COMO NO TERCEIRO PRINT)
  // =========================================================================
  return (
    <div className="h-full flex flex-col bg-white text-slate-800 overflow-hidden font-sans select-text">
      
      {/* Top Header da Tela de Venda */}
      <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {tipoOperacao === 'orcamento' ? 'Orçamento' : (tipoOperacao === 'pedido' ? 'Pedido de Entrega' : 'Venda')}
          </h1>
          <div className="flex items-center gap-1 text-slate-400">
            <button type="button" className="p-1 hover:text-slate-700 rounded transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
            <button type="button" className="p-1 hover:text-slate-700 rounded transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs font-bold text-slate-900">
              {carrinho.length === 0 ? 'Nenhum item' : `${carrinho.length} item(ns)`}
            </div>
            <div className="text-[11px] text-slate-400">Quantidade: {totalQtd}</div>
          </div>

          <button
            type="button"
            onClick={() => setModoVendaAtivo(false)}
            title="Fechar e voltar ao histórico de vendas (ESC)"
            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Corpo Principal: Lado Esquerdo (Busca + Autocomplete com Imagem + Carrinho) & Lado Direito (Cliente, Entrega, Atalhos, Total) */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        
        {/* COLUNA ESQUERDA: BUSCA + TABELA DE ITENS (COLS 1 A 8) */}
        <div className="col-span-8 flex flex-col p-6 space-y-4 border-r border-slate-200 relative overflow-hidden">
          
          {/* Barra de Entrada / Autocomplete Instantâneo com Foto */}
          <div className="relative z-20">
            <form onSubmit={handleBuscaSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute left-3.5 top-3 text-slate-400 pointer-events-none">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  ref={inputBuscaRef}
                  type="text"
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  onKeyDown={handleBuscaKeyDown}
                  placeholder="Digite o código ou nome do produto..."
                  className="w-full pl-11 pr-10 py-2.5 bg-white border border-slate-300 rounded-full text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!dropdownBuscaAberto) {
                      setProdutosSugeridos(todosProdutos.slice(0, 30));
                      setDropdownBuscaAberto(true);
                    } else {
                      setDropdownBuscaAberto(false);
                    }
                  }}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Quantidade */}
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-300 rounded-full">
                <span className="text-xs text-slate-500 font-bold">Quant:</span>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  value={quantidadeInput}
                  onChange={(e) => setQuantidadeInput(parseFloat(e.target.value) || 1)}
                  className="w-12 bg-transparent text-center text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </form>

            {/* POPUP FLUTUANTE DE AUTOCOMPLETE COM PRÉVIA DA FOTO (EXATAMENTE COMO NO 3º PRINT) */}
            {dropdownBuscaAberto && produtosSugeridos.length > 0 && (
              <div className="absolute top-full left-0 mt-1.5 w-full bg-white border border-slate-300 rounded-2xl shadow-2xl z-50 flex overflow-hidden max-h-72 animate-in fade-in duration-100">
                {/* Tabela de Produtos Sugeridos (Esquerda) */}
                <div className="flex-1 overflow-y-auto border-r border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-3">Código</th>
                        <th className="py-2 px-3">Descrição</th>
                        <th className="py-2 px-3 text-right">Preço</th>
                        <th className="py-2 px-3 text-center">Estoque</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {produtosSugeridos.map((p, idx) => {
                        const isHovered = idx === sugestaoSelecionadaIdx;
                        return (
                          <tr
                            key={p.id}
                            onMouseEnter={() => setSugestaoSelecionadaIdx(idx)}
                            onClick={() => adicionarAoCarrinho(p, quantidadeInput)}
                            className={`cursor-pointer transition-colors ${
                              isHovered ? 'bg-sky-50 font-bold text-sky-900' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{p.codigo || String(p.id).padStart(6, '0')}</td>
                            <td className="py-2 px-3 truncate max-w-[220px]">{p.nome}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">{formatCurrency(p.preco_venda)}</td>
                            <td className="py-2 px-3 text-center text-slate-600 font-mono">{p.estoque_atual}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Painel Lateral Direito com Prévia da Imagem Grande */}
                <div className="w-52 p-3 bg-slate-50 flex flex-col items-center justify-center text-center">
                  {produtoSugeridoHover?.imagem_url ? (
                    <img
                      src={produtoSugeridoHover.imagem_url}
                      alt={produtoSugeridoHover.nome}
                      className="w-36 h-36 object-cover rounded-xl border border-slate-200 shadow-sm"
                    />
                  ) : (
                    <div className="w-36 h-36 rounded-xl bg-slate-200/70 border border-slate-200 flex flex-col items-center justify-center text-slate-400">
                      <ImageIcon className="w-10 h-10 stroke-1 mb-1" />
                      <span className="text-[10px]">Sem foto</span>
                    </div>
                  )}

                  {produtoSugeridoHover && (
                    <div className="mt-2 w-full">
                      <div className="text-xs font-bold text-slate-900 truncate">{produtoSugeridoHover.nome}</div>
                      <div className="text-sm font-extrabold text-emerald-700 font-mono mt-0.5">
                        {formatCurrency(produtoSugeridoHover.preco_venda)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tabela do Carrinho */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-2xs">
            <div className="flex-1 overflow-y-auto">
              {carrinho.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 p-12">
                  <ShoppingBag className="w-12 h-12 stroke-1 text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">Nenhum item adicionado à venda.</p>
                  <p className="text-[11px] text-slate-400 text-center max-w-sm">
                    Digite o nome do produto no campo de busca acima ou utilize um leitor de código de barras.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center">#</th>
                      <th className="py-2.5 px-3 w-12 text-center">Foto</th>
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Descrição do Produto</th>
                      <th className="py-2.5 px-3 text-center">Qtd</th>
                      <th className="py-2.5 px-3 text-right">Vl. Unitário</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                      <th className="py-2.5 px-3 w-10 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {carrinho.map((item, idx) => {
                      const isSelected = idx === itemSelecionadoIdx;
                      return (
                        <tr
                          key={idx}
                          onClick={() => setItemSelecionadoIdx(idx)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-sky-50/70 border-l-4 border-sky-600 font-medium' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2 px-3 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                          <td className="py-2 px-3 text-center">
                            {item.imagem_url ? (
                              <img src={item.imagem_url} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200 mx-auto" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
                                <ImageIcon className="w-4 h-4 opacity-60" />
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">{item.produto_codigo || '—'}</td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-900 text-xs">{item.produto_nome}</div>
                            {(item.tamanho || item.cor) && (
                              <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                {item.tamanho && <span className="bg-slate-100 px-1 py-0.2 rounded border border-slate-200">Tam: {item.tamanho}</span>}
                                {item.cor && <span className="bg-slate-100 px-1 py-0.2 rounded border border-slate-200">{item.cor}</span>}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-900">
                            {item.quantidade} {item.unidade_medida}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600 font-mono">
                            {formatCurrency(item.preco_unitario)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700 font-mono">
                            {formatCurrency(item.subtotal)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCarrinho((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: CLIENTE, ENTREGA, OBSERVAÇÕES, ATALHOS E TOTAL (COLS 9 A 12) */}
        <div className="col-span-4 flex flex-col p-6 space-y-4 bg-white overflow-y-auto">
          
          {/* Card Cliente - F5 */}
          <button
            type="button"
            onClick={abrirModalClientes}
            className="w-full bg-white border border-slate-200 hover:border-sky-400 p-3.5 rounded-2xl flex items-center justify-between text-left transition-all shadow-2xs group cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">Cliente - F5</div>
                <div className="text-xs font-bold text-slate-900 truncate">
                  {clienteSelecionado?.nome || 'Consumidor Final (Não identificado)'}
                </div>
                {clienteSelecionado?.cpf_cnpj && (
                  <div className="text-[10px] text-slate-500 font-mono">CPF: {formatarCpfCnpj(clienteSelecionado.cpf_cnpj)}</div>
                )}
              </div>
            </div>
            <span className="text-[11px] font-bold text-sky-600 group-hover:translate-x-0.5 transition-transform shrink-0">
              {clienteSelecionado ? 'Trocar' : 'Identificar'}
            </span>
          </button>

          {/* Card Entrega - F9 */}
          <button
            type="button"
            onClick={() => setModalEntregaAberto(true)}
            className="w-full bg-white border border-slate-200 hover:border-sky-400 p-3.5 rounded-2xl flex items-center justify-between text-left transition-all shadow-2xs group cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center font-bold shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">Entrega - F9</div>
                <div className="text-xs font-bold text-slate-900 truncate">
                  {dadosEntrega.taxaEntrega > 0 ? `Taxa: +${formatCurrency(dadosEntrega.taxaEntrega)}` : 'Retirada no Balcão'}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-500 group-hover:text-sky-600 transition-colors shrink-0">
              Configurar
            </span>
          </button>

          {/* Card Observações - F4 */}
          <button
            type="button"
            onClick={() => setModalObsAberto(true)}
            className="w-full bg-white border border-slate-200 hover:border-sky-400 p-3.5 rounded-2xl flex items-center justify-between text-left transition-all shadow-2xs group cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center font-bold shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">Observações - F4</div>
                <div className="text-xs font-bold text-slate-900 truncate">
                  {observacoesVenda ? observacoesVenda : 'Nenhuma observação'}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-500 group-hover:text-sky-600 transition-colors shrink-0">
              Editar
            </span>
          </button>

          {/* Seção Atalhos (Exatamente como no print) */}
          <div className="pt-2">
            <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-2">Atalhos</h4>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Ler peso da balança</span>
                <span className="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">F1</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Desconto</span>
                <span className="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">F3</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Editar dados do item selecionado</span>
                <span className="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">F10</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Quantidade</span>
                <span className="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">F12</span>
              </div>
            </div>
          </div>

          {/* Espaçador */}
          <div className="flex-1" />

          {/* Bloco Inferior de Conclusão de Venda e Total */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-400">Total</span>
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {formatCurrency(totalGeral)}
              </span>
            </div>

            <button
              type="button"
              disabled={carrinho.length === 0}
              onClick={abrirModalPagamento}
              className="w-full bg-slate-300 hover:bg-emerald-600 hover:text-white text-slate-700 disabled:opacity-40 disabled:hover:bg-slate-300 disabled:hover:text-slate-700 font-bold py-3.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <span>CONCLUIR VENDA - F2</span>
            </button>

            <div className="text-right text-[10px] text-slate-400 pt-1 font-mono">
              Feito por {usuario?.nome || 'Administrador'} • {dataHoraAtual}
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAIS DO PDV                                                             */}
      {/* ========================================================================= */}

      {/* 1. MODAL DE PAGAMENTO & FORMAS DE PAGAMENTO */}
      <Modal 
        isOpen={modalPagamentoAberto} 
        onClose={() => setModalPagamentoAberto(false)} 
        title="Finalizar Venda / Pagamento" 
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          {/* Resumo do Total */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-slate-500 block text-[11px] font-bold uppercase">Total a Pagar</span>
              <div className="text-2xl font-black text-slate-900 font-mono">{formatCurrency(totalGeral)}</div>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[11px]">Cliente</span>
              <span className="font-bold text-slate-900">{clienteSelecionado?.nome || 'Consumidor Final'}</span>
            </div>
          </div>

          {/* Formas de Pagamento */}
          <div>
            <label className="font-bold text-slate-700 block mb-1.5">Escolha a Forma de Pagamento:</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'dinheiro', label: 'Dinheiro', icon: DollarSign },
                { id: 'pix', label: 'PIX', icon: QrCode },
                { id: 'cartao_credito', label: 'C. Crédito', icon: CreditCard },
                { id: 'cartao_debito', label: 'C. Débito', icon: CreditCard },
                { id: 'crediario', label: 'Crediário / Carnê', icon: Wallet, highlight: true }
              ].map((f) => {
                const Icon = f.icon;
                const isSelected = formaPagamento === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setFormaPagamento(f.id);
                      if (f.id === 'crediario' && !clienteSelecionado) {
                        setModalClienteAberto(true);
                      }
                    }}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? (f.highlight ? 'bg-sky-600 text-white border-sky-600 shadow-md font-bold' : 'bg-slate-900 text-white border-slate-900 shadow-md font-bold')
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px] leading-tight">{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bloco Específico de Dinheiro (Troco) */}
          {formaPagamento === 'dinheiro' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Valor Recebido (R$):</label>
                  <input
                    ref={inputRecebidoRef}
                    type="number"
                    step="0.01"
                    value={valorRecebidoDinheiro}
                    onChange={(e) => setValorRecebidoDinheiro(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base font-bold font-mono text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-500 block mb-1">Troco a Devolver:</span>
                  <div className={`text-xl font-black font-mono ${trocoDinheiro > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {formatCurrency(trocoDinheiro)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bloco Específico de Crediário (Simulador de Parcelas & Consulta de Limite) */}
          {formaPagamento === 'crediario' && (
            <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-200 space-y-3">
              {/* Identificação do Cliente / Status do Limite */}
              {!clienteSelecionado ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <div className="font-bold text-amber-900 text-xs">Cliente Não Identificado</div>
                      <div className="text-[11px] text-amber-700">Para vender no Crediário/Carnê é necessário selecionar um cliente cadastrado.</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalClienteAberto(true)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Identificar Cliente (F5)</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white p-3 rounded-xl border border-sky-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-sky-600" />
                      <span className="font-bold text-slate-900 text-xs">{clienteSelecionado.nome}</span>
                      {clienteSelecionado.cpf_cnpj && (
                        <span className="text-[11px] text-slate-500 font-mono">({formatarCpfCnpj(clienteSelecionado.cpf_cnpj)})</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalClienteAberto(true)}
                      className="text-[11px] text-sky-600 hover:text-sky-800 font-bold underline cursor-pointer"
                    >
                      Trocar Cliente
                    </button>
                  </div>

                  {/* 3 Cartões de Limite: Total, Utilizado, Disponível */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-center">
                      <span className="text-[10px] text-slate-500 font-medium block">Limite Total</span>
                      <span className="text-xs font-black font-mono text-slate-800">
                        {formatCurrency(saldoCreditoDetalhes?.limite ?? (clienteSelecionado.limite_credito || 0))}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-center">
                      <span className="text-[10px] text-slate-500 font-medium block">Utilizado (Dívida)</span>
                      <span className="text-xs font-black font-mono text-amber-700">
                        {formatCurrency(saldoCreditoDetalhes?.utilizado ?? 0)}
                      </span>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
                      <span className="text-[10px] text-emerald-700 font-bold block">Disponível</span>
                      <span className="text-xs font-black font-mono text-emerald-800">
                        {formatCurrency(saldoCreditoDetalhes?.disponivel ?? (clienteSelecionado.limite_credito || 0))}
                      </span>
                    </div>
                  </div>

                  {/* Alerta de Bloqueio */}
                  {saldoCreditoDetalhes?.bloqueado && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Crediário deste cliente está BLOQUEADO pela administração.</span>
                    </div>
                  )}

                  {/* Alerta de Parcelas em Atraso */}
                  {saldoCreditoDetalhes && (saldoCreditoDetalhes.emAtraso > 0 || saldoCreditoDetalhes.diasMaiorAtraso > 0) && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-amber-800 font-medium">
                        Possui parcelas em atraso: <b>{formatCurrency(saldoCreditoDetalhes.emAtraso)}</b> ({saldoCreditoDetalhes.diasMaiorAtraso} dias).
                      </span>
                    </div>
                  )}

                  {/* Alerta de Limite Excedido e Botão de Liberação de Gerente */}
                  {crediarioLimiteInfo && !crediarioLimiteInfo.permitido && !gerenteAprovado && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-xs gap-2">
                      <div className="text-rose-800">
                        <div className="font-bold">Limite Excedido ou Restrição</div>
                        <div className="text-[11px] text-rose-700">{crediarioLimiteInfo.mensagem}</div>
                      </div>
                      <button
                        type="button"
                        onClick={abrirModalLiberacaoGerente}
                        className="px-2.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-sm shrink-0 cursor-pointer"
                      >
                        Liberar com Gerente
                      </button>
                    </div>
                  )}

                  {gerenteAprovado && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-xs font-bold">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Venda autorizada pelo gerente: <b>{gerenteAprovadoPorNome || 'Gerente'}</b></span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-sky-900 text-xs">Simulação de Parcelas (Tabela Price)</span>
                <span className="text-[11px] text-sky-700">Taxa: {crediarioSemJuros ? 'Sem juros' : `${crediarioTaxaJuros}% a.m.`}</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Valor de Entrada (R$):</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={crediarioEntrada}
                    onChange={(e) => setCrediarioEntrada(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Nº de Parcelas:</label>
                  <select
                    value={crediarioParcelasQtd}
                    onChange={(e) => setCrediarioParcelasQtd(parseInt(e.target.value, 10))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6, 10, 12, 18, 24].map((n) => (
                      <option key={n} value={n}>{n}x parcelas</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">1º Vencimento:</label>
                  <input
                    type="date"
                    value={crediarioDataPrimeira}
                    onChange={(e) => setCrediarioDataPrimeira(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              {crediarioSimulacao && (
                <div className="bg-white p-3 rounded-xl border border-sky-200 shadow-sm space-y-2.5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-medium block">Valor da Venda</span>
                      <span className="text-xs font-bold font-mono text-slate-800">{formatCurrency(totalGeral)}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-medium block">Entrada</span>
                      <span className="text-xs font-bold font-mono text-slate-800">{formatCurrency(Number(crediarioEntrada) || 0)}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-medium block">Valor Financiado</span>
                      <span className="text-xs font-bold font-mono text-slate-800">{formatCurrency(crediarioSimulacao.valorFinanciado)}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-medium block">Taxa (% a.m.)</span>
                      <span className="text-xs font-bold font-mono text-slate-800">{crediarioSemJuros ? '0,00% a.m.' : `${crediarioTaxaJuros.toFixed(2)}% a.m.`}</span>
                    </div>
                    <div className="p-2 bg-sky-50 rounded-lg border border-sky-200 col-span-2 sm:col-span-2">
                      <span className="text-[10px] text-sky-700 font-bold block">TOTAL COM JUROS (Financiado + Entrada)</span>
                      <span className="text-sm font-black font-mono text-sky-950">
                        {formatCurrency(
                          (crediarioSimulacao.parcelas.reduce((acc, p) => acc + (Number(p.valor) || 0), 0)) + (Number(crediarioEntrada) || 0)
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="bg-sky-50/80 p-2.5 rounded-lg border border-sky-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[11px] text-slate-600 font-medium block">Valor de Cada Parcela:</span>
                      <div className="font-black text-sky-800 text-sm font-mono">
                        {crediarioParcelasQtd}x de {formatCurrency(crediarioSimulacao.valorParcela)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Soma Exata das Parcelas:</span>
                      <span className="text-xs font-bold font-mono text-slate-800">
                        {formatCurrency(crediarioSimulacao.parcelas.reduce((acc, p) => acc + (Number(p.valor) || 0), 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalPagamentoAberto(false)}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Voltar à Venda (ESC)
            </button>
            <button
              type="button"
              disabled={processandoVenda}
              onClick={handleFinalizarOperacao}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{processandoVenda ? 'Processando...' : 'Confirmar e Concluir'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* 2. MODAL DE CLIENTES (F5) */}
      <Modal 
        isOpen={modalClienteAberto} 
        onClose={() => setModalClienteAberto(false)} 
        title="Identificar Cliente na Venda (F5)" 
        maxWidth="xl"
      >
        <div className="space-y-3 text-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={buscaClienteF5}
              onChange={(e) => setBuscaClienteF5(e.target.value)}
              placeholder="Pesquisar cliente por nome ou CPF..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {/* Opção Consumidor Final */}
            <div
              onClick={() => {
                setClienteSelecionado(null);
                setModalClienteAberto(false);
              }}
              className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-slate-900">Consumidor Final (Não identificado)</div>
                <div className="text-[11px] text-slate-400">Venda avulsa no balcão</div>
              </div>
              <span className="text-[11px] text-sky-600 font-bold">Selecionar</span>
            </div>

            {clientesLista
              .filter((c) => !buscaClienteF5 || (c.nome && c.nome.toLowerCase().includes(buscaClienteF5.toLowerCase())) || (c.cpf_cnpj && c.cpf_cnpj.includes(buscaClienteF5)))
              .map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setClienteSelecionado(c);
                    setModalClienteAberto(false);
                  }}
                  className="p-3 hover:bg-sky-50 cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-900">{c.nome}</div>
                    <div className="text-[11px] text-slate-500">
                      {c.cpf_cnpj ? `CPF: ${formatarCpfCnpj(c.cpf_cnpj)}` : 'Sem CPF'} • Tel: {c.telefone ? formatarTelefone(c.telefone) : '—'}
                    </div>
                  </div>
                  <span className="text-[11px] text-sky-600 font-bold">Selecionar</span>
                </div>
              ))}
          </div>
        </div>
      </Modal>

      {/* 3. MODAL DE DESCONTO (F3) */}
      <Modal 
        isOpen={modalDescontoAberto} 
        onClose={() => setModalDescontoAberto(false)} 
        title="Aplicar Desconto na Venda (F3)" 
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setDescontoTipo('reais')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${descontoTipo === 'reais' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
            >
              Em Reais (R$)
            </button>
            <button
              type="button"
              onClick={() => setDescontoTipo('porcentagem')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${descontoTipo === 'porcentagem' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
            >
              Em Porcentagem (%)
            </button>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Valor do Desconto ({descontoTipo === 'reais' ? 'R$' : '%'}):
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={descontoValor}
              onChange={(e) => setDescontoValor(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base font-bold font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
              autoFocus
            />
          </div>

          <button
            type="button"
            onClick={() => setModalDescontoAberto(false)}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow"
          >
            Aplicar Desconto
          </button>
        </div>
      </Modal>

      {/* 4. MODAL DE OBSERVAÇÕES (F4) */}
      <Modal 
        isOpen={modalObsAberto} 
        onClose={() => setModalObsAberto(false)} 
        title="Observações da Venda (F4)" 
        maxWidth="md"
      >
        <div className="space-y-3 text-xs">
          <textarea
            rows={4}
            value={observacoesVenda}
            onChange={(e) => setObservacoesVenda(e.target.value)}
            placeholder="Digite aqui anotações ou observações que constarão no comprovante..."
            className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setModalObsAberto(false)}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow"
          >
            Salvar Observações
          </button>
        </div>
      </Modal>

      {/* 5. MODAL DE ENTREGA (F9) */}
      <Modal 
        isOpen={modalEntregaAberto} 
        onClose={() => setModalEntregaAberto(false)} 
        title="Dados de Entrega (F9)" 
        maxWidth="md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Endereço de Entrega:</label>
            <input
              type="text"
              value={dadosEntrega.endereco}
              onChange={(e) => setDadosEntrega({ ...dadosEntrega, endereco: e.target.value })}
              placeholder="Rua, Número, Bairro, Cidade..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Taxa de Entrega (R$):</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={dadosEntrega.taxaEntrega}
                onChange={(e) => setDadosEntrega({ ...dadosEntrega, taxaEntrega: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Entregador / Courier:</label>
              <input
                type="text"
                value={dadosEntrega.entregador}
                onChange={(e) => setDadosEntrega({ ...dadosEntrega, entregador: e.target.value })}
                placeholder="Ex: Motoboy João"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalEntregaAberto(false)}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow"
          >
            Confirmar Entrega
          </button>
        </div>
      </Modal>

      {/* 6. MODAL DE BALANÇA (F1) */}
      <Modal 
        isOpen={modalBalancaAberto} 
        onClose={() => setModalBalancaAberto(false)} 
        title="Leitura de Balança Comercial (F1)" 
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs text-center">
          <div className="bg-slate-900 text-emerald-400 p-4 rounded-2xl font-mono text-3xl font-black tracking-widest shadow-inner">
            {pesoBalancaSimulado.toFixed(3)} KG
          </div>
          <p className="text-slate-500">Coloque o produto sobre o prato da balança.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setQuantidadeInput(pesoBalancaSimulado);
                setModalBalancaAberto(false);
              }}
              className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow"
            >
              Capturar Peso
            </button>
          </div>
        </div>
      </Modal>

      {/* 7. MODAL DE QUANTIDADE (F12) */}
      <Modal 
        isOpen={modalQtdAberto} 
        onClose={() => setModalQtdAberto(false)} 
        title="Alterar Quantidade (F12)" 
        maxWidth="sm"
      >
        <div className="space-y-3 text-xs">
          <input
            type="number"
            min="0.001"
            step="any"
            value={quantidadeInput}
            onChange={(e) => setQuantidadeInput(parseFloat(e.target.value) || 1)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setModalQtdAberto(false);
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center text-xl font-bold font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setModalQtdAberto(false)}
            className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs"
          >
            Confirmar (Enter)
          </button>
        </div>
      </Modal>

      {/* 8. MODAL DE COMPROVANTE & CARNÊ */}
      {ultimaVenda && (
        <ReceiptModal
          isOpen={modalComprovanteAberto}
          onClose={() => {
            setModalComprovanteAberto(false);
            setModoVendaAtivo(false);
          }}
          venda={ultimaVenda}
          itens={ultimosItens}
          contratoCrediario={contratoCrediarioCriado}
          parcelasCrediario={parcelasCrediarioCriadas}
        />
      )}

      {/* 9. MODAL LIBERAÇÃO DO GERENTE */}
      <Modal 
        isOpen={modalLiberacaoGerenteAberto} 
        onClose={() => {
          setModalLiberacaoGerenteAberto(false);
          setGerenteErroMensagem('');
        }} 
        title="Autorização de Gerente / Administrador" 
        maxWidth="md"
        zIndex="z-[70]"
      >
        <div className="space-y-4 text-xs">
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-3 text-amber-900">
            <ShieldCheck className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <h4 className="font-bold text-xs">Autorização Necessária</h4>
              <p className="text-[11px] text-amber-700">Informe a senha de um Gerente ou Administrador para autorizar a operação.</p>
            </div>
          </div>

          {gerenteErroMensagem && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs font-semibold animate-shake">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{gerenteErroMensagem}</span>
            </div>
          )}

          {gerenteBloqueadoSegundos > 0 && (
            <div className="p-3 bg-amber-100 border border-amber-300 rounded-xl flex items-center gap-2.5 text-amber-900 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Acesso temporariamente bloqueado. Tente novamente em {gerenteBloqueadoSegundos}s.</span>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">Usuário Gerente / Administrador:</label>
            <select
              value={gerenteSelecionadoId || ''}
              disabled={gerenteBloqueadoSegundos > 0}
              onChange={(e) => {
                setGerenteSelecionadoId(parseInt(e.target.value, 10) || null);
                setGerenteErroMensagem('');
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              {usuariosGerentes.map((u) => (
                <option key={u.id} value={u.id}>{u.nome} ({u.perfil.toUpperCase()})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Senha de Autorização:</label>
            <input
              ref={inputSenhaGerenteRef}
              type="password"
              autoFocus
              disabled={gerenteBloqueadoSegundos > 0}
              value={gerenteSenha}
              onChange={(e) => {
                setGerenteSenha(e.target.value);
                setGerenteErroMensagem('');
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter' && gerenteBloqueadoSegundos === 0) handleAprovarGerente();
              }}
              placeholder="Digite a senha..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setModalLiberacaoGerenteAberto(false);
                setGerenteErroMensagem('');
              }}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={gerenteBloqueadoSegundos > 0}
              onClick={handleAprovarGerente}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {gerenteBloqueadoSegundos > 0 ? `Bloqueado (${gerenteBloqueadoSegundos}s)` : 'Autorizar'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

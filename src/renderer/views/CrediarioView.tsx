import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Plus, 
  Search, 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Eye, 
  MessageCircle, 
  Printer, 
  Calendar, 
  User, 
  Check, 
  RotateCcw,
  Sliders,
  Filter,
  ArrowRight,
  ShieldCheck,
  Building2,
  FileText,
  CreditCard
} from 'lucide-react';
import { 
  CrediarioConfig, 
  CrediarioContrato, 
  CrediarioParcela, 
  CrediarioPagamento, 
  CrediarioHistoricoCliente, 
  Cliente,
  Usuario 
} from '../types';
import { formatarMoedaBR, formatarDataBR, getTodaySaoPauloDate } from '../utils/datetime';
import { formatarCpfCnpj, formatarTelefone, formatarCep, validarCPF, limparMascara } from '../utils/validators';
import { Modal } from '../components/Modal';
import { ReceiptModal } from '../components/ReceiptModal';
import { ModalImpressaoCrediario } from '../components/ModalImpressaoCrediario';
import { useAuth } from '../context/AuthContext';
import { useCaixa } from '../context/CaixaContext';

export const CrediarioView: React.FC = () => {
  const { usuario } = useAuth();
  const { caixaAberto } = useCaixa();

  // Estados de dados
  const [dashboardData, setDashboardData] = useState<{
    totalReceber: number;
    totalAtraso: number;
    recebidoMes: number;
    taxaInadimplencia: number;
    qtdClientesInadimplentes: number;
  }>({
    totalReceber: 0,
    totalAtraso: 0,
    recebidoMes: 0,
    taxaInadimplencia: 0,
    qtdClientesInadimplentes: 0
  });

  const [parcelas, setParcelas] = useState<CrediarioParcela[]>([]);
  const [contratos, setContratos] = useState<CrediarioContrato[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);

  // Seleção múltipla de parcelas (Estilo Hiper Gestão)
  const [parcelasSelecionadasIds, setParcelasSelecionadasIds] = useState<number[]>([]);
  const [dropdownAcoesAberto, setDropdownAcoesAberto] = useState<boolean>(false);

  // Filtros da tabela principal
  const [busca, setBusca] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos'); // 'todos' | 'aberta' | 'atrasada' | 'paga'
  const [filtroClienteId, setFiltroClienteId] = useState<string>('todos');
  const [filtroVencimentoInicio, setFiltroVencimentoInicio] = useState<string>('');
  const [filtroVencimentoFim, setFiltroVencimentoFim] = useState<string>('');

  // MODAIS
  // Modal de Impressão Estilo Hiper Gestão (Carnê, Duplicata, Promissória)
  const [modalImpressaoAberto, setModalImpressaoAberto] = useState<boolean>(false);
  const [contratoIdParaImpressao, setContratoIdParaImpressao] = useState<number | null>(null);
  const [parcelasIdsParaImpressao, setParcelasIdsParaImpressao] = useState<number[]>([]);

  // MODAIS
  // 1. Modal Nova Venda no Crediário
  const [modalNovaVendaAberto, setModalNovaVendaAberto] = useState<boolean>(false);
  const [etapaNovaVenda, setEtapaNovaVenda] = useState<number>(1); // 1: Cliente, 2: Parcelamento & Vencimento
  const [clienteSelecionadoNovaVenda, setClienteSelecionadoNovaVenda] = useState<Cliente | null>(null);
  const [buscaClienteModal, setBuscaClienteModal] = useState<string>('');
  const [mostrarCadastroClienteRapido, setMostrarCadastroClienteRapido] = useState<boolean>(false);
  const [novoClienteNome, setNovoClienteNome] = useState<string>('');
  const [novoClienteCpf, setNovoClienteCpf] = useState<string>('');
  const [novoClienteTelefone, setNovoClienteTelefone] = useState<string>('');
  const [novoClienteEndereco, setNovoClienteEndereco] = useState<string>('');

  // Parâmetros do parcelamento da nova venda
  const [valorTotalNovaVenda, setValorTotalNovaVenda] = useState<number>(500);
  const [entradaNovaVenda, setEntradaNovaVenda] = useState<number>(0);
  const [qtdParcelasNovaVenda, setQtdParcelasNovaVenda] = useState<number>(3);
  const [primeiroVencimentoNovaVenda, setPrimeiroVencimentoNovaVenda] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [simulacaoNovaVenda, setSimulacaoNovaVenda] = useState<any>(null);

  // 2. Modal de Registro de Pagamento / Baixa de Parcela
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState<boolean>(false);
  const [parcelaSelecionada, setParcelaSelecionada] = useState<CrediarioParcela | null>(null);
  const [valorRecebido, setValorRecebido] = useState<number>(0);
  const [descontoConcedido, setDescontoConcedido] = useState<number>(0);
  const [formaPagtoRecebimento, setFormaPagtoRecebimento] = useState<string>('dinheiro');

  // 3. Modal de Extrato / Detalhes do Cliente com Dívida
  const [modalExtratoClienteAberto, setModalExtratoClienteAberto] = useState<boolean>(false);
  const [clienteExtrato, setClienteExtrato] = useState<Cliente | null>(null);
  const [parcelasDoCliente, setParcelasDoCliente] = useState<CrediarioParcela[]>([]);
  const [contratosDoCliente, setContratosDoCliente] = useState<CrediarioContrato[]>([]);
  const [historicoDevedorCliente, setHistoricoDevedorCliente] = useState<any>(null);

  // 4. Modal de Comprovante de Carnê / Recibo
  const [modalReciboAberto, setModalReciboAberto] = useState<boolean>(false);
  const [contratoParaRecibo, setContratoParaRecibo] = useState<CrediarioContrato | null>(null);
  const [parcelasParaRecibo, setParcelasParaRecibo] = useState<CrediarioParcela[]>([]);

  // Carregar todos os dados
  const carregarDados = async () => {
    setCarregando(true);
    try {
      if (window.api?.crediario) {
        // Carrega indicadores
        const dash = await window.api.crediario.getDashboard();
        setDashboardData(dash || {
          totalReceber: 0,
          totalAtraso: 0,
          recebidoMes: 0,
          taxaInadimplencia: 0,
          qtdClientesInadimplentes: 0
        });

        // Carrega parcelas
        const parcs = await window.api.crediario.listarParcelas();
        setParcelas(parcs || []);

        // Carrega contratos
        const conts = await window.api.crediario.listarContratos();
        setContratos(conts || []);
      }

      if (window.api?.clientes) {
        const clis = await window.api.clientes.listar();
        setClientes(clis || []);
      }
    } catch (e) {
      console.error('Erro ao carregar dados do crediário:', e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Simulação dinâmica da nova venda
  useEffect(() => {
    if (modalNovaVendaAberto && window.api?.crediario?.simular) {
      const saldoFinanciar = Math.max(0, valorTotalNovaVenda - entradaNovaVenda);
      window.api.crediario.simular(saldoFinanciar, entradaNovaVenda, qtdParcelasNovaVenda, undefined, primeiroVencimentoNovaVenda)
        .then(setSimulacaoNovaVenda)
        .catch(console.error);
    }
  }, [modalNovaVendaAberto, valorTotalNovaVenda, entradaNovaVenda, qtdParcelasNovaVenda, primeiroVencimentoNovaVenda]);

  // Abertura do Modal de Pagamento
  const abrirModalPagamento = (p: CrediarioParcela) => {
    setParcelaSelecionada(p);
    const jurosMulta = (p.juros_estimado || 0) + (p.multa_estimada || 0);
    const totalDevido = p.saldo_restante + jurosMulta;
    setValorRecebido(totalDevido);
    setDescontoConcedido(0);
    setFormaPagtoRecebimento('dinheiro');
    setModalPagamentoAberto(true);
  };

  // Confirmar Pagamento de Parcela
  const handleConfirmarPagamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parcelaSelecionada) return;

    if (valorRecebido <= 0) {
      alert('Informe um valor recebido válido.');
      return;
    }

    try {
      const res = await window.api.crediario.baixarParcela({
        parcelaId: parcelaSelecionada.id,
        valorPago: valorRecebido,
        desconto: descontoConcedido,
        formaPagamento: formaPagtoRecebimento,
        caixaSessaoId: caixaAberto?.id,
        usuarioId: usuario?.id || 1,
        observacao: 'Baixa direta no módulo Crediário'
      });

      alert(`Pagamento de ${formatarMoedaBR(valorRecebido)} registrado com sucesso!`);
      setModalPagamentoAberto(false);
      setParcelaSelecionada(null);
      carregarDados();

      if (modalExtratoClienteAberto && clienteExtrato) {
        abrirExtratoCliente(clienteExtrato);
      }
    } catch (err: any) {
      alert(`Erro ao registrar pagamento: ${err?.message || err}`);
    }
  };

  // Abertura do Extrato 360° do Cliente
  const abrirExtratoCliente = async (cli: Cliente) => {
    setClienteExtrato(cli);
    setModalExtratoClienteAberto(true);

    try {
      const todasParcs = await window.api.crediario.listarParcelas({ clienteId: cli.id });
      setParcelasDoCliente(todasParcs || []);

      const todosContratos = await window.api.crediario.listarContratos({ clienteId: cli.id });
      setContratosDoCliente(todosContratos || []);

      const info = await window.api.crediario.verificarLimite(cli.id, 0);
      setHistoricoDevedorCliente(info);
    } catch (e) {
      console.error(e);
    }
  };

  // Cadastrar Cliente Rápido dentro do Modal de Venda
  const handleCadastrarClienteRapido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoClienteNome.trim()) {
      alert('Informe o nome do cliente.');
      return;
    }

    const docLimpo = limparMascara(novoClienteCpf);
    if (docLimpo && docLimpo.length === 11 && !validarCPF(docLimpo)) {
      alert('CPF inválido!');
      return;
    }

    try {
      const novoId = await window.api.clientes.criar({
        nome: novoClienteNome.trim(),
        cpf_cnpj: docLimpo || undefined,
        telefone: limparMascara(novoClienteTelefone) || undefined,
        endereco: novoClienteEndereco.trim() || undefined
      });

      const novoCli: Cliente = {
        id: novoId,
        nome: novoClienteNome.trim(),
        cpf_cnpj: docLimpo || undefined,
        telefone: limparMascara(novoClienteTelefone) || undefined,
        endereco: novoClienteEndereco.trim() || undefined,
        limite_credito: 500,
        status_crediario: 'ativo',
        criado_em: new Date().toISOString()
      };

      setClientes((prev) => [novoCli, ...prev]);
      setClienteSelecionadoNovaVenda(novoCli);
      setMostrarCadastroClienteRapido(false);
      setNovoClienteNome('');
      setNovoClienteCpf('');
      setNovoClienteTelefone('');
      setNovoClienteEndereco('');
      alert(`Cliente "${novoCli.nome}" cadastrado e selecionado!`);
    } catch (err: any) {
      alert(`Erro ao cadastrar cliente: ${err?.message || err}`);
    }
  };

  // Confirmar Nova Venda no Crediário
  const handleConfirmarNovaVenda = async () => {
    if (!clienteSelecionadoNovaVenda) {
      alert('Selecione um cliente.');
      return;
    }

    if (valorTotalNovaVenda <= 0) {
      alert('Informe o valor total da venda.');
      return;
    }

    try {
      const res = await window.api.crediario.criarContrato({
        clienteId: clienteSelecionadoNovaVenda.id,
        valorTotal: valorTotalNovaVenda,
        valorEntrada: entradaNovaVenda,
        qtdParcelas: qtdParcelasNovaVenda,
        dataPrimeiraParcela: primeiroVencimentoNovaVenda,
        usuarioId: usuario?.id || 1,
        motivoAprovacao: 'Contrato gerado manualmente pelo módulo Crediário'
      });

      alert(`Contrato de Crediário #${res.contratoId} gerado com sucesso!`);
      setModalNovaVendaAberto(false);
      setClienteSelecionadoNovaVenda(null);
      setEtapaNovaVenda(1);
      carregarDados();

      // Abre opção de impressão de carnê
      setContratoParaRecibo(res.contrato);
      setParcelasParaRecibo(res.parcelas);
      setModalReciboAberto(true);
    } catch (err: any) {
      alert(`Erro ao criar contrato de crediário: ${err?.message || err}`);
    }
  };

  // Disparo WhatsApp
  const handleCobrarWhatsApp = async (parcela: CrediarioParcela) => {
    try {
      const res = await window.api.crediario.gerarLinkWhatsApp(parcela.id, 'lembrete');
      if (!res.telefone) {
        alert(`O cliente ${res.clienteNome} não possui telefone/WhatsApp cadastrado.`);
        return;
      }
      window.open(res.linkWhatsApp, '_blank');
      carregarDados();
    } catch (e: any) {
      alert(`Erro ao gerar link de cobrança: ${e?.message || e}`);
    }
  };

  // Filtragem da lista (Passo 3: Busca e filtros completos)
  const parcelasFiltradas = parcelas.filter((p) => {
    // Filtro por busca geral (nome, doc, contrato, vencimento, valor)
    if (busca.trim()) {
      const t = busca.toLowerCase();
      const matchNome = (p.cliente_nome || '').toLowerCase().includes(t);
      const matchDoc = (p.cliente_cpf || '').includes(t.replace(/\D/g, ''));
      const numDocStr = `nf-${p.contrato_id}`.toLowerCase();
      const matchContrato = String(p.contrato_id).includes(t) || numDocStr.includes(t);
      const matchVencimento = (p.data_vencimento || '').includes(t);
      const matchValor = (p.valor || '').toString().includes(t);
      if (!matchNome && !matchDoc && !matchContrato && !matchVencimento && !matchValor) return false;
    }

    // Filtro por status / situação
    if (filtroStatus === 'atrasada') return p.status === 'atrasada';
    if (filtroStatus === 'aberta') return p.status === 'aberta' || p.status === 'parcial';
    if (filtroStatus === 'paga') return p.status === 'paga';

    // Filtro por cliente
    if (filtroClienteId !== 'todos' && String(p.cliente_id) !== filtroClienteId) {
      return false;
    }

    // Filtro por período de vencimento
    if (filtroVencimentoInicio && p.data_vencimento < filtroVencimentoInicio) {
      return false;
    }
    if (filtroVencimentoFim && p.data_vencimento > filtroVencimentoFim) {
      return false;
    }

    return true;
  });

  // Controle de seleção de parcelas
  const todasVisiveisSelecionadas = parcelasFiltradas.length > 0 && parcelasFiltradas.every(p => parcelasSelecionadasIds.includes(p.id));

  const handleToggleSelecionarTodas = () => {
    if (todasVisiveisSelecionadas) {
      setParcelasSelecionadasIds([]);
    } else {
      setParcelasSelecionadasIds(parcelasFiltradas.map(p => p.id));
    }
  };

  const handleToggleParcela = (parcelaId: number) => {
    setParcelasSelecionadasIds(prev => 
      prev.includes(parcelaId) ? prev.filter(id => id !== parcelaId) : [...prev, parcelaId]
    );
  };

  // Abrir modal de impressão das parcelas selecionadas ou de um contrato específico
  const handleImprimirSelecionadas = (contratoId?: number, parcelasIds?: number[]) => {
    const pIds = parcelasIds || parcelasSelecionadasIds;
    if (pIds.length === 0 && !contratoId) {
      alert('Selecione ao menos uma parcela para imprimir.');
      return;
    }

    // Determina o contrato
    let cId = contratoId;
    if (!cId) {
      const primeira = parcelas.find(p => pIds.includes(p.id));
      cId = primeira?.contrato_id || 1;
    }

    setContratoIdParaImpressao(cId);
    setParcelasIdsParaImpressao(pIds);
    setModalImpressaoAberto(true);
  };

  return (
    <div className="h-full flex flex-col p-6 bg-slate-50 overflow-hidden space-y-4">
      {/* 1. CABEÇALHO LIMPO COM AÇÃO PRINCIPAL DESTACADA */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-sky-600" />
            <span>Crediário & Contas a Receber</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestão de carteira de crediário, carnês, promissórias e fluxo de cobrança estilo Hiper Gestão.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Ações em Massa (Passo 3) */}
          {parcelasSelecionadasIds.length > 0 && (
            <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-xl shadow-xs animate-in fade-in">
              <span className="text-xs font-bold text-sky-900">
                {parcelasSelecionadasIds.length} {parcelasSelecionadasIds.length === 1 ? 'selecionada' : 'selecionadas'}
              </span>
              
              <button
                type="button"
                onClick={() => handleImprimirSelecionadas()}
                className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs shadow-xs transition-all cursor-pointer"
                title="Imprimir Carnê, Duplicata ou Promissória das parcelas selecionadas"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Documentos</span>
              </button>

              <button
                type="button"
                onClick={() => setParcelasSelecionadasIds([])}
                className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold px-2 py-1"
              >
                Limpar
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setEtapaNovaVenda(1);
              setClienteSelecionadoNovaVenda(null);
              setMostrarCadastroClienteRapido(false);
              setModalNovaVendaAberto(true);
            }}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Venda no Crediário</span>
          </button>
        </div>
      </div>

      {/* 2. RESUMO DE INDICADORES (4 CARDS ESSENCIAIS E DISCRETOS) */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs">
          <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Total em Aberto</div>
          <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
            {formatarMoedaBR(dashboardData.totalReceber)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Carteira de crediário a receber</div>
        </div>

        <div className="bg-white border border-rose-200 p-3.5 rounded-xl shadow-xs bg-rose-50/20">
          <div className="text-[11px] text-rose-700 font-bold uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>Vencido (Inadimplência)</span>
          </div>
          <div className="text-lg font-black text-rose-600 font-mono mt-0.5">
            {formatarMoedaBR(dashboardData.totalAtraso)}
          </div>
          <div className="text-[10px] text-rose-600/80 mt-0.5">
            {dashboardData.qtdClientesInadimplentes} clientes em atraso ({dashboardData.taxaInadimplencia}%)
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs">
          <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">A Vencer (Regular)</div>
          <div className="text-lg font-black text-slate-700 font-mono mt-0.5">
            {formatarMoedaBR(Math.max(0, dashboardData.totalReceber - dashboardData.totalAtraso))}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Parcelas dentro do prazo</div>
        </div>

        <div className="bg-white border border-emerald-200 p-3.5 rounded-xl shadow-xs bg-emerald-50/20">
          <div className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Recebido no Mês</span>
          </div>
          <div className="text-lg font-black text-emerald-600 font-mono mt-0.5">
            {formatarMoedaBR(dashboardData.recebidoMes)}
          </div>
          <div className="text-[10px] text-emerald-700/80 mt-0.5">Total liquidado e baixado</div>
        </div>
      </div>

      {/* 3. BARRA DE BUSCA E FILTROS COMPLETOS (Passo 3: Situação, Período, Cliente) */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente, CPF, NF, contrato..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Filtro de Vencimento De / Até */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold text-[11px]">Vencimento:</span>
          <input
            type="date"
            value={filtroVencimentoInicio}
            onChange={(e) => setFiltroVencimentoInicio(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
          />
          <span className="text-slate-400 text-xs">até</span>
          <input
            type="date"
            value={filtroVencimentoFim}
            onChange={(e) => setFiltroVencimentoFim(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
          />
          {(filtroVencimentoInicio || filtroVencimentoFim) && (
            <button
              type="button"
              onClick={() => {
                setFiltroVencimentoInicio('');
                setFiltroVencimentoFim('');
              }}
              className="text-[10px] text-rose-600 font-bold hover:underline"
            >
              Limpar datas
            </button>
          )}
        </div>

        {/* Filtros em Abas de Status */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setFiltroStatus('todos')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              filtroStatus === 'todos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Todas ({parcelas.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroStatus('atrasada')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              filtroStatus === 'atrasada' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-600 hover:bg-rose-50'
            }`}
          >
            Vencidas
          </button>
          <button
            type="button"
            onClick={() => setFiltroStatus('aberta')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              filtroStatus === 'aberta' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Em Aberto
          </button>
          <button
            type="button"
            onClick={() => setFiltroStatus('paga')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              filtroStatus === 'paga' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Quitadas
          </button>
        </div>
      </div>

      {/* 4. TABELA PRINCIPAL DE PARCELAS / CONTAS A RECEBER COM CHECKBOX E COLUNAS HIPER */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200 text-[11px] sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={todasVisiveisSelecionadas}
                    onChange={handleToggleSelecionarTodas}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                    title="Selecionar todas as parcelas visíveis"
                  />
                </th>
                <th className="py-2.5 px-3 text-center w-24">Situação</th>
                <th className="py-2.5 px-3">Vencimento</th>
                <th className="py-2.5 px-3">Nº Documento</th>
                <th className="py-2.5 px-4">Cliente</th>
                <th className="py-2.5 px-3 text-right">Valor</th>
                <th className="py-2.5 px-3 text-right">Recebido</th>
                <th className="py-2.5 px-3 text-right">A Receber</th>
                <th className="py-2.5 px-4 text-center w-48">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {parcelasFiltradas.map((p) => {
                const isAtrasada = p.status === 'atrasada';
                const isQuitada = p.status === 'paga';
                const isSelecionada = parcelasSelecionadasIds.includes(p.id);
                const totalParcContrato = parcelas.filter(x => x.contrato_id === p.contrato_id).length || 1;
                const numDocHiper = `NF-${p.contrato_id}-${p.contrato_id}-${p.numero}/${totalParcContrato}`;
                const valorRecebido = isQuitada ? p.valor : Math.max(0, p.valor - p.saldo_restante);

                return (
                  <tr key={p.id} className={`hover:bg-slate-50/80 transition-colors ${isSelecionada ? 'bg-sky-50/40' : ''}`}>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelecionada}
                        onChange={() => handleToggleParcela(p.id)}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                        isQuitada
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isAtrasada
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-sky-50 text-sky-700 border-sky-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isQuitada ? 'bg-emerald-500' : isAtrasada ? 'bg-rose-500' : 'bg-sky-500'
                        }`} />
                        {isQuitada ? 'Quitada' : isAtrasada ? 'Vencida' : 'Aberta'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <div className={isAtrasada ? 'text-rose-600 font-bold' : 'text-slate-700 font-semibold'}>
                        {formatarDataBR(p.data_vencimento)}
                      </div>
                      {isAtrasada && p.dias_atraso && (
                        <span className="text-[9px] text-rose-600 font-bold block">
                          {p.dias_atraso} dias de atraso
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <span className="font-bold text-slate-800 text-[11px] block">{numDocHiper}</span>
                      <span className="text-[9px] text-slate-400">Contrato #{p.contrato_id}</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-slate-900">{p.cliente_nome || 'Consumidor'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {p.cliente_cpf ? formatarCpfCnpj(p.cliente_cpf) : 'Sem CPF'} • {p.cliente_telefone ? formatarTelefone(p.cliente_telefone) : 'Sem tel'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatarMoedaBR(p.valor)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                      {formatarMoedaBR(valorRecebido)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {isQuitada ? 'R$ 0,00' : formatarMoedaBR(p.saldo_restante)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {!isQuitada && (
                          <button
                            type="button"
                            onClick={() => abrirModalPagamento(p)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            title="Receber esta parcela"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>Receber</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleImprimirSelecionadas(p.contrato_id, [p.id])}
                          className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                          title="Imprimir Carnê / Duplicata / Promissória desta parcela"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const cli = clientes.find((c) => c.id === p.cliente_id);
                            if (cli) abrirExtratoCliente(cli);
                          }}
                          className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                          title="Ver Extrato 360° do Cliente"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {isAtrasada && p.cliente_telefone && (
                          <button
                            type="button"
                            onClick={() => handleCobrarWhatsApp(p)}
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Cobrar via WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {parcelasFiltradas.length === 0 && !carregando && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Nenhuma parcela encontrada com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da tabela */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs font-semibold text-slate-600 flex justify-between items-center">
          <span>Exibindo <strong className="text-slate-900">{parcelasFiltradas.length}</strong> parcelas</span>
          <span className="text-[11px] text-slate-500">
            Total a Receber: <strong className="text-slate-900 font-mono">{formatarMoedaBR(parcelasFiltradas.reduce((acc, curr) => acc + (curr.status === 'paga' ? 0 : curr.saldo_restante), 0))}</strong>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: FLUXO DE NOVA VENDA NO CREDIÁRIO                                 */}
      {/* ========================================================================= */}
      {modalNovaVendaAberto && (
        <Modal isOpen={modalNovaVendaAberto} onClose={() => setModalNovaVendaAberto(false)} title="Nova Venda no Crediário" maxWidth="xl">
          <div className="space-y-4 text-xs">
            {/* ETAPA 1: SELECIONAR OU CADASTRAR CLIENTE */}
            {etapaNovaVenda === 1 && !mostrarCadastroClienteRapido && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Etapa 1: Selecione o Cliente</span>
                  <button
                    type="button"
                    onClick={() => setMostrarCadastroClienteRapido(true)}
                    className="text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Cadastrar Novo Cliente</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={buscaClienteModal}
                    onChange={(e) => setBuscaClienteModal(e.target.value)}
                    placeholder="Digite o nome ou CPF do cliente..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
                  {clientes
                    .filter((c) => {
                      if (!buscaClienteModal.trim()) return true;
                      const t = buscaClienteModal.toLowerCase();
                      return (c.nome || '').toLowerCase().includes(t) || (c.cpf_cnpj || '').includes(t.replace(/\D/g, ''));
                    })
                    .map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setClienteSelecionadoNovaVenda(c);
                          setEtapaNovaVenda(2);
                        }}
                        className={`p-3 hover:bg-sky-50 cursor-pointer flex justify-between items-center transition-colors ${
                          clienteSelecionadoNovaVenda?.id === c.id ? 'bg-sky-50 font-bold' : ''
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900">{c.nome}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            CPF: {c.cpf_cnpj ? formatarCpfCnpj(c.cpf_cnpj) : '—'} • Limite: {formatarMoedaBR(c.limite_credito || 500)}
                          </div>
                        </div>
                        <button type="button" className="text-sky-600 font-bold px-2 py-1 bg-sky-50 rounded text-xs">
                          Selecionar
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* CADASTRO RÁPIDO DE CLIENTE IN-LINE */}
            {etapaNovaVenda === 1 && mostrarCadastroClienteRapido && (
              <form onSubmit={handleCadastrarClienteRapido} className="space-y-3 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-slate-800">Cadastro Rápido de Cliente</h4>
                  <button
                    type="button"
                    onClick={() => setMostrarCadastroClienteRapido(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Voltar para lista
                  </button>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nome Completo *:</label>
                  <input
                    type="text"
                    value={novoClienteNome}
                    onChange={(e) => setNovoClienteNome(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">CPF:</label>
                    <input
                      type="text"
                      value={novoClienteCpf}
                      onChange={(e) => setNovoClienteCpf(formatarCpfCnpj(e.target.value))}
                      placeholder="000.000.000-00"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Telefone / WhatsApp:</label>
                    <input
                      type="text"
                      value={novoClienteTelefone}
                      onChange={(e) => setNovoClienteTelefone(formatarTelefone(e.target.value))}
                      placeholder="(11) 99999-8888"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Endereço:</label>
                  <input
                    type="text"
                    value={novoClienteEndereco}
                    onChange={(e) => setNovoClienteEndereco(e.target.value)}
                    placeholder="Rua, número, bairro"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setMostrarCadastroClienteRapido(false)}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold"
                  >
                    Salvar e Continuar
                  </button>
                </div>
              </form>
            )}

            {/* ETAPA 2: PARCELAMENTO & CONDIÇÕES */}
            {etapaNovaVenda === 2 && clienteSelecionadoNovaVenda && (
              <div className="space-y-4">
                {/* Cliente Selecionado */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Cliente Selecionado</span>
                    <div className="font-bold text-slate-900 text-sm">{clienteSelecionadoNovaVenda.nome}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      CPF: {clienteSelecionadoNovaVenda.cpf_cnpj ? formatarCpfCnpj(clienteSelecionadoNovaVenda.cpf_cnpj) : '—'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEtapaNovaVenda(1)}
                    className="text-xs text-sky-600 hover:text-sky-800 font-bold underline cursor-pointer"
                  >
                    Trocar Cliente
                  </button>
                </div>

                {/* Parâmetros Financeiros */}
                <div className="grid grid-cols-2 gap-3 bg-white p-3 border border-slate-200 rounded-xl">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Valor Total da Venda (R$):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={valorTotalNovaVenda}
                      onChange={(e) => setValorTotalNovaVenda(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Entrada / Sinal (R$):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={entradaNovaVenda}
                      onChange={(e) => setEntradaNovaVenda(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Quantidade de Parcelas:</label>
                    <select
                      value={qtdParcelasNovaVenda}
                      onChange={(e) => setQtdParcelasNovaVenda(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 18, 24].map((num) => (
                        <option key={num} value={num}>{num}x parcelas</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">1º Vencimento:</label>
                    <input
                      type="date"
                      value={primeiroVencimentoNovaVenda}
                      onChange={(e) => setPrimeiroVencimentoNovaVenda(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Resumo da Simulação */}
                {simulacaoNovaVenda && (
                  <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl space-y-2">
                    <div className="text-xs font-bold text-sky-900 flex justify-between">
                      <span>Plano de Pagamento:</span>
                      <span className="font-mono text-sky-950 font-black">
                        {simulacaoNovaVenda.qtdParcelas}x de {formatarMoedaBR(simulacaoNovaVenda.valorParcela)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1 border-t border-sky-200">
                      <div>Total Financiado: <strong>{formatarMoedaBR(simulacaoNovaVenda.valorFinanciado)}</strong></div>
                      <div>Total c/ Juros: <strong>{formatarMoedaBR(simulacaoNovaVenda.totalComJuros)}</strong></div>
                      <div>Intervalo: <strong>30 dias</strong></div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setEtapaNovaVenda(1)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
                  >
                    ← Voltar
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmarNovaVenda}
                    className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirmar Crediário</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REGISTRO DE PAGAMENTO / RECEBER PARCELA                           */}
      {/* ========================================================================= */}
      {modalPagamentoAberto && parcelaSelecionada && (
        <Modal isOpen={modalPagamentoAberto} onClose={() => setModalPagamentoAberto(false)} title="Registrar Pagamento de Parcela" maxWidth="md">
          <form onSubmit={handleConfirmarPagamento} className="space-y-4 text-xs">
            {/* Informações da Parcela */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="font-bold text-slate-900 text-sm">{parcelaSelecionada.cliente_nome || 'Cliente'}</div>
              <div className="text-[11px] text-slate-500">
                Contrato #{parcelaSelecionada.contrato_id} • Parcela {parcelaSelecionada.numero}
              </div>
              <div className="text-[11px] text-slate-600 font-mono pt-1">
                Vencimento Original: <strong>{formatarDataBR(parcelaSelecionada.data_vencimento)}</strong>
              </div>
            </div>

            {/* Valores e Encargos */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Saldo da Parcela:</label>
                <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 text-sm">
                  {formatarMoedaBR(parcelaSelecionada.saldo_restante)}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Juros / Multa Sugeridos:</label>
                <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-amber-700 text-sm">
                  +{formatarMoedaBR((parcelaSelecionada.juros_estimado || 0) + (parcelaSelecionada.multa_estimada || 0))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Desconto Concedido (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={descontoConcedido}
                  onChange={(e) => setDescontoConcedido(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-rose-600 text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Valor Recebido (R$)*:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={valorRecebido}
                  onChange={(e) => setValorRecebido(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-black text-emerald-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Forma de Pagamento:</label>
              <select
                value={formaPagtoRecebimento}
                onChange={(e) => setFormaPagtoRecebimento(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800"
              >
                <option value="dinheiro">Dinheiro</option>
                <option value="pix">PIX</option>
                <option value="debito">Cartão de Débito</option>
                <option value="credito">Cartão de Crédito</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalPagamentoAberto(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar Recebimento</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EXTRATO 360° DO CLIENTE COM DÍVIDA                               */}
      {/* ========================================================================= */}
      {modalExtratoClienteAberto && clienteExtrato && (
        <Modal isOpen={modalExtratoClienteAberto} onClose={() => setModalExtratoClienteAberto(false)} title={`Extrato do Cliente: ${clienteExtrato.nome}`} maxWidth="3xl">
          <div className="space-y-4 text-xs">
            {/* 4 Cards de Limite & Dívida */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Limite Total</span>
                <div className="text-sm font-black text-slate-900 font-mono mt-0.5">
                  {formatarMoedaBR(historicoDevedorCliente?.limiteTotal ?? (clienteExtrato.limite_credito || 500))}
                </div>
              </div>

              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
                <span className="text-[10px] text-rose-700 uppercase font-bold">Utilizado / Devedor</span>
                <div className="text-sm font-black text-rose-600 font-mono mt-0.5">
                  {formatarMoedaBR(historicoDevedorCliente?.saldoDevedor || 0)}
                </div>
              </div>

              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-[10px] text-emerald-700 uppercase font-bold">Limite Disponível</span>
                <div className="text-sm font-black text-emerald-600 font-mono mt-0.5">
                  {formatarMoedaBR(historicoDevedorCliente?.limiteDisponivel || 0)}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Status Crediário</span>
                <div className="text-sm font-bold text-slate-800 uppercase mt-0.5">
                  {clienteExtrato.status_crediario || 'Ativo'}
                </div>
              </div>
            </div>

            {/* Lista de Parcelas em Aberto e Histórico */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-slate-800 flex items-center justify-between">
                <span>Parcelas Registradas ({parcelasDoCliente.length})</span>
              </h4>

              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Parc.</th>
                      <th className="py-2 px-3">Vencimento</th>
                      <th className="py-2 px-3 text-right">Valor</th>
                      <th className="py-2 px-3 text-right">Saldo</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                    {parcelasDoCliente.map((parc) => (
                      <tr key={parc.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold">#{parc.numero} (Contrato {parc.contrato_id})</td>
                        <td className="py-2 px-3 font-mono">{formatarDataBR(parc.data_vencimento)}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatarMoedaBR(parc.valor)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {parc.status === 'paga' ? 'R$ 0,00' : formatarMoedaBR(parc.saldo_restante)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            parc.status === 'paga'
                              ? 'bg-emerald-50 text-emerald-700'
                              : parc.status === 'atrasada'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-sky-50 text-sky-700'
                          }`}>
                            {parc.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {parc.status !== 'paga' && (
                            <button
                              type="button"
                              onClick={() => abrirModalPagamento(parc)}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[10px]"
                            >
                              Receber
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {parcelasDoCliente.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400">
                          Nenhuma parcela de crediário para este cliente.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setModalExtratoClienteAberto(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer"
              >
                Fechar Extrato
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: COMPROVANTE & CARNÊ DE PARCELAS                                  */}
      {/* ========================================================================= */}
      {modalReciboAberto && contratoParaRecibo && (
        <ReceiptModal
          isOpen={modalReciboAberto}
          onClose={() => setModalReciboAberto(false)}
          venda={{
            id: contratoParaRecibo.venda_id || 0,
            usuario_id: usuario?.id || 1,
            caixa_sessao_id: caixaAberto?.id || 1,
            tipo_operacao: 'venda',
            cliente_id: contratoParaRecibo.cliente_id,
            cliente_nome: contratoParaRecibo.cliente_nome,
            subtotal: contratoParaRecibo.valor_total,
            desconto: 0,
            total: contratoParaRecibo.valor_total,
            forma_pagamento: 'crediario',
            status: 'concluida',
            data_venda: contratoParaRecibo.criado_em
          }}
          itens={[]}
          contratoCrediario={contratoParaRecibo}
          parcelasCrediario={parcelasParaRecibo}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: IMPRESSÃO ESTILO HIPER GESTÃO (CARNÊ, DUPLICATA, PROMISSÓRIA)   */}
      {/* ========================================================================= */}
      {modalImpressaoAberto && contratoIdParaImpressao && (
        <ModalImpressaoCrediario
          isOpen={modalImpressaoAberto}
          onClose={() => setModalImpressaoAberto(false)}
          contratoId={contratoIdParaImpressao}
          parcelasIds={parcelasIdsParaImpressao.length > 0 ? parcelasIdsParaImpressao : undefined}
        />
      )}
    </div>
  );
};

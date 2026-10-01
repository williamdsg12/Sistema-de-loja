import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Trash2, 
  Filter, 
  Check, 
  Calendar, 
  Search, 
  Building2,
  TrendingDown,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { RecursoBloqueadoCard } from '../components/RecursoBloqueadoCard';
import { ContaPagar, Fornecedor } from '../types';
import { usePlanos } from '../context/PlanosContext';

export const ContasPagarView: React.FC = () => {
  const { temRecurso } = usePlanos();
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [busca, setBusca] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos');
  const [mostrarFiltrosAvancados, setMostrarFiltrosAvancados] = useState<boolean>(false);
  const [carregando, setCarregando] = useState<boolean>(true);

  // Modal
  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [formFornecedorId, setFormFornecedorId] = useState<number | undefined>(undefined);
  const [formDescricao, setFormDescricao] = useState<string>('');
  const [formTipo, setFormTipo] = useState<string>('Mercadoria');
  const [formValor, setFormValor] = useState<number>(0);
  const [formDataVencimento, setFormDataVencimento] = useState<string>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const [listaContas, listaForns] = await Promise.all([
        window.api.contasPagar.listar(filtroStatus),
        window.api.fornecedores.listar()
      ]);
      setContas(listaContas || []);
      setFornecedores(listaForns || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [filtroStatus]);

  const abrirModalNovo = () => {
    setFormFornecedorId(fornecedores[0]?.id);
    setFormDescricao('');
    setFormTipo('Mercadoria');
    setFormValor(0);
    setFormDataVencimento(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setModalAberto(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescricao.trim() || formValor <= 0 || !formDataVencimento) {
      alert('Preencha a descrição, o valor e a data de vencimento.');
      return;
    }

    try {
      await window.api.contasPagar.criar({
        fornecedor_id: formFornecedorId ? Number(formFornecedorId) : undefined,
        descricao: `[${formTipo}] ${formDescricao.trim()}`,
        valor: Number(formValor),
        data_vencimento: formDataVencimento
      });
      setModalAberto(false);
      carregarDados();
    } catch (err: any) {
      alert(`Erro ao lançar conta: ${err?.message || err}`);
    }
  };

  const handleBaixarConta = async (conta: ContaPagar) => {
    if (confirm(`Confirmar o pagamento de "${conta.descricao}" no valor de ${formatCurrency(conta.valor)}?`)) {
      try {
        await window.api.contasPagar.pagar(conta.id);
        carregarDados();
      } catch (err: any) {
        alert(`Erro ao quitar conta: ${err?.message || err}`);
      }
    }
  };

  const handleExcluir = async (conta: ContaPagar) => {
    if (confirm(`Excluir a conta a pagar "${conta.descricao}"?`)) {
      try {
        await window.api.contasPagar.excluir(conta.id);
        carregarDados();
      } catch (err: any) {
        alert(`Erro ao excluir: ${err?.message || err}`);
      }
    }
  };

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Cálculos de Dias, Mês e Semana
  const hoje = new Date().toISOString().split('T')[0];

  const calcularDias = (conta: ContaPagar) => {
    if (conta.status === 'pago') return 'Liquidado';
    const venc = new Date(conta.data_vencimento);
    const hj = new Date(hoje);
    const diffTime = venc.getTime() - hj.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)} dias em atraso`;
    if (diffDays === 0) return 'Vence hoje!';
    return `Vence em ${diffDays} dias`;
  };

  // 4 KPIs Especificados: Vencendo hoje, Vencidas, Próximas, Total em aberto
  const contasVencendoHoje = contas.filter(c => c.status !== 'pago' && c.data_vencimento === hoje);
  const contasVencidas = contas.filter(c => c.status !== 'pago' && c.data_vencimento < hoje);
  const contasProximas = contas.filter(c => c.status !== 'pago' && c.data_vencimento > hoje);
  const contasEmAberto = contas.filter(c => c.status !== 'pago');

  const totalVencendoHoje = contasVencendoHoje.reduce((a, b) => a + b.valor, 0);
  const totalVencidas = contasVencidas.reduce((a, b) => a + b.valor, 0);
  const totalProximas = contasProximas.reduce((a, b) => a + b.valor, 0);
  const totalEmAberto = contasEmAberto.reduce((a, b) => a + b.valor, 0);

  // Filtros
  const contasFiltradas = contas.filter((c) => {
    const matchBusca = !busca || 
      c.descricao.toLowerCase().includes(busca.toLowerCase()) || 
      (c.fornecedor_nome && c.fornecedor_nome.toLowerCase().includes(busca.toLowerCase())) ||
      c.data_vencimento.includes(busca) ||
      c.valor.toString().includes(busca);

    if (!matchBusca) return false;
    if (filtroPeriodo === 'hoje') return c.data_vencimento === hoje;
    if (filtroPeriodo === 'vencidas') return c.status !== 'pago' && c.data_vencimento < hoje;
    if (filtroPeriodo === 'este_mes') {
      const mesAtual = hoje.slice(0, 7);
      return c.data_vencimento.startsWith(mesAtual);
    }
    return true;
  });

  if (!temRecurso('contas_pagar')) {
    return (
      <RecursoBloqueadoCard
        recursoNome="Módulo Contas a Pagar & Obrigações"
        descricao="Controle vencimentos, pagamentos a fornecedores, contas fixas e fluxo financeiro da sua empresa com alertas e relatórios."
        planoMinimo="premium"
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-800 overflow-y-auto font-sans p-6 space-y-6">
      
      {/* 1. CABEÇALHO LIMPO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none">Contas a Pagar</h1>
              <p className="text-xs text-slate-500 mt-1">Gestão de obrigações, despesas com fornecedores e controle de vencimentos.</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={abrirModalNovo}
          className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nova Conta</span>
        </button>
      </div>

      {/* 2. CARDS DE RESUMO (4 KPIS: VENCENDO HOJE, VENCIDAS, PRÓXIMAS, TOTAL EM ABERTO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vencendo Hoje */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Vencendo Hoje</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="my-1">
            <h3 className="text-lg font-black text-amber-700 font-mono">
              {formatCurrency(totalVencendoHoje)}
            </h3>
            <p className="text-[11px] text-slate-500">{contasVencendoHoje.length} conta(s)</p>
          </div>
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
            Liquidar hoje
          </div>
        </div>

        {/* Vencidas */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Vencidas</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="my-1">
            <h3 className="text-lg font-black text-rose-700 font-mono">
              {formatCurrency(totalVencidas)}
            </h3>
            <p className="text-[11px] text-slate-500">{contasVencidas.length} conta(s) em atraso</p>
          </div>
          <div className="text-[10px] text-rose-600 pt-1 border-t border-slate-100 font-bold">
            Prioridade de quitação
          </div>
        </div>

        {/* Próximas */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">A Vencer (Próximas)</span>
            <Calendar className="w-4 h-4 text-sky-500" />
          </div>
          <div className="my-1">
            <h3 className="text-lg font-black text-slate-900 font-mono">
              {formatCurrency(totalProximas)}
            </h3>
            <p className="text-[11px] text-slate-500">{contasProximas.length} conta(s)</p>
          </div>
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
            Previsão futura
          </div>
        </div>

        {/* Total em Aberto */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total em Aberto</span>
            <TrendingDown className="w-4 h-4 text-slate-600" />
          </div>
          <div className="my-1">
            <h3 className="text-lg font-black text-slate-900 font-mono">
              {formatCurrency(totalEmAberto)}
            </h3>
            <p className="text-[11px] text-slate-500">{contasEmAberto.length} conta(s) total</p>
          </div>
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
            Passivo pendente
          </div>
        </div>
      </div>

      {/* 3. BARRA DE BUSCA E FILTROS COMPACTOS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por descrição, fornecedor, valor..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setMostrarFiltrosAvancados(!mostrarFiltrosAvancados)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              mostrarFiltrosAvancados
                ? 'bg-sky-50 border-sky-300 text-sky-700'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros</span>
          </button>
        </div>

        {/* Painel de Filtros Avançados Oculto Inicialmente */}
        {mostrarFiltrosAvancados && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Status:</label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 font-medium text-slate-800 focus:ring-2 focus:ring-sky-500"
              >
                <option value="todos">Todos os Status</option>
                <option value="pendente">Apenas Pendentes</option>
                <option value="pago">Apenas Pagos</option>
                <option value="atrasado">Apenas Atrasados</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Período de Vencimento:</label>
              <select
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 font-medium text-slate-800 focus:ring-2 focus:ring-sky-500"
              >
                <option value="todos">Todos os Períodos</option>
                <option value="hoje">Vencendo Hoje</option>
                <option value="vencidas">Vencidas / Atrasadas</option>
                <option value="este_mes">Vencimento Neste Mês</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 4. TABELA LIMPA DE CONTAS A PAGAR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200 text-[10px]">
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Vencimento</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Fornecedor</th>
                <th className="py-3 px-4 text-center">Situação</th>
                <th className="py-3 px-4 text-center w-28">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {contasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhuma conta a pagar encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                contasFiltradas.map((conta) => {
                  const estaAtrasada = conta.status !== 'pago' && conta.data_vencimento < hoje;
                  const diasTexto = calcularDias(conta);

                  return (
                    <tr key={conta.id} className="hover:bg-slate-50 transition-colors">
                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          conta.status === 'pago'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : estaAtrasada
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {conta.status === 'pago' ? 'Pago' : estaAtrasada ? 'Atrasado' : 'Pendente'}
                        </span>
                      </td>

                      {/* Vencimento */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {new Date(conta.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>

                      {/* Valor */}
                      <td className="py-3 px-4 text-right font-bold font-mono text-slate-900">
                        {formatCurrency(conta.valor)}
                      </td>

                      {/* Descrição */}
                      <td className="py-3 px-4 font-bold text-slate-900">{conta.descricao}</td>

                      {/* Fornecedor */}
                      <td className="py-3 px-4 text-slate-600">{conta.fornecedor_nome || '—'}</td>

                      {/* Situação / Dias */}
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[11px] font-bold ${
                          estaAtrasada ? 'text-rose-600' : conta.status === 'pago' ? 'text-emerald-600' : 'text-slate-500'
                        }`}>
                          {diasTexto}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {conta.status !== 'pago' && (
                            <button
                              type="button"
                              onClick={() => handleBaixarConta(conta)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold border border-emerald-200 transition-colors cursor-pointer"
                              title="Dar baixa / Quitar"
                            >
                              Baixar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleExcluir(conta)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: LANÇAR NOVA CONTA */}
      <Modal isOpen={modalAberto} onClose={() => setModalAberto(false)} title="Lançar Nova Conta a Pagar" maxWidth="md">
        <form onSubmit={handleSalvar} className="space-y-4 text-xs">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Descrição / Referente a *:
            </label>
            <input
              type="text"
              required
              value={formDescricao}
              onChange={(e) => setFormDescricao(e.target.value)}
              placeholder="Ex: Fornecedor Tecidos / Aluguel da Loja / Energia"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Valor a Pagar (R$) *:
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={formValor || ''}
                onChange={(e) => setFormValor(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Data de Vencimento *:
              </label>
              <input
                type="date"
                required
                value={formDataVencimento}
                onChange={(e) => setFormDataVencimento(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Categoria / Tipo:
              </label>
              <select
                value={formTipo}
                onChange={(e) => setFormTipo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 focus:ring-2 focus:ring-sky-500"
              >
                <option value="Mercadoria">Mercadoria / Fornecedor</option>
                <option value="Fixa">Despesa Fixa (Aluguel, Luz)</option>
                <option value="Impostos">Tributos / Impostos</option>
                <option value="Pessoal">Salários / Comissões</option>
                <option value="Outros">Outras Despesas</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Fornecedor (Opcional):
              </label>
              <select
                value={formFornecedorId || ''}
                onChange={(e) => setFormFornecedorId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Nenhum Fornecedor Vinculado</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Salvar Conta a Pagar</span>
          </button>
        </form>
      </Modal>
    </div>
  );
};

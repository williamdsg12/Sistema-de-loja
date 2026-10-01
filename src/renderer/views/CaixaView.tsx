import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCaixa } from '../context/CaixaContext';
import { 
  CircleDollarSign, 
  Lock, 
  Unlock, 
  History, 
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  PlusCircle,
  MinusCircle,
  Receipt,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { CaixaSessao, ResumoFechamentoCaixa } from '../types';

export const CaixaView: React.FC = () => {
  const { usuario } = useAuth();
  const { caixaAberto, abrirCaixa, fecharCaixa, verificarCaixa } = useCaixa();

  // Estados locais
  const [sessoes, setSessoes] = useState<CaixaSessao[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [resumoAtual, setResumoAtual] = useState<ResumoFechamentoCaixa | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);

  // Modais
  const [modalAbrirAberto, setModalAbrirAberto] = useState<boolean>(false);
  const [valorAberturaInput, setValorAberturaInput] = useState<string | number>(100);

  const [modalFecharAberto, setModalFecharAberto] = useState<boolean>(false);
  const [valorInformadoInput, setValorInformadoInput] = useState<string | number>(0);
  const [fechando, setFechando] = useState<boolean>(false);

  const [modalSangriaAberto, setModalSangriaAberto] = useState<boolean>(false);
  const [valorSangria, setValorSangria] = useState<string | number>(0);
  const [motivoSangria, setMotivoSangria] = useState<string>('');

  const [modalSuprimentoAberto, setModalSuprimentoAberto] = useState<boolean>(false);
  const [valorSuprimento, setValorSuprimento] = useState<string | number>(0);
  const [motivoSuprimento, setMotivoSuprimento] = useState<string>('');

  const [abaAtiva, setAbaAtiva] = useState<'movimentacoes' | 'historico'>('movimentacoes');

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const listaSessoes = await window.api.caixa.listarSessoes(30);
      setSessoes(listaSessoes || []);

      if (caixaAberto) {
        const resumo = await window.api.caixa.getResumo(caixaAberto.id);
        setResumoAtual(resumo);
        const movs = await window.api.caixa.listarMovimentacoes(caixaAberto.id);
        setMovimentacoes(movs || []);
      } else {
        setResumoAtual(null);
        setMovimentacoes([]);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do caixa:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [caixaAberto]);

  const parseNum = (val: any, fallback = 0): number => {
    if (val === '' || val === null || val === undefined) return fallback;
    if (typeof val === 'number') return isNaN(val) ? fallback : val;
    const parsed = parseFloat(String(val).replace(',', '.'));
    return isNaN(parsed) ? fallback : parsed;
  };

  // Abertura de Caixa
  const handleAbrirSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await abrirCaixa(parseNum(valorAberturaInput, 0));
    if (ok) {
      setModalAbrirAberto(false);
      carregarDados();
    }
  };

  // Preparar Fechamento de Caixa
  const iniciarFechamento = async () => {
    if (!caixaAberto) return;
    try {
      const resumo = await window.api.caixa.getResumo(caixaAberto.id);
      setResumoAtual(resumo);
      setValorInformadoInput(resumo.total_sistema);
      setModalFecharAberto(true);
    } catch (err: any) {
      alert(`Erro ao obter resumo do caixa: ${err?.message || err}`);
    }
  };

  // Confirmar Fechamento de Caixa
  const handleConfirmarFechamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caixaAberto) return;
    try {
      setFechando(true);
      await fecharCaixa(parseNum(valorInformadoInput, 0));
      setModalFecharAberto(false);
      await verificarCaixa();
      carregarDados();
      alert('Caixa fechado com sucesso!');
    } catch (err: any) {
      alert(`Erro ao fechar caixa: ${err?.message || err}`);
    } finally {
      setFechando(false);
    }
  };

  // Sangria
  const handleConfirmarSangria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caixaAberto) return;
    const numSangria = parseNum(valorSangria, 0);
    if (numSangria <= 0) {
      alert('Informe um valor válido para a sangria.');
      return;
    }
    try {
      await window.api.caixa.sangria(caixaAberto.id, usuario?.id || 1, numSangria, motivoSangria || 'Sangria de Caixa');
      setModalSangriaAberto(false);
      setValorSangria(0);
      setMotivoSangria('');
      carregarDados();
      alert('Sangria realizada com sucesso!');
    } catch (err: any) {
      alert(`Erro ao realizar sangria: ${err?.message || err}`);
    }
  };

  // Suprimento
  const handleConfirmarSuprimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caixaAberto) return;
    const numSuprimento = parseNum(valorSuprimento, 0);
    if (numSuprimento <= 0) {
      alert('Informe um valor válido para o suprimento.');
      return;
    }
    try {
      await window.api.caixa.suprimento(caixaAberto.id, usuario?.id || 1, numSuprimento, motivoSuprimento || 'Suprimento / Reforço');
      setModalSuprimentoAberto(false);
      setValorSuprimento(0);
      setMotivoSuprimento('');
      carregarDados();
      alert('Suprimento realizado com sucesso!');
    } catch (err: any) {
      alert(`Erro ao realizar suprimento: ${err?.message || err}`);
    }
  };

  const formatCurrency = (val: number | null | undefined) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-800 overflow-y-auto font-sans p-6 space-y-6">
      
      {/* 1. CABEÇALHO LIMPO COM AÇÃO PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
              <CircleDollarSign className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none">Controle de Caixa</h1>
              <p className="text-xs text-slate-500 mt-1">Gerenciamento operacional do turno, sangrias, suprimentos e fechamento.</p>
            </div>
          </div>
        </div>

        {/* Ações Operacionais */}
        <div className="flex items-center gap-2">
          {caixaAberto ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setValorSuprimento(0);
                  setMotivoSuprimento('');
                  setModalSuprimentoAberto(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Suprimento</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setValorSangria(0);
                  setMotivoSangria('');
                  setModalSangriaAberto(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-bold border border-amber-200 transition-colors cursor-pointer"
              >
                <MinusCircle className="w-4 h-4" />
                <span>Sangria</span>
              </button>

              <button
                type="button"
                onClick={iniciarFechamento}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Fechar Caixa</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setValorAberturaInput(100);
                setModalAbrirAberto(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir Caixa</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. CARDS DE RESUMO OPERACIONAL DO TURNO (5 KPIS DISCRETOS) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Status */}
        <div className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between ${
          caixaAberto 
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
            : 'bg-slate-100 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</span>
            {caixaAberto ? <Unlock className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-slate-400" />}
          </div>
          <div className="my-1">
            <h3 className="text-base font-black text-slate-900">{caixaAberto ? `Aberto #${caixaAberto.id}` : 'Caixa Fechado'}</h3>
            <p className="text-[11px] text-slate-500 line-clamp-1">
              {caixaAberto ? (caixaAberto.usuario_nome || usuario?.nome) : 'Abra para vender'}
            </p>
          </div>
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 font-mono">
            {caixaAberto ? new Date(caixaAberto.data_abertura).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
          </div>
        </div>

        {/* Saldo Inicial */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Saldo Inicial</span>
            <ArrowDownCircle className="w-4 h-4 text-sky-600" />
          </div>
          <div className="my-1">
            <h3 className="text-lg font-black text-slate-900 font-mono">
              {formatCurrency(caixaAberto?.valor_abertura || 0)}
            </h3>
            <p className="text-[11px] text-slate-500">Fundo de troco</p>
          </div>
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
            Gaveta inicial
          </div>
        </div>

        {/* Vendas do Turno */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Vendas do Turno</span>
            <Receipt className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="my-1">
            <h3 className="text-lg font-black text-indigo-700 font-mono">
              {formatCurrency(resumoAtual?.total_vendas || 0)}
            </h3>
            <p className="text-[11px] text-slate-500">Todas formas de pagto</p>
          </div>
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
            PIX, Cartão e Dinheiro
          </div>
        </div>

        {/* Entradas em Dinheiro */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Dinheiro Recebido</span>
            <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-1">
            <h3 className="text-lg font-black text-emerald-700 font-mono">
              {formatCurrency(resumoAtual?.vendas_por_forma?.dinheiro || 0)}
            </h3>
            <p className="text-[11px] text-slate-500">Vendas físicas</p>
          </div>
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
            Impacta a gaveta
          </div>
        </div>

        {/* Saldo Esperado em Gaveta */}
        <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-sky-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Saldo em Gaveta</span>
            <CircleDollarSign className="w-4 h-4 text-sky-600" />
          </div>
          <div className="my-1">
            <h3 className="text-lg font-black text-sky-800 font-mono">
              {formatCurrency(resumoAtual?.total_sistema || caixaAberto?.valor_abertura || 0)}
            </h3>
            <p className="text-[11px] text-sky-600">Dinheiro atual esperado</p>
          </div>
          <div className="text-[10px] text-sky-700 pt-1 border-t border-sky-200">
            Para conferência cega
          </div>
        </div>
      </div>

      {/* 3. ABAS DE NAVEGAÇÃO: MOVIMENTAÇÕES DO TURNO / HISTÓRICO DE SESSÕES */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAbaAtiva('movimentacoes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                abaAtiva === 'movimentacoes'
                  ? 'bg-white text-sky-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Movimentações do Turno Atual ({movimentacoes.length})
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('historico')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                abaAtiva === 'historico'
                  ? 'bg-white text-sky-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Histórico de Sessões Anteriores ({sessoes.length})
            </button>
          </div>

          <button
            type="button"
            onClick={carregarDados}
            className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800 font-bold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>
        </div>

        {/* CONTEÚDO DA ABA ATIVA */}
        {abaAtiva === 'movimentacoes' ? (
          <div className="overflow-x-auto">
            {caixaAberto ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Hora</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Descrição / Motivo</th>
                    <th className="py-3 px-4">Forma</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {movimentacoes.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(m.data_hora || m.created_at || Date.now()).toLocaleTimeString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 font-bold">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                          m.tipo === 'venda' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          m.tipo === 'suprimento' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                          m.tipo === 'sangria' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {m.tipo || 'Movimento'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{m.descricao || m.motivo || 'Movimentação de Caixa'}</td>
                      <td className="py-3 px-4 text-slate-500 capitalize">{m.forma_pagamento || 'Dinheiro'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(m.valor)}
                      </td>
                    </tr>
                  ))}
                  {movimentacoes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Nenhuma movimentação registrada neste turno ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center space-y-2">
                <Lock className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="font-bold text-slate-700 text-sm">O caixa está fechado</h4>
                <p className="text-xs text-slate-500">Abra um novo turno para registrar vendas, sangrias e suprimentos.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4"># Sessão</th>
                  <th className="py-3 px-4">Operador</th>
                  <th className="py-3 px-4">Abertura</th>
                  <th className="py-3 px-4">Fechamento</th>
                  <th className="py-3 px-4 text-right">Fundo Inicial</th>
                  <th className="py-3 px-4 text-right">Esperado</th>
                  <th className="py-3 px-4 text-right">Informado</th>
                  <th className="py-3 px-4 text-right">Diferença</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sessoes.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold font-mono text-sky-700">#{s.id}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{s.usuario_nome || '—'}</td>
                    <td className="py-3 px-4 text-slate-500">{new Date(s.data_abertura).toLocaleString('pt-BR')}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {s.data_fechamento ? new Date(s.data_fechamento).toLocaleString('pt-BR') : <span className="text-emerald-700 font-bold">Em Aberto</span>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(s.valor_abertura)}</td>
                    <td className="py-3 px-4 text-right font-mono font-medium">
                      {s.valor_fechamento_sistema !== undefined && s.valor_fechamento_sistema !== null ? formatCurrency(s.valor_fechamento_sistema) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium">
                      {s.valor_fechamento_informado !== undefined && s.valor_fechamento_informado !== null ? formatCurrency(s.valor_fechamento_informado) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold font-mono">
                      {s.diferenca !== undefined && s.diferenca !== null ? (
                        <span className={s.diferenca < 0 ? 'text-rose-600' : s.diferenca > 0 ? 'text-blue-600' : 'text-emerald-700'}>
                          {formatCurrency(s.diferenca)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        s.status === 'aberto' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: ABRIR CAIXA */}
      <Modal isOpen={modalAbrirAberto} onClose={() => setModalAbrirAberto(false)} title="Abertura de Turno de Caixa" maxWidth="sm">
        <form onSubmit={handleAbrirSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Valor Inicial de Fundo de Troco (R$):
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={valorAberturaInput}
              onChange={(e) => setValorAberturaInput(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-lg font-black text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              autoFocus
            />
            <p className="text-[11px] text-slate-500 mt-1">Informe a quantia física presente na gaveta para troco.</p>
          </div>

          <div className="flex gap-2">
            {[50, 100, 150, 200].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setValorAberturaInput(v)}
                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors"
              >
                R$ {v}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            <span>Confirmar e Abrir Caixa</span>
          </button>
        </form>
      </Modal>

      {/* MODAL 2: SUPRIMENTO DE CAIXA (ENTRADA) */}
      <Modal isOpen={modalSuprimentoAberto} onClose={() => setModalSuprimentoAberto(false)} title="Suprimento de Caixa (Entrada / Reforço)" maxWidth="sm">
        <form onSubmit={handleConfirmarSuprimento} className="space-y-4 text-xs">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Valor a Inserir no Caixa (R$):
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              value={valorSuprimento}
              onChange={(e) => setValorSuprimento(e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-lg font-black text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Motivo do Suprimento:
            </label>
            <input
              type="text"
              value={motivoSuprimento}
              onChange={(e) => setMotivoSuprimento(e.target.value)}
              placeholder="Ex: Troco adicional / Moedas"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Confirmar Suprimento</span>
          </button>
        </form>
      </Modal>

      {/* MODAL 3: SANGRIA DE CAIXA (RETIRADA) */}
      <Modal isOpen={modalSangriaAberto} onClose={() => setModalSangriaAberto(false)} title="Sangria de Caixa (Retirada de Dinheiro)" maxWidth="sm">
        <form onSubmit={handleConfirmarSangria} className="space-y-4 text-xs">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Valor a Retirar do Caixa (R$):
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              value={valorSangria}
              onChange={(e) => setValorSangria(e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-lg font-black text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Motivo da Sangria:
            </label>
            <input
              type="text"
              value={motivoSangria}
              onChange={(e) => setMotivoSangria(e.target.value)}
              placeholder="Ex: Pagamento fornecedor / Depósito cofre"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <MinusCircle className="w-4 h-4" />
            <span>Confirmar Sangria</span>
          </button>
        </form>
      </Modal>

      {/* MODAL 4: FECHAR CAIXA */}
      <Modal isOpen={modalFecharAberto} onClose={() => setModalFecharAberto(false)} title="Fechamento de Turno & Conferência" maxWidth="lg">
        {resumoAtual && (
          <form onSubmit={handleConfirmarFechamento} className="space-y-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
              <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">
                Totais Registrados no Turno #{caixaAberto?.id}:
              </h4>

              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div className="flex justify-between">
                  <span>Abertura (Troco):</span>
                  <span className="font-bold text-slate-800">{formatCurrency(resumoAtual.valor_abertura)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vendas em Dinheiro:</span>
                  <span className="font-bold text-slate-800">{formatCurrency(resumoAtual.vendas_por_forma?.dinheiro || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cartão de Crédito:</span>
                  <span className="font-bold text-slate-800">{formatCurrency(resumoAtual.vendas_por_forma?.cartao_credito || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cartão de Débito:</span>
                  <span className="font-bold text-slate-800">{formatCurrency(resumoAtual.vendas_por_forma?.cartao_debito || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>PIX:</span>
                  <span className="font-bold text-slate-800">{formatCurrency(resumoAtual.vendas_por_forma?.pix || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Geral Vendido:</span>
                  <span className="font-black text-emerald-700">{formatCurrency(resumoAtual.total_vendas)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black text-slate-900">
                <span>Dinheiro Esperado em Gaveta:</span>
                <span className="text-base text-sky-700 font-mono">{formatCurrency(resumoAtual.total_sistema)}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Valor Físico Contado na Gaveta (Dinheiro Real):
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={valorInformadoInput}
                onChange={(e) => setValorInformadoInput(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-lg font-black text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
              parseNum(valorInformadoInput, 0) - resumoAtual.total_sistema === 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : parseNum(valorInformadoInput, 0) - resumoAtual.total_sistema < 0
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : 'bg-blue-50 border-blue-300 text-blue-800'
            }`}>
              <span>Diferença Apurada:</span>
              <span className="text-sm font-mono font-bold">
                {formatCurrency(parseNum(valorInformadoInput, 0) - resumoAtual.total_sistema)}
                {parseNum(valorInformadoInput, 0) - resumoAtual.total_sistema === 0 && ' (Caixa Bateu Perfeitamente)'}
                {parseNum(valorInformadoInput, 0) - resumoAtual.total_sistema < 0 && ' (Falta / Quebra de Caixa)'}
                {parseNum(valorInformadoInput, 0) - resumoAtual.total_sistema > 0 && ' (Sobra de Caixa)'}
              </span>
            </div>

            <button
              type="submit"
              disabled={fechando}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-3 rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{fechando ? 'Processando Fechamento...' : 'CONFIRMAR E FECHAR CAIXA'}</span>
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
};

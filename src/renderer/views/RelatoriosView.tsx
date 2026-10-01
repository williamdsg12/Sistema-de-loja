import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Calendar, 
  Printer, 
  Award,
  Layers,
  FileText,
  Boxes,
  Users,
  CreditCard,
  CircleDollarSign,
  Download,
  ArrowLeft,
  Filter,
  Sliders,
  CheckCircle2
} from 'lucide-react';

type CategoriaRelatorio = 'vendas' | 'estoque' | 'financeiro' | 'clientes' | 'crediario' | 'caixa';

export const RelatoriosView: React.FC = () => {
  const [categoria, setCategoria] = useState<CategoriaRelatorio>('vendas');
  const [periodoFiltro, setPeriodoFiltro] = useState<'hoje' | '7dias' | '30dias' | 'mesAtual' | 'custom'>('30dias');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [carregando, setCarregando] = useState<boolean>(true);
  const [modoPreviewDoc, setModoPreviewDoc] = useState<boolean>(false);
  const [mostrarOpcoesAvancadas, setMostrarOpcoesAvancadas] = useState<boolean>(false);

  // Dados dos Relatórios
  const [faturamentoDados, setFaturamentoDados] = useState<any>(null);
  const [maisVendidos, setMaisVendidos] = useState<any[]>([]);
  const [lucroDados, setLucroDados] = useState<any>(null);
  const [clientesRelatorio, setClientesRelatorio] = useState<any[]>([]);
  const [estoqueRelatorio, setEstoqueRelatorio] = useState<any[]>([]);

  // Inicializa datas
  useEffect(() => {
    const hoje = new Date();
    const formatYMD = (d: Date) => d.toISOString().split('T')[0];

    let dtIni = new Date();
    if (periodoFiltro === 'hoje') {
      dtIni = hoje;
    } else if (periodoFiltro === '7dias') {
      dtIni.setDate(hoje.getDate() - 7);
    } else if (periodoFiltro === '30dias') {
      dtIni.setDate(hoje.getDate() - 30);
    } else if (periodoFiltro === 'mesAtual') {
      dtIni = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    }

    if (periodoFiltro !== 'custom') {
      setDataInicio(formatYMD(dtIni));
      setDataFim(formatYMD(hoje));
    }
  }, [periodoFiltro]);

  const carregarRelatorios = async () => {
    if (!dataInicio || !dataFim) return;
    setCarregando(true);
    try {
      const [fat, top, luc, clis, prods] = await Promise.all([
        window.api.relatorios.faturamento(dataInicio, dataFim).catch(() => null),
        window.api.relatorios.maisVendidos(dataInicio, dataFim, 20).catch(() => []),
        window.api.relatorios.lucroEstimado(dataInicio, dataFim).catch(() => null),
        window.api.clientes.listar().catch(() => []),
        window.api.produtos.listar('', true).catch(() => [])
      ]);
      setFaturamentoDados(fat);
      setMaisVendidos(top || []);
      setLucroDados(luc);
      setClientesRelatorio(clis || []);
      setEstoqueRelatorio(prods || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (dataInicio && dataFim) {
      carregarRelatorios();
    }
  }, [dataInicio, dataFim, categoria]);

  const formatCurrency = (val: number | null | undefined) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handlePrint = () => {
    window.print();
  };

  const getTituloRelatorio = () => {
    switch (categoria) {
      case 'vendas': return 'Relatório de Vendas & Faturamento';
      case 'estoque': return 'Relatório de Posição & Giro de Estoque';
      case 'financeiro': return 'Relatório Financeiro & Lucratividade';
      case 'clientes': return 'Relatório de Clientes & Compras';
      case 'crediario': return 'Relatório de Crediário & Cobrança';
      case 'caixa': return 'Relatório de Fechamentos de Caixa';
      default: return 'Relatório Gerencial';
    }
  };

  const getDescricaoRelatorio = () => {
    switch (categoria) {
      case 'vendas': return `Demonstrativo de faturamento de ${dataInicio} até ${dataFim}.`;
      case 'estoque': return 'Listagem consolidada de produtos, custos, estoque atual e patrimônio.';
      case 'financeiro': return 'Margens de lucro estimadas e despesas operacionais.';
      case 'clientes': return 'Base de clientes cadastrados, limite de crédito e saldos devedores.';
      case 'crediario': return 'Status das carteiras a receber, parcelas vencidas e valores recebidos.';
      case 'caixa': return 'Histórico de sessões de caixa, quebras e sobras apuradas.';
      default: return 'Documento de conferência administrativa.';
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-800 overflow-y-auto font-sans p-6 space-y-6">
      
      {/* 1. MODO PREVIEW DE DOCUMENTO / PDF (PROTAGONISTA DA TELA) */}
      {modoPreviewDoc ? (
        <div className="flex-1 flex flex-col space-y-4 max-w-5xl mx-auto w-full">
          {/* Barra Superior Minimalista do Preview */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setModoPreviewDoc(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-none">{getTituloRelatorio()}</h2>
                <p className="text-xs text-slate-500 mt-1">{getDescricaoRelatorio()}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMostrarOpcoesAvancadas(!mostrarOpcoesAvancadas)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Opções Avançadas
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Baixar PDF</span>
              </button>
            </div>
          </div>

          {/* Opções avançadas colapsáveis */}
          {mostrarOpcoesAvancadas && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Orientação:</label>
                <select className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50">
                  <option>Retrato (A4 Vertical)</option>
                  <option>Paisagem (A4 Horizontal)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tamanho da Fonte:</label>
                <select className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50">
                  <option>Padrão (10pt)</option>
                  <option>Compacto (8pt)</option>
                  <option>Grande (12pt)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Campos Extras:</label>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-sky-600" />
                  <span>Incluir cabeçalho e CNPJ da loja</span>
                </label>
              </div>
            </div>
          )}

          {/* FOLHA DE VISUALIZAÇÃO A4 (PROTAGONISTA) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-8 min-h-[600px] text-slate-900 space-y-6">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold uppercase tracking-wide">{getTituloRelatorio()}</h1>
                <p className="text-xs text-slate-500 mt-1">{getDescricaoRelatorio()}</p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <div>Emitido em: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</div>
                <div className="font-bold text-slate-600 mt-1">WS Gestão PDV</div>
              </div>
            </div>

            {/* Conteúdo específico da folha */}
            {categoria === 'vendas' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Faturamento Total</span>
                    <div className="text-lg font-black text-emerald-700 font-mono">{formatCurrency(faturamentoDados?.faturamentoTotal)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Qtd de Vendas</span>
                    <div className="text-lg font-black text-slate-800 font-mono">{faturamentoDados?.totalVendas || 0}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Ticket Médio</span>
                    <div className="text-lg font-black text-slate-800 font-mono">
                      {formatCurrency((faturamentoDados?.totalVendas || 0) > 0 ? (faturamentoDados?.faturamentoTotal || 0) / faturamentoDados.totalVendas : 0)}
                    </div>
                  </div>
                </div>

                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Produto</th>
                      <th className="py-2.5 px-3 text-center">Qtd Vendida</th>
                      <th className="py-2.5 px-3 text-right">Total Faturado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {maisVendidos.map((it: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-medium">{it.produto_nome}</td>
                        <td className="py-2 px-3 text-center">{it.total_quantidade}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">{formatCurrency(it.total_faturado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {categoria === 'estoque' && (
              <div className="space-y-4 text-xs">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Produto</th>
                      <th className="py-2.5 px-3 text-center">Estoque Atual</th>
                      <th className="py-2.5 px-3 text-right">Custo</th>
                      <th className="py-2.5 px-3 text-right">Preço Venda</th>
                      <th className="py-2.5 px-3 text-right">Total em Estoque</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {estoqueRelatorio.map((p: any) => (
                      <tr key={p.id}>
                        <td className="py-2 px-3 font-mono text-slate-500">{p.codigo || '—'}</td>
                        <td className="py-2 px-3 font-bold">{p.nome}</td>
                        <td className="py-2 px-3 text-center">{p.estoque_atual} {p.unidade_medida}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatCurrency(p.preco_custo)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">{formatCurrency(p.preco_venda)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">{formatCurrency(p.estoque_atual * p.preco_custo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 2. MODO PADRÃO DE SELEÇÃO & NAVEGAÇÃO DE RELATÓRIOS */
        <div className="space-y-6">
          {/* Cabeçalho */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 leading-none">Relatórios & Documentos</h1>
                  <p className="text-xs text-slate-500 mt-1">Gere relatórios sintéticos e visualize impressões limpas.</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModoPreviewDoc(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Visualizar / Imprimir Relatório</span>
            </button>
          </div>

          {/* Categorias de Relatórios (Vendas, Estoque, Financeiro, Clientes, Crediário, Caixa) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { id: 'vendas', label: 'Vendas', icon: ShoppingBag },
              { id: 'estoque', label: 'Estoque', icon: Boxes },
              { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
              { id: 'clientes', label: 'Clientes', icon: Users },
              { id: 'crediario', label: 'Crediário', icon: CreditCard },
              { id: 'caixa', label: 'Caixa', icon: CircleDollarSign },
            ].map((cat) => {
              const Icon = cat.icon;
              const isSel = categoria === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoria(cat.id as CategoriaRelatorio)}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                    isSel
                      ? 'bg-sky-50/70 border-sky-500 text-sky-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Filtros Contextuais Relevantes para a Categoria Selecionada */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Período:</span>
              {[
                { id: 'hoje', label: 'Hoje' },
                { id: '7dias', label: '7 Dias' },
                { id: '30dias', label: '30 Dias' },
                { id: 'mesAtual', label: 'Este Mês' }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodoFiltro(p.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    periodoFiltro === p.id
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => {
                  setPeriodoFiltro('custom');
                  setDataInicio(e.target.value);
                }}
                className="px-3 py-1.5 border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-sky-500"
              />
              <span className="text-slate-400">até</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => {
                  setPeriodoFiltro('custom');
                  setDataFim(e.target.value);
                }}
                className="px-3 py-1.5 border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* 4 Cards Principais da Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Faturamento Bruto</span>
              <div className="text-xl font-black text-slate-900 font-mono mt-1">
                {formatCurrency(faturamentoDados?.faturamentoTotal)}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{faturamentoDados?.totalVendas || 0} vendas</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Lucro Estimado</span>
              <div className="text-xl font-black text-emerald-700 font-mono mt-1">
                {formatCurrency(lucroDados?.lucroTotal)}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Margem: {(lucroDados?.margemMedia || 0).toFixed(1)}%</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Ticket Médio</span>
              <div className="text-xl font-black text-slate-900 font-mono mt-1">
                {formatCurrency((faturamentoDados?.totalVendas || 0) > 0 ? (faturamentoDados?.faturamentoTotal || 0) / faturamentoDados.totalVendas : 0)}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Média por venda</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Itens Vendidos</span>
              <div className="text-xl font-black text-slate-900 font-mono mt-1">
                {maisVendidos.reduce((acc, it) => acc + (it.total_quantidade || 0), 0)}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Unidades movimentadas</p>
            </div>
          </div>

          {/* Tabela de Detalhamento Limpa */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Award className="w-4 h-4 text-sky-600" />
                <span>Ranking dos Produtos Mais Vendidos no Período</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Produto</th>
                    <th className="py-2.5 px-3 text-center">Quantidade</th>
                    <th className="py-2.5 px-3 text-right">Total Faturado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {maisVendidos.map((it: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{idx + 1}º</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{it.produto_nome}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">{it.total_quantidade}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">{formatCurrency(it.total_faturado)}</td>
                    </tr>
                  ))}
                  {maisVendidos.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        Nenhuma venda registrada no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

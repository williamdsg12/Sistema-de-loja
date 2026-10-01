import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Building2, 
  Users, 
  CreditCard, 
  ShoppingBag, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Edit3, 
  RefreshCw, 
  TrendingUp, 
  ExternalLink,
  Lock,
  Sparkles,
  ShieldCheck,
  Power
} from 'lucide-react';
import { Modal } from '../components/Modal';

interface LojaItem {
  id: number;
  nome: string;
  slug: string;
  email: string;
  telefone?: string;
  whatsapp?: string;
  plano: 'gratis' | 'premium' | 'fiscal';
  statusAssinatura: 'ativa' | 'teste' | 'atrasada' | 'cancelada';
  trialUsado: boolean;
  diasValidade?: number;
  ativo: boolean;
  criadoEm: string;
  pedidosCatalogoCount?: number;
}

export const SuperAdminView: React.FC = () => {
  const [lojas, setLojas] = useState<LojaItem[]>([]);
  const [busca, setBusca] = useState<string>('');
  const [filtroPlano, setFiltroPlano] = useState<string>('todos');
  const [carregando, setCarregando] = useState<boolean>(true);

  // Modal Alterar Plano
  const [modalEditarAberto, setModalEditarAberto] = useState<boolean>(false);
  const [lojaSelecionada, setLojaSelecionada] = useState<LojaItem | null>(null);
  const [novoPlano, setNovoPlano] = useState<'gratis' | 'premium' | 'fiscal'>('premium');
  const [novoStatus, setNovoStatus] = useState<'ativa' | 'teste' | 'atrasada' | 'cancelada'>('ativa');

  const carregarLojas = async () => {
    setCarregando(true);
    try {
      if (window.api?.supabase?.listarLojas) {
        const lista = await window.api.supabase.listarLojas();
        setLojas(lista);
      } else {
        // Fallback mock
        setLojas([
          {
            id: 1,
            nome: 'WS Gestão PDV - Loja Modelo',
            slug: 'lojamodelo',
            email: 'contato@lojamodelo.com.br',
            telefone: '(11) 3322-4455',
            whatsapp: '(11) 99887-6655',
            plano: 'gratis',
            statusAssinatura: 'ativa',
            trialUsado: false,
            ativo: true,
            criadoEm: '2026-09-01T10:00:00Z',
            pedidosCatalogoCount: 14
          },
          {
            id: 2,
            nome: 'Boutique Elegance & Calçados',
            slug: 'boutique-elegance',
            email: 'financeiro@elegance.com.br',
            telefone: '(21) 2233-4455',
            whatsapp: '(21) 98765-4321',
            plano: 'premium',
            statusAssinatura: 'ativa',
            trialUsado: true,
            ativo: true,
            criadoEm: '2026-09-10T14:30:00Z',
            pedidosCatalogoCount: 42
          },
          {
            id: 3,
            nome: 'Supermercado Central & Distribuidora',
            slug: 'super-central',
            email: 'fiscal@supercentral.com.br',
            telefone: '(31) 3344-5566',
            whatsapp: '(31) 97654-3210',
            plano: 'fiscal',
            statusAssinatura: 'ativa',
            trialUsado: true,
            ativo: true,
            criadoEm: '2026-08-15T09:00:00Z',
            pedidosCatalogoCount: 128
          }
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarLojas();
  }, []);

  const handleSalvarPlano = async () => {
    if (!lojaSelecionada) return;
    try {
      if (window.api?.supabase?.alterarPlanoLoja) {
        await window.api.supabase.alterarPlanoLoja(lojaSelecionada.id, novoPlano, novoStatus);
      }
      setLojas(prev => prev.map(l => l.id === lojaSelecionada.id ? { ...l, plano: novoPlano, statusAssinatura: novoStatus } : l));
      setModalEditarAberto(false);
      alert(`Plano da loja "${lojaSelecionada.nome}" alterado para ${novoPlano.toUpperCase()} com status ${novoStatus.toUpperCase()}!`);
    } catch (e: any) {
      alert(`Erro: ${e?.message || e}`);
    }
  };

  const handleToggleAtivo = async (loja: LojaItem) => {
    const acao = loja.ativo ? 'suspender' : 'reativar';
    if (!confirm(`Deseja realmente ${acao} a loja "${loja.nome}"?`)) return;

    try {
      if (window.api?.supabase?.toggleStatusLoja) {
        await window.api.supabase.toggleStatusLoja(loja.id, !loja.ativo);
      }
      setLojas(prev => prev.map(l => l.id === loja.id ? { ...l, ativo: !l.ativo } : l));
    } catch (e: any) {
      alert(`Erro: ${e?.message || e}`);
    }
  };

  const lojasFiltradas = lojas.filter(l => {
    const matchBusca = !busca || 
      l.nome.toLowerCase().includes(busca.toLowerCase()) || 
      l.slug.toLowerCase().includes(busca.toLowerCase()) ||
      l.email.toLowerCase().includes(busca.toLowerCase());
    
    if (!matchBusca) return false;
    if (filtroPlano !== 'todos' && l.plano !== filtroPlano) return false;
    return true;
  });

  // Métricas do SaaS
  const totalLojas = lojas.length;
  const lojasAtivas = lojas.filter(l => l.ativo).length;
  const lojasPremium = lojas.filter(l => l.plano === 'premium').length;
  const lojasFiscal = lojas.filter(l => l.plano === 'fiscal').length;
  const mrrEstimado = (lojasPremium * 49.90) + (lojasFiscal * 89.90);
  const totalPedidosSaaS = lojas.reduce((acc, curr) => acc + (curr.pedidosCatalogoCount || 0), 0);

  return (
    <div className="h-full flex flex-col p-6 bg-slate-900 text-slate-100 overflow-y-auto space-y-6 font-sans select-none">
      
      {/* 1. CABEÇALHO DO SUPER-ADMIN */}
      <div className="flex items-center justify-between bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-lg ring-2 ring-rose-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-wide text-white">Painel Super-Admin SaaS</h1>
              <span className="bg-rose-500/20 text-rose-400 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-rose-500/30">
                Acesso Restrito
              </span>
            </div>
            <p className="text-xs text-slate-400">Gerenciamento global de lojistas, assinaturas, faturamento MRR e catálogos online.</p>
          </div>
        </div>

        <button
          onClick={carregarLojas}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-slate-700 shadow"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {/* 2. CARDS DE MÉTRICAS SAAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Total Lojas */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Total de Lojas</span>
            <div className="text-2xl font-black text-white mt-1">{totalLojas}</div>
            <span className="text-[11px] text-emerald-400 font-bold">{lojasAtivas} ativas no sistema</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* MRR Estimado */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">MRR Recorrente</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {mrrEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <span className="text-[11px] text-slate-400">Assinaturas pagas</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Distribuição de Planos */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Planos Pagos</span>
            <div className="text-2xl font-black text-amber-400 mt-1">{lojasPremium + lojasFiscal}</div>
            <span className="text-[11px] text-slate-400">{lojasFiscal} Fiscal | {lojasPremium} Premium</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* Pedidos do Catálogo */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Pedidos no Catálogo</span>
            <div className="text-2xl font-black text-purple-400 mt-1">{totalPedidosSaaS}</div>
            <span className="text-[11px] text-slate-400">Processados na nuvem</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. FILTROS & TABELA DE LOJISTAS */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
        
        {/* Barra de Filtros */}
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome da loja, slug ou e-mail..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            {['todos', 'gratis', 'premium', 'fiscal'].map(p => (
              <button
                key={p}
                onClick={() => setFiltroPlano(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${
                  filtroPlano === p
                    ? 'bg-sky-600 text-white shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela de Lojas */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900/80 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">ID / Loja</th>
                <th className="py-3 px-4">Slug Público</th>
                <th className="py-3 px-4">Contato / E-mail</th>
                <th className="py-3 px-4">Plano Atual</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Pedidos Web</th>
                <th className="py-3 px-4 text-right">Ações de Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {lojasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Nenhuma loja localizada com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                lojasFiltradas.map(loja => (
                  <tr key={loja.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm">{loja.nome}</div>
                      <div className="text-[11px] text-slate-400">ID #{loja.id} • Desde {new Date(loja.criadoEm).toLocaleDateString('pt-BR')}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-md border border-slate-800 font-mono text-[11px] text-sky-400">
                        <span>/loja/{loja.slug}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-200">{loja.email}</div>
                      <div className="text-[11px] text-slate-400">{loja.whatsapp || loja.telefone || 'Sem telefone'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase ${
                        loja.plano === 'fiscal' 
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                          : loja.plano === 'premium'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {loja.plano}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        loja.ativo 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${loja.ativo ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        {loja.ativo ? 'Ativa' : 'Suspensa'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-purple-400">
                      {loja.pedidosCatalogoCount || 0}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setLojaSelecionada(loja);
                            setNovoPlano(loja.plano);
                            setNovoStatus(loja.statusAssinatura);
                            setModalEditarAberto(true);
                          }}
                          className="flex items-center gap-1 bg-sky-600 hover:bg-sky-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Alterar Plano</span>
                        </button>

                        <button
                          onClick={() => handleToggleAtivo(loja)}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-all border ${
                            loja.ativo 
                              ? 'bg-rose-950/40 text-rose-400 border-rose-800 hover:bg-rose-900/60' 
                              : 'bg-emerald-950/40 text-emerald-400 border-emerald-800 hover:bg-emerald-900/60'
                          }`}
                          title={loja.ativo ? 'Suspender Loja' : 'Reativar Loja'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PARA ALTERAÇÃO MANUAL DE PLANO */}
      {modalEditarAberto && lojaSelecionada && (
        <Modal
          isOpen={modalEditarAberto}
          onClose={() => setModalEditarAberto(false)}
          title={`Gerenciar Assinatura - ${lojaSelecionada.nome}`}
        >
          <div className="space-y-4 text-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Selecione o Plano</label>
              <select
                value={novoPlano}
                onChange={e => setNovoPlano(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white"
              >
                <option value="gratis">Plano Grátis (R$ 0,00/mês)</option>
                <option value="premium">Plano Premium (R$ 49,90/mês)</option>
                <option value="fiscal">Plano Fiscal Completo (R$ 89,90/mês)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status da Assinatura</label>
              <select
                value={novoStatus}
                onChange={e => setNovoStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white"
              >
                <option value="ativa">Ativa (Acesso Liberado)</option>
                <option value="teste">Período de Teste (Trial 7 dias)</option>
                <option value="atrasada">Pagamento Atrasado (Tolerância)</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-800">
              <strong>Atenção:</strong> Como super-administrador, a alteração de plano é refletida imediatamente no aplicativo desktop do lojista e no banco de dados na nuvem Supabase.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalEditarAberto(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarPlano}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Modal } from './Modal';
import { 
  Check, 
  Star, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  Crown, 
  CheckCircle2, 
  Lock, 
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { PLANOS_INFO, PlanoTipo } from '../config/planos';
import { Assinatura } from '../types';

interface PlanosModalProps {
  isOpen: boolean;
  onClose: () => void;
  assinatura: Assinatura | null;
  onAlterarPlano: (plano: PlanoTipo) => Promise<void>;
  onIniciarTrial: () => Promise<void>;
}

export const PlanosModal: React.FC<PlanosModalProps> = ({
  isOpen,
  onClose,
  assinatura,
  onAlterarPlano,
  onIniciarTrial
}) => {
  const [carregando, setCarregando] = useState<boolean>(false);
  const [modoAdminDev, setModoAdminDev] = useState<boolean>(true);

  const planoAtual = assinatura?.plano_atual || 'gratis';
  const isTrial = assinatura?.status === 'trial';
  const trialUsado = assinatura?.trial_usado === 1;

  const handleEscolherPlano = async (plano: PlanoTipo) => {
    setCarregando(true);
    try {
      await onAlterarPlano(plano);
      alert(`Plano alterado para ${PLANOS_INFO[plano].nome} com sucesso!`);
    } catch (e: any) {
      alert(`Erro ao alterar plano: ${e?.message || e}`);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Planos & Assinaturas do Sistema" maxWidth="4xl">
      <div className="space-y-6 text-xs p-1">
        
        {/* Cabeçalho */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="bg-sky-100 text-sky-800 font-bold px-3 py-1 rounded-full text-[11px] inline-flex items-center gap-1.5 border border-sky-300">
            <Crown className="w-3.5 h-3.5" /> Escolha o plano perfeito para sua loja
          </span>
          <h2 className="text-xl font-black text-slate-800">
            Potencialize suas vendas, controle estoque e emita notas fiscais
          </h2>
          <p className="text-slate-500">
            Sem fidelidade ou taxa de cancelamento. Alterne de plano sempre que seu negócio precisar.
          </p>
        </div>

        {/* Notificação de Status Atual */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${PLANOS_INFO[planoAtual]?.corBadge}`}>
              {PLANOS_INFO[planoAtual]?.nome}
            </span>
            <span className="text-slate-600 font-medium">
              Status: <strong className="text-slate-800 capitalize">{isTrial ? `Em Teste Grátis (${assinatura?.dias_restantes_trial || 7} dias restantes)` : assinatura?.status || 'Ativo'}</strong>
            </span>
          </div>

          {!trialUsado && planoAtual === 'gratis' && (
            <button
              type="button"
              onClick={async () => {
                setCarregando(true);
                try {
                  await onIniciarTrial();
                } finally {
                  setCarregando(false);
                }
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all text-[11px]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Testar Premium 7 Dias Grátis</span>
            </button>
          )}
        </div>

        {/* Grade de 3 Planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          
          {/* 1. PLANO GRÁTIS */}
          <div className={`flex flex-col rounded-2xl border p-5 transition-all relative ${
            planoAtual === 'gratis' ? 'border-slate-800 ring-2 ring-slate-800/20 bg-white shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}>
            <div className="space-y-1 mb-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Início</span>
              <h3 className="text-lg font-black text-slate-800">Plano Grátis</h3>
              <p className="text-slate-500 text-[11px] min-h-[32px]">{PLANOS_INFO.gratis.descricao}</p>
            </div>

            <div className="mb-4 pb-4 border-b border-slate-100 flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900">R$ 0</span>
              <span className="text-slate-500 text-[11px]">sempre grátis</span>
            </div>

            <div className="flex-1 space-y-2.5 mb-6">
              <p className="font-bold text-slate-700 text-[11px]">Recursos incluídos:</p>
              {PLANOS_INFO.gratis.recursos.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-slate-600">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-tight">{rec}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={planoAtual === 'gratis' || carregando}
              onClick={() => handleEscolherPlano('gratis')}
              className={`w-full py-2.5 rounded-xl font-bold transition-all ${
                planoAtual === 'gratis'
                  ? 'bg-slate-100 text-slate-500 cursor-default'
                  : 'bg-slate-800 hover:bg-slate-900 text-white shadow-xs'
              }`}
            >
              {planoAtual === 'gratis' ? 'Plano Atual' : 'Mudar para Grátis'}
            </button>
          </div>

          {/* 2. PLANO PREMIUM (RECOMENDADO) */}
          <div className={`flex flex-col rounded-2xl border-2 p-5 transition-all relative ${
            planoAtual === 'premium' ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20 shadow-lg' : 'border-amber-400 bg-white hover:shadow-md'
          }`}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm flex items-center gap-1">
              <Star className="w-3 h-3 fill-white text-white" /> Mais Popular
            </div>

            <div className="space-y-1 mb-4 mt-1">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Gestão Total</span>
              <h3 className="text-lg font-black text-slate-800">Plano Premium</h3>
              <p className="text-slate-500 text-[11px] min-h-[32px]">{PLANOS_INFO.premium.descricao}</p>
            </div>

            <div className="mb-4 pb-4 border-b border-amber-100 flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900">{PLANOS_INFO.premium.preco}</span>
              <span className="text-slate-500 text-[11px]">{PLANOS_INFO.premium.periodo}</span>
            </div>

            <div className="flex-1 space-y-2.5 mb-6">
              <p className="font-bold text-slate-700 text-[11px]">Tudo do Grátis, mais:</p>
              {PLANOS_INFO.premium.recursos.slice(1).map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-slate-700">
                  <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="leading-tight font-medium">{rec}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={planoAtual === 'premium' || carregando}
              onClick={() => handleEscolherPlano('premium')}
              className={`w-full py-2.5 rounded-xl font-bold transition-all ${
                planoAtual === 'premium'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-default'
                  : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md'
              }`}
            >
              {planoAtual === 'premium' ? 'Plano Atual Ativo ⭐' : 'Ativar Plano Premium'}
            </button>
          </div>

          {/* 3. PLANO FISCAL */}
          <div className={`flex flex-col rounded-2xl border p-5 transition-all relative ${
            planoAtual === 'fiscal' ? 'border-purple-600 ring-2 ring-purple-600/20 bg-purple-50/20 shadow-md' : 'border-slate-200 bg-white hover:border-purple-300'
          }`}>
            <div className="space-y-1 mb-4">
              <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Completo + Fiscal</span>
              <h3 className="text-lg font-black text-slate-800">Plano Fiscal</h3>
              <p className="text-slate-500 text-[11px] min-h-[32px]">{PLANOS_INFO.fiscal.descricao}</p>
            </div>

            <div className="mb-4 pb-4 border-b border-slate-100 flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900">{PLANOS_INFO.fiscal.preco}</span>
              <span className="text-slate-500 text-[11px]">{PLANOS_INFO.fiscal.periodo}</span>
            </div>

            <div className="flex-1 space-y-2.5 mb-6">
              <p className="font-bold text-slate-700 text-[11px]">Tudo do Premium, mais:</p>
              {PLANOS_INFO.fiscal.recursos.slice(1).map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-slate-700">
                  <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <span className="leading-tight font-medium">{rec}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={planoAtual === 'fiscal' || carregando}
              onClick={() => handleEscolherPlano('fiscal')}
              className={`w-full py-2.5 rounded-xl font-bold transition-all ${
                planoAtual === 'fiscal'
                  ? 'bg-purple-100 text-purple-800 border border-purple-300 cursor-default'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
              }`}
            >
              {planoAtual === 'fiscal' ? 'Plano Atual Ativo 🛡️' : 'Ativar Plano Fiscal'}
            </button>
          </div>
        </div>

        {/* Modo de Teste / Alternador Rápido de Administrador */}
        {modoAdminDev && (
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-[11px]">Modo Desenvolvedor / Demonstração:</span>
              <span className="text-slate-500 text-[11px]">Alterne instantaneamente entre os 3 planos para testar os bloqueios.</span>
            </div>

            <div className="flex gap-1.5">
              {(['gratis', 'premium', 'fiscal'] as PlanoTipo[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleEscolherPlano(p)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${
                    planoAtual === p ? 'bg-slate-800 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

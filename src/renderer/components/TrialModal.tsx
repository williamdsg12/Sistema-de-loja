import React from 'react';
import { Modal } from './Modal';
import { Star, Sparkles, Check, ArrowRight, X } from 'lucide-react';

interface TrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIniciarTrial: () => Promise<void>;
  recursoNome?: string;
  carregando?: boolean;
}

export const TrialModal: React.FC<TrialModalProps> = ({
  isOpen,
  onClose,
  onIniciarTrial,
  recursoNome = 'Recursos Avançados',
  carregando = false
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Experimente Gratuitamente" maxWidth="md">
      <div className="text-center p-2 space-y-4 text-xs">
        <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-amber-500/30">
          <Star className="w-9 h-9 text-white fill-white animate-bounce" />
        </div>

        <div>
          <span className="bg-amber-100 text-amber-800 border border-amber-300 font-bold px-3 py-1 rounded-full text-[11px] inline-flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> 7 Dias de Teste Grátis
          </span>
          <h3 className="text-lg font-black text-slate-800 mt-2">
            Utilize este recurso por 7 dias gratuitamente
          </h3>
          <p className="text-slate-500 mt-1">
            Libere agora o acesso a <strong className="text-slate-800 font-bold">{recursoNome}</strong> e a todos os recursos do <strong className="text-amber-600 font-bold">Plano Premium</strong> sem pagar nada hoje.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left space-y-2">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Vendas por Pedidos (Delivery) & Orçamentos</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Módulo Contas a Pagar e Gestão de Despesas</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Pedidos do Catálogo Online integrados ao PDV</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Relatórios de Lucro Estimado e Margem Real</span>
          </div>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <button
            type="button"
            disabled={carregando}
            onClick={onIniciarTrial}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{carregando ? 'Ativando teste...' : 'Iniciar o teste do Plano Premium'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-slate-500 hover:text-slate-700 font-bold hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
};

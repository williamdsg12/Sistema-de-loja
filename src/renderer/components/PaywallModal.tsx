import React from 'react';
import { Modal } from './Modal';
import { Star, ShieldCheck, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PlanoTipo, PLANOS_INFO } from '../config/planos';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  recursoNome?: string;
  planoNecessario?: PlanoTipo;
  onVerPlanos: () => void;
  onIniciarTrial?: () => void;
  podeTestarTrial?: boolean;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  recursoNome = 'Recurso Exclusivo',
  planoNecessario = 'premium',
  onVerPlanos,
  onIniciarTrial,
  podeTestarTrial = false
}) => {
  const infoPlano = PLANOS_INFO[planoNecessario] || PLANOS_INFO.premium;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Recurso PRO" maxWidth="md">
      <div className="text-center p-3 space-y-4 text-xs">
        <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-orange-500/25">
          <Star className="w-9 h-9 text-white fill-white" />
        </div>

        <div>
          <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-3 py-1 rounded-full text-[11px] inline-flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
            Recurso {infoPlano.nome}
          </span>
          <h3 className="text-lg font-black text-slate-800 mt-2">
            Esse recurso não está disponível em seu plano atual
          </h3>
          <p className="text-slate-500 mt-1">
            A funcionalidade <strong className="text-slate-800 font-bold">"{recursoNome}"</strong> faz parte do pacote de automação e gestão do <strong className="text-sky-700 font-bold">{infoPlano.nome}</strong>.
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2">
          <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Com este plano você terá:</p>
          {infoPlano.recursos.slice(1, 5).map((rec, i) => (
            <div key={i} className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{rec}</span>
            </div>
          ))}
        </div>

        <div className="pt-2 flex flex-col gap-2">
          {podeTestarTrial && onIniciarTrial ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onIniciarTrial();
              }}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Experimente por 7 Dias Grátis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => {
              onClose();
              onVerPlanos();
            }}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <span>Conhecer Todos os Planos</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-slate-400 hover:text-slate-600 font-medium text-[11px]"
          >
            Continuar no Plano Atual
          </button>
        </div>
      </div>
    </Modal>
  );
};

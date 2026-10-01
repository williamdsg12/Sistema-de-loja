import React from 'react';
import { Star, ShieldCheck, Sparkles, ArrowRight, Lock } from 'lucide-react';
import { usePlanos } from '../context/PlanosContext';
import { PLANOS_INFO, PlanoTipo } from '../config/planos';

interface RecursoBloqueadoCardProps {
  recursoNome: string;
  descricao: string;
  planoMinimo?: PlanoTipo;
}

export const RecursoBloqueadoCard: React.FC<RecursoBloqueadoCardProps> = ({
  recursoNome,
  descricao,
  planoMinimo = 'premium'
}) => {
  const { abrirModalPlanos, abrirModalTrial, trialUsado, planoAtual } = usePlanos();
  const infoPlano = PLANOS_INFO[planoMinimo] || PLANOS_INFO.premium;
  const podeTrial = !trialUsado && planoAtual === 'gratis' && planoMinimo === 'premium';

  return (
    <div className="h-full flex items-center justify-center p-6 bg-slate-100 select-none">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-lg p-8 text-center space-y-5">
        
        {/* Ícone com gradiente */}
        <div className="relative mx-auto w-20 h-20">
          <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-500 rounded-3xl flex items-center justify-center shadow-xl shadow-orange-500/20 transform rotate-3">
            <Star className="w-10 h-10 text-white fill-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white p-1.5 rounded-xl border-2 border-white shadow-xs">
            <Lock className="w-4 h-4" />
          </div>
        </div>

        <div>
          <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-3 py-1 rounded-full text-[11px] inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Recurso Exclusivo do {infoPlano.nome}
          </span>
          <h3 className="text-xl font-black text-slate-800 mt-3">
            {recursoNome}
          </h3>
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
            {descricao}
          </p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs space-y-2">
          <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Benefícios ao desbloquear:</p>
          {infoPlano.recursos.slice(1, 5).map((rec, i) => (
            <div key={i} className="flex items-center gap-2 text-slate-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>{rec}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-2">
          {podeTrial ? (
            <button
              type="button"
              onClick={() => abrirModalTrial(recursoNome)}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Iniciar Teste Grátis de 7 Dias</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={abrirModalPlanos}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 text-xs"
          >
            <span>Ver Todos os Planos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Assinatura } from '../types';
import { PlanoTipo, RECURSOS_PERMISSOES, PLANOS_INFO } from '../config/planos';
import { PlanosModal } from '../components/PlanosModal';
import { PaywallModal } from '../components/PaywallModal';
import { TrialModal } from '../components/TrialModal';

interface PlanosContextType {
  assinatura: Assinatura | null;
  planoAtual: PlanoTipo;
  isTrial: boolean;
  trialUsado: boolean;
  carregando: boolean;
  temRecurso: (recursoId: string) => boolean;
  exigirRecurso: (recursoId: string, nomeAmigavel?: string) => boolean;
  abrirModalPlanos: () => void;
  abrirModalTrial: (recursoNome?: string) => void;
  alterarPlano: (plano: PlanoTipo, diasDuracao?: number) => Promise<void>;
  iniciarTrial7Dias: () => Promise<void>;
  recarregarAssinatura: () => Promise<void>;
}

const PlanosContext = createContext<PlanosContextType>({} as PlanosContextType);

export const PlanosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);

  // Estados dos Modais
  const [modalPlanosAberto, setModalPlanosAberto] = useState<boolean>(false);
  const [modalPaywallAberto, setModalPaywallAberto] = useState<boolean>(false);
  const [modalTrialAberto, setModalTrialAberto] = useState<boolean>(false);
  const [paywallRecursoNome, setPaywallRecursoNome] = useState<string>('');
  const [paywallPlanoNecessario, setPaywallPlanoNecessario] = useState<PlanoTipo>('premium');

  const recarregarAssinatura = async () => {
    try {
      if (window.api?.planos) {
        const assin = await window.api.planos.obter();
        setAssinatura(assin);
      }
    } catch (e) {
      console.error('Erro ao carregar assinatura:', e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    recarregarAssinatura();
  }, []);

  const planoAtual: PlanoTipo = (assinatura?.plano_atual as PlanoTipo) || 'gratis';
  const isTrial = assinatura?.status === 'trial';
  const trialUsado = assinatura?.trial_usado === 1;

  /**
   * Todos os recursos estão 100% liberados e gratuitos para o usuário do WS Gestão PDV.
   */
  const temRecurso = (_recursoId: string): boolean => {
    return true;
  };

  /**
   * Sempre permite o acesso sem bloqueios ou paywall.
   */
  const exigirRecurso = (_recursoId: string, _nomeAmigavelCustom?: string): boolean => {
    return true;
  };

  const alterarPlano = async (plano: PlanoTipo, diasDuracao?: number) => {
    try {
      const atualizada = await window.api.planos.alterar(plano, diasDuracao);
      setAssinatura(atualizada);
    } catch (e) {
      console.error('Erro ao alterar plano:', e);
      throw e;
    }
  };

  const iniciarTrial7Dias = async () => {
    try {
      const res = await window.api.planos.iniciarTrial();
      if (res.sucesso && res.assinatura) {
        setAssinatura(res.assinatura);
        setModalTrialAberto(false);
        setModalPaywallAberto(false);
        alert(res.mensagem);
      } else {
        alert(res.mensagem || 'Não foi possível ativar o teste gratuito.');
      }
    } catch (e: any) {
      alert(`Erro: ${e?.message || e}`);
    }
  };

  return (
    <PlanosContext.Provider
      value={{
        assinatura,
        planoAtual,
        isTrial,
        trialUsado,
        carregando,
        temRecurso,
        exigirRecurso,
        abrirModalPlanos: () => setModalPlanosAberto(true),
        abrirModalTrial: (recursoNome) => {
          if (recursoNome) setPaywallRecursoNome(recursoNome);
          setModalTrialAberto(true);
        },
        alterarPlano,
        iniciarTrial7Dias,
        recarregarAssinatura
      }}
    >
      {children}

      {/* MODAL PRINCIPAL DE PLANOS */}
      <PlanosModal
        isOpen={modalPlanosAberto}
        onClose={() => setModalPlanosAberto(false)}
        assinatura={assinatura}
        onAlterarPlano={alterarPlano}
        onIniciarTrial={iniciarTrial7Dias}
      />

      {/* MODAL DE PAYWALL (RECURSO BLOQUEADO) */}
      <PaywallModal
        isOpen={modalPaywallAberto}
        onClose={() => setModalPaywallAberto(false)}
        recursoNome={paywallRecursoNome}
        planoNecessario={paywallPlanoNecessario}
        podeTestarTrial={!trialUsado && planoAtual === 'gratis' && paywallPlanoNecessario === 'premium'}
        onVerPlanos={() => {
          setModalPaywallAberto(false);
          setModalPlanosAberto(true);
        }}
        onIniciarTrial={() => {
          setModalPaywallAberto(false);
          setModalTrialAberto(true);
        }}
      />

      {/* MODAL DE TESTE GRÁTIS DE 7 DIAS */}
      <TrialModal
        isOpen={modalTrialAberto}
        onClose={() => setModalTrialAberto(false)}
        recursoNome={paywallRecursoNome || 'Recursos Premium'}
        onIniciarTrial={iniciarTrial7Dias}
      />
    </PlanosContext.Provider>
  );
};

export const usePlanos = () => useContext(PlanosContext);

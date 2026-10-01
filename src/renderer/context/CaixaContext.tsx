import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CaixaSessao } from '../types';
import { useAuth } from './AuthContext';

interface CaixaContextType {
  caixaAberto: CaixaSessao | null;
  caixaCarregando: boolean;
  verificarCaixa: () => Promise<CaixaSessao | null>;
  abrirCaixa: (valorInicial: number) => Promise<boolean>;
  fecharCaixa: (valorInformado: number) => Promise<CaixaSessao>;
}

const CaixaContext = createContext<CaixaContextType>({} as CaixaContextType);

export const CaixaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { usuario } = useAuth();
  const [caixaAberto, setCaixaAberto] = useState<CaixaSessao | null>(null);
  const [caixaCarregando, setCaixaCarregando] = useState<boolean>(true);

  const verificarCaixa = useCallback(async (): Promise<CaixaSessao | null> => {
    if (!usuario) {
      setCaixaAberto(null);
      setCaixaCarregando(false);
      return null;
    }
    try {
      if (window.api?.caixa) {
        const caixa = await window.api.caixa.getAberto();
        setCaixaAberto(caixa);
        setCaixaCarregando(false);
        return caixa;
      }
    } catch (err) {
      console.error('Erro ao verificar caixa:', err);
    }
    setCaixaCarregando(false);
    return null;
  }, [usuario]);

  useEffect(() => {
    verificarCaixa();
  }, [verificarCaixa]);

  const abrirCaixa = async (valorInicial: number): Promise<boolean> => {
    if (!usuario) return false;
    try {
      await window.api.caixa.abrir(usuario.id, valorInicial);
      await verificarCaixa();
      return true;
    } catch (err: any) {
      alert(err?.message || 'Erro ao abrir caixa');
      return false;
    }
  };

  const fecharCaixa = async (valorInformado: number): Promise<CaixaSessao> => {
    if (!caixaAberto) throw new Error('Nenhum caixa aberto');
    const resultado = await window.api.caixa.fechar(caixaAberto.id, valorInformado);
    await verificarCaixa();
    return resultado;
  };

  return (
    <CaixaContext.Provider value={{ caixaAberto, caixaCarregando, verificarCaixa, abrirCaixa, fecharCaixa }}>
      {children}
    </CaixaContext.Provider>
  );
};

export const useCaixa = () => useContext(CaixaContext);

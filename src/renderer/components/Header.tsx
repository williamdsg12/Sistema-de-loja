import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCaixa } from '../context/CaixaContext';
import { 
  Lock, 
  Unlock, 
  LogOut, 
  Clock, 
  Settings,
  MoreVertical,
  Type,
  HelpCircle,
  Minimize2,
  Maximize2,
  X,
  Plus,
  ShieldCheck,
  Store
} from 'lucide-react';
import { NovaLojaModal } from './NovaLojaModal';

interface HeaderProps {
  onOpenCaixaModal?: () => void;
  onOpenConfigModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCaixaModal, onOpenConfigModal }) => {
  const { usuario, logout } = useAuth();
  const { caixaAberto } = useCaixa();
  const [horaAtual, setHoraAtual] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [nomeLoja, setNomeLoja] = useState<string>('WS Gestão PDV');
  const [modalNovaLojaAberto, setModalNovaLojaAberto] = useState<boolean>(false);
  const [menuOpcoesAberto, setMenuOpcoesAberto] = useState<boolean>(false);
  const [fontSizeScale, setFontSizeScale] = useState<number>(1);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setHoraAtual(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    const carregarConfig = async () => {
      try {
        if (window.api?.loja) {
          const l = await window.api.loja.obter();
          if (l.logo_url) setLogoUrl(l.logo_url);
          if (l.nome_fantasia) setNomeLoja(l.nome_fantasia);
        } else if (window.api?.config) {
          const c = await window.api.config.obter();
          if (c.logo_url) setLogoUrl(c.logo_url);
          if (c.nome_loja) setNomeLoja(c.nome_loja);
        }
      } catch (e) {}
    };
    carregarConfig();

    return () => clearInterval(interval);
  }, []);

  const toggleFontSize = () => {
    const newScale = fontSizeScale === 1 ? 1.1 : (fontSizeScale === 1.1 ? 1.2 : 1);
    setFontSizeScale(newScale);
    document.documentElement.style.fontSize = `${newScale * 100}%`;
  };

  const handleMinimize = () => window.api?.window?.minimize?.();
  const handleMaximize = () => window.api?.window?.maximize?.();
  const handleClose = () => window.api?.window?.close?.();

  const getPerfilBadge = (perfil?: string) => {
    switch (perfil) {
      case 'admin':
        return <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Admin</span>;
      case 'gerente':
        return <span className="bg-sky-100 text-sky-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Gerente</span>;
      default:
        return <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Operador</span>;
    }
  };

  return (
    <header className="h-13 bg-white border-b border-slate-200 px-3 flex items-center justify-between shadow-xs select-none z-30">
      {/* Lado Esquerdo: Logo & Loja */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-lg border border-slate-200 shadow-xs" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-600 to-indigo-800 text-white flex items-center justify-center font-black shadow-xs text-xs tracking-wider">
              WS
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-slate-800 text-xs leading-tight truncate max-w-[190px]" title={nomeLoja}>
                {nomeLoja}
              </h1>
              <button
                type="button"
                onClick={() => setModalNovaLojaAberto(true)}
                className="bg-sky-50 text-sky-700 hover:bg-sky-100 p-0.5 px-1.5 rounded text-[10px] font-bold border border-sky-200 flex items-center gap-0.5 cursor-pointer"
                title="Cadastrar / Gerenciar Loja"
              >
                <Plus className="w-3 h-3" />
                <span>Loja</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">WS Gestão Comercial & PDV</p>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-200 mx-1.5" />

        {/* Indicador de Modo Offline */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[11px] font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Offline Ativo</span>
        </div>
      </div>

      {/* Centro: Status do Caixa & Relógio */}
      <div className="flex items-center gap-3">
        {/* Status Caixa */}
        <button 
          type="button"
          onClick={onOpenCaixaModal}
          className={`flex items-center gap-2 px-3 py-1 rounded-md border text-xs font-semibold cursor-pointer transition-all ${
            caixaAberto 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100' 
              : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 animate-pulse'
          }`}
          title="Clique para gerenciar ou fechar o caixa"
        >
          {caixaAberto ? (
            <>
              <Unlock className="w-3.5 h-3.5 text-emerald-600" />
              <span>CAIXA ABERTO (#{caixaAberto.id})</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5 text-rose-600" />
              <span>CAIXA FECHADO (Abrir)</span>
            </>
          )}
        </button>

        {/* Relógio em 24h */}
        <div className="flex items-center gap-1.5 text-slate-600 text-xs font-mono font-semibold bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{horaAtual}</span>
        </div>
      </div>

      {/* Lado Direito: Ações rápidas, Usuário e Janela */}
      <div className="flex items-center gap-2">
        {/* Controle de Tamanho de Fonte (Layout Nex) */}
        <button
          type="button"
          onClick={toggleFontSize}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 flex items-center gap-0.5 text-xs font-bold cursor-pointer"
          title="Alternar tamanho da fonte da interface"
        >
          <Type className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[10px]">{fontSizeScale > 1 ? `${Math.round(fontSizeScale * 100)}%` : 'A'}</span>
        </button>

        {/* Menu de Opções Rápidas (...) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpcoesAberto(!menuOpcoesAberto)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
            title="Mais opções e ajuda"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {menuOpcoesAberto && (
            <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 text-xs animate-fade-in">
              <button
                type="button"
                onClick={() => {
                  setMenuOpcoesAberto(false);
                  if (onOpenCaixaModal) onOpenCaixaModal();
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-100 text-slate-700 flex items-center gap-2 cursor-pointer"
              >
                <Store className="w-3.5 h-3.5 text-slate-500" />
                <span>Painel do Caixa</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpcoesAberto(false);
                  if (onOpenConfigModal) onOpenConfigModal();
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-100 text-slate-700 flex items-center gap-2 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>Configurações Gerais</span>
              </button>
              <div className="my-1 border-t border-slate-100" />
              <div className="px-3 py-1.5 text-[10px] text-slate-400">
                WS Gestão PDV v1.0.0
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        {/* Info do Usuário */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-bold text-xs">
            {usuario?.nome?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <span className="text-xs font-bold text-slate-800 truncate max-w-[100px]">{usuario?.nome}</span>
              {getPerfilBadge(usuario?.perfil)}
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={logout}
          title="Sair / Trocar de Usuário"
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        {/* Controles da Janela Windows */}
        <div className="flex items-center gap-0.5">
          <button 
            type="button"
            onClick={handleMinimize} 
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
            title="Minimizar"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button"
            onClick={handleMaximize} 
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
            title="Maximizar"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button"
            onClick={handleClose} 
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded cursor-pointer"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* MODAL DE CADASTRO DE NOVA LOJA */}
      <NovaLojaModal
        isOpen={modalNovaLojaAberto}
        onClose={() => setModalNovaLojaAberto(false)}
        onLojaCriada={(novaLoja) => {
          if (novaLoja.nome || novaLoja.nome_fantasia) {
            setNomeLoja(novaLoja.nome || novaLoja.nome_fantasia);
          }
        }}
      />
    </header>
  );
};

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CaixaProvider, useCaixa } from './context/CaixaContext';
import { ToastProvider } from './context/ToastContext';
import { Header } from './components/Header';
import { Sidebar, ViewType } from './components/Sidebar';
import { LoginView } from './views/LoginView';
import { PdvView } from './views/PdvView';
import { CaixaView } from './views/CaixaView';
import { ProdutosView } from './views/ProdutosView';
import { ClientesView } from './views/ClientesView';
import { FornecedoresView } from './views/FornecedoresView';
import { EstoqueView } from './views/EstoqueView';
import { ContasPagarView } from './views/ContasPagarView';
import { CrediarioView } from './views/CrediarioView';
import { RelatoriosView } from './views/RelatoriosView';
import { FiscalView } from './views/FiscalView';
import { ConfigView } from './views/ConfigView';
import { CatalogoOnlineView } from './views/CatalogoOnlineView';
import { AplicativosView } from './views/AplicativosView';
import { SuperAdminView } from './views/SuperAdminView';

import { PlanosProvider } from './context/PlanosContext';
import { ErrorBoundary } from './components/ErrorBoundary';

const APP_VERSION = 'v1.0.0';
const APP_BUILD_DATE = '2026-09-29 02:40';

const MainLayout: React.FC = () => {
  const { usuario, carregando } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('pdv');

  // Atalhos Globais de Navegação F1..F12
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Se estiver no PDV, o PDV possui atalhos de operação próprios (F1..F12)
      if (currentView === 'pdv') {
        if (e.key === 'F8') {
          e.preventDefault();
          setCurrentView('produtos');
        } else if (e.key === 'F9') {
          // No PDV, F9 é modal de entrega; só troca se não estiver no PDV
          return;
        }
        return;
      }

      if (e.key === 'F1' || e.key === 'F3') {
        e.preventDefault();
        setCurrentView('pdv');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setCurrentView('caixa');
      } else if (e.key === 'F8') {
        e.preventDefault();
        setCurrentView('produtos');
      } else if (e.key === 'F9') {
        e.preventDefault();
        setCurrentView('clientes');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView]);

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm font-bold">
        Iniciando WS Gestão PDV...
      </div>
    );
  }

  if (!usuario) {
    return <LoginView />;
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-100 font-sans">
      {/* Barra de Cabeçalho Superior */}
      <Header onOpenCaixaModal={() => setCurrentView('caixa')} onOpenConfigModal={() => setCurrentView('config')} />

      {/* Corpo Dividido: Sidebar + Tela Atual */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar currentView={currentView} onNavigate={setCurrentView} />

        <main className="flex-1 overflow-hidden bg-slate-100 select-text flex flex-col">
          <ErrorBoundary onResetToPdv={() => setCurrentView('pdv')}>
            {currentView === 'pdv' && <PdvView onOpenCaixaModal={() => setCurrentView('caixa')} />}
            {currentView === 'clientes' && <ClientesView />}
            {currentView === 'produtos' && <ProdutosView />}
            {currentView === 'estoque' && <EstoqueView />}
            {currentView === 'catalogo' && <CatalogoOnlineView />}
            {currentView === 'contasPagar' && <ContasPagarView />}
            {currentView === 'crediario' && <CrediarioView />}
            {currentView === 'caixa' && <CaixaView />}
            {currentView === 'relatorios' && <RelatoriosView />}
            {currentView === 'fiscal' && <FiscalView />}
            {currentView === 'fornecedores' && <FornecedoresView />}
            {currentView === 'aplicativos' && <AplicativosView onNavigate={(view) => setCurrentView(view as ViewType)} />}
            {currentView === 'config' && <ConfigView />}
            {currentView === 'superAdmin' && <SuperAdminView />}
          </ErrorBoundary>
        </main>
      </div>

      {/* Rodapé Verificável com Versão e Data de Build */}
      <footer className="h-6 bg-slate-900 text-slate-400 text-[10px] px-3 flex items-center justify-between border-t border-slate-800 select-none shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-slate-300">WS Gestão PDV</span>
          <span>•</span>
          <span>Sistema Comercial Offline</span>
        </div>
        <div className="flex items-center gap-2 font-mono">
          <span className="text-sky-400 font-bold">{APP_VERSION}</span>
          <span>•</span>
          <span className="text-slate-300 font-bold">build {APP_BUILD_DATE}</span>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <PlanosProvider>
          <CaixaProvider>
            <ToastProvider>
              <MainLayout />
            </ToastProvider>
          </CaixaProvider>
        </PlanosProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;


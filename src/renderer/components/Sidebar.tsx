import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Users, 
  Package, 
  Boxes, 
  Globe, 
  CreditCard, 
  CircleDollarSign, 
  BarChart3, 
  FileText, 
  Truck, 
  AppWindow, 
  Settings, 
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Store,
  Tag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type ViewType = 
  | 'pdv' 
  | 'clientes' 
  | 'produtos' 
  | 'estoque' 
  | 'catalogo' 
  | 'contasPagar' 
  | 'crediario' 
  | 'caixa' 
  | 'relatorios' 
  | 'fiscal' 
  | 'fornecedores' 
  | 'aplicativos' 
  | 'config'
  | 'superAdmin';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { isGerente, isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(false);

  // Itens de Operação e Gestão Diária
  const navItems: {
    id: ViewType;
    label: string;
    icon: any;
    shortcut?: string;
    badge?: string;
    badgeColor?: string;
    reqGerente?: boolean;
    reqAdmin?: boolean;
  }[] = [
    { id: 'pdv', label: 'Vendas', icon: CircleDollarSign, shortcut: 'F3' },
    { id: 'clientes', label: 'Clientes', icon: Users, shortcut: 'F9' },
    { id: 'produtos', label: 'Produtos', icon: Tag, shortcut: 'F8' },
    { id: 'estoque', label: 'Estoque', icon: Boxes },
    { id: 'catalogo', label: 'Catálogo Online', icon: Globe },
    { id: 'contasPagar', label: 'Contas a Pagar', icon: CreditCard },
    { id: 'crediario', label: 'Crediário', icon: Wallet, badge: 'Destaque', badgeColor: 'bg-sky-100 text-sky-700 font-bold' },
    { id: 'caixa', label: 'Caixa', icon: CircleDollarSign, shortcut: 'F5' },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3, reqGerente: true },
    { id: 'fiscal', label: 'Nota Fiscal', icon: FileText },
  ];

  const secondaryNavItems: {
    id: ViewType;
    label: string;
    icon: any;
    badge?: string;
    badgeColor?: string;
    reqGerente?: boolean;
    reqAdmin?: boolean;
  }[] = [
    { id: 'fornecedores', label: 'Fornecedores', icon: Truck },
    { id: 'aplicativos', label: 'Aplicativos', icon: AppWindow },
    { id: 'config', label: 'Configurações', icon: Settings, reqGerente: true },
    { id: 'superAdmin', label: 'Painel SaaS', icon: ShieldAlert, badge: 'Admin', badgeColor: 'bg-purple-100 text-purple-700', reqAdmin: true },
  ];

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-white text-slate-700 flex flex-col justify-between border-r border-slate-200 transition-all duration-200 select-none shadow-xs`}>
      {/* Topo / Lista de Navegação Principal */}
      <div className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {/* Toggle de recolhimento */}
        <div className="flex items-center justify-between px-2 py-1 mb-1">
          {!collapsed && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Navegação
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors ml-auto cursor-pointer"
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Itens Principais */}
        {navItems.map((item) => {
          if (item.reqGerente && !isGerente) return null;
          if (item.reqAdmin && !isAdmin) return null;
          const isActive = currentView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? `${item.label} ${item.shortcut ? `(${item.shortcut})` : ''}` : undefined}
              className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'justify-between px-3'} py-2 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                isActive
                  ? 'bg-sky-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-sky-600'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!collapsed && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.shortcut && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isActive ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {item.shortcut}
                    </span>
                  )}
                  {item.badge && !isActive && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}

        {/* Separador */}
        <div className="my-2 border-t border-slate-100" />

        {/* Módulos Secundários / Utilitários */}
        {!collapsed && (
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Outros
          </div>
        )}

        {secondaryNavItems.map((item) => {
          if (item.reqGerente && !isGerente) return null;
          if (item.reqAdmin && !isAdmin) return null;
          const isActive = currentView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'justify-between px-3'} py-1.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                isActive
                  ? 'bg-sky-600 text-white shadow-sm font-bold'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-sky-600'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!collapsed && item.badge && !isActive && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${item.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Rodapé da Barra Lateral */}
      {!collapsed ? (
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 text-[11px] text-slate-500">
          <div className="flex items-center justify-between mb-0.5">
            <span className="font-bold text-slate-700 text-xs">WS Gestão PDV</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">Offline OK</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Versão Comercial Desktop
          </p>
        </div>
      ) : (
        <div className="p-2 border-t border-slate-100 flex justify-center text-[10px] font-bold text-slate-400">
          WS
        </div>
      )}
    </aside>
  );
};

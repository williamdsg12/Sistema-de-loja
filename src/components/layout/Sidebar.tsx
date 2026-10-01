'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Boxes,
  Users,
  Truck,
  ShoppingBag,
  CircleDollarSign,
  Globe,
  BarChart3,
  Settings,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import styles from './Sidebar.module.css';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ReactNode;
  badge?: string;
  subItems?: { title: string; href: string }[];
}

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    Vendas: pathname.startsWith('/vendas') || pathname.startsWith('/pdv') || pathname.startsWith('/pedidos'),
    Produtos: pathname.startsWith('/produtos'),
    Estoque: pathname.startsWith('/estoque'),
    Financeiro: pathname.startsWith('/financeiro') || pathname.startsWith('/caixa'),
    'Loja Online': pathname.startsWith('/loja-online'),
  });

  const toggleSubmenu = (title: string) => {
    setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const menuItems: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard size={20} />,
    },
    {
      title: 'Vendas',
      icon: <ShoppingCart size={20} />,
      subItems: [
        { title: 'Frente de Caixa (PDV)', href: '/pdv' },
        { title: 'Histórico de Vendas', href: '/vendas' },
        { title: 'Pedidos', href: '/pedidos' },
      ],
    },
    {
      title: 'Produtos',
      icon: <Package size={20} />,
      subItems: [
        { title: 'Lista de Produtos', href: '/produtos' },
        { title: 'Categorias', href: '/produtos/categorias' },
        { title: 'Marcas', href: '/produtos/marcas' },
        { title: 'Grade de Variações', href: '/produtos/variacoes' },
      ],
    },
    {
      title: 'Estoque',
      icon: <Boxes size={20} />,
      subItems: [
        { title: 'Posição de Estoque', href: '/estoque' },
        { title: 'Movimentações', href: '/estoque/movimentacoes' },
        { title: 'Inventário / Ajustes', href: '/estoque/inventario' },
      ],
    },
    {
      title: 'Clientes',
      href: '/clientes',
      icon: <Users size={20} />,
    },
    {
      title: 'Fornecedores',
      href: '/fornecedores',
      icon: <Truck size={20} />,
    },
    {
      title: 'Compras',
      href: '/compras',
      icon: <ShoppingBag size={20} />,
    },
    {
      title: 'Financeiro',
      icon: <CircleDollarSign size={20} />,
      subItems: [
        { title: 'Controle de Caixa', href: '/caixa' },
        { title: 'Histórico de Caixas', href: '/caixa/historico' },
        { title: 'Contas a Pagar', href: '/financeiro/contas-pagar' },
        { title: 'Contas a Receber', href: '/financeiro/contas-receber' },
        { title: 'Fluxo de Caixa', href: '/financeiro/fluxo' },
      ],
    },
    {
      title: 'Loja Online',
      icon: <Globe size={20} />,
      subItems: [
        { title: 'Visão Geral', href: '/loja-online' },
        { title: 'Catálogo Público', href: '/loja-online/catalogo' },
        { title: 'Pedidos Online', href: '/loja-online/pedidos' },
        { title: 'Banners & Destaques', href: '/loja-online/banners' },
        { title: 'Personalização & Cores', href: '/loja-online/aparencia' },
      ],
    },
    {
      title: 'Relatórios',
      href: '/relatorios',
      icon: <BarChart3 size={20} />,
    },
    {
      title: 'Auditoria & Logs',
      href: '/auditoria',
      icon: <ShieldAlert size={20} />,
    },
    {
      title: 'Configurações',
      href: '/configuracoes',
      icon: <Settings size={20} />,
    },
  ];

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      {/* Brand Header */}
      <div className={styles.brand}>
        <div className={styles.brandLogo}>
          <Sparkles size={20} />
        </div>
        <div className={styles.brandInfo}>
          <span className={styles.brandName}>KIDS & TEENS</span>
          <span className={styles.brandType}>Gestão Comercial</span>
        </div>
      </div>

      {/* PDV Quick Action */}
      <div className={styles.pdvActionWrapper}>
        <Link href="/pdv" className={styles.pdvQuickBtn} onClick={onClose}>
          <Receipt size={18} />
          <span>ABRIR PDV (F2)</span>
        </Link>
      </div>

      {/* Navigation List */}
      <nav className={styles.nav}>
        {menuItems.map((item) => {
          const hasSub = !!item.subItems;
          const isSubOpen = openMenus[item.title];
          const isDirectActive = item.href ? pathname === item.href : false;
          const isAnyChildActive = item.subItems?.some((sub) => pathname === sub.href);

          if (!hasSub && item.href) {
            return (
              <Link
                key={item.title}
                href={item.href}
                className={`${styles.navItem} ${isDirectActive ? styles.active : ''}`}
                onClick={onClose}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.title}</span>
                {item.badge && <span className={styles.navBadge}>{item.badge}</span>}
              </Link>
            );
          }

          return (
            <div key={item.title} className={styles.navGroup}>
              <button
                type="button"
                className={`${styles.navItem} ${isAnyChildActive ? styles.activeGroup : ''}`}
                onClick={() => toggleSubmenu(item.title)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.title}</span>
                <span className={styles.chevron}>
                  {isSubOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
              </button>

              {isSubOpen && item.subItems && (
                <div className={styles.submenu}>
                  {item.subItems.map((sub) => {
                    const isSubActive = pathname === sub.href;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={`${styles.submenuItem} ${isSubActive ? styles.subActive : ''}`}
                        onClick={onClose}
                      >
                        <span className={styles.subDot} />
                        <span>{sub.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className={styles.sidebarFooter}>
        <div className={styles.statusIndicator}>
          <span className={styles.statusDot} />
          <span>Banco Conectado (WAL)</span>
        </div>
      </div>
    </aside>
  );
}

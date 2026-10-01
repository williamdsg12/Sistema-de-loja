'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Bell,
  Store as StoreIcon,
  LogOut,
  User as UserIcon,
  ChevronDown,
  DollarSign,
  AlertCircle,
  Package,
  ShoppingBag,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import styles from './Header.module.css';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Notificações
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data?.user) setUser(data.user);
      }
    } catch (err) {
      console.error('Erro ao carregar sessão:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // sincroniza a cada minuto
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Erro ao deslogar:', err);
      router.push('/login');
    }
  };

  const handleNotificationClick = async (notif: any) => {
    try {
      if (!notif.isRead) {
        await fetch(`/api/notifications/${notif.id}/read`, { method: 'POST' });
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
      }
      setIsNotifMenuOpen(false);
      if (notif.linkUrl) {
        router.push(notif.linkUrl);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'ALERTA_ESTOQUE':
        return <Package size={16} style={{ color: '#d97706' }} />;
      case 'NOVO_PEDIDO':
        return <ShoppingBag size={16} style={{ color: '#2563eb' }} />;
      case 'CAIXA_DIFERENCA':
        return <DollarSign size={16} style={{ color: '#dc2626' }} />;
      default:
        return <Sparkles size={16} style={{ color: '#8b5cf6' }} />;
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <button
          type="button"
          onClick={onToggleSidebar}
          className={styles.menuToggleBtn}
          aria-label="Alternar Menu Lateral"
        >
          <Menu size={20} />
        </button>

        {/* Informações da Loja Ativa */}
        <div className={styles.storeTag}>
          <StoreIcon size={16} className={styles.storeIcon} />
          <span className={styles.storeName}>
            {user?.store?.tradeName || user?.store?.name || 'Kids & Teens Boutique Infantil'}
          </span>
          <span className={styles.storeStatus}>Desktop Local (Offline-First)</span>
        </div>
      </div>

      <div className={styles.rightSection}>
        {/* Status do Caixa */}
        <div className={styles.cashStatus}>
          <div className={styles.cashIcon}>
            <DollarSign size={15} />
          </div>
          <div className={styles.cashInfo}>
            <span className={styles.cashLabel}>Status do Caixa:</span>
            <span className={styles.cashValueOpen}>Pronto / Ativo</span>
          </div>
        </div>

        {/* Notificações */}
        <div className={styles.notificationWrapper}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Notificações"
            title="Notificações do Sistema"
            onClick={() => {
              setIsNotifMenuOpen(!isNotifMenuOpen);
              setIsUserMenuOpen(false);
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className={styles.notificationBadge}>{unreadCount}</span>}
          </button>

          {isNotifMenuOpen && (
            <div className={styles.notificationMenu}>
              <div className={styles.notificationHeader}>
                <strong>Notificações ({unreadCount} não lidas)</strong>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className={styles.markAllBtn}
                    onClick={handleMarkAllRead}
                  >
                    Marcar lidas
                  </button>
                )}
              </div>

              <div className={styles.notificationList}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    Nenhuma notificação no momento.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className={`${styles.notificationItem} ${!n.isRead ? styles.notificationUnread : ''}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className={styles.notifIcon}>{getNotifIcon(n.type)}</div>
                      <div className={styles.notifContent}>
                        <span className={styles.notifTitle}>{n.title}</span>
                        <span className={styles.notifMsg}>{n.message}</span>
                        <span className={styles.notifTime}>{formatDate(n.createdAt)}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Menu do Usuário */}
        <div className={styles.userMenuWrapper}>
          <button
            type="button"
            className={styles.userButton}
            onClick={() => {
              setIsUserMenuOpen(!isUserMenuOpen);
              setIsNotifMenuOpen(false);
            }}
          >
            <div className={styles.userAvatar}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className={styles.userDetails}>
              <span className={styles.userName}>{user?.name || 'Administrador'}</span>
              <span className={styles.userRole}>{user?.role?.name || 'ADMINISTRADOR'}</span>
            </div>
            <ChevronDown size={16} className={styles.userChevron} />
          </button>

          {isUserMenuOpen && (
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownHeader}>
                <strong>{user?.name || 'Administrador'}</strong>
                <span>{user?.email || 'admin@kidsboutique.com.br'}</span>
              </div>
              <div className={styles.dropdownDivider} />
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  router.push('/configuracoes');
                }}
                className={styles.dropdownItem}
              >
                <UserIcon size={16} />
                <span>Configurações & Usuários</span>
              </button>
              <div className={styles.dropdownDivider} />
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`${styles.dropdownItem} ${styles.logoutItem}`}
              >
                <LogOut size={16} />
                <span>{isLoggingOut ? 'Saindo...' : 'Sair do Sistema'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

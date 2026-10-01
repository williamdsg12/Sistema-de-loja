'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Eye,
  Calendar,
  User,
  Clock,
  Printer,
  RefreshCw,
  AlertTriangle,
  DollarSign,
  Layers,
  ArrowRight,
  Sparkles,
  FileCode,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import styles from './auditoria.module.css';

interface AuditLog {
  id: string;
  storeId: string;
  userId?: string | null;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  previousValue?: string | null;
  newValue?: string | null;
  parsedPrevious?: any;
  parsedNew?: any;
  ipAddress?: string | null;
  createdAt: string;
  user?: {
    name: string;
    email: string;
    role?: {
      name: string;
    };
  };
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal de Detalhes do Log (Diff)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (entityFilter) params.append('entity', entityFilter);
      if (actionFilter) params.append('action', actionFilter);
      if (userFilter) params.append('userId', userFilter);
      if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }

      const res = await fetch(`/api/audit?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
        setSummary(data.summary || null);
        setUsersList(data.usersList || []);
      }
    } catch (e) {
      console.error('Erro ao buscar logs de auditoria:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [search, entityFilter, actionFilter, userFilter, startDate, endDate]);

  const getActionBadgeClass = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CANCELAMENTO') || act.includes('EXCLUSAO') || act.includes('PERDA') || act.includes('DELETE')) {
      return styles.actionDanger;
    }
    if (act.includes('SANGRIA') || act.includes('AJUSTE') || act.includes('DESCONTO') || act.includes('FECHAMENTO')) {
      return styles.actionWarning;
    }
    if (act.includes('PRECO') || act.includes('ALTERACAO') || act.includes('STATUS') || act.includes('UPDATE')) {
      return styles.actionInfo;
    }
    return styles.actionSuccess;
  };

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>Trilha de Auditoria & Segurança</h1>
          <p>Rastreabilidade imutável de todas as ações de usuários, alterações de preços, cancelamentos e caixas</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => window.print()}
          >
            <Printer size={16} />
            <span>Imprimir Relatório</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={fetchAuditLogs}
          >
            <RefreshCw size={16} />
            <span>Atualizar Trilha</span>
          </Button>
        </div>
      </div>

      {/* KPIS */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#e0e7ff', color: '#4338ca' }}>
            <ShieldAlert size={24} />
          </div>
          <div className={styles.kpiDetails}>
            <span className={styles.kpiLabel}>Total de Eventos Registrados</span>
            <span className={styles.kpiValue}>{summary?.totalLogsCount || 0}</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#fee2e2', color: '#dc2626' }}>
            <AlertTriangle size={24} />
          </div>
          <div className={styles.kpiDetails}>
            <span className={styles.kpiLabel}>Ações Críticas / Cancelamentos</span>
            <span className={styles.kpiValue}>{summary?.criticalActionsCount || 0}</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#eff6ff', color: '#2563eb' }}>
            <DollarSign size={24} />
          </div>
          <div className={styles.kpiDetails}>
            <span className={styles.kpiLabel}>Alterações de Preço</span>
            <span className={styles.kpiValue}>{summary?.priceChangesCount || 0}</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#fef3c7', color: '#d97706' }}>
            <Clock size={24} />
          </div>
          <div className={styles.kpiDetails}>
            <span className={styles.kpiLabel}>Movimentações de Caixa</span>
            <span className={styles.kpiValue}>{summary?.cashEventsCount || 0}</span>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className={styles.filtersCard}>
        <div className={styles.filtersRow}>
          <div className={styles.searchBox}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar em ações, entidade, ID, nome do operador ou valores JSON..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className={styles.filterSelect}
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          >
            <option value="">Todas as Entidades</option>
            <option value="Product">Produtos / Matriz</option>
            <option value="Sale">Vendas (PDV)</option>
            <option value="CashRegister">Caixa & Fechamento</option>
            <option value="Stock">Estoque & Inventário</option>
            <option value="Order">Pedidos Online</option>
            <option value="AccountPayable">Contas a Pagar</option>
            <option value="AccountReceivable">Contas a Receber</option>
            <option value="Purchase">Compras Fornecedor</option>
            <option value="Customer">Clientes</option>
            <option value="User">Usuários & Permissões</option>
          </select>

          <select
            className={styles.filterSelect}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">Todos os Tipos de Ação</option>
            <option value="CRIACAO">Criação / Cadastro</option>
            <option value="ALTERACAO">Atualização / Edição</option>
            <option value="PRECO">Alteração de Preço</option>
            <option value="CANCELAMENTO">Cancelamento</option>
            <option value="SANGRIA">Sangria de Caixa</option>
            <option value="FECHAMENTO">Fechamento de Caixa</option>
            <option value="AJUSTE">Ajuste de Estoque</option>
            <option value="STATUS">Mudança de Status</option>
          </select>

          <select
            className={styles.filterSelect}
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
          >
            <option value="">Todos os Operadores</option>
            {usersList.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role?.name || 'Operador'})
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <input
              type="date"
              className={styles.dateInput}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>até</span>
            <input
              type="date"
              className={styles.dateInput}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* TABELA DE AUDITORIA */}
      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data & Hora</th>
                <th>Operador / Usuário</th>
                <th>Ação Executada</th>
                <th>Entidade / Módulo</th>
                <th>ID do Registro</th>
                <th>Resumo das Alterações</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                    Carregando trilha de auditoria...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    Nenhum evento de auditoria encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600 }}>
                        <Clock size={14} style={{ color: 'var(--text-secondary)' }} />
                        <span>{formatDate(log.createdAt)}</span>
                      </div>
                      {log.ipAddress && (
                        <small style={{ color: 'var(--text-secondary)', display: 'block' }}>
                          IP: {log.ipAddress}
                        </small>
                      )}
                    </td>

                    <td>
                      <div className={styles.userCell}>
                        <div className={styles.userAvatar}>
                          {log.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.userInfo}>
                          <strong>{log.userName}</strong>
                          <span>{log.user?.role?.name || 'Sistema'}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`${styles.actionBadge} ${getActionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>

                    <td>
                      <span className={styles.entityBadge}>{log.entity}</span>
                    </td>

                    <td>
                      <code style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {log.entityId.slice(0, 12)}...
                      </code>
                    </td>

                    <td style={{ maxWidth: '280px' }}>
                      <div
                        style={{
                          fontSize: '0.8125rem',
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {log.parsedNew
                          ? typeof log.parsedNew === 'object'
                            ? JSON.stringify(log.parsedNew).slice(0, 50) + '...'
                            : String(log.parsedNew)
                          : log.newValue || 'Registro gerado'}
                      </div>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye size={14} />
                        <span>Inspecionar Diff</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE INSPEÇÃO (DIFF / ANTES VS DEPOIS) */}
      {selectedLog && (
        <div className={styles.modalOverlay} onClick={() => setSelectedLog(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Inspeção de Log de Auditoria #{selectedLog.id.slice(0, 8)}</h3>
                <small style={{ color: 'var(--text-secondary)' }}>
                  Ação: <strong>{selectedLog.action}</strong> • Módulo: <strong>{selectedLog.entity}</strong>
                </small>
              </div>
              <button
                type="button"
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}
                onClick={() => setSelectedLog(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* METADADOS */}
              <div className={styles.metaInfoGrid}>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Data e Hora:</span>
                  <div style={{ fontWeight: 700 }}>{formatDate(selectedLog.createdAt)}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Operador / Usuário:</span>
                  <div style={{ fontWeight: 700 }}>{selectedLog.userName}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Perfil de Acesso:</span>
                  <div style={{ fontWeight: 700 }}>{selectedLog.user?.role?.name || 'Administrador'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>ID da Entidade:</span>
                  <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{selectedLog.entityId}</div>
                </div>
              </div>

              {/* COMPARATIVO DIFF (ANTES VS DEPOIS) */}
              <div className={styles.diffGrid}>
                {/* ESTADO ANTERIOR */}
                <div className={styles.diffBox}>
                  <div className={`${styles.diffHeader} ${styles.diffHeaderPrev}`}>
                    <FileCode size={16} />
                    <span>Estado Anterior (Antes)</span>
                  </div>
                  <pre className={styles.jsonCode}>
                    {selectedLog.parsedPrevious
                      ? JSON.stringify(selectedLog.parsedPrevious, null, 2)
                      : selectedLog.previousValue || '(Nenhum valor anterior registrado)'}
                  </pre>
                </div>

                {/* NOVO ESTADO */}
                <div className={styles.diffBox}>
                  <div className={`${styles.diffHeader} ${styles.diffHeaderNew}`}>
                    <FileCode size={16} />
                    <span>Novo Estado (Depois)</span>
                  </div>
                  <pre className={styles.jsonCode}>
                    {selectedLog.parsedNew
                      ? JSON.stringify(selectedLog.parsedNew, null, 2)
                      : selectedLog.newValue || '(Nenhum novo valor)'}
                  </pre>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setSelectedLog(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

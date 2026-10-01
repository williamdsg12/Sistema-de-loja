'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  History,
  ArrowLeft,
  Calendar,
  Filter,
  RefreshCw,
  Eye,
  Lock,
  Unlock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Receipt,
  Wallet,
  CreditCard,
  QrCode,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import styles from './historico.module.css';

export default function CaixaHistoricoPage() {
  const [data, setData] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal de Detalhes de um Caixa Específico
  const [selectedRegisterId, setSelectedRegisterId] = useState<string | null>(null);
  const [detailsData, setDetailsData] = useState<any | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const fetchRegisters = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/cash-registers?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico de caixas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegisters();
  }, [statusFilter]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRegisters();
  };

  const openDetails = async (id: string) => {
    setSelectedRegisterId(id);
    setIsLoadingDetails(true);
    try {
      const res = await fetch(`/api/cash-registers/${id}`);
      if (res.ok) {
        const json = await res.json();
        setDetailsData(json);
      }
    } catch (err) {
      console.error('Erro ao carregar detalhes do caixa:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const registers = data?.registers || [];
  const summary = data?.summary || {
    totalRegisters: 0,
    closedCount: 0,
    openCount: 0,
    totalExpectedSum: 0,
    totalCountedSum: 0,
    totalDifferenceSum: 0,
  };

  return (
    <div className={styles.container}>
      {/* Cabeçalho */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumbs}>
            <Link href="/caixa" className={styles.backLink}>
              <ArrowLeft size={16} /> Voltar para Controle de Caixa
            </Link>
          </div>
          <h1 className={styles.pageTitle}>Histórico de Fechamentos de Caixa</h1>
          <p className={styles.pageSubtitle}>
            Auditoria completa de sessões de caixa abertas e fechadas, diferenças apuradas e cupons emitidos.
          </p>
        </div>

        <Link href="/caixa">
          <Button variant="primary" size="md" leftIcon={<Wallet size={16} />}>
            Gerenciar Caixa Atual
          </Button>
        </Link>
      </div>

      {/* Grid de Indicadores */}
      <div className={styles.kpiGrid}>
        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Total de Sessões</span>
              <div className={`${styles.kpiIconWrapper} ${styles.neutralIcon}`}>
                <History size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{summary.totalRegisters}</div>
            <div className={styles.kpiFooter}>
              <span>{summary.closedCount} fechados • {summary.openCount} abertos</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Volume Total Apurado</span>
              <div className={`${styles.kpiIconWrapper} ${styles.primaryIcon}`}>
                <DollarSign size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{formatCurrency(summary.totalCountedSum)}</div>
            <div className={styles.kpiFooter}>
              <span>Soma dos caixas fechados</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Divergência Total Líquida</span>
              <div
                className={`${styles.kpiIconWrapper} ${
                  Math.abs(summary.totalDifferenceSum) < 0.01
                    ? styles.successIcon
                    : summary.totalDifferenceSum > 0
                    ? styles.infoIcon
                    : styles.dangerIcon
                }`}
              >
                <TrendingUp size={20} />
              </div>
            </div>
            <div
              className={styles.kpiValue}
              style={{
                color:
                  Math.abs(summary.totalDifferenceSum) < 0.01
                    ? 'var(--text-primary)'
                    : summary.totalDifferenceSum > 0
                    ? '#10b981'
                    : '#ef4444',
              }}
            >
              {summary.totalDifferenceSum >= 0 ? '+' : ''}
              {formatCurrency(summary.totalDifferenceSum)}
            </div>
            <div className={styles.kpiFooter}>
              <span>{summary.totalDifferenceSum >= 0 ? 'Sobra líquida' : 'Falta líquida acumulada'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className={styles.filterCard}>
        <CardContent className={styles.filterContent}>
          <form onSubmit={handleFilterSubmit} className={styles.filterForm}>
            <div className={styles.filterInputs}>
              <div className={styles.inputWithIcon}>
                <Calendar size={16} className={styles.fieldIcon} />
                <input
                  type="date"
                  className={styles.dateInput}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Data Início"
                />
              </div>

              <div className={styles.inputWithIcon}>
                <Calendar size={16} className={styles.fieldIcon} />
                <input
                  type="date"
                  className={styles.dateInput}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="Data Fim"
                />
              </div>

              <select
                className={styles.selectInput}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos os Status</option>
                <option value="FECHADO">Fechados</option>
                <option value="ABERTO">Abertos</option>
              </select>

              <Button type="submit" variant="secondary" size="md" leftIcon={<Filter size={16} />}>
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabela de Histórico */}
      <Card>
        <CardContent className={styles.tableCardContent}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <RefreshCw size={24} className="animate-spin" />
              <span>Carregando histórico de caixas...</span>
            </div>
          ) : registers.length === 0 ? (
            <div className={styles.emptyState}>
              <History size={44} />
              <p>Nenhuma sessão de caixa encontrada para os filtros selecionados.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Operador</th>
                    <th>Abertura</th>
                    <th>Fechamento</th>
                    <th>Fundo Inicial</th>
                    <th>Vendas / Mov.</th>
                    <th>Esperado</th>
                    <th>Contado</th>
                    <th>Diferença</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {registers.map((r: any) => {
                    const hasDiff = r.difference !== null && r.difference !== undefined;
                    const isDiffExact = hasDiff && Math.abs(r.difference) < 0.01;
                    const isDiffSobra = hasDiff && r.difference > 0;
                    const isDiffFalta = hasDiff && r.difference < -0.01;

                    return (
                      <tr key={r.id}>
                        <td>
                          <Badge
                            variant={r.status === 'ABERTO' ? 'success' : 'neutral'}
                            size="sm"
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td>
                          <strong>{r.user?.name || 'Operador'}</strong>
                        </td>
                        <td>
                          <span className={styles.dateCell}>{formatDateTime(r.openedAt)}</span>
                        </td>
                        <td>
                          <span className={styles.dateCell}>
                            {r.closedAt ? formatDateTime(r.closedAt) : '— Em andamento —'}
                          </span>
                        </td>
                        <td>{formatCurrency(r.initialBalance)}</td>
                        <td>
                          <span className={styles.countBadge}>
                            {r._count?.sales || 0} vendas • {r._count?.movements || 0} mov.
                          </span>
                        </td>
                        <td>
                          {r.finalExpected !== null ? formatCurrency(r.finalExpected) : '—'}
                        </td>
                        <td>
                          <strong>
                            {r.finalCounted !== null ? formatCurrency(r.finalCounted) : '—'}
                          </strong>
                        </td>
                        <td>
                          {hasDiff ? (
                            <span
                              className={`${styles.diffTag} ${
                                isDiffExact
                                  ? styles.diffTagExact
                                  : isDiffSobra
                                  ? styles.diffTagSobra
                                  : styles.diffTagFalta
                              }`}
                            >
                              {r.difference >= 0 ? '+' : ''}
                              {formatCurrency(r.difference)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            title="Ver Detalhes do Caixa"
                            onClick={() => openDetails(r.id)}
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL: DETALHES DO CAIXA HISTÓRICO */}
      {selectedRegisterId && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalCardLarge} ${styles.printableReceipt}`}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Auditoria da Sessão de Caixa</h3>
                <p>
                  Operador: <strong>{detailsData?.register?.user?.name}</strong> • Status:{' '}
                  <strong>{detailsData?.register?.status}</strong>
                </p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => {
                  setSelectedRegisterId(null);
                  setDetailsData(null);
                }}
              >
                ✕
              </button>
            </div>

            {isLoadingDetails || !detailsData ? (
              <div className={styles.loadingModal}>
                <RefreshCw size={24} className="animate-spin" />
                <span>Carregando dados da sessão...</span>
              </div>
            ) : (
              <div className={styles.modalBody}>
                {/* Meta Cards */}
                <div className={styles.detailsMetaGrid}>
                  <div>
                    <small>Abertura:</small>
                    <strong>{formatDateTime(detailsData.register.openedAt)}</strong>
                  </div>
                  <div>
                    <small>Fechamento:</small>
                    <strong>
                      {detailsData.register.closedAt
                        ? formatDateTime(detailsData.register.closedAt)
                        : 'Ainda em Aberto'}
                    </strong>
                  </div>
                  <div>
                    <small>Fundo Inicial:</small>
                    <strong>{formatCurrency(detailsData.summary.initialBalance)}</strong>
                  </div>
                  <div>
                    <small>Total em Vendas:</small>
                    <strong>{formatCurrency(detailsData.summary.totalSalesAmount)}</strong>
                  </div>
                  <div>
                    <small>Diferença Final:</small>
                    <strong
                      style={{
                        color:
                          detailsData.register.difference === 0
                            ? 'var(--text-primary)'
                            : detailsData.register.difference > 0
                            ? '#10b981'
                            : '#ef4444',
                      }}
                    >
                      {detailsData.register.difference !== null
                        ? `${detailsData.register.difference >= 0 ? '+' : ''}${formatCurrency(
                            detailsData.register.difference
                          )}`
                        : 'Não Fechado'}
                    </strong>
                  </div>
                </div>

                {/* Vendas */}
                <h4 className={styles.sectionTitle}>
                  Vendas Realizadas ({detailsData.register.sales?.length || 0})
                </h4>
                <table className={styles.miniTable}>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Data/Hora</th>
                      <th>Cliente</th>
                      <th>Pagamentos</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailsData.register.sales?.map((s: any) => (
                      <tr key={s.id}>
                        <td><strong>{s.code}</strong></td>
                        <td>{formatDateTime(s.createdAt)}</td>
                        <td>{s.customer ? s.customer.name : 'Cliente Balcão'}</td>
                        <td>
                          {s.payments?.map((p: any) => p.method.replace('_', ' ')).join(', ')}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          {formatCurrency(s.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Movimentações */}
                <h4 className={styles.sectionTitle} style={{ marginTop: '1rem' }}>
                  Movimentações Manuais ({detailsData.register.movements?.length || 0})
                </h4>
                <table className={styles.miniTable}>
                  <thead>
                    <tr>
                      <th>Data/Hora</th>
                      <th>Tipo</th>
                      <th>Motivo</th>
                      <th>Operador</th>
                      <th style={{ textAlign: 'right' }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailsData.register.movements?.map((m: any) => (
                      <tr key={m.id}>
                        <td>{formatDateTime(m.createdAt)}</td>
                        <td>
                          <Badge
                            variant={
                              m.type === 'SANGRIA' || m.type === 'DESPESA' ? 'danger' : 'success'
                            }
                            size="sm"
                          >
                            {m.type}
                          </Badge>
                        </td>
                        <td>{m.reason}</td>
                        <td>{m.user?.name || 'Operador'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          {formatCurrency(m.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className={styles.modalFooter}>
              <Button
                type="button"
                variant="outline"
                size="md"
                leftIcon={<Printer size={16} />}
                onClick={handlePrint}
              >
                Imprimir Relatório
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  setSelectedRegisterId(null);
                  setDetailsData(null);
                }}
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

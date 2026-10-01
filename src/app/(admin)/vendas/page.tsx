'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Ban,
  Printer,
  DollarSign,
  TrendingUp,
  Receipt,
  User,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDocument, formatDateTime } from '@/lib/utils';
import styles from './vendas.module.css';

export default function VendasPage() {
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal de Detalhes da Venda
  const [selectedSale, setSelectedSale] = useState<any | null>(null);

  // Modal de Cancelamento
  const [saleToCancel, setSaleToCancel] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await fetch(`/api/sales?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Erro ao carregar vendas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSales();
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleToCancel) return;
    if (!cancelReason.trim()) {
      alert('Informe o motivo do cancelamento.');
      return;
    }

    setIsCanceling(true);
    try {
      const res = await fetch(`/api/sales/${saleToCancel.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });

      const json = await res.json();
      if (res.ok) {
        alert(json.message || 'Venda cancelada com sucesso!');
        setSaleToCancel(null);
        setCancelReason('');
        fetchSales();
      } else {
        alert(json.error || 'Erro ao cancelar venda.');
      }
    } catch (err) {
      console.error('Erro no cancelamento:', err);
      alert('Falha na comunicação com o servidor.');
    } finally {
      setIsCanceling(false);
    }
  };

  const summary = data?.summary || {
    totalSalesAmount: 0,
    totalSalesCount: 0,
    averageTicket: 0,
  };

  const sales = data?.sales || [];

  return (
    <div className={styles.container}>
      {/* Cabeçalho */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Histórico de Vendas (PDV)</h1>
          <p className={styles.pageSubtitle}>
            Acompanhe todas as vendas concluídas no balcão, pagamentos e cancelamentos.
          </p>
        </div>

        <Link href="/pdv">
          <Button variant="primary" size="md" leftIcon={<Receipt size={16} />}>
            Abrir Frente de Caixa (PDV)
          </Button>
        </Link>
      </div>

      {/* Grid de Indicadores */}
      <div className={styles.kpiGrid}>
        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Faturamento Total das Vendas</span>
              <div className={`${styles.kpiIconWrapper} ${styles.primaryIcon}`}>
                <DollarSign size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{formatCurrency(summary.totalSalesAmount)}</div>
            <div className={styles.kpiFooter}>
              <span>Em vendas ativas no PDV</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Total de Vendas Realizadas</span>
              <div className={`${styles.kpiIconWrapper} ${styles.successIcon}`}>
                <ShoppingCart size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{summary.totalSalesCount}</div>
            <div className={styles.kpiFooter}>
              <span>Cupons emitidos</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Ticket Médio por Venda</span>
              <div className={`${styles.kpiIconWrapper} ${styles.infoIcon}`}>
                <TrendingUp size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{formatCurrency(summary.averageTicket)}</div>
            <div className={styles.kpiFooter}>
              <span>Média por cliente atendido</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className={styles.filterCard}>
        <CardContent className={styles.filterContent}>
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <div className={styles.searchInputWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar por código (V-...), nome do cliente, CPF ou operador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.filtersWrapper}>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={styles.selectFilter}
              >
                <option value="">Todos os Status</option>
                <option value="CONCLUIDA">Concluídas</option>
                <option value="CANCELADA">Canceladas</option>
              </select>

              <Button type="submit" variant="secondary" size="md" leftIcon={<Filter size={16} />}>
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabela de Vendas */}
      <Card>
        <CardContent className={styles.tableCardContent}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <RefreshCw size={24} className="animate-spin" />
              <span>Carregando histórico de vendas...</span>
            </div>
          ) : sales.length === 0 ? (
            <div className={styles.emptyState}>
              <Receipt size={44} />
              <p>Nenhuma venda encontrada.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Data & Hora</th>
                    <th>Cliente</th>
                    <th>Operador</th>
                    <th>Itens</th>
                    <th>Formas de Pagamento</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s: any) => (
                    <tr
                      key={s.id}
                      className={s.status === 'CANCELADA' ? styles.cancelledRow : ''}
                    >
                      <td>
                        <strong>{s.code}</strong>
                      </td>
                      <td>
                        <span className={styles.dateCell}>{formatDateTime(s.createdAt)}</span>
                      </td>
                      <td>
                        {s.customer ? (
                          <div className={styles.custCell}>
                            <strong>{s.customer.name}</strong>
                            {s.customer.documentNumber && (
                              <small>{formatDocument(s.customer.documentNumber)}</small>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Cliente Balcão</span>
                        )}
                      </td>
                      <td>{s.user?.name || 'Operador'}</td>
                      <td>
                        <span className={styles.itemsCountBadge}>
                          {s.items?.reduce((a: number, b: any) => a + b.quantity, 0) || 0} peças
                        </span>
                      </td>
                      <td>
                        <div className={styles.paymentsTags}>
                          {s.payments?.map((p: any, idx: number) => (
                            <span key={idx} className={styles.paymentTag}>
                              {p.method.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <strong className={styles.totalSaleAmount}>
                          {formatCurrency(s.totalAmount)}
                        </strong>
                      </td>
                      <td>
                        <Badge
                          variant={s.status === 'CONCLUIDA' ? 'success' : 'danger'}
                          size="sm"
                        >
                          {s.status}
                        </Badge>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className={styles.actionButtons}>
                          <button
                            type="button"
                            onClick={() => setSelectedSale(s)}
                            className={styles.actionBtn}
                            title="Ver Detalhes da Venda"
                          >
                            <Eye size={16} />
                          </button>
                          {s.status === 'CONCLUIDA' && (
                            <button
                              type="button"
                              onClick={() => setSaleToCancel(s)}
                              className={`${styles.actionBtn} ${styles.cancelBtn}`}
                              title="Cancelar Venda & Estornar Estoque"
                            >
                              <Ban size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Detalhes da Venda */}
      {selectedSale && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Detalhes da Venda {selectedSale.code}</h3>
                <p>Data: {formatDateTime(selectedSale.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className={styles.closeBtn}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Informações Gerais */}
              <div className={styles.saleDetailsMeta}>
                <div>
                  <small>Cliente:</small>
                  <strong>{selectedSale.customer?.name || 'Cliente Balcão'}</strong>
                </div>
                <div>
                  <small>Operador do Caixa:</small>
                  <strong>{selectedSale.user?.name}</strong>
                </div>
                <div>
                  <small>Status:</small>
                  <Badge variant={selectedSale.status === 'CONCLUIDA' ? 'success' : 'danger'} size="sm">
                    {selectedSale.status}
                  </Badge>
                </div>
              </div>

              {/* Tabela de Itens */}
              <h4 className={styles.sectionSubTitle}>Itens da Venda</h4>
              <table className={styles.itemsDetailTable}>
                <thead>
                  <tr>
                    <th>Peça / Variação</th>
                    <th>SKU</th>
                    <th>Qtd</th>
                    <th>Preço Unit.</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.items?.map((it: any) => (
                    <tr key={it.id}>
                      <td>
                        <strong>{it.variant?.product?.name}</strong>
                        <small> (Tam: {it.variant?.size} • Cor: {it.variant?.color})</small>
                      </td>
                      <td><code>{it.variant?.sku}</code></td>
                      <td>{it.quantity} un</td>
                      <td>{formatCurrency(it.unitPrice)}</td>
                      <td style={{ textAlign: 'right' }}><strong>{formatCurrency(it.totalPrice)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagamentos */}
              <h4 className={styles.sectionSubTitle} style={{ marginTop: '1rem' }}>Pagamentos Efetuados</h4>
              <div className={styles.paymentsDetailList}>
                {selectedSale.payments?.map((p: any, i: number) => (
                  <div key={i} className={styles.paymentDetailRow}>
                    <span>{p.method.replace('_', ' ')} {p.installments > 1 && `(${p.installments}x)`}:</span>
                    <strong>{formatCurrency(p.amount)}</strong>
                  </div>
                ))}
              </div>

              {/* Totais */}
              <div className={styles.saleTotalsBox}>
                <div>Subtotal: {formatCurrency(selectedSale.subtotal)}</div>
                {selectedSale.discountAmount > 0 && (
                  <div style={{ color: 'var(--danger-solid)' }}>
                    Desconto: - {formatCurrency(selectedSale.discountAmount)}
                  </div>
                )}
                <div className={styles.saleFinalTotal}>
                  TOTAL: {formatCurrency(selectedSale.totalAmount)}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setSelectedSale(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmação de Cancelamento */}
      {saleToCancel && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCardSmall}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Cancelar Venda {saleToCancel.code}</h3>
                <p>Valor da venda: {formatCurrency(saleToCancel.totalAmount)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSaleToCancel(null)}
                className={styles.closeBtn}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmCancel} className={styles.modalBody}>
              <div className={styles.warningBox}>
                <AlertTriangle size={20} />
                <span>
                  O cancelamento estornará automaticamente todos os itens para o estoque físico e registrará a saída de estorno no caixa da loja.
                </span>
              </div>

              <div className={styles.textareaWrapper}>
                <label className={styles.inputLabel}>Motivo do Cancelamento *</label>
                <textarea
                  rows={3}
                  className={styles.textarea}
                  placeholder="Ex: Cliente desistiu da compra, troca integral, erro de lançamento..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                />
              </div>

              <div className={styles.modalFooter} style={{ padding: '1rem 0 0', background: 'transparent' }}>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setSaleToCancel(null)}
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="md"
                  isLoading={isCanceling}
                  leftIcon={<Ban size={16} />}
                >
                  Confirmar Cancelamento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

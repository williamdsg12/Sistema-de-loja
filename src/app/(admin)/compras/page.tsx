'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
  Ban,
  Clock,
  DollarSign,
  PackageCheck,
  Calendar,
  Truck,
  AlertTriangle,
  Receipt,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import styles from './compras.module.css';

export default function ComprasPage() {
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modais
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);
  const [purchaseToCancel, setPurchaseToCancel] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);

  const fetchPurchases = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/purchases?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Erro ao carregar compras:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPurchases();
  };

  // Receber Pedido Pendente
  const handleReceivePurchase = async (purchaseId: string) => {
    if (!confirm('Deseja confirmar o recebimento desta compra e dar entrada no estoque físico agora?')) {
      return;
    }

    setIsReceiving(true);
    try {
      const res = await fetch(`/api/purchases/${purchaseId}/receive`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message || 'Compra recebida com sucesso!');
        if (selectedPurchase?.id === purchaseId) {
          setSelectedPurchase(null);
        }
        fetchPurchases();
      } else {
        alert(json.error || 'Erro ao receber compra.');
      }
    } catch (err) {
      console.error(err);
      alert('Falha na comunicação com o servidor.');
    } finally {
      setIsReceiving(false);
    }
  };

  // Cancelar Compra
  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseToCancel) return;

    setIsCanceling(true);
    try {
      const res = await fetch(`/api/purchases/${purchaseToCancel.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message || 'Compra cancelada com sucesso!');
        setPurchaseToCancel(null);
        setCancelReason('');
        if (selectedPurchase?.id === purchaseToCancel.id) {
          setSelectedPurchase(null);
        }
        fetchPurchases();
      } else {
        alert(json.error || 'Erro ao cancelar compra.');
      }
    } catch (err) {
      console.error(err);
      alert('Falha na comunicação com o servidor.');
    } finally {
      setIsCanceling(false);
    }
  };

  const purchases = data?.purchases || [];
  const summary = data?.summary || {
    totalPurchasesAmount: 0,
    totalPurchasesCount: 0,
    receivedCount: 0,
    pendingCount: 0,
  };

  return (
    <div className={styles.container}>
      {/* Cabeçalho */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Compras & Entradas de Mercadorias</h1>
          <p className={styles.pageSubtitle}>
            Gestão de pedidos de compra para fornecedores, recebimento de mercadorias e atualização de custos de estoque.
          </p>
        </div>

        <Link href="/compras/nova">
          <Button variant="primary" size="md" leftIcon={<Plus size={16} />}>
            Nova Compra / Entrada
          </Button>
        </Link>
      </div>

      {/* Grid de KPIs */}
      <div className={styles.kpiGrid}>
        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Total Comprado (Recebido)</span>
              <div className={`${styles.kpiIconWrapper} ${styles.primaryIcon}`}>
                <DollarSign size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{formatCurrency(summary.totalPurchasesAmount)}</div>
            <div className={styles.kpiFooter}>
              <span>Investimento em mercadorias recebidas</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Entradas Concluídas</span>
              <div className={`${styles.kpiIconWrapper} ${styles.successIcon}`}>
                <PackageCheck size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{summary.receivedCount}</div>
            <div className={styles.kpiFooter}>
              <span>Compras recebidas e estocadas</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Pedidos Pendentes</span>
              <div className={`${styles.kpiIconWrapper} ${styles.warningIcon}`}>
                <Clock size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{summary.pendingCount}</div>
            <div className={styles.kpiFooter}>
              <span>Aguardando entrega de fornecedor</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className={styles.filterCard}>
        <CardContent className={styles.filterContent}>
          <form onSubmit={handleSearchSubmit} className={styles.filterForm}>
            <div className={styles.searchInputWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar por código (COM-...), fornecedor ou observações..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.filtersWrapper}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.selectFilter}
              >
                <option value="">Todos os Status</option>
                <option value="RECEBIDO">Recebidos</option>
                <option value="PENDENTE">Pendentes</option>
                <option value="CANCELADO">Cancelados</option>
              </select>

              <Button type="submit" variant="secondary" size="md" leftIcon={<Filter size={16} />}>
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabela de Compras */}
      <Card>
        <CardContent className={styles.tableCardContent}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <RefreshCw size={24} className="animate-spin" />
              <span>Carregando compras...</span>
            </div>
          ) : purchases.length === 0 ? (
            <div className={styles.emptyState}>
              <ShoppingBag size={44} />
              <p>Nenhuma compra encontrada.</p>
              <Link href="/compras/nova">
                <Button variant="primary" size="sm" leftIcon={<Plus size={14} />}>
                  Cadastrar Primeira Compra
                </Button>
              </Link>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Data</th>
                    <th>Fornecedor</th>
                    <th>Itens / Peças</th>
                    <th>Valor Total</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p: any) => {
                    const totalPieces = p.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;

                    return (
                      <tr
                        key={p.id}
                        className={p.status === 'CANCELADO' ? styles.cancelledRow : ''}
                      >
                        <td>
                          <strong>{p.code}</strong>
                        </td>
                        <td>
                          <span className={styles.dateCell}>{formatDateTime(p.createdAt)}</span>
                        </td>
                        <td>
                          <div className={styles.supplierCell}>
                            <strong>{p.supplier?.name}</strong>
                            {p.supplier?.corporateName && (
                              <small>{p.supplier.corporateName}</small>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={styles.itemsBadge}>
                            {p.items?.length || 0} variações ({totalPieces} peças)
                          </span>
                        </td>
                        <td>
                          <strong className={styles.totalAmount}>
                            {formatCurrency(p.totalAmount)}
                          </strong>
                        </td>
                        <td>
                          <Badge
                            variant={
                              p.status === 'RECEBIDO'
                                ? 'success'
                                : p.status === 'PENDENTE'
                                ? 'warning'
                                : 'danger'
                            }
                            size="sm"
                          >
                            {p.status}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className={styles.actionButtons}>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              title="Ver Detalhes da Compra"
                              onClick={() => setSelectedPurchase(p)}
                            >
                              <Eye size={16} />
                            </button>

                            {p.status === 'PENDENTE' && (
                              <button
                                type="button"
                                className={`${styles.actionBtn} ${styles.receiveBtn}`}
                                title="Confirmar Recebimento e Dar Entrada no Estoque"
                                onClick={() => handleReceivePurchase(p.id)}
                                disabled={isReceiving}
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            )}

                            {p.status !== 'CANCELADO' && (
                              <button
                                type="button"
                                className={`${styles.actionBtn} ${styles.cancelBtn}`}
                                title="Cancelar Compra e Estornar"
                                onClick={() => setPurchaseToCancel(p)}
                              >
                                <Ban size={16} />
                              </button>
                            )}
                          </div>
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

      {/* MODAL 1: DETALHES DA COMPRA */}
      {selectedPurchase && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCardLarge}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Detalhes da Compra {selectedPurchase.code}</h3>
                <p>Registrada em: {formatDateTime(selectedPurchase.createdAt)}</p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setSelectedPurchase(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Meta da Compra */}
              <div className={styles.purchaseMetaGrid}>
                <div>
                  <small>Fornecedor:</small>
                  <strong>{selectedPurchase.supplier?.name}</strong>
                  {selectedPurchase.supplier?.phone && <span>Tel: {selectedPurchase.supplier.phone}</span>}
                </div>
                <div>
                  <small>Comprador / Operador:</small>
                  <strong>{selectedPurchase.user?.name || 'Sistema'}</strong>
                </div>
                <div>
                  <small>Status:</small>
                  <Badge
                    variant={
                      selectedPurchase.status === 'RECEBIDO'
                        ? 'success'
                        : selectedPurchase.status === 'PENDENTE'
                        ? 'warning'
                        : 'danger'
                    }
                    size="sm"
                  >
                    {selectedPurchase.status}
                  </Badge>
                </div>
                <div>
                  <small>Data do Recebimento:</small>
                  <strong>
                    {selectedPurchase.receivedAt
                      ? formatDateTime(selectedPurchase.receivedAt)
                      : 'Pendente de Entrega'}
                  </strong>
                </div>
              </div>

              {/* Tabela de Itens Comprados */}
              <h4 className={styles.sectionTitle}>Produtos e Variações ({selectedPurchase.items?.length})</h4>
              <table className={styles.itemsTable}>
                <thead>
                  <tr>
                    <th>Produto / Variação</th>
                    <th>SKU</th>
                    <th>Quantidade</th>
                    <th>Custo Unit.</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPurchase.items?.map((it: any) => (
                    <tr key={it.id}>
                      <td>
                        <strong>{it.variant?.product?.name}</strong>
                        <small> (Tam: {it.variant?.size} • Cor: {it.variant?.color})</small>
                      </td>
                      <td><code>{it.variant?.sku}</code></td>
                      <td>{it.quantity} peças</td>
                      <td>{formatCurrency(it.unitCost)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>{formatCurrency(it.totalCost)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Contas a Pagar Vinculadas */}
              {selectedPurchase.accountsPayable?.length > 0 && (
                <>
                  <h4 className={styles.sectionTitle} style={{ marginTop: '1rem' }}>
                    Contas a Pagar Vinculadas ({selectedPurchase.accountsPayable.length} parcelas)
                  </h4>
                  <div className={styles.payablesList}>
                    {selectedPurchase.accountsPayable.map((ap: any) => (
                      <div key={ap.id} className={styles.payableRow}>
                        <div>
                          <strong>{ap.description}</strong>
                          <small>Vencimento: {new Date(ap.dueDate).toLocaleDateString('pt-BR')}</small>
                        </div>
                        <div className={styles.payableRight}>
                          <Badge
                            variant={
                              ap.status === 'PAGO'
                                ? 'success'
                                : ap.status === 'CANCELADO'
                                ? 'danger'
                                : 'warning'
                            }
                            size="sm"
                          >
                            {ap.status}
                          </Badge>
                          <strong>{formatCurrency(ap.amount)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Totais */}
              <div className={styles.totalsSummary}>
                {selectedPurchase.shippingCost > 0 && (
                  <div>Frete / Custos Adicionais: + {formatCurrency(selectedPurchase.shippingCost)}</div>
                )}
                {selectedPurchase.discountAmount > 0 && (
                  <div style={{ color: 'var(--danger-solid)' }}>
                    Desconto: - {formatCurrency(selectedPurchase.discountAmount)}
                  </div>
                )}
                <div className={styles.finalTotal}>
                  TOTAL DA COMPRA: {formatCurrency(selectedPurchase.totalAmount)}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              {selectedPurchase.status === 'PENDENTE' && (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  leftIcon={<CheckCircle2 size={16} />}
                  onClick={() => handleReceivePurchase(selectedPurchase.id)}
                  isLoading={isReceiving}
                >
                  Receber Pedido & Abastecer Estoque
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setSelectedPurchase(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMAÇÃO DE CANCELAMENTO */}
      {purchaseToCancel && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCardSmall}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Cancelar Compra {purchaseToCancel.code}</h3>
                <p>Valor total: {formatCurrency(purchaseToCancel.totalAmount)}</p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setPurchaseToCancel(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmCancel} className={styles.modalBody}>
              <div className={styles.warningBox}>
                <AlertTriangle size={20} />
                <span>
                  {purchaseToCancel.status === 'RECEBIDO'
                    ? 'Atenção: O cancelamento desta compra estornará as quantidades do estoque físico e cancelará as contas a pagar pendentes vinculadas.'
                    : 'O cancelamento anulará este pedido de compra e suas contas a pagar.'}
                </span>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Motivo do Cancelamento *</label>
                <textarea
                  rows={3}
                  className={styles.textarea}
                  placeholder="Ex: Fornecedor não entregou, devolução de lote com defeito..."
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
                  onClick={() => setPurchaseToCancel(null)}
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

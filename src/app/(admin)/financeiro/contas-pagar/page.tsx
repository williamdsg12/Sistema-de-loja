'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Ban,
  Clock,
  DollarSign,
  AlertTriangle,
  Calendar,
  Layers,
  ArrowDownRight,
  TrendingDown,
  FileText,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import styles from './payables.module.css';

export default function ContasPagarPage() {
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fornecedores e Categorias para o modal
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Modais
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [payableToPay, setPayableToPay] = useState<any | null>(null);
  const [payableToCancel, setPayableToCancel] = useState<any | null>(null);

  // Form Nova Conta
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BOLETO');
  const [notes, setNotes] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Form Baixa de Pagamento
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState('BOLETO');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Form Cancelamento
  const [cancelReason, setCancelReason] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);

  const fetchPayables = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/finance/payables?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Erro ao carregar contas a pagar:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayables();
  }, [statusFilter]);

  // Carrega fornecedores e categorias para formulários
  useEffect(() => {
    const loadAuxData = async () => {
      try {
        const [supRes, catRes] = await Promise.all([
          fetch('/api/suppliers'),
          fetch('/api/finance/categories?type=DESPESA'),
        ]);
        if (supRes.ok) {
          const supJson = await supRes.json();
          setSuppliers(supJson.suppliers || []);
        }
        if (catRes.ok) {
          const catJson = await catRes.json();
          setCategories(catJson.categories || []);
        }
      } catch (e) {
        console.error('Erro ao carregar dados auxiliares:', e);
      }
    };
    loadAuxData();
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPayables();
  };

  // Criar Conta a Pagar Manual
  const handleCreatePayable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0 || !dueDate) {
      alert('Preencha a descrição, valor e data de vencimento.');
      return;
    }

    setIsSubmittingNew(true);
    try {
      const res = await fetch('/api/finance/payables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          amount,
          dueDate,
          supplierId: selectedSupplierId || null,
          categoryId: selectedCategoryId || null,
          paymentMethod,
          notes,
          installmentsCount,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setIsNewModalOpen(false);
        setDescription('');
        setAmount(0);
        setSelectedSupplierId('');
        setSelectedCategoryId('');
        setNotes('');
        setInstallmentsCount(1);
        fetchPayables();
      } else {
        alert(json.error || 'Erro ao criar conta.');
      }
    } catch (err) {
      console.error(err);
      alert('Falha na comunicação com o servidor.');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Baixar Pagamento
  const handleConfirmPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payableToPay) return;

    setIsSubmittingPay(true);
    try {
      const res = await fetch(`/api/finance/payables/${payableToPay.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentDate: payDate,
          paymentMethod: payMethod,
          notes: payNotes,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setPayableToPay(null);
        setPayNotes('');
        fetchPayables();
      } else {
        alert(json.error || 'Erro ao registrar pagamento.');
      }
    } catch (err) {
      console.error(err);
      alert('Falha ao comunicar com o servidor.');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  // Cancelar Conta
  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payableToCancel) return;

    setIsCanceling(true);
    try {
      const res = await fetch(`/api/finance/payables/${payableToCancel.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });

      const json = await res.json();
      if (res.ok) {
        setPurchaseToCancel(null);
        setPayableToCancel(null);
        setCancelReason('');
        fetchPayables();
      } else {
        alert(json.error || 'Erro ao cancelar conta.');
      }
    } catch (err) {
      console.error(err);
      alert('Falha ao comunicar com o servidor.');
    } finally {
      setIsCanceling(false);
    }
  };

  const setPurchaseToCancel = (p: any) => {};

  const payables = data?.payables || [];
  const summary = data?.summary || {
    totalPendingAmount: 0,
    totalOverdueAmount: 0,
    totalPaidAmount: 0,
    totalCount: 0,
    pendingCount: 0,
    overdueCount: 0,
    paidCount: 0,
  };

  return (
    <div className={styles.container}>
      {/* Cabeçalho */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Contas a Pagar</h1>
          <p className={styles.pageSubtitle}>
            Gestão de despesas operacionais, boletos de fornecedores, controle de vencimentos e baixas financeiras.
          </p>
        </div>

        <div className={styles.headerButtons}>
          <Link href="/financeiro/fluxo">
            <Button variant="outline" size="md" leftIcon={<TrendingDown size={16} />}>
              Fluxo de Caixa
            </Button>
          </Link>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus size={16} />}
            onClick={() => setIsNewModalOpen(true)}
          >
            Nova Conta a Pagar
          </Button>
        </div>
      </div>

      {/* Grid de Indicadores */}
      <div className={styles.kpiGrid}>
        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>A Pagar (Em Aberto)</span>
              <div className={`${styles.kpiIconWrapper} ${styles.warningIcon}`}>
                <Clock size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{formatCurrency(summary.totalPendingAmount)}</div>
            <div className={styles.kpiFooter}>
              <span>{summary.pendingCount} títulos a vencer</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Contas Vencidas</span>
              <div className={`${styles.kpiIconWrapper} ${styles.dangerIcon}`}>
                <AlertTriangle size={20} />
              </div>
            </div>
            <div className={styles.kpiValue} style={{ color: '#ef4444' }}>
              {formatCurrency(summary.totalOverdueAmount)}
            </div>
            <div className={styles.kpiFooter}>
              <span>{summary.overdueCount} títulos em atraso</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Total Pago</span>
              <div className={`${styles.kpiIconWrapper} ${styles.successIcon}`}>
                <CheckCircle2 size={20} />
              </div>
            </div>
            <div className={styles.kpiValue} style={{ color: '#10b981' }}>
              {formatCurrency(summary.totalPaidAmount)}
            </div>
            <div className={styles.kpiFooter}>
              <span>{summary.paidCount} títulos quitados</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className={styles.filterCard}>
        <CardContent className={styles.filterContent}>
          <form onSubmit={handleFilterSubmit} className={styles.filterForm}>
            <div className={styles.searchInputWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar por descrição, fornecedor ou observações..."
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
                <option value="PENDENTE">A Vencer (Pendentes)</option>
                <option value="VENCIDO">Vencidos (Em Atraso)</option>
                <option value="PAGO">Pagos</option>
                <option value="CANCELADO">Cancelados</option>
              </select>

              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={styles.dateInput}
                title="Vencimento inicial"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={styles.dateInput}
                title="Vencimento final"
              />

              <Button type="submit" variant="secondary" size="md" leftIcon={<Filter size={16} />}>
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabela de Contas a Pagar */}
      <Card>
        <CardContent className={styles.tableCardContent}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <RefreshCw size={24} className="animate-spin" />
              <span>Carregando contas a pagar...</span>
            </div>
          ) : payables.length === 0 ? (
            <div className={styles.emptyState}>
              <CreditCard size={44} />
              <p>Nenhuma conta a pagar encontrada.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Vencimento</th>
                    <th>Descrição</th>
                    <th>Fornecedor / Favorecido</th>
                    <th>Categoria DRE</th>
                    <th>Forma</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {payables.map((p: any) => {
                    const status = p.computedStatus || p.status;
                    return (
                      <tr
                        key={p.id}
                        className={status === 'CANCELADO' ? styles.cancelledRow : ''}
                      >
                        <td>
                          <span
                            className={`${styles.dateCell} ${
                              status === 'VENCIDO' ? styles.overdueDate : ''
                            }`}
                          >
                            {new Date(p.dueDate).toLocaleDateString('pt-BR')}
                          </span>
                        </td>
                        <td>
                          <strong>{p.description}</strong>
                          {p.purchase && (
                            <small className={styles.purchaseTag}>
                              Ref: {p.purchase.code}
                            </small>
                          )}
                        </td>
                        <td>
                          {p.supplier ? (
                            <span>{p.supplier.name}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Despesa Direta</span>
                          )}
                        </td>
                        <td>
                          <span className={styles.catBadge}>
                            {p.category?.name || 'Geral'}
                          </span>
                        </td>
                        <td>{p.paymentMethod || 'BOLETO'}</td>
                        <td>
                          <strong className={styles.amountText}>
                            {formatCurrency(p.amount)}
                          </strong>
                        </td>
                        <td>
                          <Badge
                            variant={
                              status === 'PAGO'
                                ? 'success'
                                : status === 'VENCIDO'
                                ? 'danger'
                                : status === 'PENDENTE'
                                ? 'warning'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {status}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className={styles.actionButtons}>
                            {(status === 'PENDENTE' || status === 'VENCIDO') && (
                              <button
                                type="button"
                                className={`${styles.actionBtn} ${styles.payBtn}`}
                                title="Baixar Pagamento"
                                onClick={() => {
                                  setPayableToPay(p);
                                  setPayMethod(p.paymentMethod || 'BOLETO');
                                }}
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            )}
                            {status !== 'CANCELADO' && status !== 'PAGO' && (
                              <button
                                type="button"
                                className={`${styles.actionBtn} ${styles.cancelBtn}`}
                                title="Cancelar Conta"
                                onClick={() => setPayableToCancel(p)}
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

      {/* MODAL 1: NOVA CONTA A PAGAR MANUAL */}
      {isNewModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Nova Despesa / Conta a Pagar</h3>
                <p>Cadastre uma fatura, boleto ou despesa operacional</p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsNewModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePayable} className={styles.modalBody}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Descrição da Despesa *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Ex: Aluguel da Loja, Conta de Energia, Lote de Sacolas..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Valor Total (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className={styles.input}
                    placeholder="0,00"
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Vencimento (1ª Parcela) *</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Fornecedor / Favorecido (Opcional)</label>
                  <select
                    className={styles.select}
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                  >
                    <option value="">Sem fornecedor vinculado</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Categoria DRE</label>
                  <select
                    className={styles.select}
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                  >
                    <option value="">Geral / Despesas Operacionais</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Forma de Pagamento</label>
                  <select
                    className={styles.select}
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="BOLETO">Boleto Bancário</option>
                    <option value="PIX">PIX / Transferência</option>
                    <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                    <option value="DINHEIRO">Dinheiro</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Parcelamento</label>
                  <select
                    className={styles.select}
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(parseInt(e.target.value) || 1)}
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                      <option key={n} value={n}>
                        {n}x {n > 1 ? `de ${formatCurrency(amount / n)}` : '(À Vista)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Observações (Opcional)</label>
                <textarea
                  rows={2}
                  className={styles.textarea}
                  placeholder="Código de barras do boleto, anotações financeiras..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className={styles.modalFooter}>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsNewModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmittingNew}
                  leftIcon={<Plus size={16} />}
                >
                  Cadastrar Conta a Pagar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BAIXA DE PAGAMENTO */}
      {payableToPay && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCardSmall}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Confirmar Baixa de Pagamento</h3>
                <p>
                  {payableToPay.description} • <strong>{formatCurrency(payableToPay.amount)}</strong>
                </p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setPayableToPay(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPay} className={styles.modalBody}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Data do Pagamento *</label>
                <input
                  type="date"
                  className={styles.input}
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Forma de Pagamento Utilizada *</label>
                <select
                  className={styles.select}
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                >
                  <option value="BOLETO">Boleto Bancário</option>
                  <option value="PIX">PIX / Transferência</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                  <option value="DINHEIRO">Dinheiro (Saída da Gaveta se Caixa Aberto)</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Observações da Baixa</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Ex: Comprovante autenticado no banco..."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                />
              </div>

              <div className={styles.modalFooter}>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setPayableToPay(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmittingPay}
                  leftIcon={<CheckCircle2 size={16} />}
                >
                  Confirmar Baixa
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CANCELAMENTO */}
      {payableToCancel && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCardSmall}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Cancelar Conta a Pagar</h3>
                <p>{payableToCancel.description}</p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setPayableToCancel(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmCancel} className={styles.modalBody}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Motivo do Cancelamento</label>
                <textarea
                  rows={2}
                  className={styles.textarea}
                  placeholder="Ex: Cobrança indevida, boleto duplicado..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                />
              </div>

              <div className={styles.modalFooter}>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setPayableToCancel(null)}
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

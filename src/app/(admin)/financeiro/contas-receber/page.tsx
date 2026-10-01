'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Ban,
  Clock,
  AlertTriangle,
  Calendar,
  Layers,
  TrendingUp,
  User,
  QrCode,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import styles from './receivables.module.css';

export default function ContasReceberPage() {
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Clientes e Categorias para o modal
  const [customers, setCustomers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Modais
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [receivableToReceive, setReceivableToReceive] = useState<any | null>(null);
  const [receivableToCancel, setReceivableToCancel] = useState<any | null>(null);

  // Form Nova Conta
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [notes, setNotes] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Form Baixa de Recebimento
  const [recDate, setRecDate] = useState(new Date().toISOString().split('T')[0]);
  const [recMethod, setRecMethod] = useState('PIX');
  const [recNotes, setRecNotes] = useState('');
  const [isSubmittingRec, setIsSubmittingRec] = useState(false);

  // Form Cancelamento
  const [cancelReason, setCancelReason] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);

  const fetchReceivables = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/finance/receivables?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Erro ao carregar contas a receber:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivables();
  }, [statusFilter]);

  useEffect(() => {
    const loadAuxData = async () => {
      try {
        const [custRes, catRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/finance/categories?type=RECEITA'),
        ]);
        if (custRes.ok) {
          const custJson = await custRes.json();
          setCustomers(custJson.customers || []);
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
    fetchReceivables();
  };

  // Criar Conta a Receber Manual
  const handleCreateReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0 || !dueDate) {
      alert('Preencha a descrição, valor e data de vencimento.');
      return;
    }

    setIsSubmittingNew(true);
    try {
      const res = await fetch('/api/finance/receivables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          amount,
          dueDate,
          customerId: selectedCustomerId || null,
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
        setSelectedCustomerId('');
        setSelectedCategoryId('');
        setNotes('');
        setInstallmentsCount(1);
        fetchReceivables();
      } else {
        alert(json.error || 'Erro ao criar conta a receber.');
      }
    } catch (err) {
      console.error(err);
      alert('Falha na comunicação com o servidor.');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Baixar Recebimento
  const handleConfirmReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivableToReceive) return;

    setIsSubmittingRec(true);
    try {
      const res = await fetch(`/api/finance/receivables/${receivableToReceive.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receivedDate: recDate,
          paymentMethod: recMethod,
          notes: recNotes,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setReceivableToReceive(null);
        setRecNotes('');
        fetchReceivables();
      } else {
        alert(json.error || 'Erro ao registrar recebimento.');
      }
    } catch (err) {
      console.error(err);
      alert('Falha ao comunicar com o servidor.');
    } finally {
      setIsSubmittingRec(false);
    }
  };

  // Cancelar Conta
  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivableToCancel) return;

    setIsCanceling(true);
    try {
      const res = await fetch(`/api/finance/receivables/${receivableToCancel.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });

      const json = await res.json();
      if (res.ok) {
        setReceivableToCancel(null);
        setCancelReason('');
        fetchReceivables();
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

  const receivables = data?.receivables || [];
  const summary = data?.summary || {
    totalPendingAmount: 0,
    totalOverdueAmount: 0,
    totalReceivedAmount: 0,
    totalCount: 0,
    pendingCount: 0,
    overdueCount: 0,
    receivedCount: 0,
  };

  return (
    <div className={styles.container}>
      {/* Cabeçalho */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Contas a Receber</h1>
          <p className={styles.pageSubtitle}>
            Gestão de crediários, parcelamentos de clientes, recebíveis futuros e controle de inadimplência.
          </p>
        </div>

        <div className={styles.headerButtons}>
          <Link href="/financeiro/fluxo">
            <Button variant="outline" size="md" leftIcon={<TrendingUp size={16} />}>
              Fluxo de Caixa
            </Button>
          </Link>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus size={16} />}
            onClick={() => setIsNewModalOpen(true)}
          >
            Novo Recebível
          </Button>
        </div>
      </div>

      {/* Grid de Indicadores */}
      <div className={styles.kpiGrid}>
        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>A Receber (Em Aberto)</span>
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
              <span className={styles.kpiLabel}>Em Atraso (Vencidas)</span>
              <div className={`${styles.kpiIconWrapper} ${styles.dangerIcon}`}>
                <AlertTriangle size={20} />
              </div>
            </div>
            <div className={styles.kpiValue} style={{ color: '#ef4444' }}>
              {formatCurrency(summary.totalOverdueAmount)}
            </div>
            <div className={styles.kpiFooter}>
              <span>{summary.overdueCount} títulos inadimplentes</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Total Recebido</span>
              <div className={`${styles.kpiIconWrapper} ${styles.successIcon}`}>
                <CheckCircle2 size={20} />
              </div>
            </div>
            <div className={styles.kpiValue} style={{ color: '#10b981' }}>
              {formatCurrency(summary.totalReceivedAmount)}
            </div>
            <div className={styles.kpiFooter}>
              <span>{summary.receivedCount} títulos quitados</span>
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
                placeholder="Buscar por descrição, cliente ou observações..."
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
                <option value="RECEBIDO">Recebidos</option>
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

      {/* Tabela de Contas a Receber */}
      <Card>
        <CardContent className={styles.tableCardContent}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <RefreshCw size={24} className="animate-spin" />
              <span>Carregando contas a receber...</span>
            </div>
          ) : receivables.length === 0 ? (
            <div className={styles.emptyState}>
              <DollarSign size={44} />
              <p>Nenhuma conta a receber encontrada.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Vencimento</th>
                    <th>Descrição</th>
                    <th>Cliente / Sacado</th>
                    <th>Categoria</th>
                    <th>Forma</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {receivables.map((r: any) => {
                    const status = r.computedStatus || r.status;
                    return (
                      <tr
                        key={r.id}
                        className={status === 'CANCELADO' ? styles.cancelledRow : ''}
                      >
                        <td>
                          <span
                            className={`${styles.dateCell} ${
                              status === 'VENCIDO' ? styles.overdueDate : ''
                            }`}
                          >
                            {new Date(r.dueDate).toLocaleDateString('pt-BR')}
                          </span>
                        </td>
                        <td>
                          <strong>{r.description}</strong>
                        </td>
                        <td>
                          {r.customer ? (
                            <span>{r.customer.name}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Cliente Avulso</span>
                          )}
                        </td>
                        <td>
                          <span className={styles.catBadge}>
                            {r.category?.name || 'Geral'}
                          </span>
                        </td>
                        <td>{r.paymentMethod || 'PIX'}</td>
                        <td>
                          <strong className={styles.amountText}>
                            {formatCurrency(r.amount)}
                          </strong>
                        </td>
                        <td>
                          <Badge
                            variant={
                              status === 'RECEBIDO'
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
                                title="Baixar Recebimento"
                                onClick={() => {
                                  setReceivableToReceive(r);
                                  setRecMethod(r.paymentMethod || 'PIX');
                                }}
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            )}
                            {status !== 'CANCELADO' && status !== 'RECEBIDO' && (
                              <button
                                type="button"
                                className={`${styles.actionBtn} ${styles.cancelBtn}`}
                                title="Cancelar Recebível"
                                onClick={() => setReceivableToCancel(r)}
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

      {/* MODAL 1: NOVO RECEBÍVEL MANUAL */}
      {isNewModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Novo Recebível / Venda a Prazo</h3>
                <p>Lance um crediário, aluguel ou receita futura</p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsNewModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReceivable} className={styles.modalBody}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Descrição da Receita *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Ex: Crediário Vestido Infantil, Aluguel de Espaço..."
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
                  <label className={styles.inputLabel}>Cliente / Devedor</label>
                  <select
                    className={styles.select}
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                  >
                    <option value="">Cliente Avulso</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
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
                    <option value="">Geral / Receitas</option>
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
                  <label className={styles.inputLabel}>Forma de Recebimento</label>
                  <select
                    className={styles.select}
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="PIX">PIX / Transferência</option>
                    <option value="BOLETO">Boleto Bancário</option>
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
                  placeholder="Informações adicionais sobre o recebível..."
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
                  Cadastrar Recebível
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BAIXA DE RECEBIMENTO */}
      {receivableToReceive && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCardSmall}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Confirmar Baixa de Recebimento</h3>
                <p>
                  {receivableToReceive.description} •{' '}
                  <strong>{formatCurrency(receivableToReceive.amount)}</strong>
                </p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setReceivableToReceive(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReceive} className={styles.modalBody}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Data do Recebimento *</label>
                <input
                  type="date"
                  className={styles.input}
                  value={recDate}
                  onChange={(e) => setRecDate(e.target.value)}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Forma de Recebimento *</label>
                <select
                  className={styles.select}
                  value={recMethod}
                  onChange={(e) => setRecMethod(e.target.value)}
                >
                  <option value="PIX">PIX / Transferência</option>
                  <option value="DINHEIRO">Dinheiro (Entrada na Gaveta se Caixa Aberto)</option>
                  <option value="CARTAO_DEBITO">Cartão de Débito</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                  <option value="BOLETO">Boleto Bancário</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Observações da Baixa</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Ex: Recebido via PIX chave CNPJ..."
                  value={recNotes}
                  onChange={(e) => setRecNotes(e.target.value)}
                />
              </div>

              <div className={styles.modalFooter}>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setReceivableToReceive(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmittingRec}
                  leftIcon={<CheckCircle2 size={16} />}
                >
                  Confirmar Recebimento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CANCELAMENTO */}
      {receivableToCancel && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCardSmall}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Cancelar Conta a Receber</h3>
                <p>{receivableToCancel.description}</p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setReceivableToCancel(null)}
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
                  placeholder="Ex: Devolução de mercadoria, renegociação de dívida..."
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
                  onClick={() => setReceivableToCancel(null)}
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

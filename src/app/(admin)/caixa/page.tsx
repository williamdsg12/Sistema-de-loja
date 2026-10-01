'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CircleDollarSign,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Lock,
  Unlock,
  History,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Printer,
  Receipt,
  Eye,
  PlusCircle,
  MinusCircle,
  X,
  CreditCard,
  QrCode,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import styles from './caixa.module.css';

export default function CaixaPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'movimentacoes' | 'vendas'>('movimentacoes');

  // Modais
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isSangriaModalOpen, setIsSangriaModalOpen] = useState(false);
  const [isSuprimentoModalOpen, setIsSuprimentoModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closingResult, setClosingResult] = useState<any | null>(null);

  // Estados dos Formulários
  const [openInitialBalance, setOpenInitialBalance] = useState<number>(0);
  const [openNotes, setOpenNotes] = useState('');
  const [isSubmittingOpen, setIsSubmittingOpen] = useState(false);

  // Sangria & Suprimento
  const [movAmount, setMovAmount] = useState<number>(0);
  const [movReason, setMovReason] = useState('');
  const [isSubmittingMov, setIsSubmittingMov] = useState(false);
  const [movError, setMovError] = useState('');

  // Fechamento Cego
  const [countedCash, setCountedCash] = useState<number>(0);
  const [countedPix, setCountedPix] = useState<number>(0);
  const [countedDebit, setCountedDebit] = useState<number>(0);
  const [countedCredit, setCountedCredit] = useState<number>(0);
  const [countedOther, setCountedOther] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState('');
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);
  const [closeError, setCloseError] = useState('');

  const fetchCurrentCash = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cash-registers/current');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Erro ao carregar status do caixa:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentCash();
  }, []);

  // 1. Abertura de Caixa
  const handleOpenCash = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingOpen(true);
    try {
      const res = await fetch('/api/cash-registers/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialBalance: openInitialBalance,
          notes: openNotes,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setIsOpenModalOpen(false);
        setOpenInitialBalance(0);
        setOpenNotes('');
        fetchCurrentCash();
      } else {
        alert(json.error || 'Erro ao abrir caixa.');
      }
    } catch (err) {
      console.error(err);
      alert('Falha na comunicação com o servidor.');
    } finally {
      setIsSubmittingOpen(false);
    }
  };

  // 2. Sangria / Suprimento
  const handleMovement = async (type: 'SANGRIA' | 'SUPRIMENTO', e: React.FormEvent) => {
    e.preventDefault();
    setMovError('');
    if (movAmount <= 0) {
      setMovError('O valor deve ser maior que zero.');
      return;
    }
    if (!movReason.trim()) {
      setMovError('Informe o motivo da movimentação.');
      return;
    }

    setIsSubmittingMov(true);
    try {
      const res = await fetch('/api/cash-registers/movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          amount: movAmount,
          paymentMethod: 'DINHEIRO',
          reason: movReason,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setIsSangriaModalOpen(false);
        setIsSuprimentoModalOpen(false);
        setMovAmount(0);
        setMovReason('');
        fetchCurrentCash();
      } else {
        setMovError(json.error || 'Erro ao registrar movimentação.');
      }
    } catch (err) {
      console.error(err);
      setMovError('Falha ao comunicar com o servidor.');
    } finally {
      setIsSubmittingMov(false);
    }
  };

  // 3. Fechamento de Caixa (Conferência Cega)
  const handleCloseCash = async (e: React.FormEvent) => {
    e.preventDefault();
    setCloseError('');
    setIsSubmittingClose(true);

    try {
      const res = await fetch('/api/cash-registers/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countedCash,
          countedPix,
          countedDebit,
          countedCredit,
          countedOther,
          notes: closeNotes,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setIsCloseModalOpen(false);
        setClosingResult(json.closingReport);
        fetchCurrentCash();
      } else {
        setCloseError(json.error || 'Erro ao fechar caixa.');
      }
    } catch (err) {
      console.error(err);
      setCloseError('Falha ao comunicar com o servidor.');
    } finally {
      setIsSubmittingClose(false);
    }
  };

  const handlePrintClosing = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <RefreshCw size={28} className="animate-spin" />
        <p>Carregando dados do caixa...</p>
      </div>
    );
  }

  const hasOpenRegister = data?.hasOpenRegister;
  const register = data?.register;
  const summary = data?.summary || {
    initialBalance: 0,
    cashInSales: 0,
    pixInSales: 0,
    debitInSales: 0,
    creditInSales: 0,
    otherInSales: 0,
    totalSalesAmount: 0,
    totalSalesCount: 0,
    totalSuprimentos: 0,
    totalSangrias: 0,
    currentDrawerCash: 0,
    currentTotalExpected: 0,
  };
  const movements = data?.movements || [];
  const sales = data?.sales || [];

  return (
    <div className={styles.container}>
      {/* Cabeçalho */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Controle de Caixa</h1>
          <p className={styles.pageSubtitle}>
            Gestão operacional de abertura, sangrias, suprimentos e fechamento com conferência cega.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/caixa/historico">
            <Button variant="outline" size="md" leftIcon={<History size={16} />}>
              Histórico de Caixas
            </Button>
          </Link>
          {hasOpenRegister && (
            <Link href="/pdv">
              <Button variant="secondary" size="md" leftIcon={<Receipt size={16} />}>
                Ir para o PDV
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ESTADO 1: CAIXA FECHADO */}
      {!hasOpenRegister && (
        <Card className={styles.closedCard}>
          <CardContent className={styles.closedContent}>
            <div className={styles.closedIconWrapper}>
              <Lock size={44} />
            </div>
            <h2>O Caixa está Fechado</h2>
            <p>
              Abra uma nova sessão de caixa informando o fundo de troco inicial para liberar o PDV e as movimentações financeiras.
            </p>
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Unlock size={18} />}
              onClick={() => setIsOpenModalOpen(true)}
            >
              Abrir Caixa Agora
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ESTADO 2: CAIXA ABERTO */}
      {hasOpenRegister && (
        <>
          {/* Status Bar */}
          <div className={styles.statusBar}>
            <div className={styles.statusInfo}>
              <div className={styles.statusBadgeWrapper}>
                <span className={styles.statusDot}></span>
                <strong>CAIXA ABERTO</strong>
              </div>
              <span>Operador: <strong>{register.userName}</strong></span>
              <span>•</span>
              <span>Aberto em: <strong>{formatDateTime(register.openedAt)}</strong></span>
            </div>

            <div className={styles.statusActions}>
              <Button
                variant="outline"
                size="sm"
                className={styles.suprimentoBtn}
                leftIcon={<PlusCircle size={15} />}
                onClick={() => {
                  setMovError('');
                  setMovAmount(0);
                  setMovReason('');
                  setIsSuprimentoModalOpen(true);
                }}
              >
                Suprimento (Aporte)
              </Button>

              <Button
                variant="outline"
                size="sm"
                className={styles.sangriaBtn}
                leftIcon={<MinusCircle size={15} />}
                onClick={() => {
                  setMovError('');
                  setMovAmount(0);
                  setMovReason('');
                  setIsSangriaModalOpen(true);
                }}
              >
                Sangria (Retirada)
              </Button>

              <Button
                variant="danger"
                size="sm"
                leftIcon={<Lock size={15} />}
                onClick={() => {
                  setCloseError('');
                  setCountedCash(0);
                  setCountedPix(0);
                  setCountedDebit(0);
                  setCountedCredit(0);
                  setCountedOther(0);
                  setCloseNotes('');
                  setIsCloseModalOpen(true);
                }}
              >
                Fechar Caixa (Conferência Cega)
              </Button>
            </div>
          </div>

          {/* Cards de KPIs Financeiros */}
          <div className={styles.kpiGrid}>
            {/* Dinheiro em Gaveta */}
            <Card className={`${styles.kpiCard} ${styles.highlightCard}`}>
              <CardContent className={styles.kpiContent}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>Dinheiro Físico em Gaveta</span>
                  <div className={`${styles.kpiIconWrapper} ${styles.cashIcon}`}>
                    <Wallet size={20} />
                  </div>
                </div>
                <div className={styles.kpiValueHighlight}>
                  {formatCurrency(summary.currentDrawerCash)}
                </div>
                <div className={styles.kpiFooter}>
                  <span>Fundo ({formatCurrency(summary.initialBalance)}) + Vendas Dinheiro ({formatCurrency(summary.cashInSales)}) + Suprim. ({formatCurrency(summary.totalSuprimentos)}) - Sangrias ({formatCurrency(summary.totalSangrias)})</span>
                </div>
              </CardContent>
            </Card>

            {/* Faturamento Vendas PDV */}
            <Card className={styles.kpiCard}>
              <CardContent className={styles.kpiContent}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>Total Vendas PDV</span>
                  <div className={`${styles.kpiIconWrapper} ${styles.salesIcon}`}>
                    <Receipt size={20} />
                  </div>
                </div>
                <div className={styles.kpiValue}>
                  {formatCurrency(summary.totalSalesAmount)}
                </div>
                <div className={styles.kpiFooter}>
                  <span>{summary.totalSalesCount} cupons emitidos nesta sessão</span>
                </div>
              </CardContent>
            </Card>

            {/* PIX */}
            <Card className={styles.kpiCard}>
              <CardContent className={styles.kpiContent}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>Vendas em PIX</span>
                  <div className={`${styles.kpiIconWrapper} ${styles.pixIcon}`}>
                    <QrCode size={20} />
                  </div>
                </div>
                <div className={styles.kpiValue}>
                  {formatCurrency(summary.pixInSales)}
                </div>
                <div className={styles.kpiFooter}>
                  <span>Recebimento instantâneo em conta</span>
                </div>
              </CardContent>
            </Card>

            {/* Cartões (Débito + Crédito) */}
            <Card className={styles.kpiCard}>
              <CardContent className={styles.kpiContent}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>Cartões (Débito + Crédito)</span>
                  <div className={`${styles.kpiIconWrapper} ${styles.cardIcon}`}>
                    <CreditCard size={20} />
                  </div>
                </div>
                <div className={styles.kpiValue}>
                  {formatCurrency(summary.debitInSales + summary.creditInSales)}
                </div>
                <div className={styles.kpiFooter}>
                  <span>Déb: {formatCurrency(summary.debitInSales)} • Créd: {formatCurrency(summary.creditInSales)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Abas de Movimentações & Vendas */}
          <Card className={styles.tabsCard}>
            <div className={styles.tabsHeader}>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'movimentacoes' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('movimentacoes')}
              >
                Movimentações de Caixa (Sangrias & Suprimentos) ({movements.length})
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'vendas' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('vendas')}
              >
                Vendas Realizadas Nesta Sessão ({sales.length})
              </button>
            </div>

            <CardContent className={styles.tabsContent}>
              {/* ABA 1: MOVIMENTAÇÕES */}
              {activeTab === 'movimentacoes' && (
                <div>
                  {movements.length === 0 ? (
                    <div className={styles.emptyTab}>
                      <CircleDollarSign size={38} />
                      <p>Nenhuma movimentação manual (sangria/suprimento) registrada neste caixa.</p>
                    </div>
                  ) : (
                    <table className={styles.tabTable}>
                      <thead>
                        <tr>
                          <th>Data/Hora</th>
                          <th>Tipo</th>
                          <th>Forma</th>
                          <th>Motivo / Descrição</th>
                          <th>Operador</th>
                          <th style={{ textAlign: 'right' }}>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movements.map((mov: any) => {
                          const isPositive = mov.type === 'SUPRIMENTO' || mov.type === 'ENTRADA' || mov.type === 'VENDA';
                          return (
                            <tr key={mov.id}>
                              <td>{formatDateTime(mov.createdAt)}</td>
                              <td>
                                <Badge
                                  variant={
                                    mov.type === 'SANGRIA' || mov.type === 'DESPESA'
                                      ? 'danger'
                                      : 'success'
                                  }
                                  size="sm"
                                >
                                  {mov.type}
                                </Badge>
                              </td>
                              <td>{mov.paymentMethod}</td>
                              <td>{mov.reason}</td>
                              <td>{mov.user?.name || 'Operador'}</td>
                              <td
                                style={{
                                  textAlign: 'right',
                                  fontWeight: 700,
                                  color: isPositive ? 'var(--success-solid, #10b981)' : 'var(--danger-solid, #ef4444)',
                                }}
                              >
                                {isPositive ? '+' : '-'} {formatCurrency(mov.amount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* ABA 2: VENDAS */}
              {activeTab === 'vendas' && (
                <div>
                  {sales.length === 0 ? (
                    <div className={styles.emptyTab}>
                      <Receipt size={38} />
                      <p>Nenhuma venda concluída nesta sessão de caixa.</p>
                    </div>
                  ) : (
                    <table className={styles.tabTable}>
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Horário</th>
                          <th>Cliente</th>
                          <th>Itens</th>
                          <th>Pagamentos</th>
                          <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map((sale: any) => (
                          <tr key={sale.id}>
                            <td><strong>{sale.code}</strong></td>
                            <td>{formatDateTime(sale.createdAt)}</td>
                            <td>{sale.customer ? sale.customer.name : 'Cliente Balcão'}</td>
                            <td>{sale.items?.reduce((a: number, b: any) => a + b.quantity, 0) || 0} peças</td>
                            <td>
                              <div className={styles.payListMini}>
                                {sale.payments?.map((p: any, i: number) => (
                                  <span key={i} className={styles.payTagMini}>
                                    {p.method.replace('_', ' ')}: {formatCurrency(p.amount)}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>
                              {formatCurrency(sale.totalAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* MODAL 1: ABERTURA DE CAIXA */}
      {isOpenModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Abertura de Caixa</h3>
                <p>Informe o fundo de troco inicial disponível na gaveta</p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsOpenModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOpenCash} className={styles.modalBody}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Fundo de Troco Inicial (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={styles.input}
                  value={openInitialBalance || ''}
                  onChange={(e) => setOpenInitialBalance(parseFloat(e.target.value) || 0)}
                  placeholder="Ex: 100,00"
                  autoFocus
                />
                <span className={styles.inputHint}>
                  Valor em dinheiro físico colocado na gaveta para troco.
                </span>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Observações de Abertura (Opcional)</label>
                <textarea
                  rows={2}
                  className={styles.textarea}
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  placeholder="Ex: Notas miúdas e moedas contadas no início do turno..."
                />
              </div>

              <div className={styles.modalFooter}>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsOpenModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmittingOpen}
                  leftIcon={<Unlock size={16} />}
                >
                  Confirmar Abertura
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SANGRIA (RETIRADA) */}
      {isSangriaModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Registrar Sangria (Retirada de Dinheiro)</h3>
                <p>Saldo em gaveta disponível: <strong>{formatCurrency(summary.currentDrawerCash)}</strong></p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsSangriaModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => handleMovement('SANGRIA', e)} className={styles.modalBody}>
              {movError && (
                <div className={styles.errorAlert}>
                  <AlertTriangle size={18} />
                  <span>{movError}</span>
                </div>
              )}

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Valor da Retirada (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={summary.currentDrawerCash}
                  className={styles.input}
                  value={movAmount || ''}
                  onChange={(e) => setMovAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  autoFocus
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Motivo da Sangria *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={movReason}
                  onChange={(e) => setMovReason(e.target.value)}
                  placeholder="Ex: Recolhimento para cofre, pagamento de despesa, etc."
                  required
                />
              </div>

              <div className={styles.modalFooter}>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsSangriaModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="md"
                  isLoading={isSubmittingMov}
                  leftIcon={<MinusCircle size={16} />}
                >
                  Confirmar Sangria
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SUPRIMENTO (APORTE) */}
      {isSuprimentoModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Registrar Suprimento (Aporte de Troco)</h3>
                <p>Adicione dinheiro extra para reforço de caixa</p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsSuprimentoModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => handleMovement('SUPRIMENTO', e)} className={styles.modalBody}>
              {movError && (
                <div className={styles.errorAlert}>
                  <AlertTriangle size={18} />
                  <span>{movError}</span>
                </div>
              )}

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Valor do Aporte (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className={styles.input}
                  value={movAmount || ''}
                  onChange={(e) => setMovAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  autoFocus
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Motivo do Suprimento *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={movReason}
                  onChange={(e) => setMovReason(e.target.value)}
                  placeholder="Ex: Aporte de moedas e notas miúdas para troco"
                  required
                />
              </div>

              <div className={styles.modalFooter}>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsSuprimentoModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmittingMov}
                  leftIcon={<PlusCircle size={16} />}
                >
                  Confirmar Suprimento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: FECHAMENTO DE CAIXA COM CONFERÊNCIA CEGA */}
      {isCloseModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCardLarge}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Fechamento de Caixa — Conferência Cega</h3>
                <p>Conte fisicamente os valores recebidos e informe abaixo para apuração de diferenças.</p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsCloseModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCloseCash} className={styles.modalBody}>
              {closeError && (
                <div className={styles.errorAlert}>
                  <AlertTriangle size={18} />
                  <span>{closeError}</span>
                </div>
              )}

              <div className={styles.blindGrid}>
                <div className={styles.blindField}>
                  <label className={styles.inputLabel}>
                    <Wallet size={16} /> Dinheiro Contado na Gaveta (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={styles.blindInput}
                    value={countedCash || ''}
                    onChange={(e) => setCountedCash(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    autoFocus
                  />
                  <small>Fundo inicial + vendas em dinheiro - sangrias</small>
                </div>

                <div className={styles.blindField}>
                  <label className={styles.inputLabel}>
                    <QrCode size={16} /> Total PIX Apurado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={styles.blindInput}
                    value={countedPix || ''}
                    onChange={(e) => setCountedPix(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                  />
                  <small>Conforme extrato da conta bancária / maquininha</small>
                </div>

                <div className={styles.blindField}>
                  <label className={styles.inputLabel}>
                    <CreditCard size={16} /> Cartão de Débito Contado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={styles.blindInput}
                    value={countedDebit || ''}
                    onChange={(e) => setCountedDebit(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                  />
                  <small>Conforme comprovantes / relatório POS Débito</small>
                </div>

                <div className={styles.blindField}>
                  <label className={styles.inputLabel}>
                    <CreditCard size={16} /> Cartão de Crédito Contado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={styles.blindInput}
                    value={countedCredit || ''}
                    onChange={(e) => setCountedCredit(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                  />
                  <small>Conforme comprovantes / relatório POS Crédito</small>
                </div>
              </div>

              <div className={styles.inputGroup} style={{ marginTop: '0.5rem' }}>
                <label className={styles.inputLabel}>Outros Meios (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={styles.input}
                  value={countedOther || ''}
                  onChange={(e) => setCountedOther(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Observações Finais do Fechamento</label>
                <textarea
                  rows={2}
                  className={styles.textarea}
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Observações do operador sobre o fechamento..."
                />
              </div>

              <div className={styles.modalFooter}>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsCloseModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="md"
                  isLoading={isSubmittingClose}
                  leftIcon={<Lock size={16} />}
                >
                  Apurar & Fechar Caixa
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: EXTRATO / RESULTADO DO FECHAMENTO */}
      {closingResult && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalCardLarge} ${styles.printableReceipt}`}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Extrato de Fechamento de Caixa</h3>
                <p>
                  Operador: <strong>{closingResult.operatorName}</strong> • Fechado em:{' '}
                  {formatDateTime(closingResult.closedAt)}
                </p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setClosingResult(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Alerta de Diferença */}
              <div
                className={`${styles.differenceBanner} ${
                  closingResult.differenceStatus === 'EXATO'
                    ? styles.diffExact
                    : closingResult.differenceStatus === 'SOBRA'
                    ? styles.diffSobra
                    : styles.diffFalta
                }`}
              >
                <div>
                  <h4>Status da Apuração: {closingResult.differenceStatus}</h4>
                  <p>
                    {closingResult.differenceStatus === 'EXATO'
                      ? 'Parabéns! O caixa bateu com 100% de exatidão.'
                      : closingResult.differenceStatus === 'SOBRA'
                      ? `Houve uma SOBRA de ${formatCurrency(closingResult.difference)} em relação ao esperado.`
                      : `Houve uma FALTA de ${formatCurrency(Math.abs(closingResult.difference))} em relação ao esperado.`}
                  </p>
                </div>
                <div className={styles.diffValueDisplay}>
                  {closingResult.difference >= 0 ? '+' : ''}
                  {formatCurrency(closingResult.difference)}
                </div>
              </div>

              {/* Tabela de Apuração Detalhada */}
              <h4 className={styles.reportSectionTitle}>Detalhamento por Forma de Pagamento</h4>
              <table className={styles.closingReportTable}>
                <thead>
                  <tr>
                    <th>Forma de Pagamento</th>
                    <th>Esperado pelo Sistema</th>
                    <th>Contado pelo Operador</th>
                    <th style={{ textAlign: 'right' }}>Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Dinheiro em Gaveta</strong></td>
                    <td>{formatCurrency(closingResult.breakdown.cash.expected)}</td>
                    <td>{formatCurrency(closingResult.breakdown.cash.counted)}</td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        color:
                          closingResult.breakdown.cash.difference === 0
                            ? 'var(--text-primary)'
                            : closingResult.breakdown.cash.difference > 0
                            ? 'var(--success-solid, #10b981)'
                            : 'var(--danger-solid, #ef4444)',
                      }}
                    >
                      {closingResult.breakdown.cash.difference >= 0 ? '+' : ''}
                      {formatCurrency(closingResult.breakdown.cash.difference)}
                    </td>
                  </tr>

                  <tr>
                    <td><strong>PIX</strong></td>
                    <td>{formatCurrency(closingResult.breakdown.pix.expected)}</td>
                    <td>{formatCurrency(closingResult.breakdown.pix.counted)}</td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        color:
                          closingResult.breakdown.pix.difference === 0
                            ? 'var(--text-primary)'
                            : closingResult.breakdown.pix.difference > 0
                            ? 'var(--success-solid, #10b981)'
                            : 'var(--danger-solid, #ef4444)',
                      }}
                    >
                      {closingResult.breakdown.pix.difference >= 0 ? '+' : ''}
                      {formatCurrency(closingResult.breakdown.pix.difference)}
                    </td>
                  </tr>

                  <tr>
                    <td><strong>Cartão de Débito</strong></td>
                    <td>{formatCurrency(closingResult.breakdown.debit.expected)}</td>
                    <td>{formatCurrency(closingResult.breakdown.debit.counted)}</td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        color:
                          closingResult.breakdown.debit.difference === 0
                            ? 'var(--text-primary)'
                            : closingResult.breakdown.debit.difference > 0
                            ? 'var(--success-solid, #10b981)'
                            : 'var(--danger-solid, #ef4444)',
                      }}
                    >
                      {closingResult.breakdown.debit.difference >= 0 ? '+' : ''}
                      {formatCurrency(closingResult.breakdown.debit.difference)}
                    </td>
                  </tr>

                  <tr>
                    <td><strong>Cartão de Crédito</strong></td>
                    <td>{formatCurrency(closingResult.breakdown.credit.expected)}</td>
                    <td>{formatCurrency(closingResult.breakdown.credit.counted)}</td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        color:
                          closingResult.breakdown.credit.difference === 0
                            ? 'var(--text-primary)'
                            : closingResult.breakdown.credit.difference > 0
                            ? 'var(--success-solid, #10b981)'
                            : 'var(--danger-solid, #ef4444)',
                      }}
                    >
                      {closingResult.breakdown.credit.difference >= 0 ? '+' : ''}
                      {formatCurrency(closingResult.breakdown.credit.difference)}
                    </td>
                  </tr>

                  <tr className={styles.closingTotalRow}>
                    <td><strong>TOTAL GERAL</strong></td>
                    <td><strong>{formatCurrency(closingResult.totalExpected)}</strong></td>
                    <td><strong>{formatCurrency(closingResult.totalCounted)}</strong></td>
                    <td style={{ textAlign: 'right' }}>
                      <strong>
                        {closingResult.difference >= 0 ? '+' : ''}
                        {formatCurrency(closingResult.difference)}
                      </strong>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Informações Complementares */}
              <div className={styles.closingMetaSummary}>
                <div>
                  <small>Fundo de Abertura:</small>
                  <strong>{formatCurrency(closingResult.initialBalance)}</strong>
                </div>
                <div>
                  <small>Vendas Concluídas:</small>
                  <strong>{closingResult.totalSalesCount} cupons ({formatCurrency(closingResult.totalSalesAmount)})</strong>
                </div>
                <div>
                  <small>Suprimentos:</small>
                  <strong>+ {formatCurrency(closingResult.totalSuprimentos)}</strong>
                </div>
                <div>
                  <small>Sangrias:</small>
                  <strong>- {formatCurrency(closingResult.totalSangrias)}</strong>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <Button
                type="button"
                variant="outline"
                size="md"
                leftIcon={<Printer size={16} />}
                onClick={handlePrintClosing}
              >
                Imprimir Extrato
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setClosingResult(null)}
              >
                Concluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

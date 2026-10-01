'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  BarChart3,
  Receipt,
  CreditCard,
  Wallet,
  Clock,
  Layers,
  FileText,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import styles from './fluxo.module.css';

export default function FluxoCaixaPage() {
  const [period, setPeriod] = useState<'hoje' | 'semana' | 'mes' | 'ano' | 'custom'>('mes');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCashFlow = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('period', period);
      if (period === 'custom' && startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }

      const res = await fetch(`/api/finance/cash-flow?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Erro ao carregar fluxo de caixa:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCashFlow();
  }, [period]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCashFlow();
  };

  const handlePrint = () => {
    window.print();
  };

  const summary = data?.summary || {
    totalEntradas: 0,
    totalSaidas: 0,
    saldoLiquido: 0,
    totalSalesAmount: 0,
    salesCount: 0,
    totalSettledReceivables: 0,
    totalSettledPayables: 0,
    totalSuprimentos: 0,
    totalSangrias: 0,
    projected: {
      pendingReceivables: 0,
      pendingPayables: 0,
      projectedBalance: 0,
    },
  };

  const dreBreakdown = data?.dreBreakdown || [];
  const dailyTimeline = data?.dailyTimeline || [];

  // Separa receitas e despesas para a DRE
  const receitasList = dreBreakdown.filter((item: any) => item.type === 'RECEITA');
  const despesasList = dreBreakdown.filter((item: any) => item.type === 'DESPESA');

  const totalReceitas = receitasList.reduce((sum: number, it: any) => sum + it.total, 0) || 1;
  const totalDespesas = despesasList.reduce((sum: number, it: any) => sum + it.total, 0) || 1;

  return (
    <div className={`${styles.container} ${styles.printableArea}`}>
      {/* Cabeçalho */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Demonstrativo de Fluxo de Caixa & DRE</h1>
          <p className={styles.pageSubtitle}>
            Visão gerencial consolidada de entradas, saídas, resultado operacional e projeções financeiras.
          </p>
        </div>

        <div className={styles.headerButtons}>
          <Button
            type="button"
            variant="outline"
            size="md"
            leftIcon={<Printer size={16} />}
            onClick={handlePrint}
          >
            Imprimir Relatório
          </Button>
        </div>
      </div>

      {/* Barra de Períodos */}
      <Card className={styles.periodCard}>
        <CardContent className={styles.periodContent}>
          <div className={styles.periodButtons}>
            <button
              type="button"
              className={`${styles.periodBtn} ${period === 'hoje' ? styles.activePeriod : ''}`}
              onClick={() => setPeriod('hoje')}
            >
              Hoje
            </button>
            <button
              type="button"
              className={`${styles.periodBtn} ${period === 'semana' ? styles.activePeriod : ''}`}
              onClick={() => setPeriod('semana')}
            >
              Esta Semana
            </button>
            <button
              type="button"
              className={`${styles.periodBtn} ${period === 'mes' ? styles.activePeriod : ''}`}
              onClick={() => setPeriod('mes')}
            >
              Este Mês
            </button>
            <button
              type="button"
              className={`${styles.periodBtn} ${period === 'ano' ? styles.activePeriod : ''}`}
              onClick={() => setPeriod('ano')}
            >
              Este Ano
            </button>
            <button
              type="button"
              className={`${styles.periodBtn} ${period === 'custom' ? styles.activePeriod : ''}`}
              onClick={() => setPeriod('custom')}
            >
              Personalizado
            </button>
          </div>

          {period === 'custom' && (
            <form onSubmit={handleCustomSubmit} className={styles.customDateForm}>
              <input
                type="date"
                className={styles.dateInput}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              <span>até</span>
              <input
                type="date"
                className={styles.dateInput}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
              <Button type="submit" variant="secondary" size="sm" leftIcon={<Filter size={14} />}>
                Aplicar
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Grid de Indicadores Principais */}
      <div className={styles.kpiGrid}>
        {/* Total Entradas */}
        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Total de Entradas (Receitas)</span>
              <div className={`${styles.kpiIconWrapper} ${styles.successIcon}`}>
                <ArrowUpRight size={20} />
              </div>
            </div>
            <div className={styles.kpiValue} style={{ color: '#10b981' }}>
              + {formatCurrency(summary.totalEntradas)}
            </div>
            <div className={styles.kpiFooter}>
              <span>Vendas PDV ({formatCurrency(summary.totalSalesAmount)}) + Recebíveis ({formatCurrency(summary.totalSettledReceivables)})</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Saídas */}
        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Total de Saídas (Despesas)</span>
              <div className={`${styles.kpiIconWrapper} ${styles.dangerIcon}`}>
                <ArrowDownRight size={20} />
              </div>
            </div>
            <div className={styles.kpiValue} style={{ color: '#ef4444' }}>
              - {formatCurrency(summary.totalSaidas)}
            </div>
            <div className={styles.kpiFooter}>
              <span>Contas pagas ({formatCurrency(summary.totalSettledPayables)}) + Sangrias ({formatCurrency(summary.totalSangrias)})</span>
            </div>
          </CardContent>
        </Card>

        {/* Saldo Líquido Operacional */}
        <Card className={`${styles.kpiCard} ${styles.highlightCard}`}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Resultado Líquido do Período</span>
              <div
                className={`${styles.kpiIconWrapper} ${
                  summary.saldoLiquido >= 0 ? styles.successIcon : styles.dangerIcon
                }`}
              >
                <DollarSign size={20} />
              </div>
            </div>
            <div
              className={styles.kpiValueHighlight}
              style={{ color: summary.saldoLiquido >= 0 ? '#10b981' : '#ef4444' }}
            >
              {summary.saldoLiquido >= 0 ? '+' : ''}
              {formatCurrency(summary.saldoLiquido)}
            </div>
            <div className={styles.kpiFooter}>
              <span>{summary.saldoLiquido >= 0 ? 'Lucro líquido de caixa' : 'Déficit no período'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Projeção Futura */}
        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Projeção de Títulos Pendentes</span>
              <div className={`${styles.kpiIconWrapper} ${styles.infoIcon}`}>
                <Clock size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>
              {summary.projected.projectedBalance >= 0 ? '+' : ''}
              {formatCurrency(summary.projected.projectedBalance)}
            </div>
            <div className={styles.kpiFooter}>
              <span>A Receber: {formatCurrency(summary.projected.pendingReceivables)} • A Pagar: {formatCurrency(summary.projected.pendingPayables)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid de 2 Colunas: DRE e Resumo das Operações */}
      <div className={styles.twoColumnGrid}>
        {/* COLUNA 1: DRE SIMPLIFICADO POR CATEGORIA */}
        <Card>
          <CardHeader>
            <CardTitle>Demonstrativo por Categoria (DRE)</CardTitle>
            <CardDescription>Distribuição de receitas e despesas por grupo financeiro</CardDescription>
          </CardHeader>
          <CardContent className={styles.dreContent}>
            <div className={styles.dreSection}>
              <h4 className={styles.dreSectionHeader} style={{ color: '#10b981' }}>
                <ArrowUpRight size={16} /> Receitas Operacionais (+ {formatCurrency(summary.totalEntradas)})
              </h4>
              {receitasList.map((rec: any, idx: number) => {
                const pct = Math.min(100, Math.round((rec.total / totalReceitas) * 100));
                return (
                  <div key={idx} className={styles.dreItem}>
                    <div className={styles.dreItemTop}>
                      <span>{rec.name}</span>
                      <strong>{formatCurrency(rec.total)} ({pct}%)</strong>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFillGreen}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.dreSection} style={{ marginTop: '1.5rem' }}>
              <h4 className={styles.dreSectionHeader} style={{ color: '#ef4444' }}>
                <ArrowDownRight size={16} /> Despesas & Custos (- {formatCurrency(summary.totalSaidas)})
              </h4>
              {despesasList.map((desp: any, idx: number) => {
                const pct = Math.min(100, Math.round((desp.total / totalDespesas) * 100));
                return (
                  <div key={idx} className={styles.dreItem}>
                    <div className={styles.dreItemTop}>
                      <span>{desp.name}</span>
                      <strong>{formatCurrency(desp.total)} ({pct}%)</strong>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFillRed}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* COLUNA 2: RESUMO OPERACIONAL & LINKS RÁPIDOS */}
        <div className={styles.rightStatsColumn}>
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento de Movimentação</CardTitle>
            </CardHeader>
            <CardContent className={styles.breakdownList}>
              <div className={styles.breakdownRow}>
                <div className={styles.rowLabelGroup}>
                  <Receipt size={16} style={{ color: '#4f46e5' }} />
                  <span>Vendas Balcão / PDV</span>
                </div>
                <strong>{formatCurrency(summary.totalSalesAmount)}</strong>
              </div>

              <div className={styles.breakdownRow}>
                <div className={styles.rowLabelGroup}>
                  <TrendingUp size={16} style={{ color: '#10b981' }} />
                  <span>Contas a Receber Baixadas</span>
                </div>
                <strong>{formatCurrency(summary.totalSettledReceivables)}</strong>
              </div>

              <div className={styles.breakdownRow}>
                <div className={styles.rowLabelGroup}>
                  <TrendingDown size={16} style={{ color: '#ef4444' }} />
                  <span>Contas a Pagar Pagas</span>
                </div>
                <strong>- {formatCurrency(summary.totalSettledPayables)}</strong>
              </div>

              <div className={styles.breakdownRow}>
                <div className={styles.rowLabelGroup}>
                  <Wallet size={16} style={{ color: '#f59e0b' }} />
                  <span>Sangrias de Caixa</span>
                </div>
                <strong>- {formatCurrency(summary.totalSangrias)}</strong>
              </div>

              <div className={styles.breakdownRow}>
                <div className={styles.rowLabelGroup}>
                  <DollarSign size={16} style={{ color: '#0ea5e9' }} />
                  <span>Suprimentos de Caixa</span>
                </div>
                <strong>+ {formatCurrency(summary.totalSuprimentos)}</strong>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acessos Rápidos Financeiros</CardTitle>
            </CardHeader>
            <CardContent className={styles.quickLinks}>
              <Link href="/financeiro/contas-pagar" className={styles.quickLinkItem}>
                <CreditCard size={18} />
                <div>
                  <strong>Contas a Pagar</strong>
                  <small>Ver {summary.pendingCount || 0} títulos pendentes</small>
                </div>
              </Link>

              <Link href="/financeiro/contas-receber" className={styles.quickLinkItem}>
                <DollarSign size={18} />
                <div>
                  <strong>Contas a Receber</strong>
                  <small>Acompanhar crediários e recebíveis</small>
                </div>
              </Link>

              <Link href="/caixa" className={styles.quickLinkItem}>
                <Wallet size={18} />
                <div>
                  <strong>Controle de Caixa</strong>
                  <small>Operações diárias da loja física</small>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* TABELA DE EXTRATO / TIMELINE DIÁRIA */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Diária do Fluxo de Caixa</CardTitle>
          <CardDescription>Extrato cronológico de receitas, despesas e saldo líquido diário</CardDescription>
        </CardHeader>
        <CardContent className={styles.tableCardContent}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <RefreshCw size={24} className="animate-spin" />
              <span>Calculando fluxo de caixa...</span>
            </div>
          ) : dailyTimeline.length === 0 ? (
            <div className={styles.emptyState}>
              <Calendar size={38} />
              <p>Nenhuma movimentação financeira registrada neste intervalo de datas.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Entradas (+)</th>
                    <th>Saídas (-)</th>
                    <th style={{ textAlign: 'right' }}>Resultado do Dia</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyTimeline.map((item: any) => {
                    const isPositive = item.saldo >= 0;
                    return (
                      <tr key={item.date}>
                        <td>
                          <strong>{new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>
                        </td>
                        <td style={{ color: '#10b981' }}>
                          + {formatCurrency(item.entradas)}
                        </td>
                        <td style={{ color: '#ef4444' }}>
                          - {formatCurrency(item.saidas)}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 700,
                            color: isPositive ? '#10b981' : '#ef4444',
                          }}
                        >
                          {isPositive ? '+' : ''}
                          {formatCurrency(item.saldo)}
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
    </div>
  );
}

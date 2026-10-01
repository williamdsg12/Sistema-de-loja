'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Package,
  Boxes,
  AlertTriangle,
  Globe,
  Wallet,
  Receipt,
  PlusCircle,
  ArrowUpRight,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const [period, setPeriod] = useState('hoje');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async (selectedPeriod: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/stats?period=${selectedPeriod}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(period);
  }, [period]);

  const stats = data?.stats || {
    totalRevenue: 0,
    totalSalesCount: 0,
    averageTicket: 0,
    totalItemsSold: 0,
    grossProfit: 0,
    cashBalance: 0,
    onlineOrdersPending: 0,
    lowStockCount: 0,
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* Header com Filtros de Período e Ações */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Visão Geral da Loja</h1>
          <p className={styles.pageSubtitle}>
            Acompanhe as métricas de vendas, faturamento, caixa e estoque em tempo real.
          </p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.filterGroup}>
            <Filter size={16} className={styles.filterIcon} />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className={styles.periodSelect}
            >
              <option value="hoje">Hoje</option>
              <option value="ontem">Ontem</option>
              <option value="7dias">Últimos 7 dias</option>
              <option value="30dias">Últimos 30 dias</option>
              <option value="mes_atual">Este Mês</option>
              <option value="mes_anterior">Mês Anterior</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchStats(period)}
            isLoading={isLoading}
            leftIcon={<RefreshCw size={14} />}
          >
            Atualizar
          </Button>
        </div>
      </div>

      {/* Grid de Cards de Indicadores Principais */}
      <div className={styles.kpiGrid}>
        {/* Faturamento */}
        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Faturamento Bruto</span>
              <div className={`${styles.kpiIconWrapper} ${styles.primaryIcon}`}>
                <DollarSign size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{formatCurrency(stats.totalRevenue)}</div>
            <div className={styles.kpiFooter}>
              <span className={styles.kpiSubtext}>No período selecionado</span>
            </div>
          </CardContent>
        </Card>

        {/* Total de Vendas */}
        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Vendas Concluídas</span>
              <div className={`${styles.kpiIconWrapper} ${styles.successIcon}`}>
                <ShoppingBag size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{stats.totalSalesCount}</div>
            <div className={styles.kpiFooter}>
              <span className={styles.kpiSubtext}>{stats.totalItemsSold} peças vendidas</span>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Médio */}
        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Ticket Médio</span>
              <div className={`${styles.kpiIconWrapper} ${styles.infoIcon}`}>
                <TrendingUp size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{formatCurrency(stats.averageTicket)}</div>
            <div className={styles.kpiFooter}>
              <span className={styles.kpiSubtext}>Média por venda</span>
            </div>
          </CardContent>
        </Card>

        {/* Lucro Bruto */}
        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Lucro Bruto Estimado</span>
              <div className={`${styles.kpiIconWrapper} ${styles.primaryIcon}`}>
                <Wallet size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{formatCurrency(stats.grossProfit)}</div>
            <div className={styles.kpiFooter}>
              <span className={styles.kpiSubtext}>Receita (-) Custo das peças</span>
            </div>
          </CardContent>
        </Card>

        {/* Saldo de Caixa */}
        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Saldo em Caixa</span>
              <div className={`${styles.kpiIconWrapper} ${styles.infoIcon}`}>
                <Receipt size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{formatCurrency(stats.cashBalance)}</div>
            <div className={styles.kpiFooter}>
              <span className={styles.kpiSubtext}>Caixa do dia atual</span>
            </div>
          </CardContent>
        </Card>

        {/* Pedidos Online Pendentes */}
        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Pedidos E-commerce</span>
              <div className={`${styles.kpiIconWrapper} ${styles.warningIcon}`}>
                <Globe size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{stats.onlineOrdersPending}</div>
            <div className={styles.kpiFooter}>
              <span className={styles.kpiSubtext}>Aguardando envio / separação</span>
            </div>
          </CardContent>
        </Card>

        {/* Alerta de Estoque Baixo */}
        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Alerta Estoque Baixo</span>
              <div className={`${styles.kpiIconWrapper} ${styles.dangerIcon}`}>
                <AlertTriangle size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{stats.lowStockCount}</div>
            <div className={styles.kpiFooter}>
              <span className={styles.kpiSubtext}>Variações abaixo do mínimo</span>
            </div>
          </CardContent>
        </Card>

        {/* Ação Rápida PDV */}
        <Card className={`${styles.kpiCard} ${styles.pdvHighlightCard}`}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabelHighlight}>Frente de Caixa</span>
              <Receipt size={20} />
            </div>
            <div className={styles.pdvQuickTitle}>Iniciar Venda Rápida</div>
            <Link href="/pdv" className={styles.pdvActionLink}>
              <span>Ir para o PDV</span>
              <ArrowUpRight size={16} />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Seção Inferior: Ações Rápidas e Últimas Movimentações */}
      <div className={styles.bottomGrid}>
        {/* Atalhos Rápidos */}
        <Card>
          <CardHeader>
            <CardTitle>Operações Frequentes</CardTitle>
          </CardHeader>
          <CardContent className={styles.quickActionsList}>
            <Link href="/pdv" className={styles.quickActionItem}>
              <div className={styles.quickActionIcon}>
                <Receipt size={18} />
              </div>
              <div className={styles.quickActionInfo}>
                <strong>Nova Venda (PDV)</strong>
                <span>Registrar venda balcão com leitor ou busca</span>
              </div>
            </Link>

            <Link href="/produtos" className={styles.quickActionItem}>
              <div className={styles.quickActionIcon}>
                <PlusCircle size={18} />
              </div>
              <div className={styles.quickActionInfo}>
                <strong>Cadastrar Produto</strong>
                <span>Novo item com grade de cores e tamanhos</span>
              </div>
            </Link>

            <Link href="/estoque/movimentacoes" className={styles.quickActionItem}>
              <div className={styles.quickActionIcon}>
                <Boxes size={18} />
              </div>
              <div className={styles.quickActionInfo}>
                <strong>Entrada de Estoque</strong>
                <span>Dar entrada de peças ou registrar ajustes</span>
              </div>
            </Link>

            <Link href="/caixa" className={styles.quickActionItem}>
              <div className={styles.quickActionIcon}>
                <DollarSign size={18} />
              </div>
              <div className={styles.quickActionInfo}>
                <strong>Sangria / Fechamento de Caixa</strong>
                <span>Conferência de valores e fluxo diário</span>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Últimas Vendas */}
        <Card>
          <CardHeader>
            <CardTitle>Últimas Vendas Realizadas</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentSales && data.recentSales.length > 0 ? (
              <div className={styles.salesTableWrapper}>
                <table className={styles.salesTable}>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Cliente</th>
                      <th>Operador</th>
                      <th>Total</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentSales.map((sale: any) => (
                      <tr key={sale.id}>
                        <td>
                          <strong>{sale.code}</strong>
                        </td>
                        <td>{sale.customer?.name || 'Cliente Balcão'}</td>
                        <td>{sale.user?.name}</td>
                        <td className={styles.saleAmount}>{formatCurrency(sale.totalAmount)}</td>
                        <td>{formatDateTime(sale.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptySales}>
                <ShoppingBag size={32} className={styles.emptyIcon} />
                <p>Nenhuma venda registrada ainda.</p>
                <Link href="/pdv">
                  <Button size="sm" variant="outline" className={styles.startSaleBtn}>
                    Realizar Primeira Venda
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

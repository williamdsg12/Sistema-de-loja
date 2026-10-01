'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Award,
  AlertTriangle,
  Clock,
  Printer,
  Calendar,
  Layers,
  ShoppingBag,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import styles from './relatorios.module.css';

export default function RelatoriosPage() {
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<'abc' | 'sellers' | 'brands' | 'stock'>('abc');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('period', period);
      if (period === 'custom' && startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }

      const res = await fetch(`/api/reports/analytics?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (e) {
      console.error('Erro ao carregar relatórios:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const handleCustomFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate && endDate) {
      setPeriod('custom');
      fetchAnalytics();
    }
  };

  const kpis = data?.kpis || {
    grossRevenue: 0,
    discounts: 0,
    netRevenue: 0,
    cmv: 0,
    grossProfit: 0,
    profitMargin: 0,
    totalTransactions: 0,
    totalPieces: 0,
    averageTicket: 0,
    itemsPerSale: 0,
  };

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>Relatórios Gerenciais & Inteligência Comercial</h1>
          <p>Análise de rentabilidade, curva ABC de produtos, ranking de vendedores e giro de estoque</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => window.print()}
          >
            <Printer size={16} />
            <span>Imprimir / Salvar PDF</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={fetchAnalytics}
          >
            <RefreshCw size={16} />
            <span>Atualizar Dados</span>
          </Button>
        </div>
      </div>

      {/* SELETOR DE PERÍODO */}
      <div className={styles.periodCard}>
        <div className={styles.periodButtons}>
          <button
            type="button"
            className={`${styles.periodBtn} ${period === 'today' ? styles.periodBtnActive : ''}`}
            onClick={() => setPeriod('today')}
          >
            Hoje
          </button>
          <button
            type="button"
            className={`${styles.periodBtn} ${period === '7days' ? styles.periodBtnActive : ''}`}
            onClick={() => setPeriod('7days')}
          >
            Últimos 7 dias
          </button>
          <button
            type="button"
            className={`${styles.periodBtn} ${period === 'month' ? styles.periodBtnActive : ''}`}
            onClick={() => setPeriod('month')}
          >
            Este Mês
          </button>
          <button
            type="button"
            className={`${styles.periodBtn} ${period === 'lastMonth' ? styles.periodBtnActive : ''}`}
            onClick={() => setPeriod('lastMonth')}
          >
            Mês Anterior
          </button>
          <button
            type="button"
            className={`${styles.periodBtn} ${period === 'year' ? styles.periodBtnActive : ''}`}
            onClick={() => setPeriod('year')}
          >
            Este Ano
          </button>
        </div>

        <form onSubmit={handleCustomFilterSubmit} className={styles.customDateInputs}>
          <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
          <input
            type="date"
            className={styles.dateInput}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>até</span>
          <input
            type="date"
            className={styles.dateInput}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <Button type="submit" variant="outline" size="sm">
            Filtrar
          </Button>
        </form>
      </div>

      {/* KPIS EXECUTIVOS */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#ecfdf5', color: '#059669' }}>
            <DollarSign size={24} />
          </div>
          <div className={styles.kpiDetails}>
            <span className={styles.kpiLabel}>Faturamento Líquido</span>
            <span className={styles.kpiValue}>{formatCurrency(kpis.netRevenue)}</span>
            <span className={styles.kpiSub}>
              Bruto: {formatCurrency(kpis.grossRevenue)} (Desc: -{formatCurrency(kpis.discounts)})
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#eff6ff', color: '#2563eb' }}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.kpiDetails}>
            <span className={styles.kpiLabel}>Lucro Bruto Real</span>
            <span className={styles.kpiValue}>{formatCurrency(kpis.grossProfit)}</span>
            <span className={styles.kpiSub} style={{ color: '#059669', fontWeight: 600 }}>
              Margem Bruta: {kpis.profitMargin.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#fef3c7', color: '#d97706' }}>
            <Package size={24} />
          </div>
          <div className={styles.kpiDetails}>
            <span className={styles.kpiLabel}>Custo Mercadorias (CMV)</span>
            <span className={styles.kpiValue}>{formatCurrency(kpis.cmv)}</span>
            <span className={styles.kpiSub}>Custo real dos itens vendidos</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#f3e8ff', color: '#9333ea' }}>
            <ShoppingBag size={24} />
          </div>
          <div className={styles.kpiDetails}>
            <span className={styles.kpiLabel}>Ticket Médio</span>
            <span className={styles.kpiValue}>{formatCurrency(kpis.averageTicket)}</span>
            <span className={styles.kpiSub}>
              {kpis.totalTransactions} vendas concluídas
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#fff1f2', color: '#e11d48' }}>
            <Sparkles size={24} />
          </div>
          <div className={styles.kpiDetails}>
            <span className={styles.kpiLabel}>Peças por Venda (PA)</span>
            <span className={styles.kpiValue}>{kpis.itemsPerSale.toFixed(1)} un</span>
            <span className={styles.kpiSub}>
              Total de {kpis.totalPieces} peças vendidas
            </span>
          </div>
        </div>
      </div>

      {/* ABAS DO RELATÓRIO */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'abc' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('abc')}
        >
          <Layers size={18} />
          <span>Curva ABC de Produtos</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'sellers' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('sellers')}
        >
          <Users size={18} />
          <span>Ranking de Vendedores</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'brands' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('brands')}
        >
          <Award size={18} />
          <span>Marcas, Categorias & Moda Infantil</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'stock' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          <AlertTriangle size={18} />
          <span>Giro de Estoque & Ruptura</span>
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div className={styles.tabContent}>
        {/* ABA 1: CURVA ABC DE PRODUTOS */}
        {activeTab === 'abc' && (
          <>
            <div className={styles.abcCards}>
              <div className={`${styles.abcClassCard} ${styles.cardClassA}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong>Classe A (Produtos Estrela)</strong>
                  <span className={styles.abcBadgeA}>CLASSE A</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                  {data?.curvaABCSummary?.countClassA || 0} produto(s)
                </div>
                <p style={{ margin: 0, fontSize: '0.8125rem' }}>
                  Representam até <strong>70%</strong> do faturamento da boutique infantil. Devem sempre
                  ter estoque prioritário.
                </p>
              </div>

              <div className={`${styles.abcClassCard} ${styles.cardClassB}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong>Classe B (Intermediários)</strong>
                  <span className={styles.abcBadgeB}>CLASSE B</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                  {data?.curvaABCSummary?.countClassB || 0} produto(s)
                </div>
                <p style={{ margin: 0, fontSize: '0.8125rem' }}>
                  Representam os próximos <strong>20%</strong> do faturamento (acumulado até 90%).
                </p>
              </div>

              <div className={`${styles.abcClassCard} ${styles.cardClassC}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong>Classe C (Cauda Longa)</strong>
                  <span className={styles.abcBadgeC}>CLASSE C</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                  {data?.curvaABCSummary?.countClassC || 0} produto(s)
                </div>
                <p style={{ margin: 0, fontSize: '0.8125rem' }}>
                  Representam os <strong>10%</strong> finais do faturamento. Avaliar giro e reposição moderada.
                </p>
              </div>
            </div>

            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3>Classificação de Pareto (Curva ABC Completa)</h3>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Total de {data?.curvaABC?.length || 0} produtos comercializados
                </span>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Curva</th>
                      <th>Produto / SKU</th>
                      <th>Categoria / Marca</th>
                      <th>Qtd Vendida</th>
                      <th>Receita Total</th>
                      <th>Custo (CMV)</th>
                      <th>Lucro Bruto</th>
                      <th>Margem %</th>
                      <th>% Acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '3rem' }}>
                          Calculando curva ABC de produtos...
                        </td>
                      </tr>
                    ) : !data?.curvaABC || data.curvaABC.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                          Nenhuma venda registrada no período selecionado para gerar a Curva ABC.
                        </td>
                      </tr>
                    ) : (
                      data.curvaABC.map((item: any) => (
                        <tr key={item.productId}>
                          <td>
                            <span
                              className={
                                item.classification === 'A'
                                  ? styles.abcBadgeA
                                  : item.classification === 'B'
                                  ? styles.abcBadgeB
                                  : styles.abcBadgeC
                              }
                            >
                              {item.classification}
                            </span>
                          </td>
                          <td>
                            <strong>{item.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              SKU: {item.sku}
                            </div>
                          </td>
                          <td>
                            <span>{item.category}</span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {item.brand}
                            </div>
                          </td>
                          <td>
                            <strong>{item.qtySold} un</strong>
                          </td>
                          <td>
                            <strong style={{ color: 'var(--text-primary)' }}>
                              {formatCurrency(item.revenue)}
                            </strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              ({item.share.toFixed(1)}% do total)
                            </div>
                          </td>
                          <td>{formatCurrency(item.cost)}</td>
                          <td style={{ color: '#059669', fontWeight: 600 }}>
                            {formatCurrency(item.profit)}
                          </td>
                          <td>
                            <Badge variant={item.margin >= 40 ? 'success' : item.margin >= 20 ? 'info' : 'warning'}>
                              {item.margin.toFixed(1)}%
                            </Badge>
                          </td>
                          <td>
                            <strong>{item.cumulativePercent.toFixed(1)}%</strong>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ABA 2: RANKING DE VENDEDORES */}
        {activeTab === 'sellers' && (
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h3>Desempenho da Equipe Comercial</h3>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Posição</th>
                    <th>Vendedor / Operador</th>
                    <th>Vendas Realizadas</th>
                    <th>Peças Vendidas</th>
                    <th>Total Faturado</th>
                    <th>Ticket Médio</th>
                    <th>Comissão Estimada (2.5%)</th>
                  </tr>
                </thead>
                <tbody>
                  {!data?.sellersRanking || data.sellersRanking.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        Nenhuma venda registrada por vendedores no período.
                      </td>
                    </tr>
                  ) : (
                    data.sellersRanking.map((s: any, idx: number) => (
                      <tr key={s.userId}>
                        <td>
                          <strong>#{idx + 1}</strong>
                        </td>
                        <td>
                          <strong>{s.name}</strong>
                        </td>
                        <td>{s.salesCount} vendas</td>
                        <td>{s.itemsSold} peças</td>
                        <td>
                          <strong style={{ fontSize: '1rem', color: 'var(--primary)' }}>
                            {formatCurrency(s.revenue)}
                          </strong>
                        </td>
                        <td>{formatCurrency(s.averageTicket)}</td>
                        <td style={{ color: '#059669', fontWeight: 700 }}>
                          {formatCurrency(s.revenue * 0.025)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 3: MARCAS, CATEGORIAS & MODA INFANTIL */}
        {activeTab === 'brands' && (
          <div className={styles.twoColGrid}>
            {/* MARCAS */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3>Ranking por Marca</h3>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Marca</th>
                      <th>Peças</th>
                      <th>Receita</th>
                      <th>Participação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data?.brandsRanking || data.brandsRanking.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                          Sem dados de marcas.
                        </td>
                      </tr>
                    ) : (
                      data.brandsRanking.map((b: any) => (
                        <tr key={b.name}>
                          <td>
                            <strong>{b.name}</strong>
                          </td>
                          <td>{b.qty} un</td>
                          <td>{formatCurrency(b.revenue)}</td>
                          <td>
                            <div style={{ width: '120px' }}>
                              <span>{b.share.toFixed(1)}%</span>
                              <div className={styles.progressBarContainer}>
                                <div
                                  className={styles.progressBarFill}
                                  style={{ width: `${Math.min(100, b.share)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CATEGORIAS */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3>Ranking por Categoria</h3>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Peças</th>
                      <th>Receita</th>
                      <th>Participação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data?.categoriesRanking || data.categoriesRanking.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                          Sem dados de categorias.
                        </td>
                      </tr>
                    ) : (
                      data.categoriesRanking.map((c: any) => (
                        <tr key={c.name}>
                          <td>
                            <strong>{c.name}</strong>
                          </td>
                          <td>{c.qty} un</td>
                          <td>{formatCurrency(c.revenue)}</td>
                          <td>
                            <div style={{ width: '120px' }}>
                              <span>{c.share.toFixed(1)}%</span>
                              <div className={styles.progressBarContainer}>
                                <div
                                  className={styles.progressBarFill}
                                  style={{ width: `${Math.min(100, c.share)}%`, background: '#8b5cf6' }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FAIXA ETÁRIA */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3>Vendas por Faixa Etária Infantil</h3>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Faixa Etária</th>
                      <th>Peças</th>
                      <th>Receita</th>
                      <th>Participação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data?.ageGroupsRanking || data.ageGroupsRanking.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                          Sem dados.
                        </td>
                      </tr>
                    ) : (
                      data.ageGroupsRanking.map((a: any) => (
                        <tr key={a.name}>
                          <td>
                            <strong>
                              {a.name === 'BEBE'
                                ? 'Bebê (0 a 2 anos)'
                                : a.name === 'PRIMEIROS_PASSOS'
                                ? 'Primeiros Passos (2 a 4 anos)'
                                : a.name === 'INFANTIL'
                                ? 'Infantil (4 a 12 anos)'
                                : a.name === 'JUVENIL_TEEN'
                                ? 'Juvenil / Teen (12 a 18 anos)'
                                : a.name}
                            </strong>
                          </td>
                          <td>{a.qty} un</td>
                          <td>{formatCurrency(a.revenue)}</td>
                          <td>{a.share.toFixed(1)}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* GÊNERO */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3>Vendas por Gênero</h3>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Segmento</th>
                      <th>Peças</th>
                      <th>Receita</th>
                      <th>Participação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data?.gendersRanking || data.gendersRanking.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                          Sem dados.
                        </td>
                      </tr>
                    ) : (
                      data.gendersRanking.map((g: any) => (
                        <tr key={g.name}>
                          <td>
                            <strong>
                              {g.name === 'INFANTIL_MENINA'
                                ? 'Infantil Menina'
                                : g.name === 'INFANTIL_MENINO'
                                ? 'Infantil Menino'
                                : g.name === 'TEEN_FEM'
                                ? 'Teen Feminino'
                                : g.name === 'TEEN_MASC'
                                ? 'Teen Masculino'
                                : 'Unissex'}
                            </strong>
                          </td>
                          <td>{g.qty} un</td>
                          <td>{formatCurrency(g.revenue)}</td>
                          <td>{g.share.toFixed(1)}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: GIRO DE ESTOQUE & RUPTURA */}
        {activeTab === 'stock' && (
          <div className={styles.twoColGrid}>
            {/* ALERTA DE RUPTURA / REPOSIÇÃO */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <div>
                  <h3 style={{ color: '#dc2626' }}>Alerta de Ruptura (Reposição Urgente)</h3>
                  <small style={{ color: 'var(--text-secondary)' }}>
                    Peças com estoque abaixo do mínimo configurado
                  </small>
                </div>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Tam / Cor</th>
                      <th>Estoque</th>
                      <th>Mínimo</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data?.lowStockRisk || data.lowStockRisk.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#059669' }}>
                          ✓ Nenhum produto em situação crítica de estoque.
                        </td>
                      </tr>
                    ) : (
                      data.lowStockRisk.map((item: any) => (
                        <tr key={item.variantId}>
                          <td>
                            <strong>{item.productName}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              SKU: {item.sku}
                            </div>
                          </td>
                          <td>
                            {item.size} • {item.color}
                          </td>
                          <td>
                            <strong style={{ color: item.quantity === 0 ? '#dc2626' : '#d97706' }}>
                              {item.quantity} un
                            </strong>
                          </td>
                          <td>{item.minStock} un</td>
                          <td>
                            <Badge variant={item.quantity === 0 ? 'danger' : 'warning'}>
                              {item.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ESTOQUE PARADO / RISCO DE ENCALHE */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <div>
                  <h3 style={{ color: '#d97706' }}>Estoque Sem Giro (Capital Parado)</h3>
                  <small style={{ color: 'var(--text-secondary)' }}>
                    Peças com estoque positivo e 0 vendas no período
                  </small>
                </div>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Tam / Cor</th>
                      <th>Estoque</th>
                      <th>Capital Parado (Custo)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data?.stagnantStock || data.stagnantStock.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#059669' }}>
                          ✓ Todo o estoque apresentou movimentação no período.
                        </td>
                      </tr>
                    ) : (
                      data.stagnantStock.map((item: any) => (
                        <tr key={item.variantId}>
                          <td>
                            <strong>{item.productName}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              SKU: {item.sku}
                            </div>
                          </td>
                          <td>
                            {item.size} • {item.color}
                          </td>
                          <td>
                            <strong>{item.quantity} un</strong>
                          </td>
                          <td style={{ color: '#d97706', fontWeight: 700 }}>
                            {formatCurrency(item.costValue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Boxes,
  Search,
  Filter,
  ArrowUpDown,
  History,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Plus,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import styles from './estoque.module.css';

export default function EstoquePage() {
  const [data, setData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(''); // todos, normal, baixo, zerado

  // Modal de Ajuste Rápido
  const [adjustModalItem, setAdjustModalItem] = useState<any | null>(null);
  const [newStockInput, setNewStockInput] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('Ajuste pontual de contagem no estoque físico');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const fetchStock = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await fetch(`/api/stock?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Erro ao buscar estoque:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setCategories(json?.categories || []));
    fetchStock();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStock();
  };

  const openAdjustModal = (item: any) => {
    setAdjustModalItem(item);
    setNewStockInput(item.physical);
    setAdjustReason('Ajuste pontual de contagem no estoque físico');
  };

  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalItem) return;

    setIsAdjusting(true);
    try {
      const res = await fetch('/api/stock/movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: adjustModalItem.id,
          type: 'AJUSTE_INVENTARIO',
          quantity: Number(newStockInput),
          reason: adjustReason,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setAdjustModalItem(null);
        fetchStock();
      } else {
        alert(json.error || 'Erro ao ajustar estoque.');
      }
    } catch (err) {
      console.error('Erro ao salvar ajuste:', err);
      alert('Falha na comunicação com o servidor.');
    } finally {
      setIsAdjusting(false);
    }
  };

  const summary = data?.summary || {
    totalPhysicalStock: 0,
    totalReservedStock: 0,
    totalAvailableStock: 0,
    totalStockCost: 0,
    totalStockSellValue: 0,
    potentialProfit: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  };

  const variants = data?.variants || [];

  return (
    <div className={styles.container}>
      {/* Cabeçalho */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Controle de Estoque Centralizado</h1>
          <p className={styles.pageSubtitle}>
            Estoque único compartilhado entre Loja Física, PDV, E-commerce e Pedidos.
          </p>
        </div>

        <div className={styles.headerButtons}>
          <Link href="/estoque/movimentacoes">
            <Button variant="outline" size="md" leftIcon={<History size={16} />}>
              Histórico de Movimentações
            </Button>
          </Link>
          <Link href="/estoque/inventario">
            <Button variant="primary" size="md" leftIcon={<ClipboardList size={16} />}>
              Balanço de Inventário
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid de KPIs Consolidados */}
      <div className={styles.kpiGrid}>
        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Estoque Físico Total</span>
              <div className={`${styles.kpiIconWrapper} ${styles.primaryIcon}`}>
                <Boxes size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{summary.totalPhysicalStock} peças</div>
            <div className={styles.kpiFooter}>
              <span>Todas as variações cadastradas</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Disponível para Venda</span>
              <div className={`${styles.kpiIconWrapper} ${styles.successIcon}`}>
                <CheckCircle2 size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{summary.totalAvailableStock} peças</div>
            <div className={styles.kpiFooter}>
              <span>{summary.totalReservedStock} peças reservadas online</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Patrimônio a Custo</span>
              <div className={`${styles.kpiIconWrapper} ${styles.infoIcon}`}>
                <DollarSign size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{formatCurrency(summary.totalStockCost)}</div>
            <div className={styles.kpiFooter}>
              <span>Valor investido em mercadorias</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Previsão de Venda</span>
              <div className={`${styles.kpiIconWrapper} ${styles.primaryIcon}`}>
                <TrendingUp size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{formatCurrency(summary.totalStockSellValue)}</div>
            <div className={styles.kpiFooter}>
              <span>Lucro potencial: {formatCurrency(summary.potentialProfit)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Estoque Baixo / Crítico</span>
              <div className={`${styles.kpiIconWrapper} ${styles.dangerIcon}`}>
                <AlertTriangle size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>
              {summary.lowStockCount + summary.outOfStockCount}
            </div>
            <div className={styles.kpiFooter}>
              <span>
                {summary.lowStockCount} abaixo do mín. • {summary.outOfStockCount} zerados
              </span>
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
                placeholder="Buscar por produto, SKU da variação, cor, tamanho..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.filtersWrapper}>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={styles.selectFilter}
              >
                <option value="">Todas as Categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={styles.selectFilter}
              >
                <option value="">Todos os Níveis</option>
                <option value="normal">Estoque Normal</option>
                <option value="baixo">Estoque Baixo (Reposição)</option>
                <option value="zerado">Estoque Zerado</option>
              </select>

              <Button type="submit" variant="secondary" size="md" leftIcon={<Filter size={16} />}>
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabela de Posição de Estoque */}
      <Card>
        <CardContent className={styles.tableCardContent}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <RefreshCw size={24} className="animate-spin" />
              <span>Consultando saldos do banco...</span>
            </div>
          ) : variants.length === 0 ? (
            <div className={styles.emptyState}>
              <Boxes size={44} />
              <p>Nenhuma peça encontrada com os filtros selecionados.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Variação</th>
                    <th>SKU Individual</th>
                    <th>Custo Unit.</th>
                    <th>Preço Unit.</th>
                    <th>Estoque Físico</th>
                    <th>Reservado</th>
                    <th>Disponível</th>
                    <th>Estoque Mínimo</th>
                    <th>Situação</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v: any) => (
                    <tr key={v.id} className={v.isOutOfStock ? styles.outOfStockRow : ''}>
                      <td>
                        <div className={styles.prodCell}>
                          <strong>{v.productName}</strong>
                          <small>{v.categoryName} • {v.brandName}</small>
                        </div>
                      </td>
                      <td>
                        <div className={styles.varCell}>
                          <span className={styles.sizeBadge}>{v.size}</span>
                          <div className={styles.colorTag}>
                            {v.colorHex && (
                              <span
                                className={styles.colorCircle}
                                style={{ backgroundColor: v.colorHex }}
                              />
                            )}
                            <span>{v.color}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <code>{v.sku}</code>
                      </td>
                      <td>{formatCurrency(v.costPrice)}</td>
                      <td>
                        <strong>{formatCurrency(v.sellPrice)}</strong>
                      </td>
                      <td>
                        <strong className={styles.physicalStock}>{v.physical} un</strong>
                      </td>
                      <td>{v.reserved > 0 ? `${v.reserved} un` : '-'}</td>
                      <td>
                        <Badge
                          variant={v.available > 0 ? 'success' : 'danger'}
                          size="sm"
                        >
                          {v.available} un
                        </Badge>
                      </td>
                      <td>{v.minStock} un</td>
                      <td>
                        {v.isOutOfStock ? (
                          <Badge variant="danger" size="sm">
                            Zerado
                          </Badge>
                        ) : v.isLowStock ? (
                          <Badge variant="warning" size="sm">
                            Repor
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            Normal
                          </Badge>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAdjustModal(v)}
                          leftIcon={<ArrowUpDown size={14} />}
                        >
                          Ajustar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Ajuste Rápido de Estoque */}
      {adjustModalItem && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Ajustar Saldo de Estoque</h3>
                <p>
                  {adjustModalItem.productName} ({adjustModalItem.size} / {adjustModalItem.color})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModalItem(null)}
                className={styles.closeBtn}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdjust} className={styles.modalForm}>
              <div className={styles.modalInfoBox}>
                <div className={styles.infoRow}>
                  <span>SKU da Peça:</span>
                  <code>{adjustModalItem.sku}</code>
                </div>
                <div className={styles.infoRow}>
                  <span>Estoque Físico Atual:</span>
                  <strong>{adjustModalItem.physical} un</strong>
                </div>
              </div>

              <Input
                label="Nova Quantidade Física Contada (Unidades)"
                type="number"
                min={0}
                value={newStockInput}
                onChange={(e) => setNewStockInput(parseInt(e.target.value) || 0)}
                required
                autoFocus
              />

              <div className={styles.textareaWrapper}>
                <label className={styles.inputLabel}>Motivo / Justificativa da Alteração *</label>
                <textarea
                  rows={2}
                  className={styles.textarea}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  required
                />
              </div>

              <div className={styles.modalFooter}>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setAdjustModalItem(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isAdjusting}
                  leftIcon={<CheckCircle2 size={16} />}
                >
                  Confirmar Ajuste
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

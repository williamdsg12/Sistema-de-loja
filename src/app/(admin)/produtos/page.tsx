'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Tag,
  Boxes,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Globe,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
  Layers,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import styles from './produtos.module.css';

export default function ProdutosPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Controle de linhas expandidas (visualizar variações)
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Modal de Impressão de Etiquetas
  const [selectedLabelItem, setSelectedLabelItem] = useState<any | null>(null);
  const [labelCopies, setLabelCopies] = useState<number>(1);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (selectedGender) params.append('gender', selectedGender);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setProducts(json.products || []);
      }
    } catch (err) {
      console.error('Erro ao buscar produtos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuxData = async () => {
    try {
      const [catRes, brandRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/brands'),
      ]);
      if (catRes.ok) {
        const cJson = await catRes.json();
        setCategories(cJson.categories || []);
      }
      if (brandRes.ok) {
        const bJson = await brandRes.json();
        setBrands(bJson.brands || []);
      }
    } catch (err) {
      console.error('Erro ao buscar dados auxiliares:', err);
    }
  };

  useEffect(() => {
    fetchAuxData();
    fetchProducts();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir ou desativar o produto "${name}"?`)) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Produto atualizado com sucesso.');
        fetchProducts();
      } else {
        alert(data.error || 'Erro ao excluir produto.');
      }
    } catch (err) {
      console.error('Erro ao deletar:', err);
      alert('Erro de conexão ao remover produto.');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className={styles.container}>
      {/* Cabeçalho da Página */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Catálogo de Produtos</h1>
          <p className={styles.pageSubtitle}>
            Gerenciamento de roupas, grades de variações (tamanho/cor), preços e visibilidade online.
          </p>
        </div>

        <div className={styles.headerButtons}>
          <Link href="/produtos/categorias">
            <Button variant="outline" size="md" leftIcon={<Tag size={16} />}>
              Categorias
            </Button>
          </Link>
          <Link href="/produtos/marcas">
            <Button variant="outline" size="md" leftIcon={<Layers size={16} />}>
              Marcas
            </Button>
          </Link>
          <Link href="/produtos/novo">
            <Button variant="primary" size="md" leftIcon={<Plus size={16} />}>
              Novo Produto
            </Button>
          </Link>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <Card className={styles.filterCard}>
        <CardContent className={styles.filterContent}>
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <div className={styles.searchInputWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar por nome, SKU, código de barras ou cor..."
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
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
                className={styles.selectFilter}
              >
                <option value="">Todos os Gêneros</option>
                <option value="INFANTIL_MENINA">Infantil Menina</option>
                <option value="INFANTIL_MENINO">Infantil Menino</option>
                <option value="UNISSEX">Unissex</option>
                <option value="TEEN_FEM">Teen Feminino</option>
                <option value="TEEN_MASC">Teen Masculino</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={styles.selectFilter}
              >
                <option value="">Todos os Status</option>
                <option value="ativo">Ativos</option>
                <option value="inativo">Inativos</option>
              </select>

              <Button type="submit" variant="secondary" size="md" leftIcon={<Filter size={16} />}>
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabela de Produtos */}
      <Card>
        <CardContent className={styles.tableCardContent}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <RefreshCw size={24} className="animate-spin" />
              <span>Carregando produtos...</span>
            </div>
          ) : products.length === 0 ? (
            <div className={styles.emptyState}>
              <ShoppingBag size={48} className={styles.emptyIcon} />
              <h3>Nenhum produto encontrado</h3>
              <p>Comece cadastrando suas peças com grade de tamanhos e cores.</p>
              <Link href="/produtos/novo">
                <Button variant="primary" size="md" leftIcon={<Plus size={16} />}>
                  Cadastrar Primeiro Produto
                </Button>
              </Link>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }} />
                    <th>Produto & SKU</th>
                    <th>Categoria / Marca</th>
                    <th>Público Alvo</th>
                    <th>Custo / Venda</th>
                    <th>Margem</th>
                    <th>Estoque Total</th>
                    <th>Loja Online</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const isExpanded = expandedRow === p.id;
                    const marginValue = p.sellPrice - p.costPrice;
                    const marginPercent = p.costPrice > 0 ? (marginValue / p.costPrice) * 100 : 100;

                    return (
                      <React.Fragment key={p.id}>
                        <tr className={`${styles.productRow} ${!p.isActive ? styles.inactiveRow : ''}`}>
                          <td>
                            <button
                              type="button"
                              onClick={() => toggleExpand(p.id)}
                              className={styles.expandBtn}
                              title="Ver Grade de Variações"
                            >
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                          </td>
                          <td>
                            <div className={styles.productInfo}>
                              <strong>{p.name}</strong>
                              <span className={styles.skuTag}>SKU: {p.sku}</span>
                            </div>
                          </td>
                          <td>
                            <div className={styles.metaInfo}>
                              <span>{p.category?.name || 'Sem Categoria'}</span>
                              <small>{p.brand?.name || 'Sem Marca'}</small>
                            </div>
                          </td>
                          <td>
                            <span className={styles.genderBadge}>
                              {p.gender ? p.gender.replace('_', ' ') : 'Geral'}
                            </span>
                          </td>
                          <td>
                            <div className={styles.priceInfo}>
                              <span className={styles.sellPrice}>{formatCurrency(p.sellPrice)}</span>
                              <small>Custo: {formatCurrency(p.costPrice)}</small>
                            </div>
                          </td>
                          <td>
                            <Badge variant={marginPercent >= 50 ? 'success' : 'warning'} size="sm">
                              {marginPercent.toFixed(0)}%
                            </Badge>
                          </td>
                          <td>
                            <div className={styles.stockInfo}>
                              <Badge
                                variant={
                                  p.totalStock === 0
                                    ? 'danger'
                                    : p.isLowStock
                                    ? 'warning'
                                    : 'success'
                                }
                                size="md"
                              >
                                {p.totalStock} un
                              </Badge>
                              <small>{p.variantsCount} variações</small>
                            </div>
                          </td>
                          <td>
                            {p.showInOnline ? (
                              <Badge variant="primary" size="sm" className={styles.onlineBadge}>
                                <Globe size={12} style={{ marginRight: '4px' }} />
                                Publicado
                              </Badge>
                            ) : (
                              <span className={styles.offlineText}>Oculto</span>
                            )}
                          </td>
                          <td>
                            <Badge variant={p.isActive ? 'success' : 'neutral'} size="sm">
                              {p.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className={styles.actionButtons}>
                              <button
                                type="button"
                                className={styles.actionBtn}
                                title="Imprimir Etiqueta de Preço / Código de Barras"
                                onClick={() =>
                                  setSelectedLabelItem({
                                    productName: p.name,
                                    size: p.variants?.[0]?.size || 'Padrão',
                                    color: p.variants?.[0]?.color || 'Única',
                                    sku: p.sku,
                                    barcode: p.barcode || p.sku,
                                    price: p.sellPrice,
                                    category: p.category?.name || 'Roupas',
                                  })
                                }
                              >
                                <Printer size={16} />
                              </button>
                              <Link href={`/produtos/${p.id}/editar`}>
                                <button className={styles.actionBtn} title="Editar Produto">
                                  <Edit2 size={16} />
                                </button>
                              </Link>
                              <button
                                onClick={() => handleDelete(p.id, p.name)}
                                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                title="Excluir / Inativar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Grade de Variações Expandida */}
                        {isExpanded && (
                          <tr className={styles.variantsRow}>
                            <td colSpan={10}>
                              <div className={styles.variantsCard}>
                                <div className={styles.variantsHeader}>
                                  <h4>Grade de Variações (Tamanho x Cor)</h4>
                                  <span>Cada item abaixo compartilha o mesmo estoque centralizado</span>
                                </div>

                                <table className={styles.variantsTable}>
                                  <thead>
                                    <tr>
                                      <th>Tamanho</th>
                                      <th>Cor</th>
                                      <th>SKU Individual</th>
                                      <th>Código de Barras</th>
                                      <th>Preço Venda</th>
                                      <th>Estoque Físico</th>
                                      <th>Reservado (Online)</th>
                                      <th>Disponível</th>
                                      <th style={{ textAlign: 'right' }}>Etiqueta</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {p.variants.map((v: any) => {
                                      const physStock = v.stock?.quantity || 0;
                                      const resStock = v.stock?.reservedQuantity || 0;
                                      const dispStock = physStock - resStock;

                                      return (
                                        <tr key={v.id}>
                                          <td>
                                            <strong className={styles.sizeBadge}>{v.size}</strong>
                                          </td>
                                          <td>
                                            <div className={styles.colorTag}>
                                              {v.colorHex && (
                                                <span
                                                  className={styles.colorCircle}
                                                  style={{ backgroundColor: v.colorHex }}
                                                />
                                              )}
                                              <span>{v.color}</span>
                                            </div>
                                          </td>
                                          <td>
                                            <code>{v.sku}</code>
                                          </td>
                                          <td>{v.barcode || '-'}</td>
                                          <td>{formatCurrency(v.sellPrice || p.sellPrice)}</td>
                                          <td>
                                            <strong>{physStock}</strong>
                                          </td>
                                          <td>{resStock > 0 ? `${resStock} un` : '-'}</td>
                                          <td>
                                            <Badge
                                              variant={dispStock > 0 ? 'success' : 'danger'}
                                              size="sm"
                                            >
                                              {dispStock} un
                                            </Badge>
                                          </td>
                                          <td style={{ textAlign: 'right' }}>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() =>
                                                setSelectedLabelItem({
                                                  productName: p.name,
                                                  size: v.size,
                                                  color: v.color,
                                                  sku: v.sku,
                                                  barcode: v.barcode || v.sku,
                                                  price: v.sellPrice || p.sellPrice,
                                                  category: p.category?.name || 'Roupas',
                                                })
                                              }
                                            >
                                              <Printer size={14} />
                                              <span>Etiqueta</span>
                                            </Button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL DE IMPRESSÃO DE ETIQUETA TÉRMICA */}
      {selectedLabelItem && (
        <div className={styles.labelModalOverlay} onClick={() => setSelectedLabelItem(null)}>
          <div className={styles.labelModalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.labelModalHeader}>
              <h3>Impressão de Etiqueta de Preço & Código de Barras</h3>
              <button
                type="button"
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}
                onClick={() => setSelectedLabelItem(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.labelModalBody}>
              {/* PREVIEW DA ETIQUETA */}
              <div className={styles.labelPreviewCard}>
                <span className={styles.labelStoreTitle}>KIDS & TEENS BOUTIQUE</span>
                <strong className={styles.labelProdName}>{selectedLabelItem.productName}</strong>
                <div className={styles.labelMeta}>
                  <span>Tam: {selectedLabelItem.size}</span>
                  <span>•</span>
                  <span>Cor: {selectedLabelItem.color}</span>
                </div>

                <div className={styles.barcodeBox}>
                  {/* Linhas simuladas de código de barras Code 128 */}
                  <div
                    style={{
                      fontFamily: 'monospace',
                      letterSpacing: '3px',
                      fontSize: '1.5rem',
                      fontWeight: 900,
                      background: '#000',
                      color: '#fff',
                      padding: '4px 12px',
                      borderRadius: '2px',
                    }}
                  >
                    ||||| | |||| ||| || |
                  </div>
                  <span className={styles.barcodeNumber}>{selectedLabelItem.barcode}</span>
                </div>

                <div className={styles.labelPriceTag}>
                  {formatCurrency(selectedLabelItem.price)}
                </div>
                <small style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                  À vista no PIX: {formatCurrency(selectedLabelItem.price * 0.95)}
                </small>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Qtd. de Cópias:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={labelCopies}
                    onChange={(e) => setLabelCopies(parseInt(e.target.value) || 1)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #cbd5e1',
                    }}
                  />
                </div>

                <div style={{ flex: 1.5 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Formato de Impressão:
                  </label>
                  <select
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #cbd5e1',
                    }}
                  >
                    <option value="termica_80">Térmica 80mm x 40mm (Gôndola)</option>
                    <option value="adesiva_tag">Etiqueta Adesiva Tag (Joia/Roupa)</option>
                    <option value="a4_grade">Folha A4 (Pimaco 30 etiquetas)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.labelModalFooter}>
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setSelectedLabelItem(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer size={16} />
                <span>Imprimir {labelCopies} Etiqueta(s)</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

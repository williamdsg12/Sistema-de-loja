'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, RefreshCw, Boxes, Layers } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import styles from '../produtos.module.css';

export default function VariacoesPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const json = await res.json();
        setProducts(json.products || []);
      }
    } catch (err) {
      console.error('Erro ao carregar variações:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Extrai todas as variações achatadas
  const allVariants: any[] = [];
  products.forEach((p) => {
    p.variants.forEach((v: any) => {
      allVariants.push({
        ...v,
        productName: p.name,
        productSku: p.sku,
        categoryName: p.category?.name,
        brandName: p.brand?.name,
        gender: p.gender,
        baseSellPrice: p.sellPrice,
      });
    });
  });

  const filteredVariants = allVariants.filter((v) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      v.productName.toLowerCase().includes(term) ||
      v.sku.toLowerCase().includes(term) ||
      v.color.toLowerCase().includes(term) ||
      v.size.toLowerCase().includes(term) ||
      (v.barcode && v.barcode.toLowerCase().includes(term))
    );
  });

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div className={styles.headerTitleGroup}>
          <Link href="/produtos">
            <button className={styles.backBtn} title="Voltar para produtos">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div>
            <h1 className={styles.pageTitle}>Grade Geral de Variações</h1>
            <p className={styles.pageSubtitle}>
              Visão consolidada de todos os SKUs, tamanhos e cores ativos no estoque unificado.
            </p>
          </div>
        </div>
      </div>

      <Card className={styles.filterCard}>
        <CardContent className={styles.filterContent}>
          <div className={styles.searchInputWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar por SKU individual, cor, tamanho, código de barras..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className={styles.tableCardContent}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <RefreshCw size={24} className="animate-spin" />
              <span>Carregando grade de variações...</span>
            </div>
          ) : filteredVariants.length === 0 ? (
            <div className={styles.emptyState}>
              <Boxes size={40} />
              <p>Nenhuma variação encontrada.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>SKU da Variação</th>
                    <th>Produto Pai</th>
                    <th>Tamanho</th>
                    <th>Cor</th>
                    <th>Código de Barras</th>
                    <th>Preço de Venda</th>
                    <th>Estoque Físico</th>
                    <th>Reservado</th>
                    <th>Disponível</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVariants.map((v) => {
                    const phys = v.stock?.quantity || 0;
                    const res = v.stock?.reservedQuantity || 0;
                    const disp = phys - res;

                    return (
                      <tr key={v.id}>
                        <td>
                          <code>{v.sku}</code>
                        </td>
                        <td>
                          <strong>{v.productName}</strong>
                          <div className={styles.skuTag}>Ref: {v.productSku}</div>
                        </td>
                        <td>
                          <span className={styles.sizeBadge}>{v.size}</span>
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
                        <td>{v.barcode || '-'}</td>
                        <td>{formatCurrency(v.sellPrice || v.baseSellPrice)}</td>
                        <td>
                          <strong>{phys} un</strong>
                        </td>
                        <td>{res > 0 ? `${res} un` : '-'}</td>
                        <td>
                          <Badge variant={disp > 0 ? 'success' : 'danger'} size="sm">
                            {disp} un
                          </Badge>
                        </td>
                        <td>
                          <Badge variant={v.isActive ? 'success' : 'neutral'} size="sm">
                            {v.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
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

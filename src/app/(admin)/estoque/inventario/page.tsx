'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  RefreshCw,
  Search,
  Sparkles,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import styles from './inventario.module.css';

export default function InventarioPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [generalReason, setGeneralReason] = useState('Balanço Periódico de Inventário da Loja');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/stock');
      if (res.ok) {
        const json = await res.json();
        const vList = json.variants || [];
        setItems(vList);

        // Inicializa as contagens com os saldos atuais
        const initialCounts: Record<string, number> = {};
        vList.forEach((v: any) => {
          initialCounts[v.id] = v.physical;
        });
        setCounts(initialCounts);
      }
    } catch (err) {
      console.error('Erro ao buscar itens:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleCountChange = (variantId: string, value: number) => {
    setCounts((prev) => ({
      ...prev,
      [variantId]: isNaN(value) ? 0 : Math.max(0, value),
    }));
  };

  // Contagem de itens com divergência
  const divergentItems = items.filter((item) => {
    const counted = counts[item.id] !== undefined ? counts[item.id] : item.physical;
    return counted !== item.physical;
  });

  const handleProcessInventory = async () => {
    if (!generalReason.trim()) {
      setErrorMessage('Informe a justificativa do balanço de inventário.');
      return;
    }

    if (divergentItems.length === 0) {
      alert('Nenhuma divergência foi identificada entre a contagem física e o sistema.');
      return;
    }

    if (
      !confirm(
        `Confirma o ajuste de ${divergentItems.length} peças divergentes no estoque? Todas as alterações serão registradas no histórico.`
      )
    ) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        generalReason,
        items: divergentItems.map((item) => ({
          variantId: item.id,
          countedStock: counts[item.id],
        })),
      };

      const res = await fetch('/api/stock/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Erro ao processar inventário.');
        setIsProcessing(false);
        return;
      }

      setSuccessMessage(data.message || 'Inventário processado com sucesso!');
      fetchItems();
    } catch (err) {
      console.error('Erro ao enviar inventário:', err);
      setErrorMessage('Erro de conexão ao processar balanço.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      item.productName.toLowerCase().includes(term) ||
      item.sku.toLowerCase().includes(term) ||
      item.color.toLowerCase().includes(term) ||
      item.size.toLowerCase().includes(term)
    );
  });

  return (
    <div className={styles.container}>
      {/* Cabeçalho */}
      <div className={styles.pageHeader}>
        <div className={styles.headerTitleGroup}>
          <Link href="/estoque">
            <button className={styles.backBtn} title="Voltar para estoque">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div>
            <h1 className={styles.pageTitle}>Balanço de Inventário</h1>
            <p className={styles.pageSubtitle}>
              Realize a conferência física e concilie divergências em lote com histórico imutável.
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <Button
            variant="primary"
            size="md"
            onClick={handleProcessInventory}
            isLoading={isProcessing}
            leftIcon={<Save size={16} />}
            disabled={divergentItems.length === 0}
          >
            Processar Balanço ({divergentItems.length} divergências)
          </Button>
        </div>
      </div>

      {successMessage && (
        <div className={styles.alertSuccess}>
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className={styles.alertError}>
          <AlertTriangle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Painel de Configuração do Balanço */}
      <Card>
        <CardContent className={styles.topSettings}>
          <div className={styles.reasonWrapper}>
            <Input
              label="Justificativa Geral do Balanço de Estoque *"
              value={generalReason}
              onChange={(e) => setGeneralReason(e.target.value)}
              placeholder="Ex: Balanço Semanal da Loja Física"
              required
            />
          </div>

          <div className={styles.searchWrapper}>
            <div className={styles.searchInputWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Filtrar peças para conferência..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Conferência */}
      <Card>
        <CardHeader>
          <div className={styles.tableHeaderRow}>
            <div>
              <CardTitle>Conferência de Peças ({items.length})</CardTitle>
              <CardDescription>
                Digite a quantidade física real encontrada em loja para cada variação
              </CardDescription>
            </div>
            <div className={styles.divergenceBadge}>
              <strong>{divergentItems.length}</strong> peças com divergência
            </div>
          </div>
        </CardHeader>
        <CardContent className={styles.tableCardContent}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <RefreshCw size={24} className="animate-spin" />
              <span>Carregando lista de conferência...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className={styles.emptyState}>
              <ClipboardList size={40} />
              <p>Nenhuma peça encontrada.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Variação</th>
                    <th>SKU da Peça</th>
                    <th>Estoque no Sistema</th>
                    <th style={{ width: '160px' }}>Contagem Física Real</th>
                    <th>Divergência</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const counted = counts[item.id] !== undefined ? counts[item.id] : item.physical;
                    const diff = counted - item.physical;

                    return (
                      <tr
                        key={item.id}
                        className={diff !== 0 ? styles.divergentRow : ''}
                      >
                        <td>
                          <div className={styles.prodInfo}>
                            <strong>{item.productName}</strong>
                            <small>{item.categoryName}</small>
                          </div>
                        </td>
                        <td>
                          <div className={styles.varTag}>
                            <span className={styles.sizeBadge}>{item.size}</span>
                            <span>{item.color}</span>
                          </div>
                        </td>
                        <td>
                          <code>{item.sku}</code>
                        </td>
                        <td>
                          <strong>{item.physical} un</strong>
                        </td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            value={counted}
                            onChange={(e) =>
                              handleCountChange(item.id, parseInt(e.target.value) || 0)
                            }
                            className={styles.countInput}
                          />
                        </td>
                        <td>
                          {diff === 0 ? (
                            <Badge variant="success" size="sm">
                              Correto (0)
                            </Badge>
                          ) : diff > 0 ? (
                            <Badge variant="info" size="sm">
                              +{diff} un (Sobra)
                            </Badge>
                          ) : (
                            <Badge variant="danger" size="sm">
                              {diff} un (Falta)
                            </Badge>
                          )}
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

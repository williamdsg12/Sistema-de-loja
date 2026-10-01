'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  AlertOctagon,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/utils';
import styles from './movimentacoes.module.css';

export default function MovimentacoesPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Modal de Nova Movimentação Manual
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [movementType, setMovementType] = useState('ENTRADA');
  const [movementQty, setMovementQty] = useState(1);
  const [movementReason, setMovementReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchMovements = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedType) params.append('type', selectedType);

      const res = await fetch(`/api/stock/movements?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setMovements(json.movements || []);
      }
    } catch (err) {
      console.error('Erro ao buscar movimentações:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProductsForModal = async () => {
    try {
      const res = await fetch('/api/stock');
      if (res.ok) {
        const json = await res.json();
        setProductsList(json.variants || []);
        if (json.variants?.length > 0) {
          setSelectedVariantId(json.variants[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar lista de produtos:', err);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [selectedType]);

  const handleOpenModal = () => {
    loadProductsForModal();
    setModalError('');
    setMovementReason('');
    setMovementQty(1);
    setIsModalOpen(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMovements();
  };

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariantId) {
      setModalError('Selecione uma peça / variação.');
      return;
    }
    if (!movementReason.trim()) {
      setModalError('Informe o motivo da movimentação.');
      return;
    }

    setIsSubmitting(true);
    setModalError('');

    try {
      const res = await fetch('/api/stock/movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: selectedVariantId,
          type: movementType,
          quantity: Number(movementQty),
          reason: movementReason,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        fetchMovements();
      } else {
        setModalError(json.error || 'Falha ao registrar movimentação.');
      }
    } catch (err) {
      console.error('Erro ao salvar movimentação:', err);
      setModalError('Erro de conexão ao salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBadgeType = (type: string) => {
    switch (type) {
      case 'ENTRADA':
        return <Badge variant="success" size="sm">Entrada Manual</Badge>;
      case 'SAIDA_PDV':
        return <Badge variant="primary" size="sm">Venda PDV</Badge>;
      case 'SAIDA_ONLINE':
        return <Badge variant="info" size="sm">Venda Online</Badge>;
      case 'AJUSTE_INVENTARIO':
        return <Badge variant="neutral" size="sm">Balanço / Ajuste</Badge>;
      case 'DEVOLUCAO':
        return <Badge variant="success" size="sm">Devolução</Badge>;
      case 'PERDA':
        return <Badge variant="danger" size="sm">Perda / Avaria</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{type}</Badge>;
    }
  };

  return (
    <div className={styles.container}>
      {/* Cabeçalho */}
      <div className={styles.pageHeader}>
        <div className={styles.headerTitleGroup}>
          <Link href="/estoque">
            <button className={styles.backBtn} title="Voltar para posição de estoque">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div>
            <h1 className={styles.pageTitle}>Histórico de Movimentações</h1>
            <p className={styles.pageSubtitle}>
              Rastreabilidade imutável de todas as entradas, saídas, perdas e inventários.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenModal}
          leftIcon={<Plus size={16} />}
        >
          Nova Movimentação Manual
        </Button>
      </div>

      {/* Barra de Filtros */}
      <Card className={styles.filterCard}>
        <CardContent className={styles.filterContent}>
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <div className={styles.searchInputWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar por motivo, produto, SKU ou cor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.filtersWrapper}>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className={styles.selectFilter}
              >
                <option value="">Todos os Tipos</option>
                <option value="ENTRADA">Entradas</option>
                <option value="SAIDA_PDV">Vendas PDV</option>
                <option value="SAIDA_ONLINE">Vendas Online</option>
                <option value="AJUSTE_INVENTARIO">Ajustes de Inventário</option>
                <option value="PERDA">Perdas / Avarias</option>
                <option value="DEVOLUCAO">Devoluções</option>
              </select>

              <Button type="submit" variant="secondary" size="md" leftIcon={<Filter size={16} />}>
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabela de Histórico */}
      <Card>
        <CardContent className={styles.tableCardContent}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <RefreshCw size={24} className="animate-spin" />
              <span>Carregando histórico...</span>
            </div>
          ) : movements.length === 0 ? (
            <div className={styles.emptyState}>
              <Boxes size={44} />
              <p>Nenhuma movimentação registrada.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Data & Hora</th>
                    <th>Tipo de Operação</th>
                    <th>Produto & Variação</th>
                    <th>SKU da Peça</th>
                    <th style={{ textAlign: 'center' }}>Qtd. Movimentada</th>
                    <th>Saldo Anterior</th>
                    <th>Saldo Novo</th>
                    <th>Motivo / Justificativa</th>
                    <th>Operador</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <span className={styles.dateCell}>{formatDateTime(m.createdAt)}</span>
                      </td>
                      <td>{getBadgeType(m.type)}</td>
                      <td>
                        <div className={styles.prodCell}>
                          <strong>{m.variant?.product?.name}</strong>
                          <small>
                            Tam: {m.variant?.size} • Cor: {m.variant?.color}
                          </small>
                        </div>
                      </td>
                      <td>
                        <code>{m.variant?.sku}</code>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className={`${styles.qtyTag} ${
                            m.quantity > 0 ? styles.qtyPositive : styles.qtyNegative
                          }`}
                        >
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity} un
                        </span>
                      </td>
                      <td>{m.previousStock} un</td>
                      <td>
                        <strong>{m.newStock} un</strong>
                      </td>
                      <td>
                        <span className={styles.reasonCell}>{m.reason || '-'}</span>
                      </td>
                      <td>
                        <span className={styles.userCell}>
                          {m.user?.name || m.user?.username || 'Sistema'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Nova Movimentação Manual */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Lançar Movimentação Manual</h3>
                <p>Altere o saldo físico de estoque com registro imutável.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className={styles.closeBtn}
              >
                ✕
              </button>
            </div>

            {modalError && <div className={styles.alertError}>{modalError}</div>}

            <form onSubmit={handleCreateMovement} className={styles.modalForm}>
              <div className={styles.selectWrapper}>
                <label className={styles.inputLabel}>Selecione a Peça / Variação *</label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className={styles.select}
                  required
                >
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productName} ({p.size} - {p.color}) | Saldo Atual: {p.physical} un | SKU: {p.sku}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formRow2}>
                <div className={styles.selectWrapper}>
                  <label className={styles.inputLabel}>Tipo de Movimentação *</label>
                  <select
                    value={movementType}
                    onChange={(e) => setMovementType(e.target.value)}
                    className={styles.select}
                  >
                    <option value="ENTRADA">Entrada (Adiciona ao saldo)</option>
                    <option value="PERDA">Perda / Avaria (Subtrai do saldo)</option>
                    <option value="DEVOLUCAO">Devolução de Cliente (Adiciona)</option>
                    <option value="TRANSFERENCIA">Transferência entre Lojas</option>
                  </select>
                </div>

                <Input
                  label="Quantidade (Unidades) *"
                  type="number"
                  min={1}
                  value={movementQty}
                  onChange={(e) => setMovementQty(parseInt(e.target.value) || 1)}
                  required
                />
              </div>

              <div className={styles.textareaWrapper}>
                <label className={styles.inputLabel}>Motivo Obrigatório *</label>
                <textarea
                  rows={2}
                  className={styles.textarea}
                  placeholder="Ex: Recebimento de reposição urgente, peça rasgada no provador, etc."
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  required
                />
              </div>

              <div className={styles.modalFooter}>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  leftIcon={<CheckCircle2 size={16} />}
                >
                  Registrar Movimentação
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

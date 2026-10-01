'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShoppingBag,
  Plus,
  Trash2,
  Search,
  Package,
  Truck,
  CreditCard,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import styles from './nova.module.css';

interface SelectedItem {
  variantId: string;
  productId: string;
  productName: string;
  size: string;
  color: string;
  sku: string;
  quantity: number;
  unitCost: number;
  sellPrice: number;
  totalCost: number;
}

export default function NovaCompraPage() {
  const router = useRouter();

  // Fornecedores & Produtos
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  // Form Geral
  const [supplierId, setSupplierId] = useState('');
  const [status, setStatus] = useState<'RECEBIDO' | 'PENDENTE'>('RECEBIDO');
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Itens Selecionados
  const [items, setItems] = useState<SelectedItem[]>([]);

  // Seletor de Itens
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemCost, setItemCost] = useState<number>(0);

  // Contas a Pagar
  const [generatePayable, setGeneratePayable] = useState(true);
  const [installmentsCount, setInstallmentsCount] = useState<number>(1);
  const [firstDueDate, setFirstDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [payablePaymentMethod, setPayablePaymentMethod] = useState('BOLETO');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Carrega fornecedores e produtos disponíveis
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [supRes, prodRes] = await Promise.all([
          fetch('/api/suppliers'),
          fetch('/api/products?limit=100'),
        ]);

        if (supRes.ok) {
          const supJson = await supRes.json();
          setSuppliers(supJson.suppliers || []);
        }

        if (prodRes.ok) {
          const prodJson = await prodRes.json();
          setProducts(prodJson.products || []);
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setIsLoadingInitial(false);
      }
    };

    loadInitialData();
  }, []);

  // Quando o produto selecionado muda, reseta variação e atualiza custo padrão
  const currentProduct = products.find((p) => p.id === selectedProductId);
  const availableVariants = currentProduct?.variants || [];

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod && prod.variants?.length > 0) {
      setSelectedVariantId(prod.variants[0].id);
      setItemCost(Number(prod.variants[0].costPrice || prod.costPrice || 0));
    } else {
      setSelectedVariantId('');
      setItemCost(0);
    }
  };

  const handleVariantChange = (varId: string) => {
    setSelectedVariantId(varId);
    const variant = availableVariants.find((v: any) => v.id === varId);
    if (variant) {
      setItemCost(Number(variant.costPrice || currentProduct?.costPrice || 0));
    }
  };

  // Adicionar item à tabela
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedProductId || !selectedVariantId) {
      setFormError('Selecione um produto e a variação desejada.');
      return;
    }
    if (itemQty <= 0) {
      setFormError('A quantidade deve ser de no mínimo 1 peça.');
      return;
    }
    if (itemCost < 0) {
      setFormError('O custo unitário não pode ser negativo.');
      return;
    }

    const variant = availableVariants.find((v: any) => v.id === selectedVariantId);
    if (!variant || !currentProduct) return;

    // Se já estiver na lista, apenas incrementa
    const existingIndex = items.findIndex((it) => it.variantId === selectedVariantId);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += itemQty;
      updated[existingIndex].unitCost = itemCost;
      updated[existingIndex].totalCost = updated[existingIndex].quantity * itemCost;
      setItems(updated);
    } else {
      setItems((prev) => [
        ...prev,
        {
          variantId: variant.id,
          productId: currentProduct.id,
          productName: currentProduct.name,
          size: variant.size,
          color: variant.color,
          sku: variant.sku,
          quantity: itemQty,
          unitCost: itemCost,
          sellPrice: Number(variant.sellPrice || currentProduct.sellPrice || 0),
          totalCost: itemQty * itemCost,
        },
      ]);
    }

    // Reseta quantidade
    setItemQty(1);
  };

  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    setItems((prev) => {
      const copy = [...prev];
      copy[index].quantity = newQty;
      copy[index].totalCost = newQty * copy[index].unitCost;
      return copy;
    });
  };

  const handleUpdateItemCost = (index: number, newCost: number) => {
    if (newCost < 0) return;
    setItems((prev) => {
      const copy = [...prev];
      copy[index].unitCost = newCost;
      copy[index].totalCost = copy[index].quantity * newCost;
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Totais
  const itemsSubtotal = items.reduce((sum, it) => sum + it.totalCost, 0);
  const totalPieces = items.reduce((sum, it) => sum + it.quantity, 0);
  const totalAmount = Math.max(0, itemsSubtotal + (shippingCost || 0) - (discountAmount || 0));

  // Submissão da Compra
  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!supplierId) {
      setFormError('Selecione o fornecedor da compra.');
      return;
    }
    if (items.length === 0) {
      setFormError('Adicione pelo menos um item à lista de compra.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        supplierId,
        status,
        items: items.map((it) => ({
          variantId: it.variantId,
          quantity: it.quantity,
          unitCost: it.unitCost,
          updateVariantCost: true,
        })),
        shippingCost,
        discountAmount,
        notes,
        generatePayable,
        installmentsCount,
        firstDueDate: generatePayable ? firstDueDate : null,
        payablePaymentMethod,
      };

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok) {
        alert(json.message || 'Compra cadastrada com sucesso!');
        router.push('/compras');
      } else {
        setFormError(json.error || 'Erro ao registrar compra.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Falha na comunicação com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Cabeçalho */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumbs}>
            <Link href="/compras" className={styles.backLink}>
              <ArrowLeft size={16} /> Voltar para Compras
            </Link>
          </div>
          <h1 className={styles.pageTitle}>Nova Compra / Entrada de Mercadoria</h1>
          <p className={styles.pageSubtitle}>
            Abasteça o estoque físico centralizado, atualize custos e gere faturas a pagar para fornecedores.
          </p>
        </div>
      </div>

      {formError && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={18} />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmitPurchase} className={styles.mainLayout}>
        {/* COLUNA ESQUERDA: FORNECEDOR, SELEÇÃO DE PRODUTOS E ITENS */}
        <div className={styles.leftColumn}>
          {/* CARD 1: FORNECEDOR E TIPO DE ENTRADA */}
          <Card className={styles.card}>
            <CardHeader>
              <CardTitle>1. Dados da Compra & Fornecedor</CardTitle>
            </CardHeader>
            <CardContent className={styles.cardContentGrid}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Fornecedor *</label>
                <select
                  className={styles.select}
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  required
                >
                  <option value="">Selecione um fornecedor...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.corporateName ? `(${s.corporateName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Status da Entrada *</label>
                <select
                  className={styles.select}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="RECEBIDO">
                    Recebido Imediatamente (Abastecer Estoque Agora)
                  </option>
                  <option value="PENDENTE">
                    Pedido Pendente (Aguardar Entrega do Fornecedor)
                  </option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* CARD 2: ADICIONAR PRODUTOS E VARIAÇÕES */}
          <Card className={styles.card}>
            <CardHeader>
              <CardTitle>2. Adicionar Peças / Variações ao Pedido</CardTitle>
              <CardDescription>
                Selecione o modelo, tamanho, cor e o custo unitário cobrado pelo fornecedor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles.addItemForm}>
                {/* Produto */}
                <div className={styles.itemFieldProduct}>
                  <label className={styles.inputLabel}>Modelo / Produto</label>
                  <select
                    className={styles.select}
                    value={selectedProductId}
                    onChange={(e) => handleProductChange(e.target.value)}
                  >
                    <option value="">Selecione um produto...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (SKU: {p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Variação */}
                <div className={styles.itemFieldVariant}>
                  <label className={styles.inputLabel}>Tamanho / Cor</label>
                  <select
                    className={styles.select}
                    value={selectedVariantId}
                    onChange={(e) => handleVariantChange(e.target.value)}
                    disabled={!selectedProductId || availableVariants.length === 0}
                  >
                    {availableVariants.length === 0 && <option value="">Sem variações</option>}
                    {availableVariants.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        Tam: {v.size} • Cor: {v.color} ({v.sku})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantidade */}
                <div className={styles.itemFieldQty}>
                  <label className={styles.inputLabel}>Qtd</label>
                  <input
                    type="number"
                    min="1"
                    className={styles.input}
                    value={itemQty}
                    onChange={(e) => setItemQty(parseInt(e.target.value) || 1)}
                  />
                </div>

                {/* Custo Unitário */}
                <div className={styles.itemFieldCost}>
                  <label className={styles.inputLabel}>Custo Unit. (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={styles.input}
                    value={itemCost}
                    onChange={(e) => setItemCost(parseFloat(e.target.value) || 0)}
                  />
                </div>

                {/* Botão Adicionar */}
                <div className={styles.itemFieldBtn}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    leftIcon={<Plus size={16} />}
                    onClick={handleAddItem}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CARD 3: TABELA DE ITENS ADICIONADOS */}
          <Card className={styles.card}>
            <CardHeader className={styles.cardHeaderFlex}>
              <div>
                <CardTitle>Itens da Compra ({items.length})</CardTitle>
                <CardDescription>
                  {totalPieces} peças no total • Subtotal: {formatCurrency(itemsSubtotal)}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className={styles.itemsTableContent}>
              {items.length === 0 ? (
                <div className={styles.emptyItems}>
                  <ShoppingBag size={40} />
                  <p>Nenhuma peça adicionada ainda. Utilize o seletor acima para incluir os itens.</p>
                </div>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.itemsTable}>
                    <thead>
                      <tr>
                        <th>Produto / Variação</th>
                        <th>SKU</th>
                        <th style={{ width: '100px' }}>Qtd</th>
                        <th style={{ width: '120px' }}>Custo Unit.</th>
                        <th>Subtotal</th>
                        <th>Venda Atual</th>
                        <th>Margem Prevista</th>
                        <th style={{ textAlign: 'right' }}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => {
                        const marginPercent =
                          it.sellPrice > 0
                            ? (((it.sellPrice - it.unitCost) / it.sellPrice) * 100).toFixed(0)
                            : '0';

                        return (
                          <tr key={it.variantId}>
                            <td>
                              <strong>{it.productName}</strong>
                              <small> (Tam: {it.size} • Cor: {it.color})</small>
                            </td>
                            <td><code>{it.sku}</code></td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                className={styles.inlineInput}
                                value={it.quantity}
                                onChange={(e) =>
                                  handleUpdateItemQuantity(idx, parseInt(e.target.value) || 1)
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className={styles.inlineInput}
                                value={it.unitCost}
                                onChange={(e) =>
                                  handleUpdateItemCost(idx, parseFloat(e.target.value) || 0)
                                }
                              />
                            </td>
                            <td>
                              <strong>{formatCurrency(it.totalCost)}</strong>
                            </td>
                            <td>{formatCurrency(it.sellPrice)}</td>
                            <td>
                              <Badge
                                variant={Number(marginPercent) >= 50 ? 'success' : 'warning'}
                                size="sm"
                              >
                                {marginPercent}%
                              </Badge>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() => handleRemoveItem(idx)}
                                title="Remover item"
                              >
                                <Trash2 size={16} />
                              </button>
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

        {/* COLUNA DIREITA: RESUMO FINANCEIRO & CONTAS A PAGAR */}
        <div className={styles.rightColumn}>
          {/* CARD DE TOTAIS */}
          <Card className={styles.card}>
            <CardHeader>
              <CardTitle>Resumo Financeiro</CardTitle>
            </CardHeader>
            <CardContent className={styles.totalsContent}>
              <div className={styles.totalRow}>
                <span>Subtotal dos Itens:</span>
                <strong>{formatCurrency(itemsSubtotal)}</strong>
              </div>

              <div className={styles.inputRow}>
                <label className={styles.rowLabel}>Frete / Custos Extras (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={styles.smallInput}
                  value={shippingCost || ''}
                  onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                />
              </div>

              <div className={styles.inputRow}>
                <label className={styles.rowLabel}>Desconto Negociado (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={styles.smallInput}
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                />
              </div>

              <div className={styles.finalTotalBox}>
                <span>TOTAL DA COMPRA:</span>
                <h2>{formatCurrency(totalAmount)}</h2>
              </div>
            </CardContent>
          </Card>

          {/* CARD DE CONTAS A PAGAR */}
          <Card className={styles.card}>
            <CardHeader>
              <CardTitle>Integração Financeira</CardTitle>
            </CardHeader>
            <CardContent className={styles.financeContent}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={generatePayable}
                  onChange={(e) => setGeneratePayable(e.target.checked)}
                />
                <strong>Gerar Contas a Pagar automaticamente</strong>
              </label>

              {generatePayable && (
                <div className={styles.payableFields}>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Número de Parcelas</label>
                    <select
                      className={styles.select}
                      value={installmentsCount}
                      onChange={(e) => setInstallmentsCount(parseInt(e.target.value) || 1)}
                    >
                      {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                        <option key={n} value={n}>
                          {n}x de {formatCurrency(totalAmount / n)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>1º Vencimento</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={firstDueDate}
                      onChange={(e) => setFirstDueDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Forma de Pagamento</label>
                    <select
                      className={styles.select}
                      value={payablePaymentMethod}
                      onChange={(e) => setPayablePaymentMethod(e.target.value)}
                    >
                      <option value="BOLETO">Boleto Bancário</option>
                      <option value="PIX">PIX / Transferência</option>
                      <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                      <option value="DINHEIRO">Dinheiro</option>
                    </select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* OBSERVAÇÕES */}
          <Card className={styles.card}>
            <CardHeader>
              <CardTitle>Observações da Compra</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                rows={3}
                className={styles.textarea}
                placeholder="Ex: Nota Fiscal nº 12345, Lote Verão 2026, prazo de entrega especial..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* BOTÕES DE AÇÃO */}
          <div className={styles.actionCard}>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className={styles.submitBtn}
              isLoading={isSubmitting}
              leftIcon={status === 'RECEBIDO' ? <CheckCircle2 size={18} /> : <ShoppingBag size={18} />}
            >
              {status === 'RECEBIDO'
                ? 'Confirmar Entrada & Abastecer Estoque'
                : 'Salvar Pedido de Compra'}
            </Button>

            <Link href="/compras">
              <Button type="button" variant="outline" size="md" className={styles.cancelBtn}>
                Cancelar
              </Button>
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  CreditCard,
  QrCode,
  Wallet,
  Receipt,
  User,
  Percent,
  CheckCircle2,
  Printer,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDocument, formatDateTime } from '@/lib/utils';
import styles from './pdv.module.css';

interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  size: string;
  color: string;
  colorHex?: string;
  sku: string;
  barcode?: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  discount: number;
  totalPrice: number;
}

interface PaymentEntry {
  method: 'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'OUTROS';
  amount: number;
  installments: number;
  receivedAmount?: number | null;
  changeAmount?: number | null;
}

export default function PdvPage() {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Estados do Carrinho
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Modal de Seleção de Variação (quando pesquisa por produto pai com múltiplas cores/tamanhos)
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<any | null>(null);

  // Cliente e Desconto Geral
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [saleNotes, setSaleNotes] = useState<string>('');

  // Modal de Pagamento
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [currentMethod, setCurrentMethod] = useState<'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'OUTROS'>('DINHEIRO');
  const [currentAmountInput, setCurrentAmountInput] = useState<number>(0);
  const [currentInstallments, setCurrentInstallments] = useState<number>(1);
  const [cashReceivedInput, setCashReceivedInput] = useState<number>(0);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Modal de Venda Concluída / Recibo
  const [completedSaleData, setCompletedSaleData] = useState<any | null>(null);

  useEffect(() => {
    // Foca automaticamente no campo de busca/código de barras
    searchInputRef.current?.focus();

    // Carrega clientes
    fetch('/api/customers')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setCustomers(json?.customers || []));
  }, []);

  // Atalhos Globais de Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: Focar na busca
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // F8: Abrir Pagamento
      if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) openPaymentModal();
      }
      // ESC: Fechar modais
      if (e.key === 'Escape') {
        if (isPaymentModalOpen) setIsPaymentModalOpen(false);
        if (selectedProductForVariants) setSelectedProductForVariants(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isPaymentModalOpen, selectedProductForVariants]);

  // Cálculos do Carrinho
  const subtotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);
  const totalAmount = Math.max(0, subtotal - discountAmount);

  // Busca de Produtos ou Leitura de Código de Barras
  const handleSearchChange = async (val: string) => {
    setSearchTerm(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/pdv/search?q=${encodeURIComponent(val)}`);
      if (res.ok) {
        const data = await res.json();
        // Se for correspondência exata do leitor de código de barras
        if (data.exactMatch && data.variant) {
          addItemToCart(data.variant);
          setSearchTerm('');
          setSearchResults([]);
          searchInputRef.current?.focus();
        } else {
          setSearchResults(data.products || []);
        }
      }
    } catch (err) {
      console.error('Erro na busca:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Se tiver apenas 1 produto no resultado, seleciona ele
      if (searchResults.length === 1) {
        handleSelectProduct(searchResults[0]);
      }
    }
  };

  const handleSelectProduct = (product: any) => {
    if (product.variants?.length === 1) {
      // Se tiver apenas 1 variação, adiciona direto
      const v = product.variants[0];
      addItemToCart({
        id: v.id,
        productId: product.id,
        productName: product.name,
        size: v.size,
        color: v.color,
        colorHex: v.colorHex,
        sku: v.sku,
        barcode: v.barcode,
        sellPrice: v.sellPrice ?? product.sellPrice,
        costPrice: v.costPrice ?? product.costPrice,
      });
      setSearchTerm('');
      setSearchResults([]);
      searchInputRef.current?.focus();
    } else {
      // Abre modal para escolher tamanho e cor
      setSelectedProductForVariants(product);
      setSearchResults([]);
    }
  };

  const addItemToCart = (variant: any) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.variantId === variant.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const current = updated[existingIdx];
        const newQty = current.quantity + 1;
        updated[existingIdx] = {
          ...current,
          quantity: newQty,
          totalPrice: newQty * current.unitPrice - current.discount,
        };
        return updated;
      } else {
        const unitPrice = variant.sellPrice;
        return [
          ...prev,
          {
            variantId: variant.id,
            productId: variant.productId,
            productName: variant.productName,
            size: variant.size,
            color: variant.color,
            colorHex: variant.colorHex,
            sku: variant.sku,
            barcode: variant.barcode,
            unitPrice,
            costPrice: variant.costPrice || 0,
            quantity: 1,
            discount: 0,
            totalPrice: unitPrice,
          },
        ];
      }
    });
  };

  const updateQuantity = (variantId: string, qty: number) => {
    if (qty <= 0) {
      removeItem(variantId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.variantId === variantId
          ? {
              ...item,
              quantity: qty,
              totalPrice: qty * item.unitPrice - item.discount,
            }
          : item
      )
    );
  };

  const removeItem = (variantId: string) => {
    setCart((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (confirm('Deseja limpar todos os itens do carrinho?')) {
      setCart([]);
      setDiscountAmount(0);
      setDiscountPercent(0);
      setSelectedCustomerId('');
      searchInputRef.current?.focus();
    }
  };

  // Aplicação de Desconto Geral
  const applyDiscountPercent = (percent: number) => {
    setDiscountPercent(percent);
    const calculated = (subtotal * percent) / 100;
    setDiscountAmount(calculated);
  };

  const applyDiscountValue = (val: number) => {
    setDiscountAmount(val);
    setDiscountPercent(subtotal > 0 ? (val / subtotal) * 100 : 0);
  };

  // Abertura do Modal de Pagamento
  const openPaymentModal = () => {
    if (cart.length === 0) return;
    setPayments([]);
    setCurrentMethod('DINHEIRO');
    setCurrentAmountInput(totalAmount);
    setCashReceivedInput(totalAmount);
    setCheckoutError('');
    setIsPaymentModalOpen(true);
  };

  // Adiciona forma de pagamento na lista de pagamentos
  const totalPaidSoFar = payments.reduce((acc, p) => acc + p.amount, 0);
  const remainingToPay = Math.max(0, totalAmount - totalPaidSoFar);

  const handleAddPayment = () => {
    if (currentAmountInput <= 0) return;

    let change = 0;
    if (currentMethod === 'DINHEIRO' && cashReceivedInput > currentAmountInput) {
      change = cashReceivedInput - currentAmountInput;
    }

    setPayments((prev) => [
      ...prev,
      {
        method: currentMethod,
        amount: currentAmountInput,
        installments: currentMethod === 'CARTAO_CREDITO' ? currentInstallments : 1,
        receivedAmount: currentMethod === 'DINHEIRO' ? cashReceivedInput : null,
        changeAmount: change > 0 ? change : null,
      },
    ]);

    const newRemaining = Math.max(0, remainingToPay - currentAmountInput);
    setCurrentAmountInput(newRemaining);
    setCashReceivedInput(newRemaining);
  };

  const removePaymentEntry = (index: number) => {
    setPayments((prev) => {
      const copy = prev.filter((_, i) => i !== index);
      const paid = copy.reduce((acc, p) => acc + p.amount, 0);
      const rem = Math.max(0, totalAmount - paid);
      setCurrentAmountInput(rem);
      setCashReceivedInput(rem);
      return copy;
    });
  };

  // Finalização da Venda
  const handleFinalizeSale = async () => {
    if (Math.abs(remainingToPay) > 0.05) {
      setCheckoutError(
        `Faltam ${formatCurrency(remainingToPay)} para completar o valor total da venda.`
      );
      return;
    }

    setIsFinalizing(true);
    setCheckoutError('');

    try {
      const payload = {
        customerId: selectedCustomerId || null,
        subtotal,
        discountAmount,
        totalAmount,
        notes: saleNotes,
        items: cart.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          costPrice: i.costPrice,
          discount: i.discount,
          totalPrice: i.totalPrice,
        })),
        payments,
      };

      const res = await fetch('/api/pdv/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setCheckoutError(data.error || 'Erro ao processar venda.');
        setIsFinalizing(false);
        return;
      }

      // Sucesso! Abre comprovante de venda
      setCompletedSaleData({
        code: data.code,
        date: new Date(),
        items: [...cart],
        subtotal,
        discountAmount,
        totalAmount,
        payments: [...payments],
        customer: customers.find((c) => c.id === selectedCustomerId)?.name || 'Cliente Balcão',
      });

      // Limpa PDV para próxima venda
      setCart([]);
      setPayments([]);
      setDiscountAmount(0);
      setDiscountPercent(0);
      setSelectedCustomerId('');
      setSaleNotes('');
      setIsPaymentModalOpen(false);
    } catch (err) {
      console.error('Erro na finalização:', err);
      setCheckoutError('Falha de conexão com o servidor.');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleStartNewSale = () => {
    setCompletedSaleData(null);
    searchInputRef.current?.focus();
  };

  return (
    <div className={styles.pdvContainer}>
      {/* Coluna Esquerda: Busca e Carrinho de Compras */}
      <div className={styles.leftColumn}>
        {/* Barra Superior de Busca / Leitor de Código de Barras */}
        <div className={styles.searchBarWrapper}>
          <div className={styles.searchBar}>
            <Barcode size={22} className={styles.barcodeIcon} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Bipe o código de barras ou digite o nome/SKU da peça (F2)..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className={styles.pdvSearchInput}
            />
            {isSearching && <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
          </div>

          {/* Dropdown de Resultados da Busca */}
          {searchResults.length > 0 && (
            <div className={styles.searchResultsDropdown}>
              {searchResults.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className={styles.searchResultItem}
                >
                  <div className={styles.resultMainInfo}>
                    <strong>{product.name}</strong>
                    <small>
                      SKU: {product.sku} • {product.category?.name} • {product.variants?.length} variações
                    </small>
                  </div>
                  <div className={styles.resultPrice}>
                    {formatCurrency(product.sellPrice)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tabela do Carrinho */}
        <div className={styles.cartCard}>
          <div className={styles.cartHeader}>
            <div className={styles.cartTitleGroup}>
              <ShoppingCart size={20} />
              <span>Itens da Venda ({cart.reduce((a, b) => a + b.quantity, 0)})</span>
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className={styles.clearCartBtn}>
                <Trash2 size={15} />
                <span>Limpar Venda</span>
              </button>
            )}
          </div>

          <div className={styles.cartContent}>
            {cart.length === 0 ? (
              <div className={styles.emptyCart}>
                <Barcode size={48} className={styles.emptyIcon} />
                <h3>Frente de Caixa Pronta</h3>
                <p>Bipe um código de barras com o leitor ou busque acima para adicionar peças.</p>
                <div className={styles.shortcutsTip}>
                  <span><strong>F2:</strong> Buscar Peça</span>
                  <span><strong>F8:</strong> Finalizar Venda</span>
                </div>
              </div>
            ) : (
              <table className={styles.cartTable}>
                <thead>
                  <tr>
                    <th>Item / Variação</th>
                    <th>SKU</th>
                    <th>Preço Unit.</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Qtd</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ width: '40px' }} />
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.variantId}>
                      <td>
                        <div className={styles.cartItemName}>
                          <strong>{item.productName}</strong>
                          <div className={styles.cartItemVariant}>
                            <span className={styles.cartSize}>{item.size}</span>
                            <span className={styles.cartColor}>{item.color}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <code className={styles.cartSku}>{item.sku}</code>
                      </td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td>
                        <div className={styles.qtyControl}>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                            className={styles.qtyBtn}
                          >
                            <Minus size={14} />
                          </button>
                          <span className={styles.qtyValue}>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                            className={styles.qtyBtn}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong className={styles.itemTotal}>
                          {formatCurrency(item.totalPrice)}
                        </strong>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeItem(item.variantId)}
                          className={styles.removeCartItemBtn}
                          title="Remover Item"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Coluna Direita: Totais, Cliente, Desconto e Finalização */}
      <div className={styles.rightColumn}>
        {/* Painel de Identificação do Cliente */}
        <div className={styles.panelCard}>
          <label className={styles.panelLabel}>
            <User size={16} />
            <span>Cliente da Venda</span>
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className={styles.pdvSelect}
          >
            <option value="">Cliente Balcão (Não Identificado)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.documentNumber ? `(${formatDocument(c.documentNumber)})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Painel de Desconto */}
        <div className={styles.panelCard}>
          <label className={styles.panelLabel}>
            <Percent size={16} />
            <span>Desconto na Venda</span>
          </label>
          <div className={styles.discountRow}>
            <div className={styles.discountInputWrapper}>
              <span>R$</span>
              <input
                type="number"
                min={0}
                step="0.50"
                value={discountAmount || ''}
                placeholder="0,00"
                onChange={(e) => applyDiscountValue(parseFloat(e.target.value) || 0)}
                className={styles.discountInput}
              />
            </div>
            <div className={styles.discountInputWrapper}>
              <span>%</span>
              <input
                type="number"
                min={0}
                max={100}
                value={discountPercent ? discountPercent.toFixed(1) : ''}
                placeholder="0%"
                onChange={(e) => applyDiscountPercent(parseFloat(e.target.value) || 0)}
                className={styles.discountInput}
              />
            </div>
          </div>
        </div>

        {/* Resumo Financeiro & Botão de Pagamento */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryRow}>
            <span>Subtotal ({cart.reduce((a, b) => a + b.quantity, 0)} itens):</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>

          {discountAmount > 0 && (
            <div className={`${styles.summaryRow} ${styles.discountSummaryRow}`}>
              <span>Desconto Aplicado:</span>
              <span>- {formatCurrency(discountAmount)}</span>
            </div>
          )}

          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>TOTAL A PAGAR:</span>
            <span className={styles.totalValue}>{formatCurrency(totalAmount)}</span>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={openPaymentModal}
            disabled={cart.length === 0}
            className={styles.checkoutBtn}
            leftIcon={<CreditCard size={20} />}
          >
            FINALIZAR VENDA (F8)
          </Button>
        </div>
      </div>

      {/* Modal de Seleção de Variações */}
      {selectedProductForVariants && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Selecione a Variação</h3>
                <p>{selectedProductForVariants.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductForVariants(null)}
                className={styles.closeBtn}
              >
                ✕
              </button>
            </div>

            <div className={styles.variantsPickerList}>
              {selectedProductForVariants.variants?.map((v: any) => {
                const stockQty = v.stock?.quantity ?? 0;
                return (
                  <button
                    type="button"
                    key={v.id}
                    disabled={stockQty <= 0}
                    onClick={() => {
                      addItemToCart({
                        id: v.id,
                        productId: selectedProductForVariants.id,
                        productName: selectedProductForVariants.name,
                        size: v.size,
                        color: v.color,
                        colorHex: v.colorHex,
                        sku: v.sku,
                        barcode: v.barcode,
                        sellPrice: v.sellPrice ?? selectedProductForVariants.sellPrice,
                        costPrice: v.costPrice ?? selectedProductForVariants.costPrice,
                      });
                      setSelectedProductForVariants(null);
                      setSearchTerm('');
                      searchInputRef.current?.focus();
                    }}
                    className={styles.variantPickItem}
                  >
                    <div className={styles.variantPickDetails}>
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
                      <code>{v.sku}</code>
                    </div>
                    <div className={styles.variantPickRight}>
                      <strong>{formatCurrency(v.sellPrice ?? selectedProductForVariants.sellPrice)}</strong>
                      <Badge variant={stockQty > 0 ? 'success' : 'danger'} size="sm">
                        {stockQty} un em estoque
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pagamentos Divididos */}
      {isPaymentModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.paymentModalCard}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Pagamento da Venda</h3>
                <p>Permite divisão flexível entre múltiplos meios de pagamento.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className={styles.closeBtn}
              >
                ✕
              </button>
            </div>

            {checkoutError && (
              <div className={styles.alertError}>
                <AlertTriangle size={16} />
                <span>{checkoutError}</span>
              </div>
            )}

            <div className={styles.paymentModalContent}>
              {/* Resumo de Valores */}
              <div className={styles.paymentSummaryBar}>
                <div className={styles.paymentSummaryItem}>
                  <span>Total da Venda:</span>
                  <strong>{formatCurrency(totalAmount)}</strong>
                </div>
                <div className={styles.paymentSummaryItem}>
                  <span>Total Pago:</span>
                  <strong style={{ color: 'var(--success-solid)' }}>
                    {formatCurrency(totalPaidSoFar)}
                  </strong>
                </div>
                <div className={styles.paymentSummaryItem}>
                  <span>Restante a Pagar:</span>
                  <strong style={{ color: remainingToPay > 0 ? 'var(--danger-solid)' : 'var(--success-solid)' }}>
                    {formatCurrency(remainingToPay)}
                  </strong>
                </div>
              </div>

              {/* Botões dos Meios de Pagamento */}
              <div className={styles.methodButtonsGrid}>
                <button
                  type="button"
                  onClick={() => setCurrentMethod('DINHEIRO')}
                  className={`${styles.methodBtn} ${currentMethod === 'DINHEIRO' ? styles.methodActive : ''}`}
                >
                  <DollarSign size={20} />
                  <span>Dinheiro</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMethod('PIX')}
                  className={`${styles.methodBtn} ${currentMethod === 'PIX' ? styles.methodActive : ''}`}
                >
                  <QrCode size={20} />
                  <span>PIX</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMethod('CARTAO_DEBITO')}
                  className={`${styles.methodBtn} ${currentMethod === 'CARTAO_DEBITO' ? styles.methodActive : ''}`}
                >
                  <CreditCard size={20} />
                  <span>Débito</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMethod('CARTAO_CREDITO')}
                  className={`${styles.methodBtn} ${currentMethod === 'CARTAO_CREDITO' ? styles.methodActive : ''}`}
                >
                  <CreditCard size={20} />
                  <span>Crédito</span>
                </button>
              </div>

              {/* Formulário do Pagamento Selecionado */}
              <div className={styles.currentPaymentForm}>
                <div className={styles.paymentFormRow}>
                  <Input
                    label={`Valor em ${currentMethod.replace('_', ' ')} (R$)`}
                    type="number"
                    step="0.01"
                    min={0.01}
                    value={currentAmountInput || ''}
                    onChange={(e) => setCurrentAmountInput(parseFloat(e.target.value) || 0)}
                  />

                  {currentMethod === 'CARTAO_CREDITO' && (
                    <div className={styles.selectWrapper}>
                      <label className={styles.inputLabel}>Parcelamento</label>
                      <select
                        value={currentInstallments}
                        onChange={(e) => setCurrentInstallments(parseInt(e.target.value) || 1)}
                        className={styles.pdvSelect}
                      >
                        <option value="1">1x à vista ({formatCurrency(currentAmountInput)})</option>
                        <option value="2">2x de {formatCurrency(currentAmountInput / 2)}</option>
                        <option value="3">3x de {formatCurrency(currentAmountInput / 3)}</option>
                        <option value="4">4x de {formatCurrency(currentAmountInput / 4)}</option>
                        <option value="5">5x de {formatCurrency(currentAmountInput / 5)}</option>
                        <option value="6">6x de {formatCurrency(currentAmountInput / 6)}</option>
                      </select>
                    </div>
                  )}

                  {currentMethod === 'DINHEIRO' && (
                    <Input
                      label="Valor Recebido do Cliente (Para Troco)"
                      type="number"
                      step="0.01"
                      min={0}
                      value={cashReceivedInput || ''}
                      onChange={(e) => setCashReceivedInput(parseFloat(e.target.value) || 0)}
                    />
                  )}
                </div>

                {currentMethod === 'DINHEIRO' && cashReceivedInput > currentAmountInput && (
                  <div className={styles.changeDisplayBox}>
                    <span>Troco a devolver:</span>
                    <strong>{formatCurrency(cashReceivedInput - currentAmountInput)}</strong>
                  </div>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handleAddPayment}
                  disabled={currentAmountInput <= 0}
                  leftIcon={<Plus size={16} />}
                >
                  Adicionar Pagamento
                </Button>
              </div>

              {/* Lista de Pagamentos Lançados */}
              {payments.length > 0 && (
                <div className={styles.paymentsListSection}>
                  <label className={styles.inputLabel}>Pagamentos Lançados nesta Venda:</label>
                  <div className={styles.paymentsList}>
                    {payments.map((p, idx) => (
                      <div key={idx} className={styles.paymentEntryItem}>
                        <div className={styles.paymentEntryInfo}>
                          <strong>{p.method.replace('_', ' ')}</strong>
                          {p.installments > 1 && <small> ({p.installments}x)</small>}
                          {p.changeAmount && (
                            <small style={{ color: 'var(--text-muted)' }}>
                              {' '}• Recebido: {formatCurrency(p.receivedAmount)} | Troco: {formatCurrency(p.changeAmount)}
                            </small>
                          )}
                        </div>
                        <div className={styles.paymentEntryRight}>
                          <strong>{formatCurrency(p.amount)}</strong>
                          <button
                            type="button"
                            onClick={() => removePaymentEntry(idx)}
                            className={styles.removePaymentBtn}
                            title="Remover"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsPaymentModalOpen(false)}
              >
                Voltar ao Carrinho
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleFinalizeSale}
                isLoading={isFinalizing}
                disabled={remainingToPay > 0.05}
                leftIcon={<CheckCircle2 size={18} />}
              >
                CONFIRMAR & EMITIR RECIBO
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Venda Concluída / Comprovante */}
      {completedSaleData && (
        <div className={styles.modalOverlay}>
          <div className={styles.receiptModalCard}>
            <div className={styles.receiptHeader}>
              <div className={styles.successIconBadge}>
                <CheckCircle2 size={32} />
              </div>
              <h2>Venda Finalizada com Sucesso!</h2>
              <p>Código da Venda: <strong>{completedSaleData.code}</strong></p>
            </div>

            {/* Cupom Formatado */}
            <div className={styles.printableReceipt}>
              <div className={styles.receiptStoreName}>BOUTIQUE KIDS & TEENS</div>
              <div className={styles.receiptMeta}>
                Data: {formatDateTime(completedSaleData.date)}<br />
                Cliente: {completedSaleData.customer}<br />
                Venda: {completedSaleData.code}
              </div>
              <div className={styles.receiptDivider} />

              <table className={styles.receiptTable}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qtd</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {completedSaleData.items.map((it: any, i: number) => (
                    <tr key={i}>
                      <td>{it.productName} ({it.size}/{it.color})</td>
                      <td>{it.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(it.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className={styles.receiptDivider} />
              <div className={styles.receiptTotals}>
                <div>Subtotal: {formatCurrency(completedSaleData.subtotal)}</div>
                {completedSaleData.discountAmount > 0 && (
                  <div>Desconto: - {formatCurrency(completedSaleData.discountAmount)}</div>
                )}
                <strong>TOTAL: {formatCurrency(completedSaleData.totalAmount)}</strong>
              </div>

              <div className={styles.receiptDivider} />
              <div className={styles.receiptPayments}>
                {completedSaleData.payments.map((p: any, i: number) => (
                  <div key={i}>
                    {p.method.replace('_', ' ')}: {formatCurrency(p.amount)}
                    {p.changeAmount && ` (Troco: ${formatCurrency(p.changeAmount)})`}
                  </div>
                ))}
              </div>

              <div className={styles.receiptFooterText}>
                Obrigado pela preferência!<br />
                Trocas em até 30 dias com etiqueta.
              </div>
            </div>

            <div className={styles.receiptActions}>
              <Button
                variant="outline"
                size="md"
                onClick={handlePrintReceipt}
                leftIcon={<Printer size={16} />}
              >
                Imprimir Recibo
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleStartNewSale}
                rightIcon={<ArrowRight size={16} />}
              >
                Nova Venda (F2)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

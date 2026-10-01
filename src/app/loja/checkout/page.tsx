'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  ArrowLeft,
  ShieldCheck,
  Truck,
  Store,
  CreditCard,
  QrCode,
  Banknote,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Phone,
  MessageCircle,
  Clock,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import styles from './checkout.module.css';

interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  size: string;
  color: string;
  colorHex?: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  availableStock: number;
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerDoc, setCustomerDoc] = useState('');

  // Delivery
  const [deliveryType, setDeliveryType] = useState<'RETIRADA' | 'ENTREGA'>('RETIRADA');
  const [zipCode, setZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  // Payment & Coupon
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [notes, setNotes] = useState('');

  // Success State
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);

  useEffect(() => {
    setIsClient(true);
    try {
      const saved = localStorage.getItem('loja_carrinho');
      if (saved) {
        setCart(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Handle CEP Autocomplete
  const handleCepBlur = async () => {
    const cleanCep = zipCode.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setIsLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setAddress(data.logradouro || '');
          setNeighborhood(data.bairro || '');
          setCity(data.localidade || '');
          setState(data.uf || '');
        }
      } catch (err) {
        console.error('Erro ao consultar CEP:', err);
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  const subtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const shippingFee = deliveryType === 'ENTREGA' ? 15.0 : 0.0;
  const discountAmount = appliedCoupon ? appliedCoupon.discount : 0;
  const grandTotal = Math.max(0, subtotal + shippingFee - discountAmount);

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    const code = couponCode.toUpperCase().trim();
    if (code === 'BEMVINDO10' || code === 'PRIMEIRACOMPRA') {
      const discount = subtotal * 0.1; // 10%
      setAppliedCoupon({ code, discount });
    } else {
      // Simulação padrão de cupom válido ou desconto fixo
      const discount = 15.0;
      setAppliedCoupon({ code, discount: Math.min(discount, subtotal) });
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage('Por favor, informe seu Nome Completo e WhatsApp/Telefone.');
      return;
    }

    if (deliveryType === 'ENTREGA' && (!address.trim() || !number.trim() || !city.trim())) {
      setErrorMessage('Por favor, preencha o endereço completo para entrega.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customerName,
        customerPhone,
        customerWhatsapp: customerWhatsapp || customerPhone,
        customerEmail: customerEmail || null,
        customerDoc: customerDoc || null,
        deliveryType,
        zipCode: zipCode || null,
        address: address || null,
        number: number || null,
        complement: complement || null,
        neighborhood: neighborhood || null,
        city: city || null,
        state: state || null,
        couponCode: appliedCoupon?.code || null,
        paymentMethod,
        notes: notes || null,
        items: cart.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      };

      const res = await fetch('/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar checkout');
      }

      // Sucesso!
      setOrderSuccess(data);
      // Limpa carrinho
      localStorage.removeItem('loja_carrinho');
      setCart([]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado ao realizar pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isClient) {
    return null;
  }

  // TELA DE SUCESSO APÓS FINALIZAR O PEDIDO
  if (orderSuccess) {
    return (
      <div className={styles.checkoutPage}>
        <header className={styles.checkoutHeader}>
          <div className={styles.headerContainer}>
            <Link href="/loja" className={styles.brandLogo}>
              <div className={styles.logoIcon}>
                <Sparkles size={22} />
              </div>
              <div>
                <h1>KIDS & TEENS BOUTIQUE</h1>
                <span>Moda Infantil e Juvenil</span>
              </div>
            </Link>
            <div className={styles.secureBadge}>
              <ShieldCheck size={16} />
              <span>Pedido Confirmado</span>
            </div>
          </div>
        </header>

        <main className={styles.checkoutContainer}>
          <div className={styles.successCard}>
            <div className={styles.successIconBadge}>
              <CheckCircle2 size={40} />
            </div>

            <h2>Pedido Realizado com Sucesso!</h2>
            <p>Seus produtos já foram separados e reservados no nosso estoque centralizado.</p>

            <div className={styles.orderNumberHighlight}>
              <span>Número do seu Pedido</span>
              <strong>{orderSuccess.orderNumber}</strong>
            </div>

            <div className={styles.successInfoBox}>
              <p>
                <strong>Tipo de Atendimento:</strong>{' '}
                {orderSuccess.deliveryType === 'RETIRADA'
                  ? 'Retirada no Balcão da Loja Física'
                  : 'Entrega em Domicílio / Envio'}
              </p>
              <p>
                <strong>Valor Total:</strong> {formatCurrency(orderSuccess.totalAmount)}
              </p>
              <p style={{ marginTop: '0.5rem', color: '#64748b' }}>
                Para agilizar a conferência, pagamento ou tirar dúvidas, envie uma mensagem direta
                para a atendente da nossa loja no WhatsApp clicando no botão abaixo:
              </p>
            </div>

            <div className={styles.successActions}>
              {orderSuccess.whatsappLink && (
                <a
                  href={orderSuccess.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.whatsappButton}
                >
                  <MessageCircle size={22} />
                  <span>Acompanhar Pedido no WhatsApp da Loja</span>
                </a>
              )}

              <Link href="/loja">
                <Button type="button" variant="outline" size="lg" style={{ width: '100%' }}>
                  Voltar para o Catálogo da Loja
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // CARRINHO VAZIO
  if (cart.length === 0) {
    return (
      <div className={styles.checkoutPage}>
        <header className={styles.checkoutHeader}>
          <div className={styles.headerContainer}>
            <Link href="/loja" className={styles.brandLogo}>
              <div className={styles.logoIcon}>
                <Sparkles size={22} />
              </div>
              <div>
                <h1>KIDS & TEENS BOUTIQUE</h1>
                <span>Moda Infantil e Juvenil</span>
              </div>
            </Link>
          </div>
        </header>

        <main className={styles.checkoutContainer}>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <ShoppingBag size={42} />
            </div>
            <h2>Seu carrinho está vazio</h2>
            <p>Escolha seus looks infantis e juvenis favoritos no catálogo para finalizar seu pedido.</p>
            <Link href="/loja">
              <Button type="button" variant="primary" size="lg">
                Explorar Coleção Completa
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.checkoutPage}>
      <header className={styles.checkoutHeader}>
        <div className={styles.headerContainer}>
          <Link href="/loja" className={styles.brandLogo}>
            <div className={styles.logoIcon}>
              <Sparkles size={22} />
            </div>
            <div>
              <h1>KIDS & TEENS BOUTIQUE</h1>
              <span>Checkout Seguro</span>
            </div>
          </Link>
          <div className={styles.secureBadge}>
            <ShieldCheck size={16} />
            <span>Ambiente 100% Protegido</span>
          </div>
        </div>
      </header>

      <main className={styles.checkoutContainer}>
        <Link href="/loja" className={styles.backLink}>
          <ArrowLeft size={16} />
          <span>Voltar para a Loja</span>
        </Link>

        {errorMessage && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '1rem',
              borderRadius: '0.75rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontWeight: 600,
            }}
          >
            <AlertCircle size={20} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmitOrder}>
          <div className={styles.checkoutGrid}>
            {/* COLUNA ESQUERDA: ETAPAS DE IDENTIFICAÇÃO, ENTREGA E PAGAMENTO */}
            <div className={styles.formSections}>
              {/* ETAPA 1: DADOS DO CLIENTE */}
              <div className={styles.cardSection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.stepNumber}>1</div>
                  <div>
                    <h2 className={styles.sectionTitle}>Seus Dados para Contato</h2>
                    <p className={styles.sectionSubtitle}>
                      Usaremos essas informações para confirmar seu pedido e enviar o comprovante
                    </p>
                  </div>
                </div>

                <div className={styles.formGrid2}>
                  <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                    <label>Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Mariana Silva"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>WhatsApp / Celular *</label>
                    <input
                      type="tel"
                      required
                      placeholder="(00) 00000-0000"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>E-mail (opcional)</label>
                    <input
                      type="email"
                      placeholder="seu.email@exemplo.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>CPF (opcional para nota)</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={customerDoc}
                      onChange={(e) => setCustomerDoc(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* ETAPA 2: FORMA DE ENTREGA */}
              <div className={styles.cardSection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.stepNumber}>2</div>
                  <div>
                    <h2 className={styles.sectionTitle}>Forma de Entrega / Retirada</h2>
                    <p className={styles.sectionSubtitle}>
                      Escolha como deseja receber seus produtos
                    </p>
                  </div>
                </div>

                <div className={styles.deliveryOptions}>
                  <div
                    className={`${styles.deliveryOptionCard} ${
                      deliveryType === 'RETIRADA' ? styles.deliveryActive : ''
                    }`}
                    onClick={() => setDeliveryType('RETIRADA')}
                  >
                    <div className={styles.deliveryIconBox}>
                      <Store size={22} />
                    </div>
                    <div className={styles.deliveryDetails}>
                      <strong>Retirada no Balcão</strong>
                      <span>Disponível em até 2 horas úteis</span>
                      <div className={styles.deliveryPrice}>Grátis</div>
                    </div>
                  </div>

                  <div
                    className={`${styles.deliveryOptionCard} ${
                      deliveryType === 'ENTREGA' ? styles.deliveryActive : ''
                    }`}
                    onClick={() => setDeliveryType('ENTREGA')}
                  >
                    <div className={styles.deliveryIconBox}>
                      <Truck size={22} />
                    </div>
                    <div className={styles.deliveryDetails}>
                      <strong>Entrega em Domicílio</strong>
                      <span>Envio com rastreamento seguro</span>
                      <div className={styles.deliveryPrice}>R$ 15,00</div>
                    </div>
                  </div>
                </div>

                {deliveryType === 'ENTREGA' && (
                  <div className={styles.formGrid3} style={{ marginTop: '1rem' }}>
                    <div className={styles.inputGroup}>
                      <label>CEP * {isLoadingCep && '(Buscando...)'}</label>
                      <input
                        type="text"
                        placeholder="00000-000"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        onBlur={handleCepBlur}
                      />
                    </div>

                    <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                      <label>Logradouro / Rua *</label>
                      <input
                        type="text"
                        placeholder="Rua, Avenida..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label>Número *</label>
                      <input
                        type="text"
                        placeholder="123"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label>Complemento</label>
                      <input
                        type="text"
                        placeholder="Apto, Bloco..."
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label>Bairro *</label>
                      <input
                        type="text"
                        placeholder="Bairro"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                      />
                    </div>

                    <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                      <label>Cidade *</label>
                      <input
                        type="text"
                        placeholder="Cidade"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label>Estado (UF) *</label>
                      <input
                        type="text"
                        placeholder="SP"
                        maxLength={2}
                        value={state}
                        onChange={(e) => setState(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ETAPA 3: FORMA DE PAGAMENTO & OBSERVAÇÕES */}
              <div className={styles.cardSection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.stepNumber}>3</div>
                  <div>
                    <h2 className={styles.sectionTitle}>Forma de Pagamento</h2>
                    <p className={styles.sectionSubtitle}>
                      Selecione a forma preferida para pagamento
                    </p>
                  </div>
                </div>

                <div className={styles.paymentOptions}>
                  <div
                    className={`${styles.paymentOptionCard} ${
                      paymentMethod === 'PIX' ? styles.paymentActive : ''
                    }`}
                    onClick={() => setPaymentMethod('PIX')}
                  >
                    <div className={styles.paymentIconBox}>
                      <QrCode size={20} />
                    </div>
                    <div>
                      <strong>PIX Imediato</strong>
                      <small style={{ color: '#059669', display: 'block' }}>Aprovação instantânea</small>
                    </div>
                  </div>

                  <div
                    className={`${styles.paymentOptionCard} ${
                      paymentMethod === 'CARTAO_CREDITO' ? styles.paymentActive : ''
                    }`}
                    onClick={() => setPaymentMethod('CARTAO_CREDITO')}
                  >
                    <div className={styles.paymentIconBox}>
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <strong>Cartão de Crédito</strong>
                      <small style={{ color: '#64748b', display: 'block' }}>Até 6x sem juros</small>
                    </div>
                  </div>

                  <div
                    className={`${styles.paymentOptionCard} ${
                      paymentMethod === 'CARTAO_DEBITO' ? styles.paymentActive : ''
                    }`}
                    onClick={() => setPaymentMethod('CARTAO_DEBITO')}
                  >
                    <div className={styles.paymentIconBox}>
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <strong>Cartão de Débito</strong>
                      <small style={{ color: '#64748b', display: 'block' }}>No balcão / entrega</small>
                    </div>
                  </div>

                  <div
                    className={`${styles.paymentOptionCard} ${
                      paymentMethod === 'DINHEIRO' ? styles.paymentActive : ''
                    }`}
                    onClick={() => setPaymentMethod('DINHEIRO')}
                  >
                    <div className={styles.paymentIconBox}>
                      <Banknote size={20} />
                    </div>
                    <div>
                      <strong>Dinheiro em Espécie</strong>
                      <small style={{ color: '#64748b', display: 'block' }}>Na retirada / entrega</small>
                    </div>
                  </div>
                </div>

                <div className={styles.inputGroup} style={{ marginTop: '1.5rem' }}>
                  <label>Observações ou Instruções Especiais (opcional)</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Embalar para presente de aniversário, deixar na portaria..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA: RESUMO DO PEDIDO E FINALIZAÇÃO */}
            <div className={styles.summarySidebar}>
              <h3 className={styles.summaryTitle}>Resumo do Pedido</h3>

              <div className={styles.orderItemsList}>
                {cart.map((item) => (
                  <div key={item.variantId} className={styles.orderItemRow}>
                    <div className={styles.itemMain}>
                      <strong>{item.productName}</strong>
                      <span>
                        Tam: {item.size} • Cor: {item.color} • Qtd: {item.quantity}
                      </span>
                    </div>
                    <div className={styles.itemPriceQty}>
                      <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                      <small>{formatCurrency(item.unitPrice)} un</small>
                    </div>
                  </div>
                ))}
              </div>

              {/* CUPOM DE DESCONTO */}
              <div className={styles.couponBox}>
                <input
                  type="text"
                  placeholder="Cupom de Desconto"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleApplyCoupon}
                >
                  Aplicar
                </Button>
              </div>

              {appliedCoupon && (
                <div
                  style={{
                    background: '#ecfdf5',
                    color: '#065f46',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.8125rem',
                    marginBottom: '1rem',
                    fontWeight: 600,
                  }}
                >
                  ✓ Cupom {appliedCoupon.code} aplicado (-{formatCurrency(appliedCoupon.discount)})
                </div>
              )}

              {/* TOTAIS */}
              <div className={styles.totalsBreakdown}>
                <div className={styles.totalRow}>
                  <span>Subtotal:</span>
                  <strong>{formatCurrency(subtotal)}</strong>
                </div>

                {appliedCoupon && (
                  <div className={`${styles.totalRow} ${styles.discount}`}>
                    <span>Desconto do Cupom:</span>
                    <strong>-{formatCurrency(appliedCoupon.discount)}</strong>
                  </div>
                )}

                <div className={styles.totalRow}>
                  <span>Frete ({deliveryType === 'RETIRADA' ? 'Retirada' : 'Entrega'}):</span>
                  <strong>{shippingFee === 0 ? 'Grátis' : formatCurrency(shippingFee)}</strong>
                </div>

                <div className={styles.grandTotalRow}>
                  <span>Total a Pagar:</span>
                  <strong>{formatCurrency(grandTotal)}</strong>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={styles.submitOrderBtn}
              >
                {isSubmitting ? (
                  <span>Processando Pedido...</span>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>Concluir Pedido ({formatCurrency(grandTotal)})</span>
                  </>
                )}
              </button>

              <div className={styles.safetyNotice}>
                <ShieldCheck size={16} />
                <span>Estoque centralizado garantido em tempo real</span>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

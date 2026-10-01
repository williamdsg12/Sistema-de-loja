'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Search,
  Filter,
  Sparkles,
  Heart,
  ChevronRight,
  Truck,
  ShieldCheck,
  CreditCard,
  QrCode,
  X,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Menu,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import styles from './loja.module.css';

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

export default function LojaPublicaPage() {
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [isLoading, setIsLoading] = useState(true);

  // Carrinho de Compras (Salvo em localStorage)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Modal de Seleção de Variação Rápida
  const [productForModal, setProductForModal] = useState<any | null>(null);
  const [modalSize, setModalSize] = useState('');
  const [modalColor, setModalColor] = useState('');

  // Carrega carrinho salvo
  useEffect(() => {
    try {
      const saved = localStorage.getItem('loja_carrinho');
      if (saved) {
        setCart(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Salva carrinho quando altera
  useEffect(() => {
    try {
      localStorage.setItem('loja_carrinho', JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart]);

  const fetchCatalog = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedGender) params.append('gender', selectedGender);
      if (selectedAgeGroup) params.append('ageGroup', selectedAgeGroup);
      if (selectedBrand) params.append('brand', selectedBrand);
      if (selectedSize) params.append('size', selectedSize);
      if (sortOption) params.append('sort', sortOption);

      const res = await fetch(`/api/store/catalog?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Erro ao buscar catálogo:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [selectedCategory, selectedGender, selectedAgeGroup, selectedBrand, selectedSize, sortOption]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCatalog();
  };

  // Abre modal de seleção para adicionar ao carrinho
  const handleOpenAddToCart = (product: any) => {
    if (product.variants?.length === 1) {
      const v = product.variants[0];
      if (v.availableStock > 0) {
        addItemToCart(product, v);
        return;
      }
    }
    setProductForModal(product);
    setModalSize(product.variants?.[0]?.size || '');
    setModalColor(product.variants?.[0]?.color || '');
  };

  const addItemToCart = (prod: any, variant: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.variantId === variant.id);
      if (existing) {
        if (existing.quantity >= variant.availableStock) {
          alert('Quantidade máxima disponível em estoque atingida.');
          return prev;
        }
        return prev.map((item) =>
          item.variantId === variant.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [
          ...prev,
          {
            variantId: variant.id,
            productId: prod.id,
            productName: prod.name,
            size: variant.size,
            color: variant.color,
            colorHex: variant.colorHex,
            sku: variant.sku,
            unitPrice: Number(variant.sellPrice || prod.sellPrice || 0),
            quantity: 1,
            availableStock: variant.availableStock,
          },
        ];
      }
    });
    setProductForModal(null);
    setIsCartOpen(true);
  };

  const updateCartQty = (variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variantId === variantId) {
            const newQty = item.quantity + delta;
            if (newQty > item.availableStock) {
              alert('Quantidade limite em estoque atingida.');
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((it) => it.variantId !== variantId));
  };

  const totalCartPieces = cart.reduce((sum, it) => sum + it.quantity, 0);
  const cartSubtotal = cart.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);

  const products = data?.products || [];
  const categories = data?.categories || [];
  const brands = data?.brands || [];
  const store = data?.store || { name: 'Pequenos & Cia Moda Infantil' };

  return (
    <div className={styles.storeContainer}>
      {/* Top Banner de Avisos */}
      <div className={styles.topNoticeBar}>
        <span>✨ Frete Grátis para Retirada no Balcão da Loja Física • Peças 100% Algodão & Conforto Kids</span>
      </div>

      {/* Header da Loja */}
      <header className={styles.storeHeader}>
        <div className={styles.headerContent}>
          <Link href="/loja" className={styles.brandLogo}>
            <span className={styles.brandBadge}>KIDS & TEEN</span>
            <h2>{store.name}</h2>
          </Link>

          {/* Busca de Produtos */}
          <form onSubmit={handleSearchSubmit} className={styles.searchBar}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar vestidos, conjuntos, camisetas, bermudas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchBtn}>
              Buscar
            </button>
          </form>

          {/* Botão Carrinho */}
          <button
            type="button"
            className={styles.cartButton}
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingBag size={22} />
            <div className={styles.cartBtnText}>
              <small>Meu Carrinho</small>
              <strong>{formatCurrency(cartSubtotal)}</strong>
            </div>
            {totalCartPieces > 0 && (
              <span className={styles.cartCountBadge}>{totalCartPieces}</span>
            )}
          </button>
        </div>
      </header>

      {/* Menu Rápido de Categorias & Filtros Principais */}
      <nav className={styles.categoryNav}>
        <div className={styles.categoryNavScroll}>
          <button
            type="button"
            className={`${styles.navItem} ${!selectedGender && !selectedCategory ? styles.navActive : ''}`}
            onClick={() => {
              setSelectedGender('');
              setSelectedCategory('');
              setSelectedAgeGroup('');
            }}
          >
            Todos os Produtos
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${selectedGender === 'MENINA' ? styles.navActive : ''}`}
            onClick={() => setSelectedGender(selectedGender === 'MENINA' ? '' : 'MENINA')}
          >
            👧 Meninas
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${selectedGender === 'MENINO' ? styles.navActive : ''}`}
            onClick={() => setSelectedGender(selectedGender === 'MENINO' ? '' : 'MENINO')}
          >
            👦 Meninos
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${selectedGender === 'UNISSEX' ? styles.navActive : ''}`}
            onClick={() => setSelectedGender(selectedGender === 'UNISSEX' ? '' : 'UNISSEX')}
          >
            👶 Bebê & Primeiros Passos
          </button>

          {categories.map((c: any) => (
            <button
              key={c.id}
              type="button"
              className={`${styles.navItem} ${selectedCategory === c.slug ? styles.navActive : ''}`}
              onClick={() => setSelectedCategory(selectedCategory === c.slug ? '' : c.slug)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </nav>

      {/* Hero Banner Showcase */}
      <div className={styles.heroSection}>
        <div className={styles.heroContent}>
          <span className={styles.heroTag}>Nova Coleção 2026</span>
          <h1>Moda Infantil & Juvenil com Conforto e Estilo Real</h1>
          <p>Roupas de alta durabilidade, tecidos antialérgicos e modelagens pensadas para a liberdade dos pequenos.</p>
          <div className={styles.heroBadges}>
            <div className={styles.heroBadgeItem}><Truck size={16} /> Envio Rápido</div>
            <div className={styles.heroBadgeItem}><QrCode size={16} /> Pagamento PIX Instantâneo</div>
            <div className={styles.heroBadgeItem}><ShieldCheck size={16} /> Estoque Integrado 100% Real</div>
          </div>
        </div>
      </div>

      {/* Grid Principal: Filtros Laterais & Produtos */}
      <div className={styles.mainGrid}>
        {/* FILTROS LATERAIS */}
        <aside className={styles.filterSidebar}>
          <div className={styles.filterSidebarHeader}>
            <Filter size={18} />
            <h3>Filtros da Loja</h3>
          </div>

          {/* Faixa Etária */}
          <div className={styles.filterGroup}>
            <label className={styles.filterGroupTitle}>Faixa Etária</label>
            <div className={styles.filterPills}>
              {['BEBE', 'PRIMEIROS_PASSOS', 'INFANTIL', 'TEEN'].map((ag) => (
                <button
                  key={ag}
                  type="button"
                  className={`${styles.pillBtn} ${selectedAgeGroup === ag ? styles.pillActive : ''}`}
                  onClick={() => setSelectedAgeGroup(selectedAgeGroup === ag ? '' : ag)}
                >
                  {ag === 'BEBE'
                    ? 'Bebê (0-2)'
                    : ag === 'PRIMEIROS_PASSOS'
                    ? 'Primeiros Passos (2-4)'
                    : ag === 'INFANTIL'
                    ? 'Infantil (4-12)'
                    : 'Juvenil / Teen'}
                </button>
              ))}
            </div>
          </div>

          {/* Tamanhos */}
          <div className={styles.filterGroup}>
            <label className={styles.filterGroupTitle}>Tamanho</label>
            <div className={styles.sizesPillsGrid}>
              {['RN', 'P', 'M', 'G', '1', '2', '3', '4', '6', '8', '10', '12', '14', '16'].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  className={`${styles.sizePill} ${selectedSize === sz ? styles.sizePillActive : ''}`}
                  onClick={() => setSelectedSize(selectedSize === sz ? '' : sz)}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* Marcas */}
          {brands.length > 0 && (
            <div className={styles.filterGroup}>
              <label className={styles.filterGroupTitle}>Marcas</label>
              <select
                className={styles.sidebarSelect}
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
              >
                <option value="">Todas as Marcas</option>
                {brands.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Limpar Filtros */}
          {(selectedCategory || selectedGender || selectedAgeGroup || selectedBrand || selectedSize || search) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={styles.clearFiltersBtn}
              onClick={() => {
                setSearch('');
                setSelectedCategory('');
                setSelectedGender('');
                setSelectedAgeGroup('');
                setSelectedBrand('');
                setSelectedSize('');
              }}
            >
              Limpar Todos os Filtros
            </Button>
          )}
        </aside>

        {/* VITRINE DE PRODUTOS */}
        <main className={styles.productsSection}>
          <div className={styles.productsHeader}>
            <span>Exibindo <strong>{products.length}</strong> produtos disponíveis</span>

            <div className={styles.sortWrapper}>
              <label>Ordenar por:</label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className={styles.sortSelect}
              >
                <option value="newest">Mais Recentes</option>
                <option value="price_asc">Menor Preço</option>
                <option value="price_desc">Maior Preço</option>
                <option value="name">Nome A-Z</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className={styles.loadingContainer}>
              <RefreshCw size={32} className="animate-spin" />
              <p>Carregando catálogo...</p>
            </div>
          ) : products.length === 0 ? (
            <div className={styles.emptyProducts}>
              <ShoppingBag size={48} />
              <h3>Nenhum produto encontrado</h3>
              <p>Tente ajustar os filtros de categoria, tamanho ou termo de busca.</p>
            </div>
          ) : (
            <div className={styles.productsGrid}>
              {products.map((p: any) => (
                <div key={p.id} className={styles.productCard}>
                  {/* Imagem / Placeholder */}
                  <div className={styles.productImageWrapper}>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className={styles.productImg} />
                    ) : (
                      <div className={styles.productImgPlaceholder}>
                        <ShoppingBag size={40} />
                      </div>
                    )}
                    {p.gender && (
                      <span className={styles.genderTag}>{p.gender}</span>
                    )}
                  </div>

                  {/* Detalhes */}
                  <div className={styles.productInfo}>
                    {p.category && (
                      <span className={styles.productCategory}>{p.category.name}</span>
                    )}
                    <h4 className={styles.productName}>{p.name}</h4>

                    {/* Variações de Tamanho */}
                    <div className={styles.cardSizesRow}>
                      {p.variants?.slice(0, 6).map((v: any) => (
                        <span
                          key={v.id}
                          className={`${styles.cardSizePill} ${
                            v.availableStock <= 0 ? styles.cardSizeOut : ''
                          }`}
                          title={`Cor: ${v.color} - ${v.availableStock} disponíveis`}
                        >
                          {v.size}
                        </span>
                      ))}
                      {p.variants?.length > 6 && (
                        <span className={styles.cardMoreSizes}>+{p.variants.length - 6}</span>
                      )}
                    </div>

                    {/* Preço e Ação */}
                    <div className={styles.productBottom}>
                      <div className={styles.priceGroup}>
                        <small>Por apenas</small>
                        <span className={styles.productPrice}>{formatCurrency(p.sellPrice)}</span>
                      </div>

                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        className={styles.buyBtn}
                        onClick={() => handleOpenAddToCart(p)}
                        disabled={!p.hasStock}
                      >
                        {p.hasStock ? 'Comprar' : 'Esgotado'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* MODAL DE SELEÇÃO DE TAMANHO / COR ANTES DE ADICIONAR */}
      {productForModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <h3>{productForModal.name}</h3>
                <p>Escolha o tamanho e cor desejados</p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setProductForModal(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.variantPickSection}>
                <label className={styles.pickLabel}>Tamanho:</label>
                <div className={styles.pickSizesGrid}>
                  {Array.from(new Set(productForModal.variants?.map((v: any) => v.size))).map(
                    (sz: any) => (
                      <button
                        key={sz}
                        type="button"
                        className={`${styles.pickSizeBtn} ${modalSize === sz ? styles.pickActive : ''}`}
                        onClick={() => setModalSize(sz)}
                      >
                        {sz}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className={styles.variantPickSection} style={{ marginTop: '1rem' }}>
                <label className={styles.pickLabel}>Cores Disponíveis:</label>
                <div className={styles.pickColorsGrid}>
                  {productForModal.variants
                    ?.filter((v: any) => v.size === modalSize)
                    .map((v: any) => (
                      <button
                        key={v.id}
                        type="button"
                        disabled={v.availableStock <= 0}
                        className={`${styles.pickColorBtn} ${
                          modalColor === v.color ? styles.pickColorActive : ''
                        } ${v.availableStock <= 0 ? styles.pickColorOut : ''}`}
                        onClick={() => setModalColor(v.color)}
                      >
                        {v.colorHex && (
                          <span
                            className={styles.colorDot}
                            style={{ backgroundColor: v.colorHex }}
                          />
                        )}
                        <span>{v.color}</span>
                        <small>({v.availableStock} un)</small>
                      </button>
                    ))}
                </div>
              </div>

              <div className={styles.modalPriceHighlight}>
                <span>Valor:</span>
                <strong>{formatCurrency(productForModal.sellPrice)}</strong>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <Button
                type="button"
                variant="primary"
                size="md"
                className={styles.confirmAddBtn}
                onClick={() => {
                  const targetVariant = productForModal.variants?.find(
                    (v: any) => v.size === modalSize && v.color === modalColor
                  );
                  if (targetVariant) {
                    addItemToCart(productForModal, targetVariant);
                  } else {
                    alert('Selecione uma combinação de tamanho e cor disponível.');
                  }
                }}
              >
                Adicionar ao Carrinho
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER / OFFCANVAS DO CARRINHO DE COMPRAS */}
      {isCartOpen && (
        <div className={styles.cartOverlay} onClick={() => setIsCartOpen(false)}>
          <div className={styles.cartDrawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.cartDrawerHeader}>
              <div>
                <h3>Meu Carrinho ({totalCartPieces} itens)</h3>
                <p>Itens reservados no estoque durante o checkout</p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsCartOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.cartDrawerBody}>
              {cart.length === 0 ? (
                <div className={styles.emptyCartBox}>
                  <ShoppingBag size={48} />
                  <p>Seu carrinho está vazio.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCartOpen(false)}
                  >
                    Continuar Comprando
                  </Button>
                </div>
              ) : (
                <div className={styles.cartItemsList}>
                  {cart.map((item) => (
                    <div key={item.variantId} className={styles.cartItemRow}>
                      <div className={styles.cartItemInfo}>
                        <strong>{item.productName}</strong>
                        <small>
                          Tam: {item.size} • Cor: {item.color}
                        </small>
                        <span className={styles.cartItemPrice}>
                          {formatCurrency(item.unitPrice)}
                        </span>
                      </div>

                      <div className={styles.cartItemActions}>
                        <div className={styles.qtyControls}>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.variantId, -1)}
                          >
                            <Minus size={14} />
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.variantId, 1)}
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <button
                          type="button"
                          className={styles.cartRemoveBtn}
                          onClick={() => removeFromCart(item.variantId)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className={styles.cartDrawerFooter}>
                <div className={styles.cartSubtotalRow}>
                  <span>Subtotal:</span>
                  <strong>{formatCurrency(cartSubtotal)}</strong>
                </div>

                <Link href="/loja/checkout" style={{ width: '100%' }}>
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    className={styles.checkoutBtn}
                  >
                    Finalizar Compra ({formatCurrency(cartSubtotal)})
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

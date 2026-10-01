'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Globe,
  Store,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Truck,
  Sparkles,
  Layers,
  Tag,
  CheckCircle2,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import styles from './loja-admin.module.css';

export default function LojaOnlineAdminPage() {
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [publishedCount, setPublishedCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchStore();
  }, []);

  const fetchStore = async () => {
    try {
      const res = await fetch('/api/store/catalog');
      const data = await res.json();
      if (res.ok) {
        setStoreInfo(data.store);
        setPublishedCount(data.totalProducts || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyLink = () => {
    const storeUrl = `${window.location.origin}/loja`;
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>Loja Online & Catálogo E-commerce</h1>
          <p>Configure a vitrine virtual, parâmetros de frete, retirada e atendimento</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleCopyLink}
          >
            <Copy size={16} />
            <span>{copied ? 'Link Copiado!' : 'Copiar Link da Loja'}</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => window.open('/loja', '_blank')}
          >
            <ExternalLink size={16} />
            <span>Abrir Loja Virtual</span>
          </Button>
        </div>
      </div>

      {/* HERO BANNER */}
      <div className={styles.bannerHero}>
        <div className={styles.heroContent}>
          <h2>Sua Loja Virtual está Ativa e Integrada ao Estoque Central</h2>
          <p>
            Qualquer item vendido no balcão (PDV) atualiza imediatamente a disponibilidade na
            loja online. Quando um cliente realiza um pedido no site, o estoque é reservado
            automaticamente por 24 horas.
          </p>
        </div>

        <div className={styles.heroActions}>
          <Link href="/pedidos">
            <Button
              type="button"
              variant="outline"
              size="lg"
              style={{ background: 'white', color: '#4f46e5', border: 'none', fontWeight: 700 }}
            >
              <ShoppingBag size={20} />
              <span>Ver Pedidos Online</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* CARDS GRID */}
      <div className={styles.gridCards}>
        {/* CARD: STATUS & LINK PÚBLICO */}
        <div className={styles.configCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>
              <Globe size={22} />
            </div>
            <div>
              <h3>Status da Vitrine</h3>
              <p>Disponibilidade pública do catálogo</p>
            </div>
          </div>

          <div className={styles.featureList}>
            <div className={styles.featureItem}>
              <CheckCircle2 size={18} className={styles.featureIcon} />
              <div>
                <strong>Catálogo Responsivo Ativo</strong>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Acessível em celulares, tablets e desktops em <code>/loja</code>
                </div>
              </div>
            </div>

            <div className={styles.featureItem}>
              <CheckCircle2 size={18} className={styles.featureIcon} />
              <div>
                <strong>Produtos Disponíveis na Loja Online:</strong>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {publishedCount} produtos ativos cadastrados na vitrine
                </div>
              </div>
            </div>

            <div className={styles.featureItem}>
              <CheckCircle2 size={18} className={styles.featureIcon} />
              <div>
                <strong>Reserva Atômica de Estoque:</strong>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Garante que dois clientes não comprem a mesma peça exclusiva simultaneamente
                </div>
              </div>
            </div>
          </div>

          <Link href="/produtos">
            <Button type="button" variant="outline" size="sm" style={{ width: '100%' }}>
              Gerenciar Produtos Publicados
            </Button>
          </Link>
        </div>

        {/* CARD: POLÍTICA DE FRETE E RETIRADA */}
        <div className={styles.configCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>
              <Truck size={22} />
            </div>
            <div>
              <h3>Entrega & Retirada</h3>
              <p>Opções disponíveis no checkout do cliente</p>
            </div>
          </div>

          <div className={styles.featureList}>
            <div className={styles.featureItem}>
              <CheckCircle2 size={18} className={styles.featureIcon} />
              <div>
                <strong>Retirada no Balcão: Ativada</strong>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Sem custo para o cliente (Grátis), pronto em até 2 horas úteis
                </div>
              </div>
            </div>

            <div className={styles.featureItem}>
              <CheckCircle2 size={18} className={styles.featureIcon} />
              <div>
                <strong>Entrega em Domicílio / Correios: Ativada</strong>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Taxa fixa de envio com preenchimento automático de CEP via ViaCEP
                </div>
              </div>
            </div>

            <div className={styles.featureItem}>
              <CheckCircle2 size={18} className={styles.featureIcon} />
              <div>
                <strong>Canal WhatsApp Integrado:</strong>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Link direto pré-configurado gerado ao finalizar o pedido
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD: CUPONS E PROMOÇÕES */}
        <div className={styles.configCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>
              <Tag size={22} />
            </div>
            <div>
              <h3>Cupons de Desconto</h3>
              <p>Incentivos de compra para novos clientes</p>
            </div>
          </div>

          <div className={styles.featureList}>
            <div className={styles.featureItem}>
              <CheckCircle2 size={18} className={styles.featureIcon} />
              <div>
                <strong>Cupom PRIMEIRACOMPRA:</strong>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  10% de desconto no total dos itens para novos clientes
                </div>
              </div>
            </div>

            <div className={styles.featureItem}>
              <CheckCircle2 size={18} className={styles.featureIcon} />
              <div>
                <strong>Cupom BEMVINDO10:</strong>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  10% de desconto na primeira compra
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

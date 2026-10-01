'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Truck,
  Phone,
  MessageCircle,
  Mail,
  Building2,
  DollarSign,
  ShoppingBag,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDocument, formatPhone, formatDateTime, formatDate } from '@/lib/utils';
import styles from '../clientes/clientes.module.css';

export default function DetalhesFornecedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [supplier, setSupplier] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/suppliers/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setSupplier(json?.supplier || null))
      .catch((err) => console.error('Erro ao buscar fornecedor:', err))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        <RefreshCw size={28} className="animate-spin" />
        <span>Carregando dados do fornecedor...</span>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className={styles.emptyState}>
        <Truck size={48} />
        <h3>Fornecedor não encontrado</h3>
        <Link href="/fornecedores">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft size={16} />}>
            Voltar para Fornecedores
          </Button>
        </Link>
      </div>
    );
  }

  const cleanWhatsapp = (supplier.whatsapp || supplier.phone || '').replace(/\D/g, '');

  return (
    <div className={styles.container}>
      {/* Cabeçalho */}
      <div className={styles.pageHeader}>
        <div className={styles.headerTitleGroup}>
          <Link href="/fornecedores">
            <button className={styles.backBtn} title="Voltar">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div>
            <h1 className={styles.pageTitle}>{supplier.name}</h1>
            <p className={styles.pageSubtitle}>
              {supplier.corporateName || 'Confecção Parceira'} • Ficha cadastral e histórico de compras.
            </p>
          </div>
        </div>

        {cleanWhatsapp && (
          <a
            href={`https://wa.me/55${cleanWhatsapp}?text=Olá ${encodeURIComponent(supplier.name)}, tudo bem?`}
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="primary" size="md" leftIcon={<MessageCircle size={16} />}>
              Falar no WhatsApp
            </Button>
          </a>
        )}
      </div>

      {/* Grid de Indicadores */}
      <div className={styles.kpiGrid}>
        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Total Comprado</span>
              <div className={`${styles.kpiIconWrapper} ${styles.primaryIcon}`}>
                <DollarSign size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{formatCurrency(supplier.totalPurchased)}</div>
            <div className={styles.kpiFooter}>
              <span>Em mercadorias e reposições</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Contas a Pagar Pendentes</span>
              <div className={`${styles.kpiIconWrapper} ${styles.warningIcon}`}>
                <Clock size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{formatCurrency(supplier.pendingPayables)}</div>
            <div className={styles.kpiFooter}>
              <span>Boletos / parcelas em aberto</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Pedidos de Compra</span>
              <div className={`${styles.kpiIconWrapper} ${styles.successIcon}`}>
                <ShoppingBag size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{supplier.purchases?.length || 0} pedidos</div>
            <div className={styles.kpiFooter}>
              <span>Histórico de entradas</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Status</span>
              <div className={`${styles.kpiIconWrapper} ${styles.infoIcon}`}>
                <Building2 size={20} />
              </div>
            </div>
            <div className={styles.kpiValue} style={{ fontSize: '1.25rem' }}>
              <Badge variant={supplier.isActive ? 'success' : 'neutral'} size="md">
                {supplier.isActive ? 'Ativo / Homologado' : 'Inativo'}
              </Badge>
            </div>
            <div className={styles.kpiFooter}>
              <span>Parceiro comercial</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dados Cadastrais & Histórico */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
        <Card>
          <CardHeader>
            <CardTitle>Dados do Fabricante</CardTitle>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <small style={{ color: 'var(--text-muted)' }}>Razão Social:</small>
              <div style={{ fontWeight: 600 }}>{supplier.corporateName || supplier.name}</div>
            </div>

            <div>
              <small style={{ color: 'var(--text-muted)' }}>CNPJ / CPF:</small>
              <div>{formatDocument(supplier.documentNumber)}</div>
            </div>

            <div>
              <small style={{ color: 'var(--text-muted)' }}>WhatsApp:</small>
              <div>{formatPhone(supplier.whatsapp) || '-'}</div>
            </div>

            <div>
              <small style={{ color: 'var(--text-muted)' }}>Telefone:</small>
              <div>{formatPhone(supplier.phone) || '-'}</div>
            </div>

            <div>
              <small style={{ color: 'var(--text-muted)' }}>E-mail:</small>
              <div>{supplier.email || '-'}</div>
            </div>

            <div>
              <small style={{ color: 'var(--text-muted)' }}>Localização:</small>
              <div>
                {supplier.address ? (
                  <>
                    {supplier.address}, {supplier.number}
                    <br />
                    {supplier.neighborhood} - {supplier.city}/{supplier.state}
                    <br />
                    CEP: {supplier.zipCode || '-'}
                  </>
                ) : (
                  '-'
                )}
              </div>
            </div>

            {supplier.notes && (
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Condições Comerciais / Observações:
                </small>
                <span style={{ fontSize: '0.8125rem' }}>{supplier.notes}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Compras Realizadas</CardTitle>
            <CardDescription>Entradas de mercadorias e notas vinculadas</CardDescription>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            {supplier.purchases?.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <ShoppingBag size={36} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p>Nenhuma compra registrada para este fornecedor ainda.</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Data</th>
                      <th>Itens / Grade</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplier.purchases?.map((p: any) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.code}</strong>
                        </td>
                        <td>{formatDateTime(p.createdAt)}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            {p.items?.map((item: any) => (
                              <span key={item.id} style={{ fontSize: '0.75rem' }}>
                                {item.quantity}x {item.variant?.product?.name} ({item.variant?.size} / {item.variant?.color})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <strong>{formatCurrency(p.totalAmount)}</strong>
                        </td>
                        <td>
                          <Badge variant="success" size="sm">{p.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

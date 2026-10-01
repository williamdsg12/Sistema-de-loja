'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Clock,
  RefreshCw,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDocument, formatPhone, formatDateTime, formatDate } from '@/lib/utils';
import styles from '../clientes.module.css';

export default function DetalhesClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setCustomer(json?.customer || null))
      .catch((err) => console.error('Erro ao buscar cliente:', err))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        <RefreshCw size={28} className="animate-spin" />
        <span>Carregando ficha do cliente...</span>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className={styles.emptyState}>
        <User size={48} />
        <h3>Cliente não encontrado</h3>
        <Link href="/clientes">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft size={16} />}>
            Voltar para Clientes
          </Button>
        </Link>
      </div>
    );
  }

  const cleanWhatsapp = (customer.whatsapp || customer.phone || '').replace(/\D/g, '');

  return (
    <div className={styles.container}>
      {/* Cabeçalho */}
      <div className={styles.pageHeader}>
        <div className={styles.headerTitleGroup}>
          <Link href="/clientes">
            <button className={styles.backBtn} title="Voltar">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div>
            <h1 className={styles.pageTitle}>{customer.name}</h1>
            <p className={styles.pageSubtitle}>
              Ficha cadastral, histórico de compras e preferências do cliente.
            </p>
          </div>
        </div>

        {cleanWhatsapp && (
          <a
            href={`https://wa.me/55${cleanWhatsapp}?text=Olá ${encodeURIComponent(customer.name)}, tudo bem?`}
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="primary" size="md" leftIcon={<MessageCircle size={16} />}>
              Conversar no WhatsApp
            </Button>
          </a>
        )}
      </div>

      {/* Grid de KPIs de Consumo */}
      <div className={styles.kpiGrid}>
        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Total Gasto Acumulado</span>
              <div className={`${styles.kpiIconWrapper} ${styles.primaryIcon}`}>
                <DollarSign size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{formatCurrency(customer.calculatedTotalSpent)}</div>
            <div className={styles.kpiFooter}>
              <span>Em compras presenciais e online</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Número de Compras</span>
              <div className={`${styles.kpiIconWrapper} ${styles.successIcon}`}>
                <ShoppingBag size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{customer.totalSalesCount} pedidos</div>
            <div className={styles.kpiFooter}>
              <span>{customer.sales?.length || 0} no PDV • {customer.orders?.length || 0} online</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Ticket Médio</span>
              <div className={`${styles.kpiIconWrapper} ${styles.infoIcon}`}>
                <TrendingUp size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{formatCurrency(customer.averageTicket)}</div>
            <div className={styles.kpiFooter}>
              <span>Média de valor por compra</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Data de Cadastro</span>
              <div className={`${styles.kpiIconWrapper} ${styles.warningIcon}`}>
                <Calendar size={20} />
              </div>
            </div>
            <div className={styles.kpiValue} style={{ fontSize: '1.15rem' }}>
              {formatDate(customer.createdAt)}
            </div>
            <div className={styles.kpiFooter}>
              <span>Cliente registrado no sistema</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dados Cadastrais & Histórico */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Card de Dados de Contato */}
        <Card>
          <CardHeader>
            <CardTitle>Dados de Contato & Endereço</CardTitle>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <small style={{ color: 'var(--text-muted)' }}>CPF / Documento:</small>
              <div style={{ fontWeight: 600 }}>{formatDocument(customer.documentNumber)}</div>
            </div>

            <div>
              <small style={{ color: 'var(--text-muted)' }}>WhatsApp:</small>
              <div style={{ fontWeight: 600 }}>{formatPhone(customer.whatsapp) || '-'}</div>
            </div>

            <div>
              <small style={{ color: 'var(--text-muted)' }}>Telefone:</small>
              <div>{formatPhone(customer.phone) || '-'}</div>
            </div>

            <div>
              <small style={{ color: 'var(--text-muted)' }}>E-mail:</small>
              <div>{customer.email || '-'}</div>
            </div>

            <div>
              <small style={{ color: 'var(--text-muted)' }}>Data de Nascimento / Aniversário:</small>
              <div>{customer.birthDate ? formatDate(customer.birthDate) : '-'}</div>
            </div>

            <div>
              <small style={{ color: 'var(--text-muted)' }}>Endereço Completo:</small>
              <div>
                {customer.address ? (
                  <>
                    {customer.address}, {customer.number} {customer.complement && `(${customer.complement})`}
                    <br />
                    {customer.neighborhood} - {customer.city}/{customer.state}
                    <br />
                    CEP: {customer.zipCode || '-'}
                  </>
                ) : (
                  '-'
                )}
              </div>
            </div>

            {customer.notes && (
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Observações / Preferências:
                </small>
                <span style={{ fontSize: '0.8125rem' }}>{customer.notes}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card de Histórico de Vendas */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Compras Realizadas</CardTitle>
            <CardDescription>Vendas balcão (PDV) e pedidos e-commerce vinculados</CardDescription>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            {customer.sales?.length === 0 && customer.orders?.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <ShoppingBag size={36} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p>Nenhuma compra registrada para este cliente ainda.</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Canal</th>
                      <th>Data</th>
                      <th>Itens Comprados</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.sales?.map((sale: any) => (
                      <tr key={sale.id}>
                        <td>
                          <strong>{sale.code}</strong>
                        </td>
                        <td>
                          <Badge variant="primary" size="sm">PDV Físico</Badge>
                        </td>
                        <td>{formatDateTime(sale.createdAt)}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            {sale.items?.map((item: any) => (
                              <span key={item.id} style={{ fontSize: '0.75rem' }}>
                                {item.quantity}x {item.variant?.product?.name} ({item.variant?.size} / {item.variant?.color})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--primary-700)' }}>
                            {formatCurrency(sale.totalAmount)}
                          </strong>
                        </td>
                        <td>
                          <Badge variant="success" size="sm">{sale.status}</Badge>
                        </td>
                      </tr>
                    ))}

                    {customer.orders?.map((order: any) => (
                      <tr key={order.id}>
                        <td>
                          <strong>{order.orderNumber}</strong>
                        </td>
                        <td>
                          <Badge variant="info" size="sm">Loja Online</Badge>
                        </td>
                        <td>{formatDateTime(order.createdAt)}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            {order.items?.map((item: any) => (
                              <span key={item.id} style={{ fontSize: '0.75rem' }}>
                                {item.quantity}x {item.variant?.product?.name} ({item.variant?.size} / {item.variant?.color})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--primary-700)' }}>
                            {formatCurrency(order.totalAmount)}
                          </strong>
                        </td>
                        <td>
                          <Badge variant="neutral" size="sm">{order.status}</Badge>
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

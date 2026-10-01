'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  Truck,
  Store,
  MessageCircle,
  Phone,
  AlertCircle,
  XCircle,
  Package,
  Send,
  Sparkles,
  DollarSign,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import styles from './pedidos.module.css';

interface OrderItem {
  id: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variant?: {
    size: string;
    color: string;
    sku: string;
    product: {
      name: string;
    };
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  deliveryType: string;
  customerName: string;
  customerPhone: string;
  customerWhatsapp?: string;
  customerEmail?: string;
  customerDoc?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  couponCode?: string;
  notes?: string;
  createdAt: string;
  items: OrderItem[];
  payments: any[];
}

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal de Detalhes e Status
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (deliveryFilter) params.append('deliveryType', deliveryFilter);

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [search, statusFilter, deliveryFilter]);

  const handleUpdateStatus = async (orderId: string, statusToSet: string, customNotes?: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusToSet,
          notes: customNotes || statusNotes || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Status atualizado com sucesso!');
        setSelectedOrder(null);
        setStatusNotes('');
        fetchOrders();
      } else {
        alert(data.error || 'Erro ao alterar status.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NOVO':
      case 'AGUARDANDO_PAGAMENTO':
        return <Badge variant="warning">Aguardando Atendimento</Badge>;
      case 'EM_PREPARACAO':
      case 'PAGO':
        return <Badge variant="info">Em Separação</Badge>;
      case 'PRONTO_RETIRADA':
        return <Badge variant="neutral">Pronto no Balcão</Badge>;
      case 'ENVIADO':
        return <Badge variant="info">Em Trânsito / Enviado</Badge>;
      case 'CONCLUIDO':
        return <Badge variant="success">Pedido Concluído</Badge>;
      case 'CANCELADO':
        return <Badge variant="danger">Cancelado</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>Gestão de Pedidos Online & E-commerce</h1>
          <p>Acompanhe pedidos da Loja Virtual, reservas de estoque e etapas de expedição</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => window.open('/loja', '_blank')}
          >
            <Store size={18} />
            <span>Abrir Catálogo da Loja</span>
          </Button>

          <Button type="button" variant="primary" size="md" onClick={fetchOrders}>
            Atualizar Lista
          </Button>
        </div>
      </div>

      {/* KPIS */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#fef3c7', color: '#d97706' }}>
            <Clock size={24} />
          </div>
          <div className={styles.kpiDetails}>
            <span className={styles.kpiLabel}>Novos / Pendentes</span>
            <span className={styles.kpiValue}>{summary?.newCount || 0}</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#e0e7ff', color: '#4f46e5' }}>
            <Package size={24} />
          </div>
          <div className={styles.kpiDetails}>
            <span className={styles.kpiLabel}>Em Separação</span>
            <span className={styles.kpiValue}>{summary?.inPrepCount || 0}</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#dcfce7', color: '#16a34a' }}>
            <CheckCircle2 size={24} />
          </div>
          <div className={styles.kpiDetails}>
            <span className={styles.kpiLabel}>Concluídos</span>
            <span className={styles.kpiValue}>{summary?.completedCount || 0}</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#f3e8ff', color: '#9333ea' }}>
            <DollarSign size={24} />
          </div>
          <div className={styles.kpiDetails}>
            <span className={styles.kpiLabel}>Faturamento E-commerce</span>
            <span className={styles.kpiValue}>
              {formatCurrency(summary?.totalOnlineRevenue || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className={styles.filtersCard}>
        <div className={styles.filtersRow}>
          <div className={styles.searchBox}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar por Nº do pedido, cliente, telefone ou e-mail..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos os Status</option>
            <option value="NOVO">Novos / Aguardando</option>
            <option value="EM_PREPARACAO">Em Preparação</option>
            <option value="PRONTO_RETIRADA">Pronto para Retirada</option>
            <option value="ENVIADO">Enviado / Em Trânsito</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="CANCELADO">Cancelado</option>
          </select>

          <select
            className={styles.filterSelect}
            value={deliveryFilter}
            onChange={(e) => setDeliveryFilter(e.target.value)}
          >
            <option value="">Todas as Entregas</option>
            <option value="RETIRADA">Retirada no Balcão</option>
            <option value="ENTREGA">Entrega em Domicílio</option>
          </select>
        </div>
      </div>

      {/* TABELA DE PEDIDOS */}
      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nº Pedido / Data</th>
                <th>Cliente / Contato</th>
                <th>Entrega / Tipo</th>
                <th>Itens</th>
                <th>Valor Total</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                    Carregando pedidos online...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    Nenhum pedido online encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const cleanPhone = (order.customerWhatsapp || order.customerPhone || '').replace(/\D/g, '');
                  const waLink = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
                    `Olá ${order.customerName}! Falamos da Kids & Teens Boutique a respeito do seu pedido *${order.orderNumber}*.`
                  )}`;

                  return (
                    <tr key={order.id}>
                      <td>
                        <div className={styles.orderNumberCell}>
                          <ShoppingBag size={16} />
                          <span>{order.orderNumber}</span>
                        </div>
                        <small style={{ color: 'var(--text-secondary)' }}>
                          {formatDate(order.createdAt)}
                        </small>
                      </td>

                      <td>
                        <div className={styles.customerCell}>
                          <strong>{order.customerName}</strong>
                          <span>{order.customerPhone}</span>
                          <div className={styles.customerActions}>
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.whatsappLink}
                            >
                              <MessageCircle size={14} />
                              <span>WhatsApp</span>
                            </a>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`${styles.deliveryBadge} ${
                            order.deliveryType === 'RETIRADA'
                              ? styles.badgeRetirada
                              : styles.badgeEntrega
                          }`}
                        >
                          {order.deliveryType === 'RETIRADA' ? (
                            <>
                              <Store size={14} />
                              <span>Retirada Balcão</span>
                            </>
                          ) : (
                            <>
                              <Truck size={14} />
                              <span>Entrega Domicílio</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {order.items.reduce((acc, i) => acc + i.quantity, 0)} peça(s)
                        </strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {order.items[0]?.variant?.product.name || 'Produto'}
                          {order.items.length > 1 && ` +${order.items.length - 1}`}
                        </div>
                      </td>

                      <td>
                        <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                          {formatCurrency(order.totalAmount)}
                        </strong>
                        {order.discountAmount > 0 && (
                          <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>
                            Desc: -{formatCurrency(order.discountAmount)}
                          </div>
                        )}
                      </td>

                      <td>{getStatusBadge(order.status)}</td>

                      <td style={{ textAlign: 'right' }}>
                        <div className={styles.actionsCell} style={{ justifyContent: 'flex-end' }}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setNewStatus(order.status);
                            }}
                          >
                            <Eye size={14} />
                            <span>Detalhes</span>
                          </Button>

                          {/* Botão de avanço rápido de status */}
                          {order.status === 'NOVO' && (
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={() => handleUpdateStatus(order.id, 'EM_PREPARACAO')}
                            >
                              Iniciar Separação
                            </Button>
                          )}

                          {order.status === 'EM_PREPARACAO' && (
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={() =>
                                handleUpdateStatus(
                                  order.id,
                                  order.deliveryType === 'RETIRADA' ? 'PRONTO_RETIRADA' : 'ENVIADO'
                                )
                              }
                            >
                              {order.deliveryType === 'RETIRADA' ? 'Pronto p/ Retirada' : 'Marcar Enviado'}
                            </Button>
                          )}

                          {(order.status === 'PRONTO_RETIRADA' || order.status === 'ENVIADO') && (
                            <Button
                              type="button"
                              variant="success"
                              size="sm"
                              onClick={() => handleUpdateStatus(order.id, 'CONCLUIDO')}
                            >
                              Concluir & Baixar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE DETALHES DO PEDIDO */}
      {selectedOrder && (
        <div className={styles.modalOverlay} onClick={() => setSelectedOrder(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Detalhes do Pedido #{selectedOrder.orderNumber}</h3>
                <small style={{ color: 'var(--text-secondary)' }}>
                  Realizado em {formatDate(selectedOrder.createdAt)} • Status Atual:{' '}
                  {selectedOrder.status}
                </small>
              </div>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedOrder(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* STATUS UPDATE CONTROL */}
              <div className={styles.statusChangeBox}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      marginBottom: '0.375rem',
                    }}
                  >
                    Alterar Status do Pedido:
                  </label>
                  <select
                    className={styles.filterSelect}
                    style={{ width: '100%' }}
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value="NOVO">NOVO (Reserva Ativa)</option>
                    <option value="EM_PREPARACAO">EM PREPARAÇÃO / SEPARAÇÃO</option>
                    <option value="PRONTO_RETIRADA">PRONTO PARA RETIRADA NO BALCÃO</option>
                    <option value="ENVIADO">ENVIADO (Baixa Estoque Físico)</option>
                    <option value="CONCLUIDO">CONCLUÍDO / ENTREGUE (Baixa Estoque Físico)</option>
                    <option value="CANCELADO">CANCELADO (Libera Reserva)</option>
                  </select>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  disabled={isUpdatingStatus || newStatus === selectedOrder.status}
                  style={{ alignSelf: 'flex-end' }}
                  onClick={() => handleUpdateStatus(selectedOrder.id, newStatus)}
                >
                  {isUpdatingStatus ? 'Salvando...' : 'Salvar Novo Status'}
                </Button>
              </div>

              {/* DADOS DO CLIENTE */}
              <div className={styles.modalSection}>
                <div className={styles.modalSectionTitle}>Informações do Cliente</div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.75rem',
                    fontSize: '0.875rem',
                  }}
                >
                  <div>
                    <strong>Nome:</strong> {selectedOrder.customerName}
                  </div>
                  <div>
                    <strong>Telefone/WhatsApp:</strong> {selectedOrder.customerPhone}
                  </div>
                  {selectedOrder.customerEmail && (
                    <div>
                      <strong>E-mail:</strong> {selectedOrder.customerEmail}
                    </div>
                  )}
                  {selectedOrder.customerDoc && (
                    <div>
                      <strong>CPF:</strong> {selectedOrder.customerDoc}
                    </div>
                  )}
                </div>
              </div>

              {/* ENDEREÇO DE ENTREGA */}
              {selectedOrder.deliveryType === 'ENTREGA' && (
                <div className={styles.modalSection}>
                  <div className={styles.modalSectionTitle}>Endereço de Entrega</div>
                  <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
                    {selectedOrder.address}, {selectedOrder.number}{' '}
                    {selectedOrder.complement && `(${selectedOrder.complement})`}
                    <br />
                    {selectedOrder.neighborhood} - {selectedOrder.city}/{selectedOrder.state}
                    <br />
                    CEP: {selectedOrder.zipCode}
                  </p>
                </div>
              )}

              {/* ITENS DO PEDIDO */}
              <div className={styles.modalSection}>
                <div className={styles.modalSectionTitle}>Itens Separados do Estoque</div>
                <table className={styles.itemsTable}>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Tamanho</th>
                      <th>Cor</th>
                      <th>Qtd</th>
                      <th>Preço Unit.</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.variant?.product.name || 'Produto'}</td>
                        <td>{item.variant?.size || '-'}</td>
                        <td>{item.variant?.color || '-'}</td>
                        <td>{item.quantity} un</td>
                        <td>{formatCurrency(item.unitPrice)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          {formatCurrency(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.375rem',
                    alignItems: 'flex-end',
                    marginTop: '1rem',
                    fontSize: '0.875rem',
                  }}
                >
                  <div>
                    Subtotal: <strong>{formatCurrency(selectedOrder.subtotal)}</strong>
                  </div>
                  {selectedOrder.discountAmount > 0 && (
                    <div style={{ color: '#16a34a' }}>
                      Desconto Cupom ({selectedOrder.couponCode || 'Cupom'}):{' '}
                      <strong>-{formatCurrency(selectedOrder.discountAmount)}</strong>
                    </div>
                  )}
                  <div>
                    Frete ({selectedOrder.deliveryType}):{' '}
                    <strong>{formatCurrency(selectedOrder.shippingFee)}</strong>
                  </div>
                  <div
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 800,
                      color: 'var(--primary)',
                      marginTop: '0.5rem',
                    }}
                  >
                    Total do Pedido: {formatCurrency(selectedOrder.totalAmount)}
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className={styles.modalSection}>
                  <div className={styles.modalSectionTitle}>Observações</div>
                  <p style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-line' }}>
                    {selectedOrder.notes}
                  </p>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setSelectedOrder(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

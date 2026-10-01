'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  Phone,
  MessageCircle,
  Mail,
  Calendar,
  DollarSign,
  TrendingUp,
  Cake,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDocument, formatPhone, formatDate } from '@/lib/utils';
import styles from './clientes.module.css';

export default function ClientesPage() {
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal de Cadastro / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    documentNumber: '',
    phone: '',
    whatsapp: '',
    email: '',
    birthDate: '',
    zipCode: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: 'SP',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const res = await fetch(`/api/customers?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      documentNumber: '',
      phone: '',
      whatsapp: '',
      email: '',
      birthDate: '',
      zipCode: '',
      address: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: 'SP',
      notes: '',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: any) => {
    setEditingId(c.id);
    setFormData({
      name: c.name || '',
      documentNumber: c.documentNumber || '',
      phone: c.phone || '',
      whatsapp: c.whatsapp || '',
      email: c.email || '',
      birthDate: c.birthDate ? c.birthDate.substring(0, 10) : '',
      zipCode: c.zipCode || '',
      address: c.address || '',
      number: c.number || '',
      complement: c.complement || '',
      neighborhood: c.neighborhood || '',
      city: c.city || '',
      state: c.state || 'SP',
      notes: c.notes || '',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setModalError('O nome do cliente é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setModalError('');

    try {
      const url = editingId ? `/api/customers/${editingId}` : '/api/customers';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        fetchCustomers();
      } else {
        setModalError(json.error || 'Erro ao salvar cliente.');
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setModalError('Falha na comunicação com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o cliente "${name}"?`)) return;

    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok) {
        fetchCustomers();
      } else {
        alert(json.error || 'Erro ao excluir cliente.');
      }
    } catch (err) {
      console.error('Erro ao deletar:', err);
      alert('Erro de conexão ao remover cliente.');
    }
  };

  const summary = data?.summary || {
    totalCustomers: 0,
    totalSpentAll: 0,
    averageTicketAll: 0,
    birthdaysThisMonth: 0,
  };

  const customers = data?.customers || [];

  return (
    <div className={styles.container}>
      {/* Cabeçalho */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Gestão de Clientes</h1>
          <p className={styles.pageSubtitle}>
            Cadastro completo, histórico de compras, ticket médio e relacionamento no WhatsApp.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenCreateModal}
          leftIcon={<Plus size={16} />}
        >
          Novo Cliente
        </Button>
      </div>

      {/* Grid de KPIs */}
      <div className={styles.kpiGrid}>
        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Total de Clientes</span>
              <div className={`${styles.kpiIconWrapper} ${styles.primaryIcon}`}>
                <Users size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{summary.totalCustomers}</div>
            <div className={styles.kpiFooter}>
              <span>Base cadastrada na loja</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Faturamento Total dos Clientes</span>
              <div className={`${styles.kpiIconWrapper} ${styles.successIcon}`}>
                <DollarSign size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{formatCurrency(summary.totalSpentAll)}</div>
            <div className={styles.kpiFooter}>
              <span>Em compras no balcão e online</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Ticket Médio por Venda</span>
              <div className={`${styles.kpiIconWrapper} ${styles.infoIcon}`}>
                <TrendingUp size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{formatCurrency(summary.averageTicketAll)}</div>
            <div className={styles.kpiFooter}>
              <span>Média de gasto por pedido</span>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.kpiCard}>
          <CardContent className={styles.kpiContent}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Aniversariantes do Mês</span>
              <div className={`${styles.kpiIconWrapper} ${styles.warningIcon}`}>
                <Cake size={20} />
              </div>
            </div>
            <div className={styles.kpiValue}>{summary.birthdaysThisMonth}</div>
            <div className={styles.kpiFooter}>
              <span>Excelente para cupons de presente</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Busca */}
      <Card className={styles.filterCard}>
        <CardContent className={styles.filterContent}>
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <div className={styles.searchInputWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar por nome, CPF, telefone ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <Button type="submit" variant="secondary" size="md">
              Buscar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tabela de Clientes */}
      <Card>
        <CardContent className={styles.tableCardContent}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <RefreshCw size={24} className="animate-spin" />
              <span>Carregando clientes...</span>
            </div>
          ) : customers.length === 0 ? (
            <div className={styles.emptyState}>
              <Users size={44} />
              <p>Nenhum cliente cadastrado.</p>
              <Button variant="primary" size="sm" onClick={handleOpenCreateModal} leftIcon={<Plus size={14} />}>
                Cadastrar Primeiro Cliente
              </Button>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nome do Cliente</th>
                    <th>CPF / Documento</th>
                    <th>WhatsApp / Telefone</th>
                    <th>E-mail</th>
                    <th>Aniversário</th>
                    <th>Total Gasto</th>
                    <th>Pedidos</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c: any) => {
                    const cleanWhatsapp = (c.whatsapp || c.phone || '').replace(/\D/g, '');

                    return (
                      <tr key={c.id}>
                        <td>
                          <div className={styles.custNameCell}>
                            <Link href={`/clientes/${c.id}`} className={styles.custNameLink}>
                              <strong>{c.name}</strong>
                            </Link>
                            {c.city && (
                              <small>{c.city} - {c.state}</small>
                            )}
                          </div>
                        </td>
                        <td>
                          <code>{formatDocument(c.documentNumber)}</code>
                        </td>
                        <td>
                          <div className={styles.phoneCell}>
                            <span>{formatPhone(c.whatsapp || c.phone)}</span>
                            {cleanWhatsapp && (
                              <a
                                href={`https://wa.me/55${cleanWhatsapp}?text=Olá ${encodeURIComponent(
                                  c.name
                                )}, tudo bem?`}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.whatsappBtn}
                                title="Abrir conversa no WhatsApp"
                              >
                                <MessageCircle size={14} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td>{c.email || '-'}</td>
                        <td>{c.birthDate ? formatDate(c.birthDate) : '-'}</td>
                        <td>
                          <strong className={styles.totalSpentCell}>
                            {formatCurrency(c.totalSpent)}
                          </strong>
                        </td>
                        <td>
                          <Badge variant="neutral" size="sm">
                            {c._count?.sales + c._count?.orders || 0} compras
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className={styles.actionButtons}>
                            <Link href={`/clientes/${c.id}`}>
                              <button className={styles.actionBtn} title="Ver Histórico Completo">
                                <Eye size={16} />
                              </button>
                            </Link>
                            <button
                              onClick={() => handleOpenEditModal(c)}
                              className={styles.actionBtn}
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(c.id, c.name)}
                              className={`${styles.actionBtn} ${styles.deleteBtn}`}
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
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

      {/* Modal de Cadastro / Edição */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <h3>{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                <p>Preencha os dados de contato e endereço do cliente.</p>
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

            <form onSubmit={handleSaveCustomer} className={styles.modalForm}>
              <div className={styles.formRow2}>
                <Input
                  label="Nome Completo *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Maria Silva"
                  required
                />
                <Input
                  label="CPF"
                  value={formData.documentNumber}
                  onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>

              <div className={styles.formRow3}>
                <Input
                  label="WhatsApp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="(11) 99999-8888"
                />
                <Input
                  label="Telefone Fixo"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 3333-4444"
                />
                <Input
                  label="Data de Nascimento"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                />
              </div>

              <Input
                label="E-mail"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="cliente@email.com"
              />

              <div className={styles.formRow3}>
                <Input
                  label="CEP"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  placeholder="00000-000"
                />
                <Input
                  label="Rua / Logradouro"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Av. das Flores"
                />
                <Input
                  label="Número"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  placeholder="123"
                />
              </div>

              <div className={styles.formRow3}>
                <Input
                  label="Bairro"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  placeholder="Jardim das Rosas"
                />
                <Input
                  label="Cidade"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="São Paulo"
                />
                <Input
                  label="Estado (UF)"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="SP"
                />
              </div>

              <div className={styles.textareaWrapper}>
                <label className={styles.inputLabel}>Observações (Filhos, Preferências, Tamanhos)</label>
                <textarea
                  rows={2}
                  className={styles.textarea}
                  placeholder="Ex: Mãe do Lucas (6 anos) e da Sofia (10 anos). Gosta de tons pastéis."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                  Salvar Cliente
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

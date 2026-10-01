'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Truck,
  Search,
  Plus,
  Phone,
  MessageCircle,
  Mail,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  CheckCircle2,
  Building2,
  ShoppingBag,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDocument, formatPhone } from '@/lib/utils';
import styles from '../clientes/clientes.module.css';

export default function FornecedoresPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal de Cadastro / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    corporateName: '',
    documentNumber: '',
    phone: '',
    whatsapp: '',
    email: '',
    zipCode: '',
    address: '',
    number: '',
    neighborhood: '',
    city: '',
    state: 'SP',
    notes: '',
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const res = await fetch(`/api/suppliers?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setSuppliers(json.suppliers || []);
      }
    } catch (err) {
      console.error('Erro ao buscar fornecedores:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSuppliers();
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      corporateName: '',
      documentNumber: '',
      phone: '',
      whatsapp: '',
      email: '',
      zipCode: '',
      address: '',
      number: '',
      neighborhood: '',
      city: '',
      state: 'SP',
      notes: '',
      isActive: true,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (s: any) => {
    setEditingId(s.id);
    setFormData({
      name: s.name || '',
      corporateName: s.corporateName || '',
      documentNumber: s.documentNumber || '',
      phone: s.phone || '',
      whatsapp: s.whatsapp || '',
      email: s.email || '',
      zipCode: s.zipCode || '',
      address: s.address || '',
      number: s.number || '',
      neighborhood: s.neighborhood || '',
      city: s.city || '',
      state: s.state || 'SP',
      notes: s.notes || '',
      isActive: s.isActive ?? true,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setModalError('O nome / responsável do fornecedor é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setModalError('');

    try {
      const url = editingId ? `/api/suppliers/${editingId}` : '/api/suppliers';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        fetchSuppliers();
      } else {
        setModalError(json.error || 'Erro ao salvar fornecedor.');
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setModalError('Falha na comunicação com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir ou desativar o fornecedor "${name}"?`)) return;

    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok) {
        alert(json.message || 'Operação realizada com sucesso.');
        fetchSuppliers();
      } else {
        alert(json.error || 'Erro ao excluir fornecedor.');
      }
    } catch (err) {
      console.error('Erro ao deletar:', err);
      alert('Erro de conexão ao remover fornecedor.');
    }
  };

  return (
    <div className={styles.container}>
      {/* Cabeçalho */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Gestão de Fornecedores</h1>
          <p className={styles.pageSubtitle}>
            Cadastro de confecções parceiras, marcas fabricantes e contatos comerciais.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenCreateModal}
          leftIcon={<Plus size={16} />}
        >
          Novo Fornecedor
        </Button>
      </div>

      {/* Barra de Busca */}
      <Card className={styles.filterCard}>
        <CardContent className={styles.filterContent}>
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <div className={styles.searchInputWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar por nome, razão social, CNPJ ou telefone..."
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

      {/* Tabela de Fornecedores */}
      <Card>
        <CardContent className={styles.tableCardContent}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <RefreshCw size={24} className="animate-spin" />
              <span>Carregando fornecedores...</span>
            </div>
          ) : suppliers.length === 0 ? (
            <div className={styles.emptyState}>
              <Truck size={44} />
              <p>Nenhum fornecedor cadastrado.</p>
              <Button variant="primary" size="sm" onClick={handleOpenCreateModal} leftIcon={<Plus size={14} />}>
                Cadastrar Primeiro Fornecedor
              </Button>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nome / Razão Social</th>
                    <th>CNPJ / CPF</th>
                    <th>Contato / WhatsApp</th>
                    <th>E-mail</th>
                    <th>Cidade / UF</th>
                    <th>Compras Vinculadas</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s: any) => {
                    const cleanWhatsapp = (s.whatsapp || s.phone || '').replace(/\D/g, '');

                    return (
                      <tr key={s.id}>
                        <td>
                          <div className={styles.custNameCell}>
                            <Link href={`/fornecedores/${s.id}`} className={styles.custNameLink}>
                              <strong>{s.name}</strong>
                            </Link>
                            {s.corporateName && <small>{s.corporateName}</small>}
                          </div>
                        </td>
                        <td>
                          <code>{formatDocument(s.documentNumber)}</code>
                        </td>
                        <td>
                          <div className={styles.phoneCell}>
                            <span>{formatPhone(s.whatsapp || s.phone)}</span>
                            {cleanWhatsapp && (
                              <a
                                href={`https://wa.me/55${cleanWhatsapp}?text=Olá ${encodeURIComponent(
                                  s.name
                                )}, tudo bem?`}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.whatsappBtn}
                                title="Conversar no WhatsApp"
                              >
                                <MessageCircle size={14} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td>{s.email || '-'}</td>
                        <td>{s.city ? `${s.city} - ${s.state}` : '-'}</td>
                        <td>
                          <Badge variant="neutral" size="sm">
                            {s._count?.purchases || 0} compras
                          </Badge>
                        </td>
                        <td>
                          <Badge variant={s.isActive ? 'success' : 'neutral'} size="sm">
                            {s.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className={styles.actionButtons}>
                            <Link href={`/fornecedores/${s.id}`}>
                              <button className={styles.actionBtn} title="Ver Ficha Completa">
                                <Eye size={16} />
                              </button>
                            </Link>
                            <button
                              onClick={() => handleOpenEditModal(s)}
                              className={styles.actionBtn}
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(s.id, s.name)}
                              className={`${styles.actionBtn} ${styles.deleteBtn}`}
                              title="Excluir / Inativar"
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
                <h3>{editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
                <p>Cadastre a confecção parceira e dados para pedidos de compra.</p>
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

            <form onSubmit={handleSaveSupplier} className={styles.modalForm}>
              <div className={styles.formRow2}>
                <Input
                  label="Nome Comercial / Contato *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Confecções Estrela Kids"
                  required
                />
                <Input
                  label="Razão Social"
                  value={formData.corporateName}
                  onChange={(e) => setFormData({ ...formData, corporateName: e.target.value })}
                  placeholder="Ex: Estrela Indústria Têxtil Ltda"
                />
              </div>

              <div className={styles.formRow3}>
                <Input
                  label="CNPJ ou CPF"
                  value={formData.documentNumber}
                  onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                  placeholder="00.000.000/0001-00"
                />
                <Input
                  label="WhatsApp Comercial"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="(11) 99999-8888"
                />
                <Input
                  label="Telefone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 3333-4444"
                />
              </div>

              <Input
                label="E-mail de Pedidos"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="vendas@fornecedor.com.br"
              />

              <div className={styles.formRow3}>
                <Input
                  label="CEP"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  placeholder="00000-000"
                />
                <Input
                  label="Endereço"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua das Indústrias"
                />
                <Input
                  label="Número"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  placeholder="100"
                />
              </div>

              <div className={styles.formRow3}>
                <Input
                  label="Bairro"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  placeholder="Distrito Industrial"
                />
                <Input
                  label="Cidade"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Brusque"
                />
                <Input
                  label="Estado (UF)"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="SC"
                />
              </div>

              <div className={styles.textareaWrapper}>
                <label className={styles.inputLabel}>Observações (Prazo de entrega, Condições)</label>
                <textarea
                  rows={2}
                  className={styles.textarea}
                  placeholder="Ex: Prazo de 15 dias úteis para confecção. Frete CIF acima de R$ 2.000."
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
                  Salvar Fornecedor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

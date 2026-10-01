'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  Users,
  ShieldCheck,
  Plus,
  Edit2,
  Lock,
  Mail,
  CheckCircle2,
  XCircle,
  Sparkles,
  Phone,
  MapPin,
  Save,
  KeyRound,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import styles from './configuracoes.module.css';

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: { permission: { code: string; name: string; category: string } }[];
  _count?: { users: number };
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  roleDescription?: string;
  isActive: boolean;
  createdAt: string;
}

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<'store' | 'users' | 'rbac'>('store');

  // Dados da Loja
  const [storeData, setStoreData] = useState<any>({
    name: '',
    tradeName: '',
    documentNumber: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [isSavingStore, setIsSavingStore] = useState(false);

  // Usuários & Roles
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Modal de Usuário
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRoleId, setFormRoleId] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSavingUser, setIsSavingUser] = useState(false);

  useEffect(() => {
    fetchStoreSettings();
    fetchUsers();
    fetchRolesAndPermissions();
  }, []);

  const fetchStoreSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (res.ok && data.store) {
        setStoreData({
          name: data.store.name || '',
          tradeName: data.store.tradeName || '',
          documentNumber: data.store.documentNumber || '',
          phone: data.store.phone || '',
          email: data.store.email || '',
          address: data.store.address || '',
          city: data.store.city || '',
          state: data.store.state || '',
          zipCode: data.store.zipCode || '',
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        if (data.roles) setRoles(data.roles);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchRolesAndPermissions = async () => {
    try {
      const res = await fetch('/api/roles');
      const data = await res.json();
      if (res.ok) {
        setRoles(data.roles || []);
        setPermissions(data.permissions || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingStore(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storeData),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Configurações da loja salvas com sucesso!');
      } else {
        alert(data.error || 'Erro ao salvar configurações.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de comunicação.');
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRoleId(roles[0]?.id || '');
    setFormIsActive(true);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: UserItem) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormPassword('');
    setFormRoleId(u.roleId);
    setFormIsActive(u.isActive);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingUser(true);

    try {
      if (editingUser) {
        // Update
        const payload: any = {
          name: formName,
          email: formEmail,
          roleId: formRoleId,
          isActive: formIsActive,
        };
        if (formPassword.trim()) {
          payload.password = formPassword.trim();
        }

        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok) {
          alert('Usuário atualizado com sucesso!');
          setIsUserModalOpen(false);
          fetchUsers();
        } else {
          alert(data.error || 'Erro ao atualizar.');
        }
      } else {
        // Create
        if (!formPassword.trim()) {
          alert('Informe uma senha inicial para o usuário.');
          setIsSavingUser(false);
          return;
        }

        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            email: formEmail,
            password: formPassword,
            roleId: formRoleId,
            isActive: formIsActive,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          alert('Usuário cadastrado com sucesso!');
          setIsUserModalOpen(false);
          fetchUsers();
        } else {
          alert(data.error || 'Erro ao cadastrar.');
        }
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const getRoleBadgeClass = (roleName: string) => {
    switch (roleName.toUpperCase()) {
      case 'ADMINISTRADOR':
        return styles.roleAdmin;
      case 'GERENTE':
        return styles.roleGerente;
      case 'CAIXA':
        return styles.roleCaixa;
      case 'VENDEDOR':
        return styles.roleVendedor;
      case 'ESTOQUISTA':
        return styles.roleEstoquista;
      default:
        return styles.roleEstoquista;
    }
  };

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>Configurações da Loja & Controle de Acessos (RBAC)</h1>
          <p>Gerencie dados cadastrais da empresa, equipe de operadores e permissões por perfil</p>
        </div>
      </div>

      {/* ABAS */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'store' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('store')}
        >
          <Store size={18} />
          <span>Dados da Loja & Empresa</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'users' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={18} />
          <span>Usuários & Operadores</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'rbac' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('rbac')}
        >
          <ShieldCheck size={18} />
          <span>Matriz de Permissões (RBAC)</span>
        </button>
      </div>

      {/* ABA 1: DADOS DA LOJA */}
      {activeTab === 'store' && (
        <form onSubmit={handleSaveStore}>
          <div className={styles.cardSection}>
            <div className={styles.sectionHeader}>
              <div>
                <h3>Identificação da Empresa</h3>
                <p>Informações exibidas no cabeçalho, comprovantes térmicos e loja virtual</p>
              </div>
              <Button type="submit" variant="primary" size="md" disabled={isSavingStore}>
                <Save size={16} />
                <span>{isSavingStore ? 'Salvando...' : 'Salvar Dados da Loja'}</span>
              </Button>
            </div>

            <div className={styles.formGrid2}>
              <div className={styles.inputGroup}>
                <label>Nome Fantasia da Loja *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Kids & Teens Boutique Infantil"
                  value={storeData.tradeName}
                  onChange={(e) => setStoreData({ ...storeData, tradeName: e.target.value })}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Razão Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Boutique Moda Infantil Eireli"
                  value={storeData.name}
                  onChange={(e) => setStoreData({ ...storeData, name: e.target.value })}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>CNPJ / CPF</label>
                <input
                  type="text"
                  placeholder="00.000.000/0001-00"
                  value={storeData.documentNumber}
                  onChange={(e) => setStoreData({ ...storeData, documentNumber: e.target.value })}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>WhatsApp Oficial da Loja</label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={storeData.phone}
                  onChange={(e) => setStoreData({ ...storeData, phone: e.target.value })}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>E-mail Comercial</label>
                <input
                  type="email"
                  placeholder="contato@kidsboutique.com.br"
                  value={storeData.email}
                  onChange={(e) => setStoreData({ ...storeData, email: e.target.value })}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>CEP</label>
                <input
                  type="text"
                  placeholder="00000-000"
                  value={storeData.zipCode}
                  onChange={(e) => setStoreData({ ...storeData, zipCode: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.formGrid3}>
              <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                <label>Endereço / Logradouro</label>
                <input
                  type="text"
                  placeholder="Rua das Flores, 120"
                  value={storeData.address}
                  onChange={(e) => setStoreData({ ...storeData, address: e.target.value })}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Cidade / UF</label>
                <input
                  type="text"
                  placeholder="São Paulo / SP"
                  value={storeData.city ? `${storeData.city} - ${storeData.state}` : ''}
                  onChange={(e) => {
                    const parts = e.target.value.split('-');
                    setStoreData({
                      ...storeData,
                      city: parts[0]?.trim() || '',
                      state: parts[1]?.trim() || 'SP',
                    });
                  }}
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ABA 2: USUÁRIOS & OPERADORES */}
      {activeTab === 'users' && (
        <div className={styles.cardSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>Equipe & Acessos</h3>
              <p>Cadastre operadores de caixa, gerentes, vendedores e controle as credenciais</p>
            </div>
            <Button type="button" variant="primary" size="md" onClick={handleOpenCreateUser}>
              <Plus size={16} />
              <span>Novo Usuário</span>
            </Button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>E-mail</th>
                  <th>Perfil de Acesso (Cargo)</th>
                  <th>Status</th>
                  <th>Data de Cadastro</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingUsers ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                      Carregando equipe...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                      Nenhum usuário cadastrado.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.userAvatar}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <strong>{u.name}</strong>
                        </div>
                      </td>

                      <td>{u.email}</td>

                      <td>
                        <span className={`${styles.roleBadge} ${getRoleBadgeClass(u.roleName)}`}>
                          {u.roleName}
                        </span>
                      </td>

                      <td>
                        <Badge variant={u.isActive ? 'success' : 'danger'}>
                          {u.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>

                      <td>{formatDate(u.createdAt)}</td>

                      <td style={{ textAlign: 'right' }}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditUser(u)}
                        >
                          <Edit2 size={14} />
                          <span>Editar</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 3: MATRIZ DE PERMISSÕES RBAC */}
      {activeTab === 'rbac' && (
        <div className={styles.cardSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>Matriz de Permissões Granulares por Cargo</h3>
              <p>Visualização das permissões e restrições de cada perfil nos módulos da loja</p>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Módulo / Funcionalidade</th>
                  <th style={{ textAlign: 'center' }}>Administrador</th>
                  <th style={{ textAlign: 'center' }}>Gerente</th>
                  <th style={{ textAlign: 'center' }}>Caixa</th>
                  <th style={{ textAlign: 'center' }}>Vendedor</th>
                  <th style={{ textAlign: 'center' }}>Estoquista</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Frente de Caixa (PDV) & Vendas</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Abertura de caixa, emissão de vendas e cupons
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', color: '#16a34a' }}>✓ Total</td>
                  <td style={{ textAlign: 'center', color: '#16a34a' }}>✓ Total</td>
                  <td style={{ textAlign: 'center', color: '#16a34a' }}>✓ Total</td>
                  <td style={{ textAlign: 'center', color: '#16a34a' }}>✓ Total</td>
                  <td style={{ textAlign: 'center', color: '#dc2626' }}>✕ Bloqueado</td>
                </tr>

                <tr>
                  <td>
                    <strong>Descontos e Cancelamentos de Vendas</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Descontos acima da tabela e estorno de transações
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', color: '#16a34a' }}>✓ Total</td>
                  <td style={{ textAlign: 'center', color: '#16a34a' }}>✓ Total</td>
                  <td style={{ textAlign: 'center', color: '#d97706' }}>⚠️ Sob Autorização</td>
                  <td style={{ textAlign: 'center', color: '#dc2626' }}>✕ Bloqueado</td>
                  <td style={{ textAlign: 'center', color: '#dc2626' }}>✕ Bloqueado</td>
                </tr>

                <tr>
                  <td>
                    <strong>Gestão de Estoque & Inventário</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Ajuste de saldos, balanço e movimentações
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', color: '#16a34a' }}>✓ Total</td>
                  <td style={{ textAlign: 'center', color: '#16a34a' }}>✓ Total</td>
                  <td style={{ textAlign: 'center', color: '#2563eb' }}>👁️ Apenas Consulta</td>
                  <td style={{ textAlign: 'center', color: '#2563eb' }}>👁️ Apenas Consulta</td>
                  <td style={{ textAlign: 'center', color: '#16a34a' }}>✓ Total</td>
                </tr>

                <tr>
                  <td>
                    <strong>Cadastro de Produtos & Alteração de Preços</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Criação de matriz tamanho x cor e custos
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', color: '#16a34a' }}>✓ Total</td>
                  <td style={{ textAlign: 'center', color: '#16a34a' }}>✓ Total</td>
                  <td style={{ textAlign: 'center', color: '#2563eb' }}>👁️ Apenas Consulta</td>
                  <td style={{ textAlign: 'center', color: '#2563eb' }}>👁️ Apenas Consulta</td>
                  <td style={{ textAlign: 'center', color: '#16a34a' }}>✓ Cadastro/Etiquetas</td>
                </tr>

                <tr>
                  <td>
                    <strong>Módulo Financeiro, Contas & DRE</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Contas a pagar/receber, margem de lucro e fluxo de caixa
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', color: '#16a34a' }}>✓ Total</td>
                  <td style={{ textAlign: 'center', color: '#16a34a' }}>✓ Total</td>
                  <td style={{ textAlign: 'center', color: '#dc2626' }}>✕ Bloqueado</td>
                  <td style={{ textAlign: 'center', color: '#dc2626' }}>✕ Bloqueado</td>
                  <td style={{ textAlign: 'center', color: '#dc2626' }}>✕ Bloqueado</td>
                </tr>

                <tr>
                  <td>
                    <strong>Trilha de Auditoria & Segurança</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Logs imutáveis de ações de todos os usuários
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', color: '#16a34a' }}>✓ Total</td>
                  <td style={{ textAlign: 'center', color: '#16a34a' }}>✓ Total</td>
                  <td style={{ textAlign: 'center', color: '#dc2626' }}>✕ Bloqueado</td>
                  <td style={{ textAlign: 'center', color: '#dc2626' }}>✕ Bloqueado</td>
                  <td style={{ textAlign: 'center', color: '#dc2626' }}>✕ Bloqueado</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE USUÁRIO */}
      {isUserModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsUserModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveUser}>
              <div className={styles.modalHeader}>
                <h3>{editingUser ? 'Editar Usuário' : 'Novo Usuário do Sistema'}</h3>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}
                  onClick={() => setIsUserModalOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.inputGroup}>
                  <label>Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>E-mail de Acesso *</label>
                  <input
                    type="email"
                    required
                    placeholder="carlos@pequenosecia.com.br"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>
                    {editingUser ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha de Acesso *'}
                  </label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>Perfil de Acesso (Cargo) *</label>
                  <select
                    required
                    value={formRoleId}
                    onChange={(e) => setFormRoleId(e.target.value)}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.description && `(${r.description})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="isActiveCheck" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
                    Usuário Ativo (Pode fazer login no sistema)
                  </label>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsUserModalOpen(false)}
                >
                  Cancelar
                </Button>

                <Button type="submit" variant="primary" size="md" disabled={isSavingUser}>
                  {isSavingUser ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Tag, RefreshCw, FolderTree } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import styles from './categorias.module.css';

export default function CategoriasPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Formulário de Nova Categoria
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const json = await res.json();
        setCategories(json.categories || []);
      }
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsCreating(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName, description: newCatDesc }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Erro ao criar categoria.');
        setIsCreating(false);
        return;
      }

      setNewCatName('');
      setNewCatDesc('');
      fetchCategories();
    } catch (err) {
      console.error('Erro ao criar categoria:', err);
      setErrorMessage('Erro de conexão.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div className={styles.headerTitleGroup}>
          <Link href="/produtos">
            <button className={styles.backBtn} title="Voltar para produtos">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div>
            <h1 className={styles.pageTitle}>Categorias de Produtos</h1>
            <p className={styles.pageSubtitle}>
              Organize os setores e coleções de roupas da sua loja física e online.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.gridLayout}>
        {/* Formulário de Criação */}
        <Card>
          <CardHeader>
            <CardTitle>Nova Categoria</CardTitle>
            <CardDescription>Cadastre um novo departamento</CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && <div className={styles.alertError}>{errorMessage}</div>}
            <form onSubmit={handleCreateCategory} className={styles.form}>
              <Input
                label="Nome da Categoria"
                placeholder="Ex: Vestidos de Festa"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                required
              />
              <Input
                label="Descrição (Opcional)"
                placeholder="Ex: Vestidos infantis e juvenis para eventos"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isCreating}
                leftIcon={<Plus size={16} />}
              >
                Cadastrar Categoria
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Listagem de Categorias */}
        <Card>
          <CardHeader>
            <CardTitle>Categorias Cadastradas ({categories.length})</CardTitle>
          </CardHeader>
          <CardContent className={styles.tableCardContent}>
            {isLoading ? (
              <div className={styles.loadingState}>
                <RefreshCw size={24} className="animate-spin" />
                <span>Carregando categorias...</span>
              </div>
            ) : categories.length === 0 ? (
              <div className={styles.emptyState}>
                <FolderTree size={36} />
                <p>Nenhuma categoria cadastrada.</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nome & Slug</th>
                      <th>Descrição</th>
                      <th>Produtos Vinculados</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <strong>{c.name}</strong>
                          <div className={styles.slugTag}>/{c.slug}</div>
                        </td>
                        <td>{c.description || '-'}</td>
                        <td>
                          <Badge variant="neutral" size="sm">
                            {c._count?.products || 0} produtos
                          </Badge>
                        </td>
                        <td>
                          <Badge variant={c.isActive ? 'success' : 'neutral'} size="sm">
                            {c.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
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

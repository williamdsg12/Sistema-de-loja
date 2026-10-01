'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Layers, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import styles from '../categorias/categorias.module.css';

export default function MarcasPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const fetchBrands = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/brands');
      if (res.ok) {
        const json = await res.json();
        setBrands(json.brands || []);
      }
    } catch (err) {
      console.error('Erro ao buscar marcas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsCreating(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDesc }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Erro ao criar marca.');
        setIsCreating(false);
        return;
      }

      setNewName('');
      setNewDesc('');
      fetchBrands();
    } catch (err) {
      console.error('Erro ao criar marca:', err);
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
            <h1 className={styles.pageTitle}>Marcas & Fabricantes</h1>
            <p className={styles.pageSubtitle}>
              Gerencie as confecções e marcas parceiras da loja de roupas.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.gridLayout}>
        <Card>
          <CardHeader>
            <CardTitle>Nova Marca / Confecção</CardTitle>
            <CardDescription>Cadastre um fabricante parceiro</CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && <div className={styles.alertError}>{errorMessage}</div>}
            <form onSubmit={handleCreateBrand} className={styles.form}>
              <Input
                label="Nome da Marca"
                placeholder="Ex: Malu Kids, Kidy, Tigor T. Tigre..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
              <Input
                label="Descrição (Opcional)"
                placeholder="Ex: Confecção especializada em algodão orgânico"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isCreating}
                leftIcon={<Plus size={16} />}
              >
                Cadastrar Marca
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Marcas Cadastradas ({brands.length})</CardTitle>
          </CardHeader>
          <CardContent className={styles.tableCardContent}>
            {isLoading ? (
              <div className={styles.loadingState}>
                <RefreshCw size={24} className="animate-spin" />
                <span>Carregando marcas...</span>
              </div>
            ) : brands.length === 0 ? (
              <div className={styles.emptyState}>
                <Layers size={36} />
                <p>Nenhuma marca cadastrada.</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nome da Marca</th>
                      <th>Descrição</th>
                      <th>Produtos Vinculados</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brands.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <strong>{b.name}</strong>
                        </td>
                        <td>{b.description || '-'}</td>
                        <td>
                          <Badge variant="neutral" size="sm">
                            {b._count?.products || 0} produtos
                          </Badge>
                        </td>
                        <td>
                          <Badge variant={b.isActive ? 'success' : 'neutral'} size="sm">
                            {b.isActive ? 'Ativo' : 'Inativo'}
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

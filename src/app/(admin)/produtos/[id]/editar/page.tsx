'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Trash2,
  Boxes,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import styles from '../../produto-form.module.css';

export default function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    categoryId: '',
    brandId: '',
    gender: 'INFANTIL_MENINA',
    ageGroup: 'INFANTIL',
    description: '',
    imageUrl: '',
    costPrice: 0,
    sellPrice: 0,
    minStock: 5,
    showInOnline: true,
    isActive: true,
  });

  const [variants, setVariants] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/categories'),
      fetch('/api/brands'),
      fetch(`/api/products/${id}`),
    ])
      .then(async ([cRes, bRes, pRes]) => {
        if (cRes.ok) {
          const cJson = await cRes.json();
          setCategories(cJson.categories || []);
        }
        if (bRes.ok) {
          const bJson = await bRes.json();
          setBrands(bJson.brands || []);
        }
        if (pRes.ok) {
          const pJson = await pRes.json();
          const p = pJson.product;
          if (p) {
            setFormData({
              name: p.name || '',
              sku: p.sku || '',
              barcode: p.barcode || '',
              categoryId: p.categoryId || '',
              brandId: p.brandId || '',
              gender: p.gender || 'INFANTIL_MENINA',
              ageGroup: p.ageGroup || 'INFANTIL',
              description: p.description || '',
              imageUrl: p.imageUrl || '',
              costPrice: p.costPrice || 0,
              sellPrice: p.sellPrice || 0,
              minStock: p.minStock || 5,
              showInOnline: p.showInOnline ?? true,
              isActive: p.isActive ?? true,
            });

            setVariants(
              p.variants.map((v: any) => ({
                id: v.id,
                size: v.size,
                color: v.color,
                colorHex: v.colorHex || '#94A3B8',
                sku: v.sku,
                barcode: v.barcode || '',
                costPrice: v.costPrice,
                sellPrice: v.sellPrice,
                initialStock: v.stock?.quantity || 0,
                isActive: v.isActive ?? true,
              }))
            );
          }
        }
      })
      .catch((err) => console.error('Erro ao carregar dados:', err))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateVariantRow = (index: number, field: string, value: any) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addSingleVariant = () => {
    const baseSku = formData.sku || 'PROD';
    setVariants((prev) => [
      ...prev,
      {
        size: 'UN',
        color: 'Nova Cor',
        colorHex: '#94A3B8',
        sku: `${baseSku}-${Date.now().toString().slice(-4)}`,
        barcode: '',
        costPrice: formData.costPrice || null,
        sellPrice: formData.sellPrice || null,
        initialStock: 0,
        isActive: true,
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSaving(true);

    try {
      const payload = {
        ...formData,
        costPrice: Number(formData.costPrice),
        sellPrice: Number(formData.sellPrice),
        minStock: Number(formData.minStock),
        variants: variants.map((v) => ({
          ...v,
          costPrice: v.costPrice ? Number(v.costPrice) : null,
          sellPrice: v.sellPrice ? Number(v.sellPrice) : null,
          initialStock: Number(v.initialStock) || 0,
        })),
      };

      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Erro ao atualizar produto.');
        setIsSaving(false);
        return;
      }

      router.push('/produtos');
      router.refresh();
    } catch (err) {
      console.error('Erro ao atualizar produto:', err);
      setErrorMessage('Falha na comunicação com o servidor.');
      setIsSaving(false);
    }
  };

  const marginValue = formData.sellPrice - formData.costPrice;
  const marginPercent =
    formData.costPrice > 0 ? (marginValue / formData.costPrice) * 100 : formData.sellPrice > 0 ? 100 : 0;

  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        <RefreshCw size={28} className="animate-spin" />
        <span>Carregando dados do produto...</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div className={styles.headerTitleGroup}>
          <Link href="/produtos">
            <button className={styles.backBtn} title="Voltar para lista">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div>
            <h1 className={styles.pageTitle}>Editar Produto</h1>
            <p className={styles.pageSubtitle}>
              Atualize as informações da peça, preços e grade de estoque.
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <Link href="/produtos">
            <Button variant="outline" size="md">
              Cancelar
            </Button>
          </Link>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            isLoading={isSaving}
            leftIcon={<Save size={16} />}
          >
            Salvar Alterações
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className={styles.alertError}>
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.formLayout}>
        <div className={styles.mainColumn}>
          <Card>
            <CardHeader>
              <CardTitle>Identificação da Peça</CardTitle>
            </CardHeader>
            <CardContent className={styles.cardForm}>
              <div className={styles.formRow2}>
                <Input
                  label="Nome da Peça de Roupa"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
                <Input
                  label="SKU Base (Código Referência)"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div className={styles.formRow3}>
                <div className={styles.selectWrapper}>
                  <label className={styles.inputLabel}>Categoria *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => handleInputChange('categoryId', e.target.value)}
                    className={styles.select}
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.selectWrapper}>
                  <label className={styles.inputLabel}>Marca / Confecção</label>
                  <select
                    value={formData.brandId}
                    onChange={(e) => handleInputChange('brandId', e.target.value)}
                    className={styles.select}
                  >
                    <option value="">Selecione uma marca</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Código de Barras Principal (EAN)"
                  value={formData.barcode}
                  onChange={(e) => handleInputChange('barcode', e.target.value)}
                />
              </div>

              <div className={styles.formRow2}>
                <div className={styles.selectWrapper}>
                  <label className={styles.inputLabel}>Público / Gênero</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className={styles.select}
                  >
                    <option value="INFANTIL_MENINA">Infantil Menina</option>
                    <option value="INFANTIL_MENINO">Infantil Menino</option>
                    <option value="UNISSEX">Unissex</option>
                    <option value="TEEN_FEM">Teen Feminino</option>
                    <option value="TEEN_MASC">Teen Masculino</option>
                  </select>
                </div>

                <div className={styles.selectWrapper}>
                  <label className={styles.inputLabel}>Faixa Etária</label>
                  <select
                    value={formData.ageGroup}
                    onChange={(e) => handleInputChange('ageGroup', e.target.value)}
                    className={styles.select}
                  >
                    <option value="BEBE">Bebê (0 a 2 anos)</option>
                    <option value="PRIMEIROS_PASSOS">Primeiros Passos (2 a 4 anos)</option>
                    <option value="INFANTIL">Infantil (4 a 12 anos)</option>
                    <option value="JUVENIL_TEEN">Juvenil / Teen (12 a 18 anos)</option>
                  </select>
                </div>
              </div>

              <div className={styles.textareaWrapper}>
                <label className={styles.inputLabel}>Descrição da Peça (Tecido, Composição, Cuidados)</label>
                <textarea
                  rows={3}
                  className={styles.textarea}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className={styles.matrixHeaderRow}>
                <div>
                  <CardTitle>Grade de Variações do Produto ({variants.length})</CardTitle>
                  <CardDescription>Variações de tamanho e cor vinculadas</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addSingleVariant}
                  leftIcon={<Plus size={14} />}
                >
                  Adicionar Variação
                </Button>
              </div>
            </CardHeader>
            <CardContent className={styles.cardForm}>
              <div className={styles.tableResponsive}>
                <table className={styles.matrixTable}>
                  <thead>
                    <tr>
                      <th>Tamanho</th>
                      <th>Cor</th>
                      <th>SKU Individual *</th>
                      <th>Código Barras</th>
                      <th>Estoque Atual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            value={v.size}
                            onChange={(e) => updateVariantRow(idx, 'size', e.target.value)}
                            className={styles.tableInputSmall}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={v.color}
                            onChange={(e) => updateVariantRow(idx, 'color', e.target.value)}
                            className={styles.tableInput}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={v.sku}
                            onChange={(e) => updateVariantRow(idx, 'sku', e.target.value)}
                            className={styles.tableInputMono}
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={v.barcode}
                            placeholder="EAN"
                            onChange={(e) => updateVariantRow(idx, 'barcode', e.target.value)}
                            className={styles.tableInput}
                          />
                        </td>
                        <td>
                          <strong>{v.initialStock} un</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className={styles.sideColumn}>
          <Card>
            <CardHeader>
              <CardTitle>Precificação</CardTitle>
            </CardHeader>
            <CardContent className={styles.sideCardContent}>
              <Input
                label="Preço de Custo (R$)"
                type="number"
                step="0.01"
                min="0"
                value={formData.costPrice}
                onChange={(e) => handleInputChange('costPrice', parseFloat(e.target.value) || 0)}
              />

              <Input
                label="Preço de Venda (R$)"
                type="number"
                step="0.01"
                min="0"
                value={formData.sellPrice}
                onChange={(e) => handleInputChange('sellPrice', parseFloat(e.target.value) || 0)}
                required
              />

              <div className={styles.marginBox}>
                <div className={styles.marginRow}>
                  <span>Lucro Bruto por Peça:</span>
                  <strong>{formatCurrency(marginValue)}</strong>
                </div>
                <div className={styles.marginRow}>
                  <span>Margem sobre o Custo:</span>
                  <Badge variant={marginPercent >= 50 ? 'success' : 'warning'} size="sm">
                    {marginPercent.toFixed(1)}%
                  </Badge>
                </div>
              </div>

              <Input
                label="Estoque Mínimo de Alerta"
                type="number"
                min="0"
                value={formData.minStock}
                onChange={(e) => handleInputChange('minStock', parseInt(e.target.value) || 0)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Canais de Venda</CardTitle>
            </CardHeader>
            <CardContent className={styles.sideCardContent}>
              <label className={styles.switchLabel}>
                <input
                  type="checkbox"
                  checked={formData.showInOnline}
                  onChange={(e) => handleInputChange('showInOnline', e.target.checked)}
                />
                <div>
                  <strong>Exibir na Loja Online</strong>
                  <p>Disponibiliza no catálogo público.</p>
                </div>
              </label>

              <div className={styles.divider} />

              <label className={styles.switchLabel}>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                />
                <div>
                  <strong>Produto Ativo</strong>
                  <p>Permite vender no PDV.</p>
                </div>
              </label>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}

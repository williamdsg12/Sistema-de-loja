'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Sparkles,
  Plus,
  Trash2,
  Boxes,
  DollarSign,
  Globe,
  Tag,
  Info,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import styles from '../produto-form.module.css';

// Tamanhos Padrão de Roupas
const PRESET_SIZES = ['RN', 'P', 'M', 'G', 'GG', '1', '2', '3', '4', '6', '8', '10', '12', '14', '16', '18'];

// Cores Padrão com Hex
const PRESET_COLORS = [
  { name: 'Branco', hex: '#FFFFFF' },
  { name: 'Preto', hex: '#0F172A' },
  { name: 'Azul Claro', hex: '#93C5FD' },
  { name: 'Azul Marinho', hex: '#1E3A8A' },
  { name: 'Rosa Claro', hex: '#FBCFE8' },
  { name: 'Rosa Pink', hex: '#EC4899' },
  { name: 'Vermelho', hex: '#EF4444' },
  { name: 'Amarelo', hex: '#FBBF24' },
  { name: 'Verde Menta', hex: '#86EFAC' },
  { name: 'Cinza Mescla', hex: '#94A3B8' },
  { name: 'Lilás', hex: '#C084FC' },
  { name: 'Bege', hex: '#E2D9C8' },
];

export default function NovoProdutoPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Formulário Principal
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

  // Estado do Gerador de Matriz
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['P', 'M', 'G']);
  const [selectedColors, setSelectedColors] = useState<{ name: string; hex: string }[]>([
    { name: 'Azul Marinho', hex: '#1E3A8A' },
    { name: 'Rosa Claro', hex: '#FBCFE8' },
  ]);

  // Variações Geradas
  const [variants, setVariants] = useState<any[]>([]);

  useEffect(() => {
    // Carrega Categorias e Marcas
    Promise.all([fetch('/api/categories'), fetch('/api/brands')])
      .then(async ([cRes, bRes]) => {
        if (cRes.ok) {
          const cJson = await cRes.json();
          setCategories(cJson.categories || []);
          if (cJson.categories?.length > 0) {
            setFormData((prev) => ({ ...prev, categoryId: cJson.categories[0].id }));
          }
        }
        if (bRes.ok) {
          const bJson = await bRes.json();
          setBrands(bJson.brands || []);
          if (bJson.brands?.length > 0) {
            setFormData((prev) => ({ ...prev, brandId: bJson.brands[0].id }));
          }
        }
      })
      .catch((err) => console.error('Erro ao carregar dados auxiliares:', err));
  }, []);

  // Atualiza campo do produto
  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Se alterou o nome e não preencheu o SKU, sugere um SKU base automático
      if (field === 'name' && !prev.sku) {
        const autoSku = value
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .slice(0, 8);
        if (autoSku) updated.sku = autoSku;
      }
      return updated;
    });
  };

  // Toggle de Tamanho
  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  // Toggle de Cor
  const toggleColor = (colorObj: { name: string; hex: string }) => {
    setSelectedColors((prev) =>
      prev.some((c) => c.name === colorObj.name)
        ? prev.filter((c) => c.name !== colorObj.name)
        : [...prev, colorObj]
    );
  };

  // Gerar Matriz de Variações
  const generateVariantsMatrix = () => {
    if (selectedSizes.length === 0 || selectedColors.length === 0) {
      alert('Selecione ao menos 1 tamanho e 1 cor para gerar a grade.');
      return;
    }

    const baseSku = formData.sku || 'PROD';
    const newVariants: any[] = [];

    selectedColors.forEach((c) => {
      selectedSizes.forEach((s) => {
        const cleanColor = c.name
          .toUpperCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^A-Z0-9]/g, '')
          .slice(0, 4);

        const varSku = `${baseSku}-${s}-${cleanColor}`;

        newVariants.push({
          size: s,
          color: c.name,
          colorHex: c.hex,
          sku: varSku,
          barcode: '',
          costPrice: formData.costPrice || null,
          sellPrice: formData.sellPrice || null,
          initialStock: 10, // Saldo inicial sugerido
          isActive: true,
        });
      });
    });

    setVariants(newVariants);
  };

  // Atualiza valor específico em uma linha de variação
  const updateVariantRow = (index: number, field: string, value: any) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Remove variação individual
  const removeVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  // Adiciona variação avulsa
  const addSingleVariant = () => {
    const baseSku = formData.sku || 'PROD';
    setVariants((prev) => [
      ...prev,
      {
        size: 'UN',
        color: 'Padrão',
        colorHex: '#94A3B8',
        sku: `${baseSku}-${Date.now().toString().slice(-4)}`,
        barcode: '',
        costPrice: formData.costPrice || null,
        sellPrice: formData.sellPrice || null,
        initialStock: 5,
        isActive: true,
      },
    ]);
  };

  // Submissão do Formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name.trim()) {
      setErrorMessage('Informe o nome do produto.');
      return;
    }
    if (!formData.sku.trim()) {
      setErrorMessage('Informe o SKU base do produto.');
      return;
    }
    if (variants.length === 0) {
      setErrorMessage('Gere ou adicione ao menos uma variação (tamanho/cor) com estoque inicial.');
      return;
    }

    setIsLoading(true);

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

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Erro ao cadastrar produto.');
        setIsLoading(false);
        return;
      }

      router.push('/produtos');
      router.refresh();
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      setErrorMessage('Falha na comunicação com o servidor.');
      setIsLoading(false);
    }
  };

  // Cálculo de Margem em tempo real
  const marginValue = formData.sellPrice - formData.costPrice;
  const marginPercent =
    formData.costPrice > 0 ? (marginValue / formData.costPrice) * 100 : formData.sellPrice > 0 ? 100 : 0;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerTitleGroup}>
          <Link href="/produtos">
            <button className={styles.backBtn} title="Voltar para lista">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div>
            <h1 className={styles.pageTitle}>Novo Produto</h1>
            <p className={styles.pageSubtitle}>
              Cadastre peças de roupas infantil e juvenil com grade completa de variações.
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
            isLoading={isLoading}
            leftIcon={<Save size={16} />}
          >
            Salvar Produto & Variações
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className={styles.alertError}>
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.formLayout}>
        {/* Coluna Principal */}
        <div className={styles.mainColumn}>
          {/* Card: Dados Principais */}
          <Card>
            <CardHeader>
              <CardTitle>Identificação da Peça</CardTitle>
              <CardDescription>Informações básicas do vestuário</CardDescription>
            </CardHeader>
            <CardContent className={styles.cardForm}>
              <div className={styles.formRow2}>
                <Input
                  label="Nome da Peça de Roupa"
                  placeholder="Ex: Conjunto Infantil Moletom Ursinho"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
                <Input
                  label="SKU Base (Código Referência)"
                  placeholder="Ex: CONJ-URS-01"
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
                  placeholder="7890000000000"
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
                  placeholder="Ex: Confeccionado em 100% algodão suedine macio, antialérgico, com botões de pressão..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card: Gerador de Grade de Variações */}
          <Card>
            <CardHeader>
              <div className={styles.matrixHeaderRow}>
                <div>
                  <CardTitle>Grade de Variações (Tamanho x Cor)</CardTitle>
                  <CardDescription>
                    Gere combinações automáticas para alimentar o estoque único
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={generateVariantsMatrix}
                  leftIcon={<Sparkles size={14} />}
                >
                  Gerar Grade Automática
                </Button>
              </div>
            </CardHeader>
            <CardContent className={styles.cardForm}>
              {/* Seletor de Tamanhos */}
              <div className={styles.pickerSection}>
                <label className={styles.pickerLabel}>1. Selecione os Tamanhos Disponíveis:</label>
                <div className={styles.sizesGrid}>
                  {PRESET_SIZES.map((size) => {
                    const isSelected = selectedSizes.includes(size);
                    return (
                      <button
                        type="button"
                        key={size}
                        onClick={() => toggleSize(size)}
                        className={`${styles.sizeTagBtn} ${isSelected ? styles.sizeSelected : ''}`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seletor de Cores */}
              <div className={styles.pickerSection}>
                <label className={styles.pickerLabel}>2. Selecione as Cores:</label>
                <div className={styles.colorsGrid}>
                  {PRESET_COLORS.map((c) => {
                    const isSelected = selectedColors.some((sc) => sc.name === c.name);
                    return (
                      <button
                        type="button"
                        key={c.name}
                        onClick={() => toggleColor(c)}
                        className={`${styles.colorTagBtn} ${isSelected ? styles.colorSelected : ''}`}
                      >
                        <span className={styles.colorDot} style={{ backgroundColor: c.hex }} />
                        <span>{c.name}</span>
                        {isSelected && <Check size={12} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tabela de Variações Geradas */}
              <div className={styles.variantsTableSection}>
                <div className={styles.variantsTableSectionHeader}>
                  <strong>Variações Geradas ({variants.length})</strong>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addSingleVariant}
                    leftIcon={<Plus size={14} />}
                  >
                    Adicionar Variação Manual
                  </Button>
                </div>

                {variants.length === 0 ? (
                  <div className={styles.emptyMatrix}>
                    <Boxes size={32} />
                    <p>Nenhuma variação gerada ainda. Clique em "Gerar Grade Automática" acima.</p>
                  </div>
                ) : (
                  <div className={styles.tableResponsive}>
                    <table className={styles.matrixTable}>
                      <thead>
                        <tr>
                          <th>Tamanho</th>
                          <th>Cor</th>
                          <th>SKU Individual *</th>
                          <th>Código Barras</th>
                          <th>Estoque Inicial *</th>
                          <th style={{ width: '40px' }} />
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
                              <div className={styles.tableColorCell}>
                                {v.colorHex && (
                                  <span
                                    className={styles.colorDot}
                                    style={{ backgroundColor: v.colorHex }}
                                  />
                                )}
                                <input
                                  type="text"
                                  value={v.color}
                                  onChange={(e) => updateVariantRow(idx, 'color', e.target.value)}
                                  className={styles.tableInput}
                                />
                              </div>
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
                              <input
                                type="number"
                                min={0}
                                value={v.initialStock}
                                onChange={(e) =>
                                  updateVariantRow(idx, 'initialStock', parseInt(e.target.value) || 0)
                                }
                                className={styles.tableInputStock}
                                required
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => removeVariant(idx)}
                                className={styles.removeRowBtn}
                                title="Remover Variação"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Lateral: Preços, Estoque Mínimo e Visibilidade */}
        <div className={styles.sideColumn}>
          {/* Card: Preços & Margem */}
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

              {/* Indicador de Margem */}
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
                helperText="Dispara alerta no painel quando o estoque total estiver abaixo."
              />
            </CardContent>
          </Card>

          {/* Card: Loja Online */}
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
                  <p>Disponibiliza este produto no catálogo público do e-commerce.</p>
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
                  <p>Permite vender no PDV e realizar movimentações.</p>
                </div>
              </label>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}

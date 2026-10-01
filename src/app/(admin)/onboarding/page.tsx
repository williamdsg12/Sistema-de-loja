'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Store,
  MapPin,
  Phone,
  DollarSign,
  Boxes,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import styles from './onboarding.module.css';

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    name: 'Pequenos & Cia Moda Infantil',
    tradeName: 'Pequenos & Cia',
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
    initialCashBalance: 100,
    defaultMinStock: 5,
  });

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFinish = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/store/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Falha ao salvar configurações.');
        setIsLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      console.error('Erro ao finalizar onboarding:', err);
      setErrorMessage('Erro de conexão ao salvar os dados.');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.wizardCard}>
        {/* Cabeçalho do Wizard */}
        <div className={styles.wizardHeader}>
          <div className={styles.badge}>
            <Sparkles size={16} />
            <span>Configuração Inicial</span>
          </div>
          <h1 className={styles.wizardTitle}>Vamos configurar sua loja</h1>
          <p className={styles.wizardSubtitle}>
            Preencha as informações essenciais para personalizar seu sistema de vendas e estoque.
          </p>

          {/* Stepper */}
          <div className={styles.stepper}>
            <div className={`${styles.step} ${currentStep >= 1 ? styles.stepActive : ''}`}>
              <div className={styles.stepCircle}>1</div>
              <span>Dados da Loja</span>
            </div>
            <div className={styles.stepLine} />
            <div className={`${styles.step} ${currentStep >= 2 ? styles.stepActive : ''}`}>
              <div className={styles.stepCircle}>2</div>
              <span>Endereço & Contato</span>
            </div>
            <div className={styles.stepLine} />
            <div className={`${styles.step} ${currentStep >= 3 ? styles.stepActive : ''}`}>
              <div className={styles.stepCircle}>3</div>
              <span>Caixa & Estoque</span>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className={styles.alertError}>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Conteúdo dos Passos */}
        <div className={styles.stepContent}>
          {currentStep === 1 && (
            <div className={styles.formGrid}>
              <Input
                label="Razão Social ou Nome Completo"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ex: Confecções Kids Ltda"
                required
              />
              <Input
                label="Nome Fantasia (Como os clientes conhecem)"
                value={formData.tradeName}
                onChange={(e) => handleChange('tradeName', e.target.value)}
                placeholder="Ex: Boutique Kids & Teens"
                required
              />
              <Input
                label="CNPJ ou CPF"
                value={formData.documentNumber}
                onChange={(e) => handleChange('documentNumber', e.target.value)}
                placeholder="00.000.000/0001-00"
              />
              <Input
                label="E-mail de Contato da Loja"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="contato@sualoja.com.br"
              />
            </div>
          )}

          {currentStep === 2 && (
            <div className={styles.formGrid}>
              <Input
                label="Telefone Fixo"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(11) 3333-4444"
              />
              <Input
                label="WhatsApp Principal (Para vendas e avisos)"
                value={formData.whatsapp}
                onChange={(e) => handleChange('whatsapp', e.target.value)}
                placeholder="(11) 99999-8888"
              />
              <Input
                label="CEP"
                value={formData.zipCode}
                onChange={(e) => handleChange('zipCode', e.target.value)}
                placeholder="00000-000"
              />
              <Input
                label="Rua / Avenida"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Av. Principal"
              />
              <Input
                label="Número"
                value={formData.number}
                onChange={(e) => handleChange('number', e.target.value)}
                placeholder="123"
              />
              <Input
                label="Bairro"
                value={formData.neighborhood}
                onChange={(e) => handleChange('neighborhood', e.target.value)}
                placeholder="Centro"
              />
              <Input
                label="Cidade"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="São Paulo"
              />
              <Input
                label="Estado (UF)"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="SP"
              />
            </div>
          )}

          {currentStep === 3 && (
            <div className={styles.formGrid}>
              <Input
                label="Fundo de Troco Inicial para o Caixa (R$)"
                type="number"
                value={formData.initialCashBalance}
                onChange={(e) => handleChange('initialCashBalance', parseFloat(e.target.value) || 0)}
                placeholder="100.00"
                helperText="Valor em dinheiro disponível para troco na abertura do primeiro caixa."
              />
              <Input
                label="Alerta de Estoque Mínimo Padrão (Unidades)"
                type="number"
                value={formData.defaultMinStock}
                onChange={(e) => handleChange('defaultMinStock', parseInt(e.target.value) || 5)}
                placeholder="5"
                helperText="O sistema alertará no dashboard quando uma peça atingir essa quantidade."
              />
            </div>
          )}
        </div>

        {/* Botões de Navegação */}
        <div className={styles.wizardFooter}>
          {currentStep > 1 ? (
            <Button
              variant="outline"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              leftIcon={<ArrowLeft size={16} />}
            >
              Voltar
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 3 ? (
            <Button
              variant="primary"
              onClick={() => setCurrentStep((prev) => prev + 1)}
              rightIcon={<ArrowRight size={16} />}
            >
              Próximo Passo
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleFinish}
              isLoading={isLoading}
              rightIcon={<CheckCircle2 size={16} />}
            >
              Concluir e Ir para o Painel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, User, Sparkles, HelpCircle, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import styles from './login.module.css';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('from') || '/dashboard';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Por favor, informe seu e-mail ou usuário.');
      return;
    }
    if (!password) {
      setErrorMessage('Por favor, informe sua senha de acesso.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Falha na autenticação. Verifique suas credenciais.');
        setIsLoading(false);
        return;
      }

      // Redireciona para o onboarding se a loja ainda não estiver configurada
      if (data.user?.store?.isConfigured === false) {
        router.push('/onboarding');
      } else {
        router.push(redirectPath);
      }
      router.refresh();
    } catch (err) {
      console.error('Erro no login:', err);
      setErrorMessage('Não foi possível conectar ao servidor. Verifique sua conexão.');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.formCard}>
      <div className={styles.header}>
        <div className={styles.logoBadge}>
          <span>ERP</span>
        </div>
        <h2 className={styles.title}>Acessar Plataforma</h2>
        <p className={styles.subtitle}>Digite suas credenciais para gerenciar a loja</p>
      </div>

      {errorMessage && (
        <div className={styles.alertError} role="alert">
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          label="E-mail ou Usuário"
          type="text"
          placeholder="ex: admin ou seu@email.com"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          disabled={isLoading}
          leftIcon={<User size={18} />}
          required
        />

        <div className={styles.passwordWrapper}>
          <Input
            label="Senha de Acesso"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            leftIcon={<Lock size={18} />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.togglePasswordBtn}
                aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
            required
          />
        </div>

        <div className={styles.formOptions}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
            />
            <span>Lembrar de mim neste dispositivo</span>
          </label>

          <button
            type="button"
            onClick={() => alert('Para redefinir sua senha, solicite ao administrador da loja ou utilize o e-mail cadastrado.')}
            className={styles.forgotPassword}
          >
            Esqueci minha senha
          </button>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          rightIcon={<ArrowRight size={18} />}
          className={styles.submitButton}
        >
          Entrar no Sistema
        </Button>
      </form>

      {/* Dica de Acesso Rápido */}
      <div className={styles.demoCredentials}>
        <div className={styles.demoTitle}>
          <HelpCircle size={14} />
          <span>Acesso Administrativo Padrão:</span>
        </div>
        <div className={styles.demoCredsBox}>
          <div>Usuário: <code>admin</code></div>
          <div>Senha: <code>admin123</code></div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className={styles.container}>
      {/* Coluna Visual e Apresentação */}
      <div className={styles.brandHero}>
        <div className={styles.brandHeroContent}>
          <div className={styles.badge}>
            <Sparkles size={16} />
            <span>Sistema Profissional de Gestão</span>
          </div>
          <h1 className={styles.brandTitle}>
            Gestão inteligente e integrada para sua loja infantil & teen.
          </h1>
          <p className={styles.brandSubtitle}>
            Controle total de estoque unificado, frente de caixa (PDV) ultra veloz, finanças, compras e e-commerce sincronizados em tempo real.
          </p>

          <div className={styles.featureCards}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <strong className={styles.featureTitle}>Estoque Centralizado</strong>
                <p className={styles.featureDesc}>PDV físico e loja online alimentando o mesmo inventário sem furos.</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.brandFooter}>
          <span>Versão Comercial 1.0 • Todos os direitos reservados</span>
        </div>
      </div>

      {/* Coluna do Formulário de Login com Suspense Boundary */}
      <div className={styles.formSection}>
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}><Loader2 className="animate-spin" size={32} /></div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

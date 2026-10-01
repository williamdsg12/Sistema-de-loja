import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Store, ShieldAlert, ArrowRight } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [usuarioLogin, setUsuarioLogin] = useState<string>('admin');
  const [senha, setSenha] = useState<string>('admin123');
  const [erro, setErro] = useState<string>('');
  const [carregando, setCarregando] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!usuarioLogin || !senha) {
      setErro('Informe o login e a senha.');
      return;
    }

    setCarregando(true);
    const sucesso = await login(usuarioLogin, senha);
    setCarregando(false);

    if (!sucesso) {
      setErro('Login ou senha inválidos. Tente novamente.');
    }
  };

  const handleQuickLogin = (user: string, pass: string) => {
    setUsuarioLogin(user);
    setSenha(pass);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 select-none font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 animate-fade-in">
        {/* Cabeçalho Visual da Marca */}
        <div className="bg-sky-600 p-8 text-white text-center relative overflow-hidden">
          <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl mx-auto flex items-center justify-center mb-3 border border-white/20 shadow-xs">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">WS Gestão PDV</h2>
          <p className="text-sky-100 text-xs font-medium mt-1">Sistema Comercial Desktop de Alta Performance</p>
        </div>

        {/* Formulário de Login */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erro && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{erro}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Usuário / Login</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={usuarioLogin}
                onChange={(e) => setUsuarioLogin(e.target.value)}
                placeholder="Ex: admin ou vendedor"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all font-medium"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full mt-2 bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{carregando ? 'Acessando...' : 'Entrar no Sistema'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Atalhos de Login Rápido para Demonstração */}
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
            Acesso Rápido de Teste:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'admin123')}
              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-sky-500 hover:bg-sky-50 rounded-xl text-[11px] text-slate-700 font-semibold transition-all text-left cursor-pointer"
            >
              👑 <span className="font-bold">Admin:</span> admin123
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('vendedor', '123456')}
              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-sky-500 hover:bg-sky-50 rounded-xl text-[11px] text-slate-700 font-semibold transition-all text-left cursor-pointer"
            >
              🛒 <span className="font-bold">Vendedor:</span> 123456
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

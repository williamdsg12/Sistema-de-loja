import React, { useState } from 'react';
import { Store, Mail, Lock, Globe, Phone, MapPin, CheckCircle, AlertCircle, Sparkles, Building2 } from 'lucide-react';
import { Modal } from './Modal';

interface NovaLojaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLojaCriada: (loja: any) => void;
}

export const NovaLojaModal: React.FC<NovaLojaModalProps> = ({ isOpen, onClose, onLojaCriada }) => {
  const [nomeLoja, setNomeLoja] = useState<string>('');
  const [slug, setSlug] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [senha, setSenha] = useState<string>('');
  const [telefone, setTelefone] = useState<string>('');
  const [cidade, setCidade] = useState<string>('');
  const [estado, setEstado] = useState<string>('SP');
  const [carregando, setCarregando] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');

  const gerarSlugAuto = (texto: string) => {
    setNomeLoja(texto);
    if (!slug || slug === nomeLoja.toLowerCase().replace(/[^a-z0-9]/g, '')) {
      const slugSugerido = texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(slugSugerido);
    }
  };

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!nomeLoja.trim() || !slug.trim() || !email.trim()) {
      setErro('Por favor, preencha os campos obrigatórios.');
      return;
    }

    setCarregando(true);
    try {
      if (window.api?.supabase?.cadastrarLoja) {
        const res = await window.api.supabase.cadastrarLoja({
          nomeLoja,
          slug,
          email,
          senha,
          telefone,
          cidade,
          estado
        });

        if (res.sucesso && res.loja) {
          onLojaCriada(res.loja);
          alert(res.mensagem);
          onClose();
        } else {
          setErro(res.mensagem || 'Erro ao cadastrar loja');
        }
      } else {
        // Fallback local
        const nova = {
          id: Date.now(),
          nome_fantasia: nomeLoja,
          slug_catalogo: slug,
          email,
          telefone
        };
        onLojaCriada(nova);
        alert('Loja criada com sucesso no Plano Grátis!');
        onClose();
      }
    } catch (err: any) {
      setErro(err?.message || 'Falha na comunicação com o Supabase');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cadastrar Nova Loja no WS Gestão PDV SaaS">
      <form onSubmit={handleCadastrar} className="space-y-4 text-slate-800">
        
        {/* Banner Informativo */}
        <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <div className="font-bold text-sky-950">Inicie no Plano Grátis</div>
            <div className="text-sky-800 text-[11px]">Sua loja é criada imediatamente com catálogo online e PDV local sincronizado.</div>
          </div>
        </div>

        {erro && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Nome Fantasia da Loja *</label>
          <div className="relative">
            <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              placeholder="Ex: Minha Loja de Roupas"
              value={nomeLoja}
              onChange={e => gerarSlugAuto(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Link Público do Catálogo (Slug) *</label>
          <div className="flex items-center">
            <span className="bg-slate-100 border border-r-0 border-slate-300 px-3 py-2 text-slate-500 text-xs rounded-l-xl select-none font-mono">
              /loja/
            </span>
            <input
              type="text"
              required
              placeholder="minha-loja"
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
              className="w-full px-3 py-2 border border-slate-300 rounded-r-xl text-xs font-mono font-bold text-sky-700 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">E-mail do Lojista (Login) *</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                placeholder="contato@minhaloja.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Senha de Acesso *</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp / Telefone</label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="(11) 99887-6655"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Estado (UF)</label>
            <input
              type="text"
              maxLength={2}
              placeholder="SP"
              value={estado}
              onChange={e => setEstado(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold uppercase text-center focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={carregando}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Building2 className="w-4 h-4" />
            <span>{carregando ? 'Criando Loja...' : 'Criar Loja no SaaS'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

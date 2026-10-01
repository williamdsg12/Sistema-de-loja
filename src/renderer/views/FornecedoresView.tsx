import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, Edit, Trash2, Check, Phone, Mail, MapPin } from 'lucide-react';
import { Modal } from '../components/Modal';
import { Fornecedor } from '../types';
import { formatarCpfCnpj, formatarTelefone } from '../utils/validators';

export const FornecedoresView: React.FC = () => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [busca, setBusca] = useState<string>('');
  const [carregando, setCarregando] = useState<boolean>(true);

  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [fornecedorEditando, setFornecedorEditando] = useState<Fornecedor | null>(null);

  const [formNome, setFormNome] = useState<string>('');
  const [formCnpj, setFormCnpj] = useState<string>('');
  const [formTelefone, setFormTelefone] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formEndereco, setFormEndereco] = useState<string>('');

  const carregarFornecedores = async () => {
    setCarregando(true);
    try {
      const lista = await window.api.fornecedores.listar(busca);
      setFornecedores(lista || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarFornecedores();
  }, [busca]);

  const abrirModalNovo = () => {
    setFornecedorEditando(null);
    setFormNome('');
    setFormCnpj('');
    setFormTelefone('');
    setFormEmail('');
    setFormEndereco('');
    setModalAberto(true);
  };

  const abrirModalEditar = (f: Fornecedor) => {
    setFornecedorEditando(f);
    setFormNome(f.nome);
    setFormCnpj(f.cnpj || '');
    setFormTelefone(f.telefone || '');
    setFormEmail(f.email || '');
    setFormEndereco(f.endereco || '');
    setModalAberto(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      alert('A razão social ou nome do fornecedor é obrigatório.');
      return;
    }

    try {
      const payload = {
        nome: formNome.trim(),
        cnpj: formCnpj.trim() || undefined,
        telefone: formTelefone.trim() || undefined,
        email: formEmail.trim() || undefined,
        endereco: formEndereco.trim() || undefined
      };

      if (fornecedorEditando) {
        await window.api.fornecedores.atualizar(fornecedorEditando.id, payload);
      } else {
        await window.api.fornecedores.criar(payload);
      }

      setModalAberto(false);
      carregarFornecedores();
    } catch (err: any) {
      alert(`Erro ao salvar fornecedor: ${err?.message || err}`);
    }
  };

  const handleExcluir = async (f: Fornecedor) => {
    if (confirm(`Deseja realmente excluir o fornecedor "${f.nome}"?`)) {
      try {
        await window.api.fornecedores.excluir(f.id);
        carregarFornecedores();
      } catch (err: any) {
        alert(`Erro ao excluir: ${err?.message || err}`);
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-800 overflow-y-auto font-sans p-6 space-y-6">
      
      {/* 1. CABEÇALHO LIMPO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none">Fornecedores & Distribuidores</h1>
              <p className="text-xs text-slate-500 mt-1">Gerenciamento de distribuidores para compras e entrada de estoque.</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={abrirModalNovo}
          className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Novo Fornecedor</span>
        </button>
      </div>

      {/* 2. BUSCA */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por razão social, CNPJ ou e-mail..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* 3. TABELA LIMPA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200 text-[10px]">
              <tr>
                <th className="py-3 px-4"># ID</th>
                <th className="py-3 px-4">Razão Social / Nome</th>
                <th className="py-3 px-4">CNPJ</th>
                <th className="py-3 px-4">Telefone</th>
                <th className="py-3 px-4">E-mail</th>
                <th className="py-3 px-4">Endereço</th>
                <th className="py-3 px-4 text-center w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {fornecedores.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-400 font-bold">#{f.id}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{f.nome}</td>
                  <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">{f.cnpj ? formatarCpfCnpj(f.cnpj) : '—'}</td>
                  <td className="py-3 px-4 text-slate-600">{f.telefone ? formatarTelefone(f.telefone) : '—'}</td>
                  <td className="py-3 px-4 text-slate-600">{f.email || '—'}</td>
                  <td className="py-3 px-4 text-slate-600 truncate max-w-xs">{f.endereco || '—'}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => abrirModalEditar(f)}
                        className="p-1 text-slate-400 hover:text-sky-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        title="Editar Fornecedor"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExcluir(f)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Excluir Fornecedor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {fornecedores.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhum fornecedor cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs font-semibold text-slate-500 flex justify-between">
          <span>Total de Fornecedores: <strong className="text-slate-900">{fornecedores.length}</strong></span>
        </div>
      </div>

      <Modal isOpen={modalAberto} onClose={() => setModalAberto(false)} title={fornecedorEditando ? 'Editar Fornecedor' : 'Novo Fornecedor'} maxWidth="2xl">
        <form onSubmit={handleSalvar} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Razão Social / Nome Fantasia *:</label>
              <input
                type="text"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Ex: Distribuidora Nacional de Bebidas Ltda"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">CNPJ:</label>
              <input
                type="text"
                value={formCnpj}
                onChange={(e) => setFormCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Telefone / Comercial:</label>
              <input
                type="text"
                value={formTelefone}
                onChange={(e) => setFormTelefone(e.target.value)}
                placeholder="(11) 3322-1100"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">E-mail Comercial:</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="contato@distribuidora.com.br"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Endereço Completo:</label>
              <input
                type="text"
                value={formEndereco}
                onChange={(e) => setFormEndereco(e.target.value)}
                placeholder="Av. das Indústrias, 500 - SP"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Salvar Dados do Fornecedor</span>
          </button>
        </form>
      </Modal>
    </div>
  );
};

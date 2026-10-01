import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Check, 
  Phone, 
  Mail, 
  MapPin, 
  Eye, 
  Wallet, 
  ShoppingBag,
  CreditCard,
  AlertCircle,
  X
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { Cliente, Venda, CrediarioContrato } from '../types';
import { 
  formatarCpfCnpj, 
  formatarTelefone, 
  formatarCep, 
  validarCPF, 
  validarCNPJ, 
  limparMascara 
} from '../utils/validators';
import { formatarMoedaBR, formatarDataBR } from '../utils/datetime';

export const ClientesView: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState<string>('');
  const [carregando, setCarregando] = useState<boolean>(true);

  // Modais
  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState<boolean>(false);
  const [clienteDetalhes, setClienteDetalhes] = useState<Cliente | null>(null);
  const [historicoVendasCliente, setHistoricoVendasCliente] = useState<Venda[]>([]);
  const [saldoCreditoCliente, setSaldoCreditoCliente] = useState<number>(0);
  const [crediarioLimiteInfo, setCrediarioLimiteInfo] = useState<any>(null);

  // Formulário
  const [formNome, setFormNome] = useState<string>('');
  const [formCpfCnpj, setFormCpfCnpj] = useState<string>('');
  const [formTelefone, setFormTelefone] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formEndereco, setFormEndereco] = useState<string>('');
  const [formCidade, setFormCidade] = useState<string>('São Paulo');
  const [formEstado, setFormEstado] = useState<string>('SP');
  const [formCep, setFormCep] = useState<string>('');
  const [formLimiteCrediario, setFormLimiteCrediario] = useState<string | number>(500);

  const carregarClientes = async () => {
    setCarregando(true);
    try {
      const lista = await window.api.clientes.listar(busca);
      setClientes(lista || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarClientes();
  }, [busca]);

  const abrirModalNovo = () => {
    setClienteEditando(null);
    setFormNome('');
    setFormCpfCnpj('');
    setFormTelefone('');
    setFormEmail('');
    setFormEndereco('');
    setFormCidade('São Paulo');
    setFormEstado('SP');
    setFormCep('');
    setFormLimiteCrediario(500);
    setModalAberto(true);
  };

  const abrirModalEditar = (cli: Cliente) => {
    setClienteEditando(cli);
    setFormNome(cli.nome || '');
    setFormCpfCnpj(formatarCpfCnpj(cli.cpf_cnpj));
    setFormTelefone(formatarTelefone(cli.telefone));
    setFormEmail(cli.email || '');
    setFormEndereco(cli.endereco || '');
    setFormCidade(cli.cidade || 'São Paulo');
    setFormEstado(cli.estado || 'SP');
    setFormCep(formatarCep(cli.cep));
    setFormLimiteCrediario(cli.limite_credito !== undefined && cli.limite_credito !== null ? cli.limite_credito : 500);
    setModalAberto(true);
  };

  const abrirDetalhes = async (cli: Cliente) => {
    setClienteDetalhes(cli);
    setModalDetalhesAberto(true);

    try {
      // Carrega saldo de crédito
      if (window.api?.clientes?.getSaldoCredito) {
        const saldo = await window.api.clientes.getSaldoCredito(cli.id);
        setSaldoCreditoCliente(saldo || 0);
      }
      // Carrega informações de limite e crediário
      if (window.api?.crediario?.verificarLimite) {
        const lim = await window.api.crediario.verificarLimite(cli.id, 0);
        setCrediarioLimiteInfo(lim);
      }
      // Carrega vendas do cliente
      if (window.api?.vendas?.listar) {
        const todasVendas = await window.api.vendas.listar();
        const vendasCli = todasVendas.filter((v: any) => v.cliente_id === cli.id);
        setHistoricoVendasCliente(vendasCli);
      }
    } catch (e) {
      console.error('Erro ao carregar detalhes do cliente:', e);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      alert('O nome do cliente é obrigatório.');
      return;
    }

    const docLimpo = limparMascara(formCpfCnpj);
    if (docLimpo.length > 0) {
      if (docLimpo.length === 11) {
        if (!validarCPF(docLimpo)) {
          alert('CPF inválido! Por favor, confira os 11 dígitos.');
          return;
        }
      } else if (docLimpo.length === 14) {
        if (!validarCNPJ(docLimpo)) {
          alert('CNPJ inválido! Por favor, confira os 14 dígitos.');
          return;
        }
      } else {
        alert('Documento incompleto. O CPF deve possuir 11 dígitos ou o CNPJ 14 dígitos.');
        return;
      }
    }

    try {
      const parsedLimite = typeof formLimiteCrediario === 'number' 
        ? formLimiteCrediario 
        : (parseFloat(String(formLimiteCrediario).replace(',', '.')) || 0);

      const payload = {
        nome: formNome.trim(),
        cpf_cnpj: docLimpo || undefined,
        telefone: limparMascara(formTelefone) || undefined,
        email: formEmail.trim() || undefined,
        endereco: formEndereco.trim() || undefined,
        cidade: formCidade.trim() || undefined,
        estado: formEstado.trim() || undefined,
        cep: limparMascara(formCep) || undefined,
        limite_credito: parsedLimite
      };

      if (clienteEditando) {
        await window.api.clientes.atualizar(clienteEditando.id, payload);
      } else {
        await window.api.clientes.criar(payload);
      }

      setModalAberto(false);
      carregarClientes();
    } catch (err: any) {
      alert(`Erro ao salvar cliente: ${err?.message || err}`);
    }
  };

  const handleExcluir = async (cli: Cliente) => {
    if (confirm(`Deseja realmente excluir o cliente "${cli.nome}"?`)) {
      try {
        await window.api.clientes.excluir(cli.id);
        carregarClientes();
      } catch (err: any) {
        alert(`Erro ao excluir: ${err?.message || err}`);
      }
    }
  };

  return (
    <div className="h-full flex flex-col p-6 bg-slate-50 overflow-hidden space-y-4">
      {/* 1. CABEÇALHO PADRÃO LIMPO */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-600" />
            <span>Clientes</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastro de clientes, consulta de limites, histórico de compras e crediário.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirModalNovo}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all text-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Novo Cliente</span>
        </button>
      </div>

      {/* 2. BARRA DE BUSCA RÁPIDA */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente por nome, CPF/CNPJ ou telefone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-none"
          />
        </div>
        {busca && (
          <button
            type="button"
            onClick={() => setBusca('')}
            className="text-xs text-slate-400 hover:text-slate-600 font-medium px-2 py-1"
          >
            Limpar
          </button>
        )}
      </div>

      {/* 3. TABELA LIMPA DE CLIENTES */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200 text-[11px] sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-4"># ID</th>
                <th className="py-2.5 px-4">Nome do Cliente</th>
                <th className="py-2.5 px-4">CPF / CNPJ</th>
                <th className="py-2.5 px-4">Telefone</th>
                <th className="py-2.5 px-4">Cidade / UF</th>
                <th className="py-2.5 px-4 text-right">Limite Crediário</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-center w-28">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {clientes.map((cli) => (
                <tr key={cli.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-mono text-slate-400 font-bold">#{cli.id}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">{cli.nome}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-600 text-[11px]">
                    {cli.cpf_cnpj ? formatarCpfCnpj(cli.cpf_cnpj) : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {cli.telefone ? formatarTelefone(cli.telefone) : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">{cli.cidade ? `${cli.cidade}/${cli.estado || ''}` : '—'}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                    {formatarMoedaBR(cli.limite_credito || 500)}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      cli.status_crediario === 'bloqueado'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {(cli.status_crediario || 'ativo').toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => abrirDetalhes(cli)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                        title="Ver Detalhes / Extrato 360°"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirModalEditar(cli)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Editar Cliente"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExcluir(cli)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir Cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {clientes.length === 0 && !carregando && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Nenhum cliente cadastrado ou encontrado com o filtro atual.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs font-semibold text-slate-600 flex justify-between items-center">
          <span>Total de Clientes Cadastrados: <strong className="text-slate-900">{clientes.length}</strong></span>
          <span className="text-[11px] text-slate-400">Clique no ícone de visualização para consultar o extrato completo</span>
        </div>
      </div>

      {/* 4. MODAL NOVO / EDITAR CLIENTE */}
      <Modal isOpen={modalAberto} onClose={() => setModalAberto(false)} title={clienteEditando ? 'Editar Cliente' : 'Cadastrar Novo Cliente'} maxWidth="xl">
        <form onSubmit={handleSalvar} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Nome Completo / Razão Social *:</label>
              <input
                type="text"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Ex: Carlos Eduardo Silva"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-none"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">CPF ou CNPJ:</label>
              <input
                type="text"
                value={formCpfCnpj}
                onChange={(e) => setFormCpfCnpj(formatarCpfCnpj(e.target.value))}
                placeholder="000.000.000-00"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Telefone / WhatsApp:</label>
              <input
                type="text"
                value={formTelefone}
                onChange={(e) => setFormTelefone(formatarTelefone(e.target.value))}
                placeholder="(11) 99999-8888"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="font-bold text-slate-700 block mb-1">E-mail:</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Limite Crediário (R$):</label>
              <input
                type="number"
                step="50"
                min="0"
                value={formLimiteCrediario}
                onChange={(e) => setFormLimiteCrediario(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-none font-bold text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">CEP:</label>
              <input
                type="text"
                value={formCep}
                onChange={(e) => setFormCep(formatarCep(e.target.value))}
                placeholder="01000-000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-none font-mono"
              />
            </div>
            <div className="col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Endereço (Rua, Número, Bairro):</label>
              <input
                type="text"
                value={formEndereco}
                onChange={(e) => setFormEndereco(e.target.value)}
                placeholder="Ex: Av. Paulista, 1000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Cidade:</label>
              <input
                type="text"
                value={formCidade}
                onChange={(e) => setFormCidade(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Estado (UF):</label>
              <input
                type="text"
                maxLength={2}
                value={formEstado}
                onChange={(e) => setFormEstado(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-none font-bold"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalAberto(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-5 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Cliente</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. MODAL DETALHES / EXTRATO 360° DO CLIENTE */}
      {modalDetalhesAberto && clienteDetalhes && (
        <Modal isOpen={modalDetalhesAberto} onClose={() => setModalDetalhesAberto(false)} title={`Extrato & Ficha do Cliente: ${clienteDetalhes.nome}`} maxWidth="3xl">
          <div className="space-y-4 text-xs">
            {/* Topo com 3 Cards de Indicadores */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Limite Crediário</span>
                <div className="text-base font-black text-slate-900 font-mono mt-0.5">
                  {formatarMoedaBR(crediarioLimiteInfo?.limiteTotal ?? (clienteDetalhes.limite_credito || 500))}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Disponível: <strong className="text-emerald-700 font-mono">{formatarMoedaBR(crediarioLimiteInfo?.limiteDisponivel || 0)}</strong>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Saldo Devedor em Aberto</span>
                <div className="text-base font-black text-rose-600 font-mono mt-0.5">
                  {formatarMoedaBR(crediarioLimiteInfo?.saldoDevedor || 0)}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Status: <strong className="text-slate-700 uppercase">{clienteDetalhes.status_crediario || 'Ativo'}</strong>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Saldo de Crédito / Troco</span>
                <div className="text-base font-black text-emerald-600 font-mono mt-0.5">
                  {formatarMoedaBR(saldoCreditoCliente || 0)}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Disponível para abatimento no PDV
                </div>
              </div>
            </div>

            {/* Dados Cadastrais Rápidos */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
              <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b pb-1.5">
                <Users className="w-3.5 h-3.5 text-sky-600" />
                <span>Dados de Contato & Endereço</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                <div><strong>CPF / CNPJ:</strong> {clienteDetalhes.cpf_cnpj ? formatarCpfCnpj(clienteDetalhes.cpf_cnpj) : 'Não informado'}</div>
                <div><strong>Telefone / WhatsApp:</strong> {clienteDetalhes.telefone ? formatarTelefone(clienteDetalhes.telefone) : 'Não informado'}</div>
                <div><strong>E-mail:</strong> {clienteDetalhes.email || 'Não informado'}</div>
                <div><strong>Endereço:</strong> {clienteDetalhes.endereco ? `${clienteDetalhes.endereco} (${clienteDetalhes.cidade}/${clienteDetalhes.estado})` : 'Não informado'}</div>
              </div>
            </div>

            {/* Histórico Recente de Compras */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-sky-600" />
                <span>Últimas Compras Realizadas ({historicoVendasCliente.length})</span>
              </h4>

              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Venda #</th>
                      <th className="py-2 px-3">Data</th>
                      <th className="py-2 px-3">Forma Pagto</th>
                      <th className="py-2 px-3 text-right">Valor Total</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                    {historicoVendasCliente.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="py-1.5 px-3 font-mono font-bold">#{v.id}</td>
                        <td className="py-1.5 px-3 font-mono">{formatarDataBR(v.data_venda)}</td>
                        <td className="py-1.5 px-3 uppercase font-bold text-slate-600">{v.forma_pagamento}</td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">{formatarMoedaBR(v.total)}</td>
                        <td className="py-1.5 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700">
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {historicoVendasCliente.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400">
                          Nenhuma compra registrada para este cliente.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setModalDetalhesAberto(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer"
              >
                Fechar Extrato
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

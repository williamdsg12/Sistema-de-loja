import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Share2, 
  ExternalLink, 
  ShoppingBag, 
  Check, 
  Copy, 
  Settings, 
  Smartphone, 
  Clock, 
  QrCode, 
  Truck, 
  CreditCard, 
  Eye, 
  Store, 
  Image as ImageIcon,
  MessageCircle,
  Phone,
  AlertCircle,
  Sparkles,
  Lock,
  RefreshCw,
  Plus,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { Produto, CatalogoPedido } from '../types';
import { usePlanos } from '../context/PlanosContext';

export const CatalogoOnlineView: React.FC = () => {
  const { temRecurso, exigirRecurso, planoAtual, abrirModalPlanos } = usePlanos();

  const [catalogoAtivo, setCatalogoAtivo] = useState<boolean>(true);
  const [slugLoja, setSlugLoja] = useState<string>('nexpdv-moda');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [pedidosCatalogo, setPedidosCatalogo] = useState<CatalogoPedido[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'produtos' | 'pedidos' | 'configuracoes'>('produtos');
  const [buscaProduto, setBuscaProduto] = useState<string>('');
  const [sincronizandoNuvem, setSincronizandoNuvem] = useState<boolean>(false);

  // Configurações da Loja Virtual
  const [nomeLoja, setNomeLoja] = useState<string>('NexPDV - Moda & Estilo');
  const [biografia, setBiografia] = useState<string>('As melhores roupas e acessórios com entrega rápida e pagamento via PIX no WhatsApp.');
  const [whatsappLoja, setWhatsappLoja] = useState<string>('');
  const [instagramLoja, setInstagramLoja] = useState<string>('');
  const [chavePix, setChavePix] = useState<string>('');
  const [taxaEntrega, setTaxaEntrega] = useState<number>(0);
  const [instrucoesPagamento, setInstrucoesPagamento] = useState<string>('Aceitamos PIX, Cartão na Entrega e Dinheiro.');
  const [manterSemEstoque, setManterSemEstoque] = useState<boolean>(false);
  const [linkCopiado, setLinkCopiado] = useState<boolean>(false);

  const carregarDados = async () => {
    try {
      const [prods, configs, pedidos, lojaInfo] = await Promise.all([
        window.api.produtos.listar('', false),
        window.api.config.obter(),
        window.api.catalogo.listarPedidos().catch(() => []),
        window.api.loja.obter().catch(() => null)
      ]);

      setProdutos(prods);
      setPedidosCatalogo(pedidos || []);

      if (lojaInfo) {
        if (lojaInfo.nome_fantasia) setNomeLoja(lojaInfo.nome_fantasia);
        if (lojaInfo.slug_catalogo) setSlugLoja(lojaInfo.slug_catalogo);
        if (lojaInfo.whatsapp) setWhatsappLoja(lojaInfo.whatsapp);
        if (lojaInfo.bio) setBiografia(lojaInfo.bio);
      }

      if (configs.taxa_entrega) setTaxaEntrega(Number(configs.taxa_entrega) || 0);
      if (configs.catalogo_ativo !== undefined) setCatalogoAtivo(configs.catalogo_ativo === '1');
      if (configs.manter_sem_estoque !== undefined) setManterSemEstoque(configs.manter_sem_estoque === '1');
      if (configs.instrucoes_pagamento) setInstrucoesPagamento(configs.instrucoes_pagamento);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const linkPublico = `https://meucomercio.com.br/${slugLoja}`;

  const copiarLink = () => {
    navigator.clipboard.writeText(linkPublico);
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2000);
  };

  const abrirLojaNavegador = () => {
    window.open(linkPublico, '_blank');
  };

  const handleTogglePublicado = async (produtoId: number, publicadoAtual: number | undefined) => {
    try {
      const novoStatus = !(publicadoAtual === 1 || publicadoAtual === undefined);
      await window.api.catalogo.togglePublicacao(produtoId, novoStatus);
      carregarDados();
    } catch (e: any) {
      alert(`Erro: ${e?.message || e}`);
    }
  };

  const handleSincronizarNuvem = async () => {
    setSincronizandoNuvem(true);
    try {
      await Promise.all([
        window.api.loja.atualizar({
          nome_fantasia: nomeLoja,
          slug_catalogo: slugLoja,
          whatsapp: whatsappLoja,
          bio: biografia
        }),
        window.api.config.salvar('catalogo_ativo', catalogoAtivo ? '1' : '0'),
        window.api.config.salvar('manter_sem_estoque', manterSemEstoque ? '1' : '0'),
        window.api.config.salvar('taxa_entrega', String(taxaEntrega)),
        window.api.config.salvar('instrucoes_pagamento', instrucoesPagamento)
      ]);
      alert('Catálogo Online sincronizado com a nuvem e loja pública com sucesso!');
    } catch (e: any) {
      alert(`Erro ao sincronizar: ${e?.message || e}`);
    } finally {
      setSincronizandoNuvem(false);
    }
  };

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const produtosFiltrados = produtos.filter(p => {
    if (!buscaProduto) return true;
    const t = buscaProduto.toLowerCase();
    return p.nome.toLowerCase().includes(t) || (p.codigo && p.codigo.toLowerCase().includes(t));
  });

  const totalPublicados = produtos.filter(p => p.publicado_catalogo === 1 || p.publicado_catalogo === undefined).length;

  return (
    <div className="h-full flex flex-col p-6 bg-slate-100 overflow-hidden space-y-4">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-sky-600/20">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 leading-tight">Catálogo Online & Loja Virtual</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                catalogoAtivo ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${catalogoAtivo ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                {catalogoAtivo ? 'Loja Pública Ativa' : 'Loja Desativada'}
              </span>
            </div>
            <p className="text-xs text-slate-500">Sua vitrine pública na internet integrada ao estoque e PDV.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copiarLink}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            {linkCopiado ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{linkCopiado ? 'Link Copiado!' : 'Copiar Link'}</span>
          </button>

          <button
            type="button"
            onClick={abrirLojaNavegador}
            className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Abrir Loja Virtual</span>
          </button>

          <button
            type="button"
            disabled={sincronizandoNuvem}
            onClick={handleSincronizarNuvem}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${sincronizandoNuvem ? 'animate-spin' : ''}`} />
            <span>{sincronizandoNuvem ? 'Sincronizando...' : 'Sincronizar Nuvem'}</span>
          </button>
        </div>
      </div>

      {/* ABAS SUPERIORES */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setAbaAtiva('produtos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            abaAtiva === 'produtos' ? 'bg-sky-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Produtos na Vitrine ({totalPublicados})</span>
        </button>

        <button
          onClick={() => {
            if (exigirRecurso('pedidos_catalogo', 'Pedidos Recebidos pelo Catálogo Online')) {
              setAbaAtiva('pedidos');
            }
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            abaAtiva === 'pedidos' ? 'bg-sky-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Pedidos Recebidos</span>
          {pedidosCatalogo.length > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-500 text-slate-950 font-black rounded-full text-[10px]">
              {pedidosCatalogo.length}
            </span>
          )}
          {!temRecurso('pedidos_catalogo') && (
            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-bold">PRO</span>
          )}
        </button>

        <button
          onClick={() => setAbaAtiva('configuracoes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            abaAtiva === 'configuracoes' ? 'bg-sky-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Configurações & Painel da Loja</span>
        </button>
      </div>

      {/* CONTEÚDO */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        
        {/* ABA PRODUTOS */}
        {abaAtiva === 'produtos' && (
          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-hidden space-y-3">
            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                placeholder="Filtrar por nome ou código do produto..."
                className="w-full max-w-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
              <span className="text-xs text-slate-500 font-medium">
                Mostrando <strong>{produtosFiltrados.length}</strong> de {produtos.length} produtos
              </span>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="p-3 w-16">Foto</th>
                    <th className="p-3">Código</th>
                    <th className="p-3">Produto</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3 text-right">Preço de Venda</th>
                    <th className="p-3 text-center">Estoque Atual</th>
                    <th className="p-3 text-center">Publicar na Loja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {produtosFiltrados.map((p) => {
                    const publicado = p.publicado_catalogo === 1 || p.publicado_catalogo === undefined;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200">
                            {p.imagem_url ? (
                              <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-600">{p.codigo || `#${p.id}`}</td>
                        <td className="p-3 font-bold text-slate-800">{p.nome}</td>
                        <td className="p-3 text-slate-500">{p.categoria || '-'}</td>
                        <td className="p-3 text-right font-black text-slate-900">{formatCurrency(p.preco_venda)}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            p.estoque_atual > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {p.estoque_atual} {p.unidade_medida || 'UN'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePublicado(p.id, p.publicado_catalogo)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs ${
                              publicado
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            {publicado ? '✓ Publicado' : 'Oculto'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA PEDIDOS DO CATÁLOGO */}
        {abaAtiva === 'pedidos' && (
          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-hidden space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Pedidos Recebidos pela Loja Virtual</h3>
                <p className="text-slate-500 text-xs">Os pedidos feitos pelos clientes entram automaticamente aqui para faturamento no PDV.</p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
                Total: {pedidosCatalogo.length} pedidos
              </span>
            </div>

            {pedidosCatalogo.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-300 rounded-2xl">
                <ShoppingBag className="w-12 h-12 text-slate-300 mb-2" />
                <h4 className="font-bold text-slate-700 text-sm">Nenhum pedido recebido ainda</h4>
                <p className="text-slate-400 text-xs mt-1">Divulgue o link da sua loja virtual para seus clientes!</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3">
                {pedidosCatalogo.map((ped) => (
                  <div key={ped.id} className="p-4 border border-slate-200 rounded-2xl hover:border-sky-300 transition-all bg-slate-50/50 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">Pedido #{ped.id}</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full uppercase">
                          {ped.status}
                        </span>
                        <span className="text-slate-400 text-xs">• {new Date(ped.criado_em).toLocaleString('pt-BR')}</span>
                      </div>
                      <p className="font-bold text-slate-700 text-xs">Cliente: {ped.cliente_nome} ({ped.cliente_telefone})</p>
                      {ped.cliente_endereco && (
                        <p className="text-slate-500 text-xs">Endereço: {ped.cliente_endereco}</p>
                      )}
                    </div>

                    <div className="text-right space-y-1">
                      <p className="text-slate-400 text-[11px] font-medium">Total do Pedido</p>
                      <p className="text-base font-black text-emerald-700">{formatCurrency(ped.total)}</p>
                      <button
                        type="button"
                        onClick={() => alert(`Pedido #${ped.id} pronto para envio ao PDV!`)}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors"
                      >
                        Abrir no PDV
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA CONFIGURAÇÕES DA LOJA VIRTUAL */}
        {abaAtiva === 'configuracoes' && (
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-y-auto max-w-3xl space-y-5 text-xs">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-2">
              Personalização da Loja Virtual
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nome da Loja Virtual:</label>
                <input
                  type="text"
                  value={nomeLoja}
                  onChange={(e) => setNomeLoja(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Link Público (Subdomínio):</label>
                <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
                  <span className="px-3 py-2 text-slate-500 font-mono text-[11px] border-r border-slate-300">
                    meucomercio.com.br/
                  </span>
                  <input
                    type="text"
                    value={slugLoja}
                    onChange={(e) => setSlugLoja(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 px-3 py-2 font-mono font-bold text-sky-700 bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">WhatsApp para Recebimento de Pedidos:</label>
                <input
                  type="text"
                  value={whatsappLoja}
                  onChange={(e) => setWhatsappLoja(e.target.value)}
                  placeholder="5511998877665"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Taxa Padrão de Entrega (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  value={taxaEntrega}
                  onChange={(e) => setTaxaEntrega(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Biografia / Descrição da Loja:</label>
                <textarea
                  rows={2}
                  value={biografia}
                  onChange={(e) => setBiografia(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="md:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Instruções de Pagamento aos Clientes:</label>
                <input
                  type="text"
                  value={instrucoesPagamento}
                  onChange={(e) => setInstrucoesPagamento(e.target.value)}
                  placeholder="Ex: Aceitamos PIX, Cartão na Entrega e Dinheiro."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={catalogoAtivo}
                  onChange={(e) => setCatalogoAtivo(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <div>
                  <span className="font-bold text-slate-800 text-xs block">Ativar Catálogo Online</span>
                  <span className="text-slate-500 text-[11px]">Permite que clientes acessem sua vitrine e façam pedidos pela internet.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer pt-2 border-t border-slate-200">
                <input
                  type="checkbox"
                  checked={manterSemEstoque}
                  onChange={(e) => setManterSemEstoque(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <div>
                  <span className="font-bold text-slate-800 text-xs block">Manter publicado mesmo sem estoque</span>
                  <span className="text-slate-500 text-[11px]">Se desmarcado, produtos com estoque zerado somem automaticamente da vitrine.</span>
                </div>
              </label>
            </div>

            <button
              type="button"
              disabled={sincronizandoNuvem}
              onClick={handleSincronizarNuvem}
              className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer text-xs"
            >
              {sincronizandoNuvem ? 'Salvando...' : 'Salvar Configurações da Loja Virtual'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

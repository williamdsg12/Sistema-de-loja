import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Barcode, 
  Check, 
  Image as ImageIcon,
  Camera,
  Upload,
  X,
  Star,
  Layers,
  FileText,
  Truck,
  Sliders,
  Calendar,
  DollarSign,
  AlertCircle,
  Tag,
  Printer,
  ShieldCheck,
  Building2,
  RefreshCw,
  Eye
} from 'lucide-react';
import { Produto, Fornecedor, TributacaoPerfil } from '../types';
import { Modal } from '../components/Modal';
import { useToast } from '../context/ToastContext';

const ProductImgWithFallback: React.FC<{ src?: string; alt?: string; className?: string }> = ({
  src,
  alt,
  className = "w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-xs mx-auto"
}) => {
  const [hasError, setHasError] = useState<boolean>(false);

  if (!src || hasError) {
    return (
      <div className={`${className} bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400`}>
        <ImageIcon className="w-5 h-5 opacity-60" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || "Produto"}
      onError={() => setHasError(true)}
      className={className}
    />
  );
};

type TabViewPrincipal = 'itens' | 'etiquetas' | 'fornecedores' | 'tributacoes';
type TabModalTipo = 'cadastro' | 'kit' | 'tributacao' | 'fornecedores' | 'opcoes' | 'validade';

export const ProdutosView: React.FC = () => {
  const { toast, confirmDialog } = useToast();
  const [tabPrincipal, setTabPrincipal] = useState<TabViewPrincipal>('itens');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [perfisTributacao, setPerfisTributacao] = useState<TributacaoPerfil[]>([]);
  const [busca, setBusca] = useState<string>('');
  const [apenasAtivos, setApenasAtivos] = useState<boolean>(true);
  const [carregando, setCarregando] = useState<boolean>(true);

  // Estados para Módulo de Etiquetas
  const [etiquetasSelecionadas, setEtiquetasSelecionadas] = useState<{ [id: number]: { selecionado: boolean; copias: number } }>({});
  const [formatoEtiqueta, setFormatoEtiqueta] = useState<'pequena' | 'media' | 'gondola'>('media');

  // Modal de Produto
  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [abaModalAtiva, setAbaModalAtiva] = useState<TabModalTipo>('cadastro');
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);

  // Campos do Formulário - Aba CADASTRO (estilo Nex)
  const [formCodigo, setFormCodigo] = useState<string>('');
  const [formCodigoAutomatico, setFormCodigoAutomatico] = useState<boolean>(false);
  const [formCodigoExtra, setFormCodigoExtra] = useState<string>('');
  const [formEanGtin, setFormEanGtin] = useState<string>('');
  const [formNome, setFormNome] = useState<string>('');
  const [formCategoria, setFormCategoria] = useState<string>('Vestuário');
  const [formSubcategoria, setFormSubcategoria] = useState<string>('');
  const [formMarca, setFormMarca] = useState<string>('');
  const [formPesoLiquido, setFormPesoLiquido] = useState<string | number>('');
  const [formPesoBruto, setFormPesoBruto] = useState<string | number>('');
  const [formLocalizacao, setFormLocalizacao] = useState<string>('');
  
  // Preços
  const [formPrecoVenda, setFormPrecoVenda] = useState<string | number>('');
  const [formPrecoVendaAutomatico, setFormPrecoVendaAutomatico] = useState<boolean>(false);
  const [formPrecoAlteravelVenda, setFormPrecoAlteravelVenda] = useState<boolean>(false);
  const [formPrecoCusto, setFormPrecoCusto] = useState<string | number>('');
  
  // Estoque
  const [formControlarEstoque, setControlarEstoque] = useState<boolean>(true);
  const [formEstoqueAtual, setFormEstoqueAtual] = useState<string | number>(0);
  const [formEstoqueMinimo, setFormEstoqueMinimo] = useState<string | number>(5);
  const [formEstoqueMaximo, setFormEstoqueMaximo] = useState<string | number>(100);
  const [formUnidadeMedida, setFormUnidadeMedida] = useState<string>('UN');
  const [formPermiteFracionamento, setFormPermiteFracionamento] = useState<boolean>(false);
  
  // Foto & Observações
  const [formImagemUrl, setFormImagemUrl] = useState<string>('');
  const [formObservacao, setFormObservacao] = useState<string>('');
  const [mostrarCampoObservacao, setMostrarCampoObservacao] = useState<boolean>(false);

  // Aba Kit / Combo
  const [formIsKit, setFormIsKit] = useState<boolean>(false);
  const [formKitItens, setFormKitItens] = useState<{ produtoId: number; nome: string; qtd: number; custoUnitario: number }[]>([]);

  // Aba Tributação
  const [formNcm, setFormNcm] = useState<string>('');
  const [formCest, setFormCest] = useState<string>('');
  const [formCfop, setFormCfop] = useState<string>('5102');
  const [formOrigem, setFormOrigem] = useState<number>(0);
  const [formCsosnCst, setFormCsosnCst] = useState<string>('102');
  const [formAliquotaIcms, setFormAliquotaIcms] = useState<string | number>(0);
  const [formAliquotaPis, setFormAliquotaPis] = useState<string | number>(0);
  const [formAliquotaCofins, setFormAliquotaCofins] = useState<string | number>(0);

  // Aba Fornecedores
  const [formFornecedorId, setFormFornecedorId] = useState<number | undefined>(undefined);
  const [formCodigoFornecedor, setFormCodigoFornecedor] = useState<string>('');

  // Aba Opções
  const [formAtivo, setFormAtivo] = useState<number>(1);
  const [formTamanho, setFormTamanho] = useState<string>('M');
  const [formCor, setFormCor] = useState<string>('');
  const [formComissaoPercentual, setFormComissaoPercentual] = useState<string | number>(0);
  const [formPontosFidelidade, setFormPontosFidelidade] = useState<string | number>(0);

  // Aba Controle de Validade
  const [formLote, setFormLote] = useState<string>('');
  const [formDataFabricacao, setFormDataFabricacao] = useState<string>('');
  const [formDataValidade, setFormDataValidade] = useState<string>('');
  const [formDiasAvisoVencimento, setFormDiasAvisoVencimento] = useState<string | number>(30);

  // Modal Perfil Tributário
  const [modalTributacaoAberto, setModalTributacaoAberto] = useState<boolean>(false);
  const [formPerfilTributacao, setFormPerfilTributacao] = useState({
    codigo: '',
    nome: '',
    origem: 0,
    monofasico: false,
    ncm_padrao: '',
    cfop_padrao: '5102',
    csosn_cst: '102',
    aliquota_icms: 0,
    aliquota_pis: 0,
    aliquota_cofins: 0
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputNomeRef = useRef<HTMLInputElement>(null);

  // Foco automático no campo Nome ao abrir o modal
  useEffect(() => {
    if (modalAberto && abaModalAtiva === 'cadastro') {
      const timer = setTimeout(() => {
        inputNomeRef.current?.focus();
        inputNomeRef.current?.select();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [modalAberto, abaModalAtiva]);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const [prods, forns, tributos] = await Promise.all([
        window.api.produtos.listar(busca, apenasAtivos),
        window.api.fornecedores.listar(),
        window.api.tributacao.listarPerfis().catch(() => [])
      ]);
      setProdutos(prods);
      setFornecedores(forns);
      setPerfisTributacao(tributos || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [busca, apenasAtivos]);

  // Atalhos no Modal (F2 para salvar, F4 observação, Esc fechar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!modalAberto) return;
      if (e.key === 'F2') {
        e.preventDefault();
        document.getElementById('btn-salvar-produto')?.click();
      } else if (e.key === 'F4') {
        e.preventDefault();
        setMostrarCampoObservacao((prev) => !prev);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setModalAberto(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalAberto]);

  const gerarCodigoAutomatico = () => {
    const proximoNum = (produtos.length + 1).toString().padStart(6, '0');
    return `PROD${proximoNum}`;
  };

  const abrirModalNovo = () => {
    setProdutoEditando(null);
    setAbaModalAtiva('cadastro');
    
    setFormCodigo(gerarCodigoAutomatico());
    setFormCodigoAutomatico(false);
    setFormCodigoExtra('');
    setFormEanGtin('');
    setFormNome('');
    setFormCategoria('Vestuário');
    setFormSubcategoria('');
    setFormMarca('');
    setFormPesoLiquido('');
    setFormPesoBruto('');
    setFormLocalizacao('');
    
    setFormPrecoVenda('');
    setFormPrecoVendaAutomatico(false);
    setFormPrecoAlteravelVenda(false);
    setFormPrecoCusto('');
    
    setControlarEstoque(true);
    setFormEstoqueAtual(0);
    setFormEstoqueMinimo(5);
    setFormEstoqueMaximo(100);
    setFormUnidadeMedida('UN');
    setFormPermiteFracionamento(false);
    
    setFormImagemUrl('');
    setFormObservacao('');
    setMostrarCampoObservacao(false);

    setFormIsKit(false);
    setFormKitItens([]);

    setFormNcm('');
    setFormCest('');
    setFormCfop('5102');
    setFormOrigem(0);
    setFormCsosnCst('102');
    setFormAliquotaIcms(0);
    setFormAliquotaPis(0);
    setFormAliquotaCofins(0);

    setFormFornecedorId(undefined);
    setFormCodigoFornecedor('');

    setFormAtivo(1);
    setFormTamanho('M');
    setFormCor('');
    setFormComissaoPercentual(0);
    setFormPontosFidelidade(0);

    setFormLote('');
    setFormDataFabricacao('');
    setFormDataValidade('');
    setFormDiasAvisoVencimento(30);

    setModalAberto(true);
  };

  const abrirModalEditar = (prod: Produto) => {
    setProdutoEditando(prod);
    setAbaModalAtiva('cadastro');

    setFormCodigo(prod.codigo || '');
    setFormCodigoAutomatico(false);
    setFormCodigoExtra(prod.codigo_extra || '');
    setFormEanGtin(prod.ean_gtin || '');
    setFormNome(prod.nome);
    setFormCategoria(prod.categoria || 'Vestuário');
    setFormSubcategoria(prod.subcategoria || '');
    setFormMarca(prod.marca || '');
    setFormPesoLiquido(prod.peso_liquido || '');
    setFormPesoBruto(prod.peso_bruto || '');
    setFormLocalizacao(prod.localizacao || '');

    setFormPrecoVenda(prod.preco_venda || '');
    setFormPrecoVendaAutomatico(Boolean(prod.preco_venda_automatico));
    setFormPrecoAlteravelVenda(Boolean(prod.preco_alteravel_venda));
    setFormPrecoCusto(prod.preco_custo || '');

    setControlarEstoque(prod.controlar_estoque !== undefined ? Boolean(prod.controlar_estoque) : true);
    setFormEstoqueAtual(prod.estoque_atual || 0);
    setFormEstoqueMinimo(prod.estoque_minimo || 0);
    setFormEstoqueMaximo(prod.estoque_maximo || 100);
    setFormUnidadeMedida(prod.unidade_medida || 'UN');
    setFormPermiteFracionamento(Boolean(prod.permite_fracionamento));

    setFormImagemUrl(prod.imagem_url || '');
    setFormObservacao(prod.observacao || prod.descricao || '');
    setMostrarCampoObservacao(Boolean(prod.observacao || prod.descricao));

    setFormIsKit(Boolean(prod.is_kit));
    try {
      setFormKitItens(prod.kit_itens ? JSON.parse(prod.kit_itens) : []);
    } catch {
      setFormKitItens([]);
    }

    setFormNcm(prod.ncm || '');
    setFormCest(prod.cest || '');
    setFormCfop(prod.cfop || '5102');
    setFormOrigem(prod.origem || 0);
    setFormCsosnCst(prod.csosn_cst || '102');
    setFormAliquotaIcms(prod.aliquota_icms || 0);
    setFormAliquotaPis(prod.aliquota_pis || 0);
    setFormAliquotaCofins(prod.aliquota_cofins || 0);

    setFormFornecedorId(prod.fornecedor_id);
    setFormCodigoFornecedor(prod.codigo_fornecedor || '');

    setFormAtivo(prod.ativo);
    setFormTamanho(prod.tamanho || 'M');
    setFormCor(prod.cor || '');
    setFormComissaoPercentual(prod.comissao_percentual || 0);
    setFormPontosFidelidade(prod.pontos_fidelidade || 0);

    setFormLote(prod.lote || '');
    setFormDataFabricacao(prod.data_fabricacao || '');
    setFormDataValidade(prod.data_validade || '');
    setFormDiasAvisoVencimento(prod.dias_aviso_vencimento || 30);

    setModalAberto(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFormImagemUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const parseNum = (val: any, fallback = 0): number => {
    if (val === '' || val === null || val === undefined) return fallback;
    if (typeof val === 'number') return isNaN(val) ? fallback : val;
    const clean = String(val).replace(',', '.').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? fallback : parsed;
  };

  const handleSalvar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formNome.trim()) {
      toast('Por favor, informe o Nome do produto.', 'warning');
      setAbaModalAtiva('cadastro');
      return;
    }

    const pesoLiq = parseNum(formPesoLiquido);
    const pesoBruto = parseNum(formPesoBruto);
    const precoCusto = parseNum(formPrecoCusto);
    const precoVenda = parseNum(formPrecoVenda);
    const estoqueAtual = parseNum(formEstoqueAtual);
    const estoqueMinimo = parseNum(formEstoqueMinimo);
    const estoqueMaximo = parseNum(formEstoqueMaximo, 100);

    if (pesoLiq < 0 || pesoBruto < 0) {
      toast('Peso líquido e peso bruto não podem ser negativos.', 'error');
      setAbaModalAtiva('cadastro');
      return;
    }
    if (precoCusto < 0 || precoVenda < 0) {
      toast('Preço de venda e preço de custo não podem ser negativos.', 'error');
      setAbaModalAtiva('cadastro');
      return;
    }
    if (estoqueAtual < 0 || estoqueMinimo < 0 || estoqueMaximo < 0) {
      toast('Os campos de estoque (atual, mínimo e máximo) não podem ser negativos.', 'error');
      setAbaModalAtiva('cadastro');
      return;
    }

    let codigoFinal = formCodigo.trim();
    if (!codigoFinal && formCodigoAutomatico) {
      codigoFinal = gerarCodigoAutomatico();
    }

    try {
      const payload: Omit<Produto, 'id' | 'criado_em' | 'fornecedor_nome'> = {
        codigo: codigoFinal || undefined,
        codigo_extra: formCodigoExtra.trim() || undefined,
        ean_gtin: formEanGtin.trim() || undefined,
        nome: formNome.trim(),
        descricao: formObservacao.trim() || undefined,
        categoria: formCategoria.trim() || 'Geral',
        subcategoria: formSubcategoria.trim() || undefined,
        marca: formMarca.trim() || undefined,
        peso_liquido: Math.max(0, pesoLiq),
        peso_bruto: Math.max(0, pesoBruto),
        localizacao: formLocalizacao.trim() || undefined,
        unidade_medida: formUnidadeMedida || 'UN',
        tamanho: formTamanho.trim() || undefined,
        cor: formCor.trim() || undefined,
        imagem_url: formImagemUrl.trim() || undefined,
        preco_custo: Math.max(0, precoCusto),
        preco_venda: Math.max(0, precoVenda),
        preco_venda_automatico: formPrecoVendaAutomatico ? 1 : 0,
        preco_alteravel_venda: formPrecoAlteravelVenda ? 1 : 0,
        controlar_estoque: formControlarEstoque ? 1 : 0,
        estoque_atual: Math.max(0, estoqueAtual),
        estoque_minimo: Math.max(0, estoqueMinimo),
        estoque_maximo: Math.max(0, estoqueMaximo),
        permite_fracionamento: formPermiteFracionamento ? 1 : 0,
        observacao: formObservacao.trim() || undefined,
        is_kit: formIsKit ? 1 : 0,
        kit_itens: formIsKit ? JSON.stringify(formKitItens) : undefined,
        ncm: formNcm.trim() || undefined,
        cest: formCest.trim() || undefined,
        cfop: formCfop.trim() || undefined,
        origem: parseNum(formOrigem),
        csosn_cst: formCsosnCst.trim() || undefined,
        aliquota_icms: parseNum(formAliquotaIcms),
        aliquota_pis: parseNum(formAliquotaPis),
        aliquota_cofins: parseNum(formAliquotaCofins),
        codigo_fornecedor: formCodigoFornecedor.trim() || undefined,
        comissao_percentual: parseNum(formComissaoPercentual),
        pontos_fidelidade: parseNum(formPontosFidelidade),
        lote: formLote.trim() || undefined,
        data_fabricacao: formDataFabricacao || undefined,
        data_validade: formDataValidade || undefined,
        dias_aviso_vencimento: parseNum(formDiasAvisoVencimento, 30),
        fornecedor_id: formFornecedorId ? Number(formFornecedorId) : undefined,
        ativo: formAtivo
      };

      if (produtoEditando) {
        await window.api.produtos.atualizar(produtoEditando.id, payload);
        toast(`Produto "${payload.nome}" atualizado com sucesso!`, 'success');
      } else {
        await window.api.produtos.criar(payload);
        toast(`Produto "${payload.nome}" cadastrado com sucesso!`, 'success');
      }

      setModalAberto(false);
      carregarDados();
    } catch (err: any) {
      toast(`Erro ao salvar produto: ${err?.message || err}`, 'error');
    }
  };

  const handleExcluir = async (prod: Produto) => {
    const ok = await confirmDialog({
      title: 'Excluir Produto',
      message: `Deseja realmente excluir o produto "${prod.nome}"?`,
      confirmText: 'Excluir',
      variant: 'danger'
    });
    if (ok) {
      try {
        await window.api.produtos.excluir(prod.id);
        toast(`Produto "${prod.nome}" excluído com sucesso.`, 'info');
        carregarDados();
      } catch (err: any) {
        toast(`Erro ao excluir: ${err?.message || err}`, 'error');
      }
    }
  };

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="h-full flex flex-col p-6 bg-slate-100 overflow-hidden space-y-4 font-sans">
      
      {/* 1. CABEÇALHO COM AS 4 ABAS DA LISTA PRINCIPAL */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-sky-600" />
            Produtos & Gestão de Catálogo
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Controle completo de itens, gerador de etiquetas, fornecedores e perfis tributários.</p>
        </div>

        <button
          onClick={abrirModalNovo}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 px-4 rounded-xl shadow transition-colors text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Produto</span>
        </button>
      </div>

      {/* 2. NAVEGAÇÃO DE ABAS SUPERIORES (ITENS, ETIQUETAS, FORNECEDORES, TRIBUTAÇÕES) */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold">
        {[
          { id: 'itens', label: 'Itens (Produtos)', icon: Package },
          { id: 'etiquetas', label: 'Impressão de Etiquetas', icon: Tag },
          { id: 'fornecedores', label: 'Fornecedores', icon: Building2 },
          { id: 'tributacoes', label: 'Tributações dos Produtos', icon: ShieldCheck }
        ].map((t) => {
          const Icon = t.icon;
          const isAtivo = tabPrincipal === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTabPrincipal(t.id as TabViewPrincipal)}
              className={`flex items-center gap-2 pb-3 px-4 border-b-2 transition-all ${
                isAtivo
                  ? 'text-sky-600 border-sky-600 font-extrabold'
                  : 'text-slate-500 border-transparent hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. CONTEÚDO DA ABA SELECIONADA */}
      {tabPrincipal === 'itens' && (
        <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
          {/* Barra de Busca e Filtros */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, código de barras, EAN, categoria, tamanho ou cor..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={apenasAtivos}
                onChange={(e) => setApenasAtivos(e.target.checked)}
                className="rounded text-sky-600 focus:ring-sky-500"
              />
              <span>Apenas produtos ativos</span>
            </label>
          </div>

          {/* Tabela de Produtos */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200 text-[11px] sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-16 text-center">Foto</th>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">EAN / GTIN</th>
                    <th className="py-2.5 px-3">Descrição / Nome</th>
                    <th className="py-2.5 px-3">Categoria / Marca</th>
                    <th className="py-2.5 px-3 text-center">Tamanho / Cor</th>
                    <th className="py-2.5 px-3 text-right">Preço Custo</th>
                    <th className="py-2.5 px-3 text-right">Preço Venda</th>
                    <th className="py-2.5 px-3 text-center">Estoque</th>
                    <th className="py-2.5 px-3 text-center w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {produtos.map((prod) => {
                    const estoqueBaixo = prod.estoque_atual <= prod.estoque_minimo;
                    return (
                      <tr key={prod.id} className="hover:bg-sky-50/50 transition-colors">
                        <td className="py-2 px-3 text-center">
                          <ProductImgWithFallback src={prod.imagem_url} alt={prod.nome} />
                        </td>

                        <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px] font-semibold">{prod.codigo || '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{prod.ean_gtin || '—'}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          <div>{prod.nome}</div>
                          {prod.observacao && <div className="text-[10px] text-slate-400 font-normal truncate max-w-xs">{prod.observacao}</div>}
                          {prod.ativo === 0 && (
                            <span className="inline-block mt-0.5 text-[9px] bg-slate-200 text-slate-600 px-1 py-0.2 rounded font-bold">Inativo</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <div>{prod.categoria || 'Geral'}</div>
                          {prod.marca && <div className="text-[10px] text-slate-400 font-medium">{prod.marca}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {prod.tamanho && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-bold rounded text-[10px] border border-slate-200">
                                Tam: {prod.tamanho}
                              </span>
                            )}
                            {prod.cor && (
                              <span className="px-1.5 py-0.5 bg-sky-50 text-sky-700 font-medium rounded text-[10px] border border-sky-100">
                                {prod.cor}
                              </span>
                            )}
                            {!prod.tamanho && !prod.cor && <span className="text-slate-400">—</span>}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right currency-val text-slate-500">{formatCurrency(prod.preco_custo)}</td>
                        <td className="py-2.5 px-3 text-right font-bold currency-val text-emerald-700">{formatCurrency(prod.preco_venda)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            estoqueBaixo ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {prod.estoque_atual} {prod.unidade_medida}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => abrirModalEditar(prod)}
                              className="p-1 text-slate-400 hover:text-sky-600 hover:bg-slate-100 rounded transition-colors"
                              title="Editar Produto"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleExcluir(prod)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Excluir Produto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs font-semibold text-slate-600 flex justify-between">
              <span>Total de Produtos Listados: <strong className="text-slate-900">{produtos.length}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: GERADOR E IMPRESSÃO DE ETIQUETAS */}
      {tabPrincipal === 'etiquetas' && (
        <div className="flex-1 flex flex-col space-y-4 overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Tag className="w-4 h-4 text-sky-600" />
                Gerador de Etiquetas de Gôndola e Código de Barras
              </h3>
              <p className="text-xs text-slate-500">Selecione os produtos e gere folhas de etiquetas prontas para impressoras térmicas (Zebra/Argox) ou folha A4.</p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={formatoEtiqueta}
                onChange={(e: any) => setFormatoEtiqueta(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold"
              >
                <option value="pequena">Etiqueta Pequena (30x20mm - Joias/Moda)</option>
                <option value="media">Etiqueta Média (50x30mm - Padrão)</option>
                <option value="gondola">Etiqueta de Gôndola / Prateleira (100x30mm)</option>
              </select>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs shadow transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Etiquetas</span>
              </button>
            </div>
          </div>

          {/* Prévia das Etiquetas */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="grid grid-cols-4 gap-4">
              {produtos.slice(0, 12).map((p) => (
                <div key={p.id} className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm flex flex-col justify-between items-center text-center space-y-1">
                  <span className="text-[10px] font-bold text-slate-700 line-clamp-1">{p.nome}</span>
                  {p.tamanho && <span className="text-[9px] bg-slate-100 px-1 rounded font-bold">Tam: {p.tamanho} {p.cor ? `• ${p.cor}` : ''}</span>}
                  
                  {/* Código de barras ilustrativo */}
                  <div className="my-1 font-mono tracking-widest text-slate-900 font-bold text-xs bg-slate-100 px-2 py-0.5 rounded">
                    ❚❘❙❘❚ ❚❘❙❚ {p.codigo || '789100000'}
                  </div>

                  <div className="text-base font-black text-slate-900 font-mono">
                    {formatCurrency(p.preco_venda)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: FORNECEDORES CENTRAL */}
      {tabPrincipal === 'fornecedores' && (
        <div className="flex-1 flex flex-col space-y-4 overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-600" />
                Fornecedores Cadastrados
              </h3>
              <p className="text-xs text-slate-500">Gestão de parceiros, fabricantes e distribuidores de mercadorias.</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Razão Social / Nome</th>
                  <th className="py-2.5 px-3">CNPJ / CPF</th>
                  <th className="py-2.5 px-3">Telefone</th>
                  <th className="py-2.5 px-3">E-mail</th>
                  <th className="py-2.5 px-3">Endereço</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {fornecedores.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{f.nome}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{f.cnpj || '—'}</td>
                    <td className="py-2.5 px-3">{f.telefone || '—'}</td>
                    <td className="py-2.5 px-3 text-sky-600">{f.email || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-500">{f.endereco || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 4: TRIBUTAÇÕES DOS PRODUTOS */}
      {tabPrincipal === 'tributacoes' && (
        <div className="flex-1 flex flex-col space-y-4 overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                Tributações dos Produtos (Perfis Fiscais Reutilizáveis)
              </h3>
              <p className="text-xs text-slate-500">Perfis fiscais para automatizar o preenchimento de NCM, CSOSN/CST e alíquotas nos produtos.</p>
            </div>

            <button
              type="button"
              onClick={() => setModalTributacaoAberto(true)}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-3 rounded-xl text-xs shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Perfil Fiscal</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Nome do Perfil</th>
                  <th className="py-2.5 px-3">Origem</th>
                  <th className="py-2.5 px-3">Monofásico</th>
                  <th className="py-2.5 px-3">NCM Padrão</th>
                  <th className="py-2.5 px-3">CFOP</th>
                  <th className="py-2.5 px-3">CSOSN / CST</th>
                  <th className="py-2.5 px-3 text-right">ICMS %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {perfisTributacao.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      Nenhum perfil fiscal cadastrado. Clique em "Novo Perfil Fiscal" para criar.
                    </td>
                  </tr>
                ) : (
                  perfisTributacao.map((pt) => (
                    <tr key={pt.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-sky-600">{pt.codigo}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{pt.nome}</td>
                      <td className="py-2.5 px-3 text-slate-500">{pt.origem === 0 ? '0 - Nacional' : '1 - Importada'}</td>
                      <td className="py-2.5 px-3">{pt.monofasico ? <span className="text-emerald-700 font-bold">Sim</span> : 'Não'}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{pt.ncm_padrao || '—'}</td>
                      <td className="py-2.5 px-3 font-mono">{pt.cfop_padrao || '5102'}</td>
                      <td className="py-2.5 px-3 font-mono">{pt.csosn_cst || '102'}</td>
                      <td className="py-2.5 px-3 text-right font-bold">{pt.aliquota_icms}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CADASTRO / EDIÇÃO DE PRODUTO (ESTILO NEX COMPLETO)               */}
      {/* ========================================================================= */}
      {modalAberto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200 select-text"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 text-[13px] select-text">
            
            {/* Barra de Abas Superiores */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 pt-3 bg-white">
              <div className="flex items-center gap-6 overflow-x-auto text-[13px] font-medium">
                {[
                  { id: 'cadastro', label: 'Cadastro' },
                  { id: 'kit', label: 'Kit / Combo' },
                  { id: 'tributacao', label: 'Tributação' },
                  { id: 'fornecedores', label: 'Fornecedores' },
                  { id: 'opcoes', label: 'Opções' },
                  { id: 'validade', label: 'Controle de validade' }
                ].map((ab) => (
                  <button
                    key={ab.id}
                    type="button"
                    onClick={() => setAbaModalAtiva(ab.id as TabModalTipo)}
                    className={`pb-2.5 transition-colors relative font-semibold cursor-pointer ${
                      abaModalAtiva === ab.id 
                        ? 'text-sky-600 border-b-2 border-sky-600' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {ab.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="text-slate-400 hover:text-slate-700 pb-2 transition-colors cursor-pointer"
                title="Fechar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo das Abas */}
            <div className="flex-1 overflow-y-auto p-6 select-text">
              
              {/* ABA 1: CADASTRO */}
              {abaModalAtiva === 'cadastro' && (
                <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-8 space-y-3.5">
                    
                    {/* Linha 1: Código */}
                    <div className="flex items-center gap-4">
                      <div className="w-28 text-slate-800 font-normal">Código</div>
                      <div className="w-40">
                        <input
                          type="text"
                          value={formCodigo}
                          disabled={formCodigoAutomatico}
                          onChange={(e) => setFormCodigo(e.target.value)}
                          placeholder={formCodigoAutomatico ? 'Automático' : 'Ex: PROD001'}
                          className="w-full px-2.5 py-1.5 border border-slate-800 rounded bg-white text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100 disabled:border-slate-300 disabled:text-slate-400"
                        />
                      </div>
                      <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formCodigoAutomatico}
                          onChange={(e) => setFormCodigoAutomatico(e.target.checked)}
                          className="rounded text-sky-600 focus:ring-sky-500"
                        />
                        <span>Automático</span>
                      </label>

                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-slate-700 whitespace-nowrap">Código Extra</span>
                        <input
                          type="text"
                          value={formCodigoExtra}
                          onChange={(e) => setFormCodigoExtra(e.target.value)}
                          className="w-36 px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    {/* Linha 2: EAN / GTIN */}
                    <div className="flex items-center gap-4">
                      <div className="w-28 text-slate-800 font-normal flex items-center gap-1.5">
                        <Barcode className="w-4 h-4 text-slate-700" />
                        <span>EAN / GTIN</span>
                      </div>
                      <div className="w-64">
                        <input
                          type="text"
                          value={formEanGtin}
                          onChange={(e) => setFormEanGtin(e.target.value)}
                          placeholder="7890000000000"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                        />
                      </div>
                    </div>

                    {/* Linha 3: Nome */}
                    <div className="flex items-center gap-4">
                      <div className="w-28 text-slate-800 font-bold">Nome *</div>
                      <div className="flex-1">
                        <input
                          ref={inputNomeRef}
                          type="text"
                          value={formNome}
                          onChange={(e) => setFormNome(e.target.value)}
                          placeholder="Ex: Camiseta Básica Algodão"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium text-slate-900 bg-white"
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Linha 4: Categoria | Peso Líquido */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-28 text-slate-800 font-normal">Categoria</div>
                        <div className="flex-1">
                          <select
                            value={formCategoria}
                            onChange={(e) => setFormCategoria(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                          >
                            <option value="Vestuário">Vestuário</option>
                            <option value="Calçados">Calçados</option>
                            <option value="Acessórios">Acessórios</option>
                            <option value="Moda Íntima">Moda Íntima</option>
                            <option value="Alimentos">Alimentos</option>
                            <option value="Bebidas">Bebidas</option>
                            <option value="Conveniência">Conveniência</option>
                            <option value="Geral">Geral</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-24 text-slate-700 whitespace-nowrap">Peso Líquido</div>
                        <div className="flex-1">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={formPesoLiquido}
                            onChange={(e) => setFormPesoLiquido(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Linha 5: Subcategoria | Peso Bruto */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-28 text-slate-400 font-normal">Subcategoria</div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={formSubcategoria}
                            onChange={(e) => setFormSubcategoria(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-24 text-slate-700 whitespace-nowrap">Peso Bruto</div>
                        <div className="flex-1">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={formPesoBruto}
                            onChange={(e) => setFormPesoBruto(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Linha 6: Marca | Localização */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-28 text-slate-800 font-normal">Marca</div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={formMarca}
                            onChange={(e) => setFormMarca(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-24 text-slate-700 whitespace-nowrap">Localização</div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={formLocalizacao}
                            onChange={(e) => setFormLocalizacao(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Linha 7: Preço de Venda */}
                    <div className="flex items-center gap-4 pt-1">
                      <div className="w-28 text-slate-800 font-bold">Preço de Venda</div>
                      <div className="relative w-44">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formPrecoVenda}
                          onChange={(e) => setFormPrecoVenda(e.target.value)}
                          className="w-full pl-3 pr-14 py-1.5 border border-slate-300 rounded font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                        <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400 select-none uppercase tracking-wide">
                          PROMO
                        </span>
                      </div>

                      <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer select-none ml-2">
                        <input
                          type="checkbox"
                          checked={formPrecoVendaAutomatico}
                          onChange={(e) => setFormPrecoVendaAutomatico(e.target.checked)}
                          className="rounded text-sky-600 focus:ring-sky-500"
                        />
                        <span>Automático</span>
                      </label>

                      <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer select-none ml-4">
                        <input
                          type="checkbox"
                          checked={formPrecoAlteravelVenda}
                          onChange={(e) => setFormPrecoAlteravelVenda(e.target.checked)}
                          className="rounded text-sky-600 focus:ring-sky-500"
                        />
                        <span>Preço alterável na venda</span>
                      </label>
                    </div>

                    {/* Linha 8: Preço de Custo */}
                    <div className="flex items-center gap-4">
                      <div className="w-28 text-slate-800 font-normal">Preço de Custo</div>
                      <div className="w-44">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formPrecoCusto}
                          onChange={(e) => setFormPrecoCusto(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2"><hr className="border-slate-200" /></div>

                    {/* Linha 9: Controlar Estoque */}
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setControlarEstoque(!formControlarEstoque)}
                        className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${
                          formControlarEstoque ? 'bg-sky-600' : 'bg-slate-300'
                        }`}
                      >
                        <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform ${
                          formControlarEstoque ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                      <span className="text-slate-800 font-normal select-none">Controlar Estoque</span>

                      <div className="flex items-center gap-1 text-slate-700 font-bold text-xs ml-4">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                        <span>Recurso PRO</span>
                      </div>
                    </div>

                    {/* Linha 10: Estoque Atual */}
                    <div className="flex items-center gap-4">
                      <div className="w-28 text-slate-800 font-normal">Estoque Atual</div>
                      <div className="w-40">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={formEstoqueAtual}
                          onChange={(e) => setFormEstoqueAtual(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    {/* Linha 11: Limites estoque */}
                    <div className="flex items-center gap-4">
                      <div className="w-28 text-slate-800 font-normal">Limites estoque</div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span>Mín:</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={formEstoqueMinimo}
                            onChange={(e) => setFormEstoqueMinimo(e.target.value)}
                            className="w-20 px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-2">
                          <span>Máx:</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={formEstoqueMaximo}
                            onChange={(e) => setFormEstoqueMaximo(e.target.value)}
                            className="w-20 px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Linha 12: Unidade Medida */}
                    <div className="flex items-center gap-4">
                      <div className="w-28 text-slate-800 font-normal">Unidade Medida</div>
                      <div className="w-40">
                        <select
                          value={formUnidadeMedida}
                          onChange={(e) => setFormUnidadeMedida(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                        >
                          <option value="UN">UN - Unidade</option>
                          <option value="PAR">PAR - Par</option>
                          <option value="KG">KG - Quilograma</option>
                          <option value="PC">PC - Peça</option>
                          <option value="CX">CX - Caixa</option>
                          <option value="LT">LT - Litro</option>
                          <option value="MT">MT - Metro</option>
                        </select>
                      </div>

                      <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer select-none ml-2">
                        <input
                          type="checkbox"
                          checked={formPermiteFracionamento}
                          onChange={(e) => setFormPermiteFracionamento(e.target.checked)}
                          className="rounded text-sky-600 focus:ring-sky-500"
                        />
                        <span>Permite fracionamento (Ex: venda por peso/kg)</span>
                      </label>
                    </div>

                    {/* Observação F4 */}
                    {mostrarCampoObservacao && (
                      <div className="pt-2 space-y-1 animate-in fade-in">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span>Observação / Descrição Detalhada:</span>
                          <button type="button" onClick={() => setMostrarCampoObservacao(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <textarea
                          value={formObservacao}
                          onChange={(e) => setFormObservacao(e.target.value)}
                          rows={3}
                          placeholder="Digite observações técnicas ou detalhes do produto..."
                          className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Foto do Produto */}
                  <div className="col-span-4 flex flex-col items-center">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-56 h-56 rounded-2xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group shadow-inner"
                      title="Clique para adicionar ou trocar a foto do produto"
                    >
                      {formImagemUrl ? (
                        <>
                          <img src={formImagemUrl} alt="Produto" className="w-full h-full object-cover rounded-2xl" />
                          <div className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                            <Camera className="w-8 h-8" />
                            <span className="text-xs font-semibold">Alterar Foto</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormImagemUrl('');
                              }}
                              className="mt-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold"
                            >
                              Remover Foto
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-slate-600 transition-colors">
                          <div className="relative">
                            <Camera className="w-16 h-16 stroke-1 text-slate-400" />
                            <Plus className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-500 stroke-[3]" />
                          </div>
                          <span className="text-[11px] font-medium text-slate-400 mt-2">Adicionar Foto</span>
                        </div>
                      )}

                      <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </div>

                    <button
                      type="button"
                      onClick={() => setMostrarCampoObservacao(!mostrarCampoObservacao)}
                      className="mt-4 text-sky-600 hover:text-sky-700 font-semibold text-xs underline cursor-pointer"
                    >
                      {mostrarCampoObservacao ? 'Ocultar Observação' : 'Adicionar Observação - F4'}
                    </button>
                  </div>
                </div>
              )}

              {/* ABA 2: KIT / COMBO (COMPOR A PARTIR DE OUTROS PRODUTOS) */}
              {abaModalAtiva === 'kit' && (
                <div className="space-y-4 max-w-3xl">
                  <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl space-y-2">
                    <label className="flex items-center gap-2 font-bold text-sky-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIsKit}
                        onChange={(e) => setFormIsKit(e.target.checked)}
                        className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                      />
                      <span>Este produto é um Kit / Combo composto por outros produtos</span>
                    </label>
                    <p className="text-xs text-sky-700">
                      Ao vender este combo no PDV, o sistema dará baixa automática no estoque de cada produto participante.
                    </p>
                  </div>

                  {formIsKit && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Produtos Inclusos na Composição:</span>
                        <select
                          onChange={(e) => {
                            const pId = Number(e.target.value);
                            const pObj = produtos.find((p) => p.id === pId);
                            if (pObj && !formKitItens.some((it) => it.produtoId === pId)) {
                              setFormKitItens([...formKitItens, { produtoId: pId, nome: pObj.nome, qtd: 1, custoUnitario: pObj.preco_custo }]);
                            }
                            e.target.value = '';
                          }}
                          className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                        >
                          <option value="">+ Adicionar Item ao Combo...</option>
                          {produtos.filter((p) => p.id !== produtoEditando?.id).map((p) => (
                            <option key={p.id} value={p.id}>{p.nome} (Custo: R$ {p.preco_custo.toFixed(2)})</option>
                          ))}
                        </select>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="py-2 px-3">Produto</th>
                              <th className="py-2 px-3 text-center w-24">Qtd</th>
                              <th className="py-2 px-3 text-right">Custo Unit</th>
                              <th className="py-2 px-3 text-right">Custo Total</th>
                              <th className="py-2 px-3 w-10 text-center">Remover</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {formKitItens.map((kitItem, idx) => (
                              <tr key={idx}>
                                <td className="py-2 px-3 font-bold text-slate-900">{kitItem.nome}</td>
                                <td className="py-2 px-3 text-center">
                                  <input
                                    type="number"
                                    min="1"
                                    value={kitItem.qtd}
                                    onChange={(e) => {
                                      const nQtd = parseFloat(e.target.value) || 1;
                                      const nItens = [...formKitItens];
                                      nItens[idx].qtd = nQtd;
                                      setFormKitItens(nItens);
                                    }}
                                    className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-center font-bold"
                                  />
                                </td>
                                <td className="py-2 px-3 text-right text-slate-500">{formatCurrency(kitItem.custoUnitario)}</td>
                                <td className="py-2 px-3 text-right font-bold text-slate-800">{formatCurrency(kitItem.custoUnitario * kitItem.qtd)}</td>
                                <td className="py-2 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setFormKitItens(formKitItens.filter((_, i) => i !== idx))}
                                    className="text-rose-500 hover:text-rose-700 p-1"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ABA 3: TRIBUTAÇÃO */}
              {abaModalAtiva === 'tributacao' && (
                <div className="space-y-4 max-w-3xl">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 text-xs block mb-1">NCM (Classificação Fiscal):</label>
                      <input
                        type="text"
                        value={formNcm}
                        onChange={(e) => setFormNcm(e.target.value)}
                        placeholder="Ex: 6109.10.00"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 text-xs block mb-1">CEST:</label>
                      <input
                        type="text"
                        value={formCest}
                        onChange={(e) => setFormCest(e.target.value)}
                        placeholder="Ex: 28.038.00"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 text-xs block mb-1">CFOP Padrão:</label>
                      <input
                        type="text"
                        value={formCfop}
                        onChange={(e) => setFormCfop(e.target.value)}
                        placeholder="Ex: 5102"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 text-xs block mb-1">Origem da Mercadoria:</label>
                      <select
                        value={formOrigem}
                        onChange={(e) => setFormOrigem(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                      >
                        <option value={0}>0 - Nacional</option>
                        <option value={1}>1 - Estrangeira (Importação Direta)</option>
                        <option value={2}>2 - Estrangeira (Mercado Interno)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 text-xs block mb-1">CSOSN / CST (ICMS):</label>
                      <input
                        type="text"
                        value={formCsosnCst}
                        onChange={(e) => setFormCsosnCst(e.target.value)}
                        placeholder="Ex: 102"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="font-bold text-slate-700 text-xs block mb-1">Alíquota ICMS (%):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formAliquotaIcms}
                        onChange={(e) => setFormAliquotaIcms(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 text-xs block mb-1">Alíquota PIS (%):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formAliquotaPis}
                        onChange={(e) => setFormAliquotaPis(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 text-xs block mb-1">Alíquota COFINS (%):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formAliquotaCofins}
                        onChange={(e) => setFormAliquotaCofins(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 4: FORNECEDORES */}
              {abaModalAtiva === 'fornecedores' && (
                <div className="space-y-4 max-w-2xl">
                  <div>
                    <label className="font-bold text-slate-700 text-xs block mb-1">Fornecedor Principal:</label>
                    <select
                      value={formFornecedorId || ''}
                      onChange={(e) => setFormFornecedorId(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                    >
                      <option value="">Nenhum fornecedor vinculado</option>
                      {fornecedores.map((f) => (
                        <option key={f.id} value={f.id}>{f.nome} ({f.cnpj || f.telefone || 'Sem doc'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 text-xs block mb-1">Código Ref. no Fornecedor:</label>
                    <input
                      type="text"
                      value={formCodigoFornecedor}
                      onChange={(e) => setFormCodigoFornecedor(e.target.value)}
                      placeholder="Ex: FORN-REF-2026"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}

              {/* ABA 5: OPÇÕES & GRADE */}
              {abaModalAtiva === 'opcoes' && (
                <div className="space-y-5 max-w-2xl">
                  <label className="flex items-center gap-2 font-bold text-slate-800 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formAtivo === 1}
                      onChange={(e) => setFormAtivo(e.target.checked ? 1 : 0)}
                      className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                    />
                    <span>Produto Ativo (Disponível para venda no PDV)</span>
                  </label>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <h4 className="font-bold text-slate-800 text-xs">Variações de Vestuário</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="font-bold text-slate-700 text-xs block mb-1">Tamanho:</label>
                        <input
                          type="text"
                          value={formTamanho}
                          onChange={(e) => setFormTamanho(e.target.value)}
                          placeholder="Ex: P, M, G, 40"
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                        />
                        <div className="flex gap-1 mt-1.5">
                          {['P', 'M', 'G', 'GG', 'XG', '38', '40', '42', '44', 'Único'].map((tam) => (
                            <button
                              key={tam}
                              type="button"
                              onClick={() => setFormTamanho(tam)}
                              className="px-1.5 py-0.5 bg-white hover:bg-slate-200 border border-slate-300 rounded text-[10px] font-bold"
                            >
                              {tam}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 text-xs block mb-1">Cor:</label>
                        <input
                          type="text"
                          value={formCor}
                          onChange={(e) => setFormCor(e.target.value)}
                          placeholder="Ex: Preto, Azul, Floral"
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 text-xs block mb-1">Comissão do Vendedor (%):</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formComissaoPercentual}
                        onChange={(e) => setFormComissaoPercentual(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 text-xs block mb-1">Pontos Fidelidade:</label>
                      <input
                        type="number"
                        step="1"
                        value={formPontosFidelidade}
                        onChange={(e) => setFormPontosFidelidade(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 6: CONTROLE DE VALIDADE */}
              {abaModalAtiva === 'validade' && (
                <div className="space-y-4 max-w-2xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 text-xs block mb-1">Número do Lote:</label>
                      <input
                        type="text"
                        value={formLote}
                        onChange={(e) => setFormLote(e.target.value)}
                        placeholder="Ex: LT-2026-09"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 text-xs block mb-1">Avisar com antecedência (Dias):</label>
                      <input
                        type="number"
                        value={formDiasAvisoVencimento}
                        onChange={(e) => setFormDiasAvisoVencimento(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 text-xs block mb-1">Data de Fabricação:</label>
                      <input
                        type="date"
                        value={formDataFabricacao}
                        onChange={(e) => setFormDataFabricacao(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 text-xs block mb-1">Data de Validade:</label>
                      <input
                        type="date"
                        value={formDataValidade}
                        onChange={(e) => setFormDataValidade(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Rodapé Inferior */}
            <div className="border-t border-slate-200 px-6 py-4 bg-white flex items-center gap-3">
              <button
                id="btn-salvar-produto"
                type="button"
                onClick={() => handleSalvar()}
                className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-7 py-2 rounded text-xs tracking-wide shadow-sm transition-colors uppercase"
              >
                SALVAR - F2
              </button>

              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="bg-white hover:bg-slate-100 text-slate-700 font-bold px-6 py-2 rounded border border-slate-300 text-xs tracking-wide transition-colors uppercase"
              >
                CANCELAR
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL NOVO PERFIL FISCAL */}
      <Modal isOpen={modalTributacaoAberto} onClose={() => setModalTributacaoAberto(false)} title="Novo Perfil Tributário Reutilizável" maxWidth="lg">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await window.api.tributacao.criarPerfil(formPerfilTributacao);
              setModalTributacaoAberto(false);
              carregarDados();
            } catch (err: any) {
              alert(`Erro ao criar perfil fiscal: ${err?.message || err}`);
            }
          }}
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Código do Perfil:</label>
              <input
                type="text"
                value={formPerfilTributacao.codigo}
                onChange={(e) => setFormPerfilTributacao({ ...formPerfilTributacao, codigo: e.target.value })}
                placeholder="Ex: TRIB-VEST-01"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nome do Perfil:</label>
              <input
                type="text"
                value={formPerfilTributacao.nome}
                onChange={(e) => setFormPerfilTributacao({ ...formPerfilTributacao, nome: e.target.value })}
                placeholder="Ex: Vestuário Simples Nacional"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">NCM Padrão:</label>
              <input
                type="text"
                value={formPerfilTributacao.ncm_padrao}
                onChange={(e) => setFormPerfilTributacao({ ...formPerfilTributacao, ncm_padrao: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">CFOP Padrão:</label>
              <input
                type="text"
                value={formPerfilTributacao.cfop_padrao}
                onChange={(e) => setFormPerfilTributacao({ ...formPerfilTributacao, cfop_padrao: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">CSOSN / CST:</label>
              <input
                type="text"
                value={formPerfilTributacao.csosn_cst}
                onChange={(e) => setFormPerfilTributacao({ ...formPerfilTributacao, csosn_cst: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 rounded-xl shadow"
          >
            Salvar Perfil Fiscal
          </button>
        </form>
      </Modal>

    </div>
  );
};

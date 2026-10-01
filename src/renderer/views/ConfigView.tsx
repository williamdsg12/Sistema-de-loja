import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Store, 
  FileText, 
  Users, 
  ShieldCheck, 
  Save, 
  Plus, 
  Edit, 
  Key,
  CheckCircle,
  Globe,
  RefreshCw,
  Phone,
  MessageCircle,
  MapPin,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  Upload,
  Building2,
  Share2
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { Usuario, Loja } from '../types';

export const ConfigView: React.FC = () => {
  const [abaAtiva, setAbaAtiva] = useState<'loja' | 'fiscal' | 'usuarios' | 'sync'>('loja');
  const [salvando, setSalvando] = useState<boolean>(false);
  const [sincronizandoWeb, setSincronizandoWeb] = useState<boolean>(false);

  // Dados da Loja (Multi-loja e Perfil)
  const [lojaId, setLojaId] = useState<number>(1);
  const [nomeLoja, setNomeLoja] = useState<string>('');
  const [razaoSocial, setRazaoSocial] = useState<string>('');
  const [cnpj, setCnpj] = useState<string>('');
  const [emailLoja, setEmailLoja] = useState<string>('');
  const [telefone, setTelefone] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState<string>('');
  const [endereco, setEndereco] = useState<string>('');
  const [cidade, setCidade] = useState<string>('');
  const [estado, setEstado] = useState<string>('');
  const [cep, setCep] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [slogan, setSlogan] = useState<string>('A melhor experiência para você e sua família');
  const [slugCatalogo, setSlugCatalogo] = useState<string>('lojamodelo');
  const [bio, setBio] = useState<string>('Moda feminina, masculina, calçados e conveniência.');
  const [mostrarLogoFundo, setMostrarLogoFundo] = useState<boolean>(true);
  const [rodapeCupom, setRodapeCupom] = useState<string>('Obrigado pela preferência! Volte sempre.');
  const [chaveApiSync, setChaveApiSync] = useState<string>('SYNC_NEX_STORE_001');

  // Formulário de Vinculação com Site Web
  const [emailCadastroWeb, setEmailCadastroWeb] = useState<string>('');
  const [tokenCadastroWeb, setTokenCadastroWeb] = useState<string>('');
  const [statusSyncMsg, setStatusSyncMsg] = useState<string>('');

  // Configs Fiscais
  const [fiscalProvider, setFiscalProvider] = useState<string>('focus_nfe');
  const [fiscalUrl, setFiscalUrl] = useState<string>('https://api.focusnfe.com.br/v2');
  const [fiscalToken, setFiscalToken] = useState<string>('TOKEN_DEMO_NEXPDV_2026');
  const [fiscalAmbiente, setFiscalAmbiente] = useState<string>('homologacao');

  // Gestão de Usuários
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [modalUsuarioAberto, setModalUsuarioAberto] = useState<boolean>(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [formNomeUser, setFormNomeUser] = useState<string>('');
  const [formLoginUser, setFormLoginUser] = useState<string>('');
  const [formSenhaUser, setFormSenhaUser] = useState<string>('');
  const [formPerfilUser, setFormPerfilUser] = useState<'admin' | 'gerente' | 'vendedor'>('vendedor');

  const carregarDadosCompletos = async () => {
    try {
      // 1. Carregar dados da Loja
      const dadosLoja = await window.api.loja.obter();
      if (dadosLoja) {
        setLojaId(dadosLoja.id || 1);
        if (dadosLoja.nome_fantasia) setNomeLoja(dadosLoja.nome_fantasia);
        if (dadosLoja.razao_social) setRazaoSocial(dadosLoja.razao_social);
        if (dadosLoja.cnpj_cpf) setCnpj(dadosLoja.cnpj_cpf);
        if (dadosLoja.email) setEmailLoja(dadosLoja.email);
        if (dadosLoja.telefone) setTelefone(dadosLoja.telefone);
        if (dadosLoja.whatsapp) setWhatsapp(dadosLoja.whatsapp);
        if (dadosLoja.endereco) setEndereco(dadosLoja.endereco);
        if (dadosLoja.cidade) setCidade(dadosLoja.cidade);
        if (dadosLoja.estado) setEstado(dadosLoja.estado);
        if (dadosLoja.cep) setCep(dadosLoja.cep);
        if (dadosLoja.logo_url) setLogoUrl(dadosLoja.logo_url);
        if (dadosLoja.slogan) setSlogan(dadosLoja.slogan);
        if (dadosLoja.slug_catalogo) setSlugCatalogo(dadosLoja.slug_catalogo);
        if (dadosLoja.bio) setBio(dadosLoja.bio);
        if (dadosLoja.chave_api_sync) setChaveApiSync(dadosLoja.chave_api_sync);
      }

      // 2. Carregar configurações gerais
      const configs = await window.api.config.obter();
      setMostrarLogoFundo(configs.mostrar_logo_fundo_pdv !== '0');
      if (configs.rodape_cupom) setRodapeCupom(configs.rodape_cupom);
      if (configs.fiscal_provider) setFiscalProvider(configs.fiscal_provider);
      if (configs.fiscal_url) setFiscalUrl(configs.fiscal_url);
      if (configs.fiscal_token) setFiscalToken(configs.fiscal_token);
      if (configs.fiscal_ambiente) setFiscalAmbiente(configs.fiscal_ambiente);

      // 3. Carregar operadores
      const listaUsers = await window.api.auth.listarUsuarios();
      setUsuarios(listaUsers);
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    }
  };

  useEffect(() => {
    carregarDadosCompletos();
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setLogoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSalvarLoja = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await window.api.loja.atualizar({
        nome_fantasia: nomeLoja,
        razao_social: razaoSocial,
        cnpj_cpf: cnpj,
        email: emailLoja,
        telefone,
        whatsapp,
        endereco,
        cidade,
        estado,
        cep,
        logo_url: logoUrl,
        slogan,
        slug_catalogo: slugCatalogo,
        bio
      });

      await window.api.config.salvar('mostrar_logo_fundo_pdv', mostrarLogoFundo ? '1' : '0');
      await window.api.config.salvar('rodape_cupom', rodapeCupom);

      alert('Dados e identidade da loja atualizados com sucesso!');
    } catch (err: any) {
      alert(`Erro ao salvar dados da loja: ${err?.message || err}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleVincularCadastroWeb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailCadastroWeb.trim()) {
      alert('Informe o e-mail cadastrado no site da plataforma.');
      return;
    }
    setSincronizandoWeb(true);
    setStatusSyncMsg('Conectando ao banco de dados e sincronizando dados da conta web...');
    try {
      const lojaAtualizada = await window.api.loja.vincularContaWeb(emailCadastroWeb, tokenCadastroWeb);
      await carregarDadosCompletos();
      setStatusSyncMsg(`✓ Loja "${lojaAtualizada.nome_fantasia}" vinculada com sucesso! Os dados foram importados.`);
      alert(`Conta sincronizada com sucesso! A loja agora está vinculada ao e-mail ${emailCadastroWeb}.`);
    } catch (err: any) {
      setStatusSyncMsg(`Erro na sincronização: ${err?.message || err}`);
      alert(`Erro na sincronização: ${err?.message || err}`);
    } finally {
      setSincronizandoWeb(false);
    }
  };

  const handleSalvarFiscal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await window.api.config.salvar('fiscal_provider', fiscalProvider);
      await window.api.config.salvar('fiscal_url', fiscalUrl);
      await window.api.config.salvar('fiscal_token', fiscalToken);
      await window.api.config.salvar('fiscal_ambiente', fiscalAmbiente);
      alert('Parâmetros fiscais salvos com sucesso!');
    } catch (err: any) {
      alert(`Erro ao salvar: ${err?.message || err}`);
    } finally {
      setSalvando(false);
    }
  };

  const abrirModalNovoUsuario = () => {
    setUsuarioEditando(null);
    setFormNomeUser('');
    setFormLoginUser('');
    setFormSenhaUser('');
    setFormPerfilUser('vendedor');
    setModalUsuarioAberto(true);
  };

  const handleSalvarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNomeUser.trim() || !formLoginUser.trim()) {
      alert('Nome e login são obrigatórios.');
      return;
    }

    try {
      if (usuarioEditando) {
        await window.api.auth.atualizarUsuario(
          usuarioEditando.id,
          formNomeUser,
          formPerfilUser,
          1,
          formSenhaUser.trim() ? formSenhaUser : undefined
        );
      } else {
        if (!formSenhaUser.trim()) {
          alert('Informe uma senha para o novo usuário.');
          return;
        }
        await window.api.auth.criarUsuario(
          formNomeUser,
          formLoginUser,
          formSenhaUser,
          formPerfilUser
        );
      }

      setModalUsuarioAberto(false);
      carregarDadosCompletos();
      alert('Usuário salvo com sucesso!');
    } catch (err: any) {
      alert(`Erro: ${err?.message || err}`);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 bg-slate-100 overflow-hidden space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-6 h-6 text-sky-600" />
            Configurações da Loja & Sistema
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Identidade da loja, logo, vinculação com site web, parâmetros fiscais e operadores.</p>
        </div>

        {/* Badge de Status da Loja Conectada */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-right">
            <p className="text-[11px] font-black text-slate-800 leading-none truncate max-w-[180px]">{nomeLoja}</p>
            <p className="text-[10px] text-emerald-600 font-bold">Banco Conectado</p>
          </div>
        </div>
      </div>

      {/* Abas Superiores */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setAbaAtiva('loja')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            abaAtiva === 'loja' ? 'bg-sky-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Minha Loja & Identidade</span>
        </button>

        <button
          onClick={() => setAbaAtiva('sync')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            abaAtiva === 'sync' ? 'bg-sky-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Vinculação com Site Web</span>
        </button>

        <button
          onClick={() => setAbaAtiva('fiscal')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            abaAtiva === 'fiscal' ? 'bg-sky-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>API Fiscal (NFC-e / NF-e)</span>
        </button>

        <button
          onClick={() => setAbaAtiva('usuarios')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            abaAtiva === 'usuarios' ? 'bg-sky-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Operadores & Acessos</span>
        </button>
      </div>

      {/* Conteúdo das Configurações */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-y-auto">
        
        {/* ABA 1: Minha Loja & Identidade Visual */}
        {abaAtiva === 'loja' && (
          <form onSubmit={handleSalvarLoja} className="space-y-6 text-xs max-w-4xl">
            
            {/* Banner de Identidade Visual em Tempo Real */}
            <div className="p-4 bg-gradient-to-r from-slate-900 to-sky-900 text-white rounded-2xl shadow-md flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden p-1 shadow-inner">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                  ) : (
                    <Store className="w-8 h-8 text-white/60" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">{nomeLoja || 'Nome da sua Loja'}</h3>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Loja Ativa
                    </span>
                  </div>
                  <p className="text-xs text-sky-200 mt-0.5">{slogan || 'Slogan do seu estabelecimento'}</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-1">meucomercio.com.br/{slugCatalogo || 'sualoja'}</p>
                </div>
              </div>

              <div className="hidden sm:flex flex-col items-end gap-1 text-[11px] text-slate-300">
                <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-sky-400" /> {telefone}</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 text-emerald-400" /> {whatsapp}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-rose-400" /> {cidade} - {estado}</span>
              </div>
            </div>

            {/* SEÇÃO LOGOMARCA */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sky-600" />
                Logomarca Oficial da Loja
              </h4>
              <p className="text-slate-500 text-[11px]">Essa imagem é exibida no cabeçalho do sistema, nos cupons de venda e na vitrine da loja virtual.</p>

              <div className="flex items-center gap-4 pt-1">
                <div className="w-24 h-24 rounded-xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shadow-xs">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                  ) : (
                    <Store className="w-10 h-10 text-slate-300" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Carregar Logo do Computador</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="px-3 py-2 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg font-bold transition-colors"
                      >
                        Remover Logo
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="Ou cole a URL direta da imagem (ex: https://site.com/logo.png)..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={mostrarLogoFundo}
                      onChange={(e) => setMostrarLogoFundo(e.target.checked)}
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-slate-700 font-semibold text-[11px]">
                      Exibir a logomarca com marca d'água no fundo da tela de vendas (PDV)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* SEÇÃO DADOS CADASTRAIS & FISCAIS */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-600" />
                Dados Cadastrais do Estabelecimento
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nome Fantasia (Como os clientes conhecem) *:</label>
                  <input
                    type="text"
                    value={nomeLoja}
                    onChange={(e) => setNomeLoja(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Razão Social (Nome Jurídico):</label>
                  <input
                    type="text"
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">CNPJ ou CPF do Titular:</label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">E-mail Principal da Loja:</label>
                  <input
                    type="email"
                    value={emailLoja}
                    onChange={(e) => setEmailLoja(e.target.value)}
                    placeholder="contato@sualoja.com.br"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Telefone Fixo / Balcão:</label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(11) 3322-4455"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">WhatsApp Comercial (Vendas e Delivery):</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(11) 99887-6655"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-emerald-700"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Slogan ou Frase Promocional:</label>
                  <input
                    type="text"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    placeholder="Ex: A melhor experiência em moda da cidade!"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Biografia / Descrição da Loja (Sobre Nós):</label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Conte aos clientes sobre a história, estilo e produtos da loja..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO ENDEREÇO */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-600" />
                Endereço da Loja Física
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3">
                  <label className="font-bold text-slate-700 block mb-1">Logradouro / Rua e Número:</label>
                  <input
                    type="text"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Av. Comercial, 1000 - Centro"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">CEP:</label>
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="01000-000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="font-bold text-slate-700 block mb-1">Cidade:</label>
                  <input
                    type="text"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="São Paulo"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">UF / Estado:</label>
                  <input
                    type="text"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    placeholder="SP"
                    maxLength={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase text-center font-bold"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO CUPOM E CATÁLOGO */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Share2 className="w-4 h-4 text-sky-600" />
                Link da Loja Virtual & Rodapé de Comprovantes
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Subdomínio / Link da Loja Virtual:</label>
                  <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                    <span className="px-3 py-2 bg-slate-100 text-slate-500 font-mono text-[11px] border-r border-slate-300">
                      meucomercio.com.br/
                    </span>
                    <input
                      type="text"
                      value={slugCatalogo}
                      onChange={(e) => setSlugCatalogo(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="nomedaloja"
                      className="flex-1 px-3 py-2 font-mono font-bold text-sky-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mensagem de Rodapé no Cupom Térmico (80mm):</label>
                  <input
                    type="text"
                    value={rodapeCupom}
                    onChange={(e) => setRodapeCupom(e.target.value)}
                    placeholder="Ex: Obrigado pela preferência! Volte sempre."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={salvando}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all flex items-center gap-2 text-sm"
            >
              <Save className="w-4 h-4" />
              <span>{salvando ? 'Salvando Alterações...' : 'Salvar Dados da Loja'}</span>
            </button>
          </form>
        )}

        {/* ABA 2: Vinculação com Site Web / Cadastro na Nuvem */}
        {abaAtiva === 'sync' && (
          <div className="max-w-3xl space-y-6 text-xs">
            <div className="p-5 bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-sky-600 text-white rounded-xl shadow-sm">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-sky-950">Vinculação com a Plataforma Web</h3>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    Quando o lojista se cadastrar no site oficial, ele insere o e-mail ou a chave de acesso aqui para 
                    importar e vincular automaticamente todas as informações da loja (logo, contatos, produtos e pedidos) 
                    com o banco de dados local.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleVincularCadastroWeb} className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <h4 className="font-bold text-slate-800 text-sm">Conectar Conta Cadastrada no Site</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">E-mail da Conta na Plataforma *:</label>
                  <input
                    type="email"
                    value={emailCadastroWeb}
                    onChange={(e) => setEmailCadastroWeb(e.target.value)}
                    placeholder="loja@meudominio.com.br"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Token de Sincronização / Senha (Opcional):</label>
                  <input
                    type="password"
                    value={tokenCadastroWeb}
                    onChange={(e) => setTokenCadastroWeb(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {statusSyncMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>{statusSyncMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={sincronizandoWeb}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 px-6 rounded-xl shadow transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${sincronizandoWeb ? 'animate-spin' : ''}`} />
                <span>{sincronizandoWeb ? 'Sincronizando...' : 'Sincronizar e Conectar Loja'}</span>
              </button>
            </form>

            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
              <h5 className="font-bold text-slate-700">Chave de Sincronização Local (API Key)</h5>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={chaveApiSync}
                  className="flex-1 px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg font-mono text-slate-600 text-xs select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(chaveApiSync);
                    alert('Chave copiada para a área de transferência!');
                  }}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold"
                >
                  Copiar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: API Fiscal */}
        {abaAtiva === 'fiscal' && (
          <form onSubmit={handleSalvarFiscal} className="max-w-2xl space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-800 border-b border-slate-200 pb-2">
              Parâmetros da API Fiscal Terceirizada (Focus NFe / PlugNotas / eNotas)
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Provedor de Emissão Fiscal:</label>
                <select
                  value={fiscalProvider}
                  onChange={(e) => setFiscalProvider(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="focus_nfe">Focus NFe (focusnfe.com.br)</option>
                  <option value="plugnotas">PlugNotas / TecnoSpeed</option>
                  <option value="enotas">eNotas Gateway</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ambiente de Emissão:</label>
                <select
                  value={fiscalAmbiente}
                  onChange={(e) => setFiscalAmbiente(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                >
                  <option value="homologacao">Homologação (Testes sem valor fiscal)</option>
                  <option value="producao">Produção (Emissão Real com SEFAZ)</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Endpoint Base da API:</label>
                <input
                  type="text"
                  value={fiscalUrl}
                  onChange={(e) => setFiscalUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div className="col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Token de Acesso / Chave de API:</label>
                <input
                  type="password"
                  value={fiscalToken}
                  onChange={(e) => setFiscalToken(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={salvando}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 px-6 rounded-xl shadow transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{salvando ? 'Salvando...' : 'Salvar Parâmetros Fiscais'}</span>
            </button>
          </form>
        )}

        {/* ABA 4: Usuários e Operadores */}
        {abaAtiva === 'usuarios' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Operadores de Caixa e Administradores</h3>
                <p className="text-slate-500">Controle quem pode acessar o PDV, relatórios e configurações.</p>
              </div>
              <button
                onClick={abrirModalNovoUsuario}
                className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Operador</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Nome</th>
                    <th className="p-3">Login de Acesso</th>
                    <th className="p-3">Perfil</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-bold text-slate-800">{u.nome}</td>
                      <td className="p-3 font-mono text-slate-600">{u.login}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-semibold uppercase text-[10px] ${
                          u.perfil === 'admin' ? 'bg-purple-100 text-purple-700' :
                          u.perfil === 'gerente' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {u.perfil}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Ativo
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setUsuarioEditando(u);
                            setFormNomeUser(u.nome);
                            setFormLoginUser(u.login);
                            setFormSenhaUser('');
                            setFormPerfilUser(u.perfil);
                            setModalUsuarioAberto(true);
                          }}
                          className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
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

      {/* Modal Criar / Editar Usuário */}
      <Modal
        isOpen={modalUsuarioAberto}
        onClose={() => setModalUsuarioAberto(false)}
        title={usuarioEditando ? `Editar Usuário: ${usuarioEditando.nome}` : 'Cadastrar Novo Operador'}
        maxWidth="md"
      >
        <form onSubmit={handleSalvarUsuario} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Nome Completo *:</label>
            <input
              type="text"
              value={formNomeUser}
              onChange={(e) => setFormNomeUser(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Login de Acesso *:</label>
            <input
              type="text"
              value={formLoginUser}
              onChange={(e) => setFormLoginUser(e.target.value)}
              disabled={!!usuarioEditando}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono disabled:bg-slate-100"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              {usuarioEditando ? 'Nova Senha (deixe em branco para manter a atual):' : 'Senha de Acesso *: '}
            </label>
            <input
              type="password"
              value={formSenhaUser}
              onChange={(e) => setFormSenhaUser(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Perfil de Permissão:</label>
            <select
              value={formPerfilUser}
              onChange={(e) => setFormPerfilUser(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
            >
              <option value="vendedor">Vendedor / Operador de Caixa (Apenas PDV)</option>
              <option value="gerente">Gerente (PDV, Estoque, Contas e Relatórios)</option>
              <option value="admin">Administrador (Acesso Total)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 rounded-xl shadow transition-colors"
          >
            Salvar Operador
          </button>
        </form>
      </Modal>
    </div>
  );
};

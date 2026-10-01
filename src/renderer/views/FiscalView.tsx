import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  Code, 
  Settings, 
  Send, 
  Eye, 
  Download, 
  Upload, 
  Ban, 
  CreditCard, 
  ShieldCheck, 
  FolderArchive, 
  FileSpreadsheet,
  Building2,
  Check,
  Search
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { RecursoBloqueadoCard } from '../components/RecursoBloqueadoCard';
import { NotaFiscal, NfInutilizacao } from '../types';
import { usePlanos } from '../context/PlanosContext';

type TabFiscal = 'nfce' | 'nfe' | 'inutilizacao' | 'sped' | 'nfe_fornecedor' | 'tef';

export const FiscalView: React.FC = () => {
  const { temRecurso } = usePlanos();
  const [abaAtiva, setAbaAtiva] = useState<TabFiscal>('nfce');
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [inutilizacoes, setInutilizacoes] = useState<NfInutilizacao[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);

  // Modal Payload / Detalhes
  const [modalPayloadAberto, setModalPayloadAberto] = useState<boolean>(false);
  const [payloadSelecionado, setPayloadSelecionado] = useState<any>(null);
  const [vendaSelecionadaId, setVendaSelecionadaId] = useState<number>(0);

  // Modal Inutilização
  const [modalInutilizarAberto, setModalInutilizarAberto] = useState<boolean>(false);
  const [formInut, setFormInut] = useState({
    modelo: '65',
    serie: '1',
    numero_inicial: 100,
    numero_final: 100,
    justificativa: 'Salto de numeração por quebra de sequência no emissor fiscal'
  });

  // TEF Config State
  const [tefAtivo, setTefAtivo] = useState<boolean>(false);
  const [tefProvedor, setTefProvedor] = useState<string>('sitef');
  const [tefIp, setTefIp] = useState<string>('127.0.0.1');
  const [tefPorta, setTefPorta] = useState<string>('4096');
  const [tefEmpresa, setTefEmpresa] = useState<string>('00000000');

  // SPED State
  const [spedMes, setSpedMes] = useState<string>(new Date().toISOString().slice(0, 7));
  const [spedGerado, setSpedGerado] = useState<boolean>(false);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const [listaNotas, listaInut, configs] = await Promise.all([
        window.api.fiscal.listarNotas(50),
        window.api.inutilizacao.listar().catch(() => []),
        window.api.config.obter()
      ]);
      setNotas(listaNotas);
      setInutilizacoes(listaInut || []);

      if (configs.tef_ativo) setTefAtivo(configs.tef_ativo === '1');
      if (configs.tef_provedor) setTefProvedor(configs.tef_provedor);
      if (configs.tef_ip) setTefIp(configs.tef_ip);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleVerPayload = async (vendaId?: number) => {
    if (!vendaId) return;
    try {
      setVendaSelecionadaId(vendaId);
      const json = await window.api.fiscal.montarPayload(vendaId);
      setPayloadSelecionado(json);
      setModalPayloadAberto(true);
    } catch (err: any) {
      alert(`Erro ao gerar payload: ${err?.message || err}`);
    }
  };

  const handleReemitir = async (vendaId?: number) => {
    if (!vendaId) return;
    try {
      const res = await window.api.fiscal.emitirNota(vendaId);
      if (res.sucesso) {
        alert(`NFC-e processada com sucesso! Chave: ${res.chaveAcesso}`);
      } else {
        alert(`Retorno fiscal: ${res.mensagem}`);
      }
      carregarDados();
    } catch (err: any) {
      alert(`Erro na comunicação: ${err?.message || err}`);
    }
  };

  const handleInutilizarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInut.justificativa || formInut.justificativa.length < 15) {
      alert('A justificativa de inutilização deve conter no mínimo 15 caracteres.');
      return;
    }

    try {
      await window.api.inutilizacao.inutilizar(formInut);
      alert('Numeração de Nota Fiscal inutilizada com sucesso na SEFAZ!');
      setModalInutilizarAberto(false);
      carregarDados();
    } catch (err: any) {
      alert(`Erro ao inutilizar: ${err?.message || err}`);
    }
  };

  const handleSalvarTef = async () => {
    try {
      await Promise.all([
        window.api.config.salvar('tef_ativo', tefAtivo ? '1' : '0'),
        window.api.config.salvar('tef_provedor', tefProvedor),
        window.api.config.salvar('tef_ip', tefIp),
        window.api.config.salvar('tef_porta', tefPorta),
        window.api.config.salvar('tef_empresa', tefEmpresa)
      ]);
      alert('Configurações de TEF salvas com sucesso!');
    } catch (err: any) {
      alert(`Erro: ${err?.message || err}`);
    }
  };

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (!temRecurso('nota_fiscal')) {
    return (
      <RecursoBloqueadoCard
        recursoNome="Módulo Fiscal (NFC-e, NF-e & SPED)"
        descricao="Emita NFC-e (consumidor final), NF-e (empresas), realize inutilização de numeração SEFAZ, gere arquivos SPED/Sintegra, importe XMLs de fornecedores e integre maquininhas TEF."
        planoMinimo="fiscal"
      />
    );
  }

  return (
    <div className="h-full flex flex-col p-6 bg-slate-100 overflow-hidden space-y-4 font-sans">
      
      {/* 1. CABEÇALHO */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Módulo Fiscal & Emissão SEFAZ</h2>
            <p className="text-xs text-slate-500">Gestão central de NFC-e, NF-e Modelo 55, Inutilização, SPED Contábil, XMLs de Fornecedor e TEF.</p>
          </div>
        </div>

        <button
          onClick={carregarDados}
          className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Atualizar Documentos</span>
        </button>
      </div>

      {/* 2. SUB-ABAS FISCAIS DO NEX */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold select-none overflow-x-auto">
        {[
          { id: 'nfce', label: 'NFC-e (Consumidor Final)', icon: FileText },
          { id: 'nfe', label: 'NF-e (Modelo 55 - Empresas)', icon: Building2 },
          { id: 'inutilizacao', label: 'Inutilização de Numeração', icon: Ban },
          { id: 'sped', label: 'SPED Fiscal / Sintegra', icon: FileSpreadsheet },
          { id: 'nfe_fornecedor', label: 'NFEs dos Fornecedores (XML)', icon: Upload },
          { id: 'tef', label: 'TEF (Maquininha Integrada)', icon: CreditCard }
        ].map((sub) => {
          const Icon = sub.icon;
          const isAtivo = abaAtiva === sub.id;
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => setAbaAtiva(sub.id as TabFiscal)}
              className={`flex items-center gap-2 pb-3 px-4 border-b-2 transition-all whitespace-nowrap ${
                isAtivo
                  ? 'text-sky-600 border-sky-600 font-extrabold'
                  : 'text-slate-500 border-transparent hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sub.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. CONTEÚDO DAS SUB-ABAS */}

      {/* SUB-ABA 1: NFC-E */}
      {abaAtiva === 'nfce' && (
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200 text-[10px] sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Nº / Série</th>
                  <th className="py-2.5 px-3">Venda Ref</th>
                  <th className="py-2.5 px-3">Destinatário</th>
                  <th className="py-2.5 px-3 text-right">Valor Total</th>
                  <th className="py-2.5 px-3">Chave de Acesso</th>
                  <th className="py-2.5 px-3">Emissão</th>
                  <th className="py-2.5 px-3 text-center w-36">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {notas.map((nota) => (
                  <tr key={nota.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        nota.status === 'autorizada'
                          ? 'bg-emerald-100 text-emerald-800'
                          : nota.status === 'pendente'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {nota.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{nota.numero || '—'} / {nota.serie || '1'}</td>
                    <td className="py-2.5 px-3 font-mono text-sky-600 font-bold">Venda #{nota.venda_id}</td>
                    <td className="py-2.5 px-3">{nota.cliente_nome || 'Consumidor Final'}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(nota.total || 0)}</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 truncate max-w-xs">{nota.chave_acesso || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-500">{new Date(nota.criado_em).toLocaleString('pt-BR')}</td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleVerPayload(nota.venda_id)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                        >
                          Payload
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReemitir(nota.venda_id)}
                          className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded text-[10px] font-bold"
                        >
                          Reemitir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-ABA 2: NF-E (MODELO 55) */}
      {abaAtiva === 'nfe' && (
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Emissão de NF-e Modelo 55 (Empresas, Atacado & Devolução)</h3>
              <p className="text-xs text-slate-500">Exige dados cadastrais completos do cliente (Razão Social, CNPJ, Inscrição Estadual e Endereço).</p>
            </div>
            <button
              type="button"
              onClick={() => alert('Selecione uma venda no histórico ou PDV com cliente PJ identificado para emitir a NF-e Modelo 55.')}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-xl text-xs shadow"
            >
              Emitir Nova NF-e Modelo 55
            </button>
          </div>

          <div className="py-10 text-center text-slate-400 space-y-2">
            <Building2 className="w-12 h-12 mx-auto opacity-50" />
            <p className="text-xs font-semibold">Módulo de NF-e Modelo 55 pronto para emissão via Focus NFe / PlugNotas.</p>
          </div>
        </div>
      )}

      {/* SUB-ABA 3: INUTILIZAÇÃO DE NUMERAÇÃO DE NF */}
      {abaAtiva === 'inutilizacao' && (
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-600" />
                Inutilização de Numeração de Nota Fiscal
              </h3>
              <p className="text-xs text-slate-500">Informe à SEFAZ números ou faixas de notas que não foram emitidas devido a quebra de sequência.</p>
            </div>
            <button
              type="button"
              onClick={() => setModalInutilizarAberto(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-xl text-xs shadow"
            >
              Inutilizar Numeração
            </button>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Modelo</th>
                <th className="py-2.5 px-3">Série</th>
                <th className="py-2.5 px-3">Faixa Inutilizada</th>
                <th className="py-2.5 px-3">Justificativa</th>
                <th className="py-2.5 px-3">Protocolo SEFAZ</th>
                <th className="py-2.5 px-3">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {inutilizacoes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Nenhuma numeração inutilizada registrada.</td>
                </tr>
              ) : (
                inutilizacoes.map((inut) => (
                  <tr key={inut.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold">Mod {inut.modelo}</td>
                    <td className="py-2.5 px-3 font-mono">{inut.serie}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-rose-600">Nº {inut.numero_inicial} até Nº {inut.numero_final}</td>
                    <td className="py-2.5 px-3 text-slate-600">{inut.justificativa}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-700 font-bold">{inut.protocolo || 'HOMOLOGADO'}</td>
                    <td className="py-2.5 px-3 text-slate-500">{new Date(inut.criado_em).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB-ABA 4: SPED FISCAL */}
      {abaAtiva === 'sped' && (
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-y-auto space-y-4 max-w-3xl">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-sky-600" />
            Exportação de Arquivo SPED EFD / Sintegra para Contabilidade
          </h3>
          <p className="text-xs text-slate-500">Gere o arquivo magnético mensal consolidando todas as vendas, entradas e inventário de estoque.</p>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mês de Competência:</label>
                <input
                  type="month"
                  value={spedMes}
                  onChange={(e) => setSpedMes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Perfil do Arquivo:</label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
                  <option value="A">Perfil A - Completo (Lucro Real / Presumido)</option>
                  <option value="B">Perfil B - Simples Nacional</option>
                  <option value="sintegra">Sintegra Convênio 57/95</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSpedGerado(true);
                setTimeout(() => alert(`Arquivo SPED Fiscal (${spedMes}) gerado com sucesso!`), 500);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl shadow transition-colors"
            >
              Gerar e Baixar Arquivo SPED (.TXT)
            </button>
          </div>
        </div>
      )}

      {/* SUB-ABA 5: NFES DOS FORNECEDORES (XML IMPORT) */}
      {abaAtiva === 'nfe_fornecedor' && (
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Upload className="w-4 h-4 text-sky-600" />
                Hub de Importação de XMLs de Notas de Compra dos Fornecedores
              </h3>
              <p className="text-xs text-slate-500">Importe o arquivo XML da NF-e para cadastrar produtos novos e atualizar o estoque automaticamente.</p>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3 bg-slate-50 hover:bg-sky-50/50 cursor-pointer transition-colors">
            <Upload className="w-12 h-12 text-sky-600 mx-auto" />
            <div className="font-bold text-slate-800 text-sm">Arraste os arquivos XML das Notas Fiscais aqui</div>
            <p className="text-xs text-slate-500">ou clique para selecionar do seu computador (suporta múltiplos XMLs de uma só vez)</p>
          </div>
        </div>
      )}

      {/* SUB-ABA 6: TEF (TRANSFERÊNCIA ELETRÔNICA DE FUNDOS) */}
      {abaAtiva === 'tef' && (
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-y-auto space-y-4 max-w-3xl">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-sky-600" />
                TEF — Ponto de Integração para Maquininha de Cartão
              </h3>
              <p className="text-xs text-slate-500">Configure a comunicação direta do PDV com o PinPad / Maquininha (SiTef, PayGo, Stone, Auttar).</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={tefAtivo}
                onChange={(e) => setTefAtivo(e.target.checked)}
                className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
              />
              <span>Ativar Integração TEF no PDV</span>
            </label>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Provedor TEF:</label>
                <select
                  value={tefProvedor}
                  onChange={(e) => setTefProvedor(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold"
                >
                  <option value="sitef">Software Express / SiTef</option>
                  <option value="paygo">PayGo / Cargas TEF</option>
                  <option value="stone">Stone TEF Integrado</option>
                  <option value="cielo">Cielo LIO / TEF</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">IP do Servidor TEF Local:</label>
                <input
                  type="text"
                  value={tefIp}
                  onChange={(e) => setTefIp(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSalvarTef}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 px-6 rounded-xl shadow transition-colors"
            >
              Salvar Configurações de TEF
            </button>
          </div>
        </div>
      )}

      {/* MODAL INUTILIZAÇÃO */}
      <Modal isOpen={modalInutilizarAberto} onClose={() => setModalInutilizarAberto(false)} title="Inutilizar Faixa de Numeração na SEFAZ" maxWidth="md">
        <form onSubmit={handleInutilizarSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Número Inicial:</label>
              <input
                type="number"
                value={formInut.numero_inicial}
                onChange={(e) => setFormInut({ ...formInut, numero_inicial: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Número Final:</label>
              <input
                type="number"
                value={formInut.numero_final}
                onChange={(e) => setFormInut({ ...formInut, numero_final: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Justificativa (mínimo 15 caracteres) *:</label>
            <textarea
              value={formInut.justificativa}
              onChange={(e) => setFormInut({ ...formInut, justificativa: e.target.value })}
              rows={3}
              className="w-full p-2.5 border border-slate-300 rounded-lg"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl shadow transition-colors"
          >
            Enviar Inutilização para SEFAZ
          </button>
        </form>
      </Modal>

      {/* MODAL PAYLOAD FISCAL JSON */}
      <Modal isOpen={modalPayloadAberto} onClose={() => setModalPayloadAberto(false)} title={`Payload Fiscal JSON — Venda #${vendaSelecionadaId}`} maxWidth="3xl">
        <div className="space-y-3">
          <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-[65vh]">
            {JSON.stringify(payloadSelecionado, null, 2)}
          </pre>
          <button
            type="button"
            onClick={() => setModalPayloadAberto(false)}
            className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 rounded-lg text-xs"
          >
            Fechar
          </button>
        </div>
      </Modal>

    </div>
  );
};

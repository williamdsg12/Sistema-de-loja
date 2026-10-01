import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { 
  Calendar, 
  FileText, 
  ShieldCheck, 
  Printer, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  Loader2 
} from 'lucide-react';
import { formatarMoedaBR, formatarDataBR } from '../utils/datetime';
import { formatarCpfCnpj } from '../utils/validators';

export type TipoDocumentoCrediario = 'carne' | 'duplicata' | 'promissoria';

interface ModalImpressaoCrediarioProps {
  isOpen: boolean;
  onClose: () => void;
  contratoId: number;
  parcelasIds?: number[];
  tituloCustom?: string;
}

export const ModalImpressaoCrediario: React.FC<ModalImpressaoCrediarioProps> = ({
  isOpen,
  onClose,
  contratoId,
  parcelasIds,
  tituloCustom
}) => {
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoDocumentoCrediario>('carne');
  const [carregandoDados, setCarregandoDados] = useState<boolean>(false);
  const [gerandoAcao, setGerandoAcao] = useState<boolean>(false);
  const [dadosDoc, setDadosDoc] = useState<any>(null);
  const [htmlPreview, setHtmlPreview] = useState<string>('');
  const [erro, setErro] = useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  // Carregar dados reais do contrato e parcelas
  useEffect(() => {
    if (!isOpen || !contratoId) return;

    const carregar = async () => {
      setCarregandoDados(true);
      setErro(null);
      setSucessoMsg(null);
      try {
        if (!window.api?.crediario) {
          throw new Error('API do Crediário indisponível');
        }

        const dados = await window.api.crediario.obterDadosDocumento(contratoId, parcelasIds);
        setDadosDoc(dados);

        // Gera o HTML inicial
        const html = await window.api.crediario.gerarHtmlDocumento('carne', dados);
        setHtmlPreview(html);
      } catch (err: any) {
        console.error('Erro ao carregar dados do documento:', err);
        setErro(err?.message || 'Erro ao carregar dados do crediário.');
      } finally {
        setCarregandoDados(false);
      }
    };

    carregar();
  }, [isOpen, contratoId, JSON.stringify(parcelasIds)]);

  // Atualizar preview ao mudar o tipo
  const handleChangeTipo = async (novoTipo: TipoDocumentoCrediario) => {
    setTipoSelecionado(novoTipo);
    if (!dadosDoc || !window.api?.crediario) return;
    try {
      const html = await window.api.crediario.gerarHtmlDocumento(novoTipo, dadosDoc);
      setHtmlPreview(html);
    } catch (err: any) {
      console.error('Erro ao atualizar preview:', err);
    }
  };

  // Salvar PDF com Diálogo
  const handleSalvarPdf = async () => {
    if (!dadosDoc || !window.api?.crediario) return;
    setGerandoAcao(true);
    setSucessoMsg(null);
    setErro(null);
    try {
      const nomeSugerido = `${tipoSelecionado}_contrato_${contratoId}_${Date.now()}.pdf`;
      const res = await window.api.crediario.salvarPdfComDialogo(tipoSelecionado, dadosDoc, nomeSugerido);
      if (res.sucesso) {
        setSucessoMsg(`PDF salvo com sucesso em: ${res.caminho}`);
      } else if (!res.cancelado) {
        setErro(res.erro || 'Não foi possível salvar o PDF.');
      }
    } catch (err: any) {
      setErro(`Erro ao salvar PDF: ${err?.message || err}`);
    } finally {
      setGerandoAcao(false);
    }
  };

  // Imprimir Direto
  const handleImprimir = async () => {
    if (!dadosDoc || !window.api?.crediario) return;
    setGerandoAcao(true);
    setSucessoMsg(null);
    setErro(null);
    try {
      const res = await window.api.crediario.imprimirDireto(tipoSelecionado, dadosDoc);
      if (res.sucesso) {
        setSucessoMsg('Documento enviado para a fila de impressão!');
      } else {
        setErro(res.erro || 'Falha ao imprimir.');
      }
    } catch (err: any) {
      setErro(`Erro ao imprimir: ${err?.message || err}`);
    } finally {
      setGerandoAcao(false);
    }
  };

  if (!isOpen) return null;

  // Verificações de integridade dos dados (Passo 6)
  const avisosDados: string[] = [];
  if (dadosDoc) {
    if (!dadosDoc.loja?.cnpj) {
      avisosDados.push('CNPJ da Loja não configurado (acesse Configurações > Dados da Loja).');
    }
    if (!dadosDoc.cliente?.cpf) {
      avisosDados.push('CPF do Cliente não informado no cadastro.');
    }
    if (!dadosDoc.cliente?.endereco && (tipoSelecionado === 'promissoria' || tipoSelecionado === 'duplicata')) {
      avisosDados.push('Endereço do Cliente não preenchido.');
    }
  }

  const qtdParcelasSelecionadas = dadosDoc?.parcelas?.length || 0;
  const valorTotalSelecionado = (dadosDoc?.parcelas || []).reduce((acc: number, p: any) => acc + (p.valor || 0), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tituloCustom || 'O que você deseja imprimir?'}
      maxWidth="5xl"
    >
      <div className="space-y-4 text-xs">
        {/* Banner de informações do contrato */}
        {dadosDoc && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Documento</span>
                <span className="font-mono font-bold text-slate-900 text-xs">
                  NF-{dadosDoc.contrato.venda_id || dadosDoc.contrato.id}-{dadosDoc.contrato.id}
                </span>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Cliente</span>
                <span className="font-bold text-slate-900 text-xs">
                  {dadosDoc.cliente.nome} {dadosDoc.cliente.cpf ? `(${formatarCpfCnpj(dadosDoc.cliente.cpf)})` : ''}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Parcelas Selecionadas</span>
                <span className="font-bold text-sky-700 text-xs">
                  {qtdParcelasSelecionadas} {qtdParcelasSelecionadas === 1 ? 'parcela' : 'parcelas'}
                </span>
              </div>
              <div className="text-right border-l border-slate-200 pl-4">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Selecionado</span>
                <span className="font-mono font-black text-emerald-700 text-sm">
                  {formatarMoedaBR(valorTotalSelecionado)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Mensagens de Alerta e Validação */}
        {avisosDados.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-[11px] block">Atenção aos dados do documento:</span>
              {avisosDados.map((aviso, idx) => (
                <div key={idx} className="text-[10px] text-amber-800">• {aviso}</div>
              ))}
            </div>
          </div>
        )}

        {erro && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-bold">{erro}</span>
          </div>
        )}

        {sucessoMsg && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-bold">{sucessoMsg}</span>
          </div>
        )}

        {/* CARDS DE ESCOLHA (ESTILO HIPER GESTÃO) */}
        <div>
          <label className="font-bold text-slate-700 block mb-2 text-xs uppercase tracking-wide">
            Selecione o modelo de impressão:
          </label>
          <div className="grid grid-cols-3 gap-3">
            {/* Opção 1: Carnê */}
            <button
              type="button"
              onClick={() => handleChangeTipo('carne')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                tipoSelecionado === 'carne'
                  ? 'border-sky-500 bg-sky-50/50 shadow-sm ring-2 ring-sky-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${tipoSelecionado === 'carne' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Calendar className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-900 text-sm">Carnê</span>
                  </div>
                  {tipoSelecionado === 'carne' && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Utilize para parcelamento das compras na loja
                </p>
              </div>
              <span className="text-[10px] text-sky-700 font-bold mt-2 block">3 parcelas por folha A4</span>
            </button>

            {/* Opção 2: Duplicata */}
            <button
              type="button"
              onClick={() => handleChangeTipo('duplicata')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                tipoSelecionado === 'duplicata'
                  ? 'border-sky-500 bg-sky-50/50 shadow-sm ring-2 ring-sky-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${tipoSelecionado === 'duplicata' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-900 text-sm">Duplicata</span>
                  </div>
                  {tipoSelecionado === 'duplicata' && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Utilize quando o comprador se obriga a pagar no prazo da fatura
                </p>
              </div>
              <span className="text-[10px] text-sky-700 font-bold mt-2 block">Fatura comercial e aceite</span>
            </button>

            {/* Opção 3: Promissória */}
            <button
              type="button"
              onClick={() => handleChangeTipo('promissoria')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                tipoSelecionado === 'promissoria'
                  ? 'border-sky-500 bg-sky-50/50 shadow-sm ring-2 ring-sky-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${tipoSelecionado === 'promissoria' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-900 text-sm">Promissória</span>
                  </div>
                  {tipoSelecionado === 'promissoria' && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Utilize como promessa de pagamento, geralmente registrada em cartório
                </p>
              </div>
              <span className="text-[10px] text-sky-700 font-bold mt-2 block">Valor por extenso + Avalistas</span>
            </button>
          </div>
        </div>

        {/* ÁREA DE PRÉ-VISUALIZAÇÃO COMPLETA */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Pré-visualização do Documento Impresso:</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Fonte Courier New • Layout 100% Real • Fundo Branco
            </span>
          </div>

          <div className="border border-slate-300 rounded-xl bg-slate-100 p-2 overflow-hidden h-[380px] relative">
            {carregandoDados ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                <span>Carregando dados e gerando documento...</span>
              </div>
            ) : htmlPreview ? (
              <iframe
                srcDoc={htmlPreview}
                title="Prévia do Documento"
                className="w-full h-full bg-white border border-slate-300 rounded-lg shadow-inner"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Nenhum dado para exibir.
              </div>
            )}
          </div>
        </div>

        {/* BARRA DE AÇÕES INFERIOR */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSalvarPdf}
              disabled={gerandoAcao || carregandoDados}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {gerandoAcao ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Salvar PDF (Sem corte / Em alta definição)</span>
            </button>

            <button
              type="button"
              onClick={handleImprimir}
              disabled={gerandoAcao || carregandoDados}
              className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {gerandoAcao ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span>Imprimir Agora</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { 
  Printer, 
  CheckCircle, 
  FileText, 
  Calendar, 
  ShieldCheck, 
  Download, 
  Eye, 
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Venda, ItemVenda, CrediarioContrato, CrediarioParcela, CrediarioConfig } from '../types';
import { formatarCpfCnpj } from '../utils/validators';
import { safeApiCall } from '../utils/safeApi';
import { TipoDocumentoCrediario } from './ModalImpressaoCrediario';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  venda: Venda | null;
  itens: ItemVenda[];
  contratoCrediario?: CrediarioContrato | null;
  parcelasCrediario?: CrediarioParcela[];
  onEmitirNFCe?: () => void;
  carregandoNFCe?: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  venda,
  itens,
  contratoCrediario,
  parcelasCrediario = [],
  onEmitirNFCe,
  carregandoNFCe = false
}) => {
  const [config, setConfig] = useState<any>({});
  const [lojaInfo, setLojaInfo] = useState<any>(null);
  const [crediarioConfig, setCrediarioConfig] = useState<CrediarioConfig | null>(null);
  const [clienteCompleto, setClienteCompleto] = useState<any>(null);
  
  // Abas de visualização
  const [abaPrincipal, setAbaPrincipal] = useState<'cupom' | 'documentos'>('cupom');
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoCrediario>('carne');

  // Estado do gerador unificado
  const [dadosDoc, setDadosDoc] = useState<any>(null);
  const [htmlDocPreview, setHtmlDocPreview] = useState<string>('');
  const [carregandoDoc, setCarregandoDoc] = useState<boolean>(false);
  const [gerandoAcao, setGerandoAcao] = useState<boolean>(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const isCrediario = venda?.forma_pagamento === 'crediario' || !!contratoCrediario;

  // Carregar dados gerais da loja e cliente
  useEffect(() => {
    const load = async () => {
      try {
        const c = await safeApiCall(() => window.api.config.obter(), {}, 'config.obter');
        setConfig(c || {});
        const lj = await safeApiCall(() => window.api.loja.obter(), null, 'loja.obter');
        setLojaInfo(lj);
        const credCfg = await safeApiCall(() => window.api.crediario.getConfig(), null, 'crediario.getConfig');
        setCrediarioConfig(credCfg);

        const cliId = contratoCrediario?.cliente_id || venda?.cliente_id;
        if (cliId) {
          const cli = await safeApiCall(() => window.api.clientes.obterPorId(cliId), null, 'clientes.obterPorId');
          setClienteCompleto(cli);
        }
      } catch (e) {
        console.error('Erro ao carregar dados complementares do recibo:', e);
      }
    };

    if (isOpen) {
      load();
      if (isCrediario) {
        setAbaPrincipal('documentos');
      }
    }
  }, [isOpen, venda, contratoCrediario, isCrediario]);

  // Carregar dados do documento unificado quando for crediário
  useEffect(() => {
    if (!isOpen || !isCrediario || !window.api?.crediario) return;

    const carregarDocumentoUnificado = async () => {
      const cId = contratoCrediario?.id;
      if (!cId) return;

      setCarregandoDoc(true);
      setMensagemErro(null);
      try {
        const dados = await window.api.crediario.obterDadosDocumento(cId);
        setDadosDoc(dados);
        const html = await window.api.crediario.gerarHtmlDocumento(tipoDocumento, dados);
        setHtmlDocPreview(html);
      } catch (e: any) {
        console.error('Erro ao carregar documento unificado de crediário:', e);
        setMensagemErro(e?.message || 'Erro ao carregar layout de crediário.');
      } finally {
        setCarregandoDoc(false);
      }
    };

    carregarDocumentoUnificado();
  }, [isOpen, isCrediario, contratoCrediario?.id, tipoDocumento]);

  if (!venda) return null;

  const formatCurrency = (val?: number | string | null) => {
    const num = typeof val === 'number' ? (isNaN(val) ? 0 : val) : Number(val) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const dataFormatada = new Date(venda.data_venda || Date.now()).toLocaleString('pt-BR');
  const nomeCedente = lojaInfo?.nome_fantasia || lojaInfo?.razao_social || config.nome_loja || 'WS Gestão PDV';
  const cnpjCedente = lojaInfo?.cnpj_cpf || config.cnpj || '';
  const nomeSacado = clienteCompleto?.nome || venda.cliente_nome || contratoCrediario?.cliente_nome || 'Consumidor Padrão';
  const rawCpf = clienteCompleto?.cpf_cnpj || contratoCrediario?.cliente_cpf || (venda as any).cliente_cpf || (venda as any).cpf_cnpj;
  const cpfFormatado = rawCpf ? formatarCpfCnpj(rawCpf) : 'Não informado';

  // Salvar PDF com diálogo nativo (Passo 2)
  const handleSalvarPdf = async () => {
    if (!dadosDoc || !window.api?.crediario) return;
    setGerandoAcao(true);
    setMensagemSucesso(null);
    setMensagemErro(null);
    try {
      const nomeSugerido = `${tipoDocumento}_venda_${venda.id}_contrato_${contratoCrediario?.id || 1}.pdf`;
      const res = await window.api.crediario.salvarPdfComDialogo(tipoDocumento, dadosDoc, nomeSugerido);
      if (res.sucesso) {
        setMensagemSucesso(`PDF salvo com sucesso em: ${res.caminho}`);
      } else if (!res.cancelado) {
        setMensagemErro(res.erro || 'Não foi possível salvar o PDF.');
      }
    } catch (err: any) {
      setMensagemErro(`Erro ao gerar PDF: ${err?.message || err}`);
    } finally {
      setGerandoAcao(false);
    }
  };

  // Imprimir direto (Passo 2)
  const handleImprimirDocumento = async () => {
    if (abaPrincipal === 'cupom') {
      window.print();
      return;
    }

    if (!dadosDoc || !window.api?.crediario) return;
    setGerandoAcao(true);
    setMensagemSucesso(null);
    setMensagemErro(null);
    try {
      const res = await window.api.crediario.imprimirDireto(tipoDocumento, dadosDoc);
      if (res.sucesso) {
        setMensagemSucesso('Documento enviado para a fila de impressão com sucesso!');
      } else {
        setMensagemErro(res.erro || 'Falha ao imprimir.');
      }
    } catch (err: any) {
      setMensagemErro(`Erro ao imprimir: ${err?.message || err}`);
    } finally {
      setGerandoAcao(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isCrediario ? `Venda #${venda.id} — Crediário / Carnê` : `Comprovante de Venda #${venda.id}`}
      maxWidth={isCrediario && abaPrincipal === 'documentos' ? '5xl' : 'md'}
    >
      <div className="space-y-4 text-xs">
        {/* Banner de Sucesso */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3 text-emerald-800">
          <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-sm">
              {isCrediario ? 'Venda & Contrato de Crediário Concluídos com Sucesso!' : 'Venda Concluída com Sucesso!'}
            </h4>
            <p className="text-xs text-emerald-700">
              {isCrediario
                ? 'As parcelas do crediário foram geradas e o saldo do cliente atualizado.'
                : 'Estoque atualizado e transação gravada no caixa.'}
            </p>
          </div>
        </div>

        {/* Mensagens de Feedback */}
        {mensagemSucesso && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-bold text-[11px]">{mensagemSucesso}</span>
          </div>
        )}

        {mensagemErro && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-bold text-[11px]">{mensagemErro}</span>
          </div>
        )}

        {/* Abas Superiores (Cupom ou Documentos Crediário) */}
        {isCrediario && (
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setAbaPrincipal('documentos')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                abaPrincipal === 'documentos'
                  ? 'bg-white text-sky-700 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Documentos do Crediário (Carnê, Duplicata, Promissória)</span>
            </button>

            <button
              type="button"
              onClick={() => setAbaPrincipal('cupom')}
              className={`py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                abaPrincipal === 'cupom'
                  ? 'bg-white text-sky-700 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cupom Térmico (80mm)</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 1: DOCUMENTOS DO CREDIÁRIO (CARNÊ, DUPLICATA, PROMISSÓRIA)            */}
        {/* ========================================================================= */}
        {abaPrincipal === 'documentos' && isCrediario && (
          <div className="space-y-3">
            {/* 3 Botões de Opção Estilo Hiper Gestão */}
            <div>
              <label className="font-bold text-slate-700 block mb-1.5 uppercase text-[11px]">
                O que você deseja imprimir?
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setTipoDocumento('carne')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    tipoDocumento === 'carne'
                      ? 'border-sky-500 bg-sky-50/60 ring-2 ring-sky-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`p-1 rounded-md ${tipoDocumento === 'carne' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-slate-900 text-xs">Carnê</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 leading-snug">
                    Utilize para parcelamento das compras na loja
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoDocumento('duplicata')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    tipoDocumento === 'duplicata'
                      ? 'border-sky-500 bg-sky-50/60 ring-2 ring-sky-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`p-1 rounded-md ${tipoDocumento === 'duplicata' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-slate-900 text-xs">Duplicata</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 leading-snug">
                    Utilize quando o comprador se obriga a pagar no prazo da fatura
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoDocumento('promissoria')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    tipoDocumento === 'promissoria'
                      ? 'border-sky-500 bg-sky-50/60 ring-2 ring-sky-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`p-1 rounded-md ${tipoDocumento === 'promissoria' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-slate-900 text-xs">Promissória</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 leading-snug">
                    Utilize como promessa de pagamento, geralmente registrada em cartório
                  </p>
                </button>
              </div>
            </div>

            {/* Prévia do Documento em Iframe */}
            <div className="border border-slate-300 rounded-xl bg-slate-100 p-2 overflow-hidden h-[340px] relative">
              {carregandoDoc ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                  <span>Renderizando layout do documento...</span>
                </div>
              ) : htmlDocPreview ? (
                <iframe
                  srcDoc={htmlDocPreview}
                  title="Prévia do Documento"
                  className="w-full h-full bg-white border border-slate-300 rounded-lg shadow-inner"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  Nenhum contrato de crediário vinculado.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 2: CUPOM NÃO FISCAL TÉRMICO (80MM)                                    */}
        {/* ========================================================================= */}
        {abaPrincipal === 'cupom' && (
          <div id="cupom-nao-fiscal" className="bg-slate-50 border border-slate-300 rounded-lg p-4 font-mono text-xs text-slate-800 shadow-inner max-h-[340px] overflow-y-auto">
            <div className="text-center border-b border-dashed border-slate-300 pb-2 mb-2">
              <h2 className="font-bold text-sm uppercase">{nomeCedente}</h2>
              {cnpjCedente ? <p className="text-[11px] text-slate-600">CNPJ: {cnpjCedente}</p> : null}
              <p className="text-[11px] text-slate-600 font-bold mt-1">*** CUPOM NÃO FISCAL ***</p>
            </div>

            <div className="text-[11px] text-slate-600 border-b border-dashed border-slate-300 pb-2 mb-2">
              <div>Venda: <span className="font-bold text-slate-800">#{venda.id}</span></div>
              <div>Data: {dataFormatada}</div>
              <div>Cliente: <span className="font-bold text-slate-800">{nomeSacado}</span></div>
              {cpfFormatado !== 'Não informado' && <div>CPF: <span className="font-mono text-slate-800">{cpfFormatado}</span></div>}
            </div>

            {/* Tabela de Itens */}
            <div className="border-b border-dashed border-slate-300 pb-2 mb-2">
              <div className="flex justify-between font-bold text-[11px] mb-1">
                <span>ITEM / DESCRIÇÃO</span>
                <span>TOTAL</span>
              </div>
              {itens.map((item, idx) => (
                <div key={idx} className="mb-1 text-[11px]">
                  <div className="font-medium truncate">{idx + 1}. {item.produto_nome}</div>
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span>{item.quantidade} {item.unidade_medida || 'UN'} x {formatCurrency(item.preco_unitario)}</span>
                    <span className="font-bold text-slate-800">{formatCurrency(item.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totais */}
            <div className="space-y-1 text-xs border-b border-dashed border-slate-300 pb-2 mb-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(venda.subtotal)}</span>
              </div>
              {venda.desconto > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Desconto:</span>
                  <span>- {formatCurrency(venda.desconto)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1">
                <span>TOTAL:</span>
                <span className="text-emerald-700">{formatCurrency(venda.total)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600 pt-1">
                <span>Forma de Pagamento:</span>
                <span className="font-semibold uppercase">{venda.forma_pagamento.replace('_', ' ')}</span>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-500 pt-1">
              <p>Obrigado pela preferência! Volte sempre.</p>
              <p className="text-[9px] mt-0.5">WS Gestão PDV</p>
            </div>
          </div>
        )}

        {/* BARRA DE AÇÕES INFERIOR */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            Nova Venda (ESC)
          </button>

          <div className="flex items-center gap-2">
            {isCrediario && abaPrincipal === 'documentos' && (
              <button
                type="button"
                onClick={handleSalvarPdf}
                disabled={gerandoAcao || carregandoDoc}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {gerandoAcao ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>Salvar PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleImprimirDocumento}
              disabled={gerandoAcao || carregandoDoc}
              className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {gerandoAcao ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              <span>{abaPrincipal === 'documentos' ? `Imprimir ${tipoDocumento === 'carne' ? 'Carnê' : tipoDocumento === 'duplicata' ? 'Duplicata' : 'Promissória'}` : 'Imprimir Cupom'}</span>
            </button>

            {onEmitirNFCe && (
              <button
                type="button"
                onClick={onEmitirNFCe}
                disabled={carregandoNFCe}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{carregandoNFCe ? 'Emitindo...' : 'Emitir NFC-e'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

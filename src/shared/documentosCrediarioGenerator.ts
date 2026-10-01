import { numeroParaExtenso, dataPorExtenso } from './extenso';
import { gerarSvgCode128, gerarNumeroCodigoBarrasParcela } from './barcode128';
import { gerarPayloadPix, gerarSvgQrCode } from './pixQrCode';

export interface ParcelaDocumento {
  id?: number;
  numero: number;
  totalParcelas: number;
  valor: number;
  dataVencimento: string; // YYYY-MM-DD ou DD/MM/YYYY
  numDocumento?: string; // ex: NF-51-1-1/3
  barcodeNumber?: string;
  pixPayload?: string;
}

export interface DadosDocumentoCrediario {
  loja: {
    nome: string;
    razaoSocial?: string;
    cnpj: string;
    cidade: string;
    estado: string;
    endereco?: string;
    telefone?: string;
    chavePix?: string;
  };
  cliente: {
    nome: string;
    cpfCnpj: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    telefone?: string;
  };
  contrato: {
    id: number;
    vendaId: number;
    dataEmissao: string;
    valorTotal: number;
    qtdParcelas: number;
    taxaJurosMensal?: number;
    multaAtrasoPercentual?: number;
  };
  parcelas: ParcelaDocumento[];
}

function formatarMoeda(val: number): string {
  return (Number(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarValorSimples(val: number): string {
  return (Number(val) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarDataSimples(dataStr: string): string {
  if (!dataStr) return '';
  if (dataStr.includes('/')) return dataStr;
  const parts = dataStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dataStr;
}

function escapeHtml(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * =========================================================================
 * 1. GERADOR DO CARNÊ DE PARCELAS (LAYOUT 100% IDÊNTICO À IMAGEM DE REFERÊNCIA)
 * =========================================================================
 */
export function gerarHtmlCarne(dados: DadosDocumentoCrediario): string {
  const { loja, cliente, contrato, parcelas } = dados;
  const totalParcs = contrato.qtdParcelas || parcelas.length || 1;
  const dataDocStr = formatarDataSimples(contrato.dataEmissao);
  const multaStr = (contrato.multaAtrasoPercentual ?? 1.00).toFixed(2).replace('.', ',');
  const jurosStr = (contrato.taxaJurosMensal ?? 1.05).toFixed(2).replace('.', ',');
  const instrucaoTexto = `Após o vencimento cobrar ${multaStr}% de multa e ${jurosStr}% de juros ao mês. OBRIGADO PELA PREFERÊNCIA!`;

  const chavePixLoja = loja.chavePix || loja.telefone || loja.cnpj || '';

  let htmlParcelas = '';

  parcelas.forEach((p, idx) => {
    const numDoc = p.numDocumento || `NF-${contrato.vendaId}-${contrato.id}-${p.numero}/${totalParcs}`;
    const vencimentoStr = formatarDataSimples(p.dataVencimento);
    const valorStr = formatarMoeda(p.valor);
    const barcodeNumber = p.barcodeNumber || gerarNumeroCodigoBarrasParcela(contrato.vendaId, contrato.id, p.numero, p.id);
    const barcodeSvg = gerarSvgCode128(barcodeNumber, { larguraBarra: 1.25, altura: 28 });

    // Geração do QR Code PIX da parcela
    let qrcodePixHtml = '';
    if (chavePixLoja) {
      try {
        const txidParcela = `P${p.numero}C${contrato.id}V${contrato.vendaId || 0}`.substring(0, 25);
        const payloadPix = p.pixPayload || gerarPayloadPix({
          chavePix: chavePixLoja,
          nomeRecebedor: loja.nome || loja.razaoSocial || 'LOJA',
          cidadeRecebedor: loja.cidade || 'BRASIL',
          valor: p.valor,
          txid: txidParcela,
          descricao: `Parc ${p.numero}/${totalParcs} Doc ${numDoc}`
        });
        const qrSvg = gerarSvgQrCode(payloadPix, { tamanho: 44, margem: 1 });
        qrcodePixHtml = `
          <div class="bloco-pix-inline">
            <div class="pix-qr-svg">${qrSvg}</div>
            <div class="pix-info-col">
              <span class="pix-tag">PAGAMENTO VIA PIX</span>
              <span class="pix-chave-txt">Chave: ${escapeHtml(chavePixLoja)}</span>
              <span class="pix-dica-txt">Escaneie para pagar no valor exato</span>
            </div>
          </div>
        `;
      } catch (err) {
        console.warn('Falha ao gerar QR Code Pix da parcela:', err);
      }
    }

    const isLastItemOnPage = (idx + 1) % 3 === 0 && idx < parcelas.length - 1;
    const hasDashedDivider = idx < parcelas.length - 1;

    htmlParcelas += `
      <div class="carne-bloco ${isLastItemOnPage ? 'quebra-pagina-depois' : ''}">
        <div class="carne-grade">
          
          <!-- COLUNA ESQUERDA (~25%) -->
          <div class="col-esquerda">
            <div class="linha-dupla">
              <div class="celula-metade borda-dir">
                <span class="rotulo">Parcela</span>
                <span class="valor-negrito">${p.numero}/${totalParcs}</span>
              </div>
              <div class="celula-metade">
                <span class="rotulo">Vencimento</span>
                <span class="valor-negrito">${vencimentoStr}</span>
              </div>
            </div>

            <div class="linha-campo borda-baixo">
              <span class="rotulo">(=) Valor do Documento</span>
              <span class="valor-destaque">${valorStr}</span>
            </div>

            <div class="linha-vazia borda-baixo"><span class="rotulo">(-) Descontos</span></div>
            <div class="linha-vazia borda-baixo"><span class="rotulo">(-) Outras Deduções</span></div>
            <div class="linha-vazia borda-baixo"><span class="rotulo">(+) Mora / Multa</span></div>
            <div class="linha-vazia borda-baixo"><span class="rotulo">(+) Outros Acréscimos</span></div>
            <div class="linha-vazia borda-baixo"><span class="rotulo">(=) Valor Cobrado</span></div>

            <div class="linha-campo borda-nenhuma">
              <span class="rotulo">Número do Documento</span>
              <span class="valor-mono">${numDoc}</span>
            </div>
          </div>

          <!-- COLUNA CENTRO (~46%) -->
          <div class="col-centro">
            <div class="linha-campo borda-baixo">
              <span class="rotulo">Local de Pagamento</span>
              <span class="valor-caixa-alta">PAGÁVEL NO ESTABELECIMENTO EMISSOR OU VIA PIX</span>
            </div>

            <div class="linha-campo borda-baixo">
              <span class="rotulo">Cedente</span>
              <span class="valor-negrito-grande">${escapeHtml(loja.nome || loja.razaoSocial || 'LOJA EMISSORA')}</span>
            </div>

            <div class="linha-quadrupla borda-baixo">
              <div class="celula-quarto borda-dir">
                <span class="rotulo">Data do Doc.</span>
                <span class="valor-normal">${dataDocStr}</span>
              </div>
              <div class="celula-quarto borda-dir">
                <span class="rotulo">Núm. do Doc.</span>
                <span class="valor-normal">${numDoc}</span>
              </div>
              <div class="celula-quarto borda-dir">
                <span class="rotulo">Espécie do Doc.</span>
                <span class="valor-normal">Carnê</span>
              </div>
              <div class="celula-quarto">
                <span class="rotulo">Data do Proces.</span>
                <span class="valor-normal">${dataDocStr}</span>
              </div>
            </div>

            <div class="caixa-instrucao borda-baixo">
              <div class="texto-instrucoes">${instrucaoTexto}</div>
              ${qrcodePixHtml}
            </div>

            <div class="linha-sacado">
              <div class="sacado-item"><span class="rotulo-inline">Sacado</span> <span class="valor-sacado">${escapeHtml(cliente.nome || 'CONSUMIDOR PADRÃO')}</span></div>
              <div class="sacado-item"><span class="rotulo-inline">CPF</span> <span class="valor-sacado font-mono">${escapeHtml(cliente.cpfCnpj || '000.000.000-00')}</span></div>
            </div>
          </div>

          <!-- COLUNA DIREITA (~29%) -->
          <div class="col-direita">
            <div class="linha-campo borda-baixo">
              <span class="rotulo">Vencimento</span>
              <span class="valor-negrito">${vencimentoStr}</span>
            </div>

            <div class="linha-campo borda-baixo">
              <span class="rotulo">(=) Valor do Documento</span>
              <span class="valor-destaque">${valorStr}</span>
            </div>

            <div class="linha-vazia borda-baixo"><span class="rotulo">(-) Descontos</span></div>
            <div class="linha-vazia borda-baixo"><span class="rotulo">(-) Outras Deduções</span></div>
            <div class="linha-vazia borda-baixo"><span class="rotulo">(+) Mora / Multa</span></div>
            <div class="linha-vazia borda-baixo"><span class="rotulo">(+) Outros Acréscimos</span></div>
            <div class="linha-vazia borda-baixo"><span class="rotulo">(=) Valor Cobrado</span></div>

            <div class="caixa-barcode">
              <div class="barcode-svg-wrap">${barcodeSvg}</div>
              <div class="barcode-number">${barcodeNumber}</div>
            </div>
          </div>

        </div>
        ${hasDashedDivider ? '<div class="linha-separadora-tracejada"></div>' : ''}
      </div>
    `;
  });

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Carnê de Pagamento - ${escapeHtml(loja.nome)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 8mm 8mm 8mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: #ffffff !important;
      color: #000000 !important;
      font-family: 'Courier New', Courier, monospace;
      font-size: 10px;
      line-height: 1.15;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .documento-carne-container {
      width: 100%;
      max-width: 194mm;
      margin: 0 auto;
    }
    .carne-bloco {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: 6px;
    }
    .quebra-pagina-depois {
      page-break-after: always;
      break-after: page;
    }
    .linha-separadora-tracejada {
      border-bottom: 1px dashed #000000;
      margin: 8px 0;
      width: 100%;
      height: 1px;
    }
    .carne-grade {
      display: flex;
      border: 1px solid #000000;
      background-color: #ffffff;
      width: 100%;
    }
    .col-esquerda {
      width: 25%;
      border-right: 1px solid #000000;
      display: flex;
      flex-direction: column;
    }
    .col-centro {
      width: 46%;
      border-right: 1px solid #000000;
      display: flex;
      flex-direction: column;
    }
    .col-direita {
      width: 29%;
      display: flex;
      flex-direction: column;
    }
    .borda-baixo {
      border-bottom: 1px solid #000000;
    }
    .borda-dir {
      border-right: 1px solid #000000;
    }
    .borda-nenhuma {
      border: none !important;
    }
    .linha-dupla {
      display: flex;
      border-bottom: 1px solid #000000;
    }
    .celula-metade {
      flex: 1;
      padding: 2px 4px;
    }
    .linha-quadrupla {
      display: flex;
    }
    .celula-quarto {
      flex: 1;
      padding: 2px 3px;
    }
    .linha-campo {
      padding: 2px 4px;
    }
    .linha-vazia {
      padding: 1px 4px;
      height: 14px;
    }
    .rotulo {
      display: block;
      font-size: 7.5px;
      color: #333333;
      text-transform: none;
    }
    .rotulo-inline {
      font-size: 8.5px;
      color: #222222;
      width: 45px;
      display: inline-block;
    }
    .valor-negrito {
      font-size: 9.5px;
      font-weight: bold;
      color: #000000;
      display: block;
    }
    .valor-destaque {
      font-size: 10.5px;
      font-weight: bold;
      color: #000000;
      display: block;
    }
    .valor-negrito-grande {
      font-size: 10.5px;
      font-weight: bold;
      color: #000000;
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .valor-mono {
      font-size: 9px;
      font-weight: bold;
      color: #000000;
      display: block;
    }
    .valor-normal {
      font-size: 8.5px;
      font-weight: bold;
      color: #000000;
      display: block;
    }
    .valor-caixa-alta {
      font-size: 8px;
      font-weight: bold;
      color: #000000;
      display: block;
      text-transform: uppercase;
    }
    .caixa-instrucao {
      padding: 3px 4px;
      font-size: 7.5px;
      min-height: 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 3px;
      line-height: 1.15;
    }
    .texto-instrucoes {
      font-size: 7.5px;
      color: #111;
    }
    .bloco-pix-inline {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #f8fafc;
      border: 1px dashed #64748b;
      padding: 2px 4px;
      border-radius: 2px;
    }
    .pix-qr-svg svg {
      display: block;
      width: 44px;
      height: 44px;
    }
    .pix-info-col {
      display: flex;
      flex-direction: column;
      gap: 1px;
      overflow: hidden;
    }
    .pix-tag {
      font-size: 7px;
      font-weight: bold;
      color: #0369a1;
      letter-spacing: 0.5px;
    }
    .pix-chave-txt {
      font-size: 7.5px;
      font-weight: bold;
      color: #000000;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pix-dica-txt {
      font-size: 6.5px;
      color: #475569;
    }
    .linha-sacado {
      padding: 3px 4px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .sacado-item {
      font-size: 8.5px;
      display: flex;
      align-items: center;
    }
    .valor-sacado {
      font-size: 8.5px;
      font-weight: bold;
      color: #000000;
    }
    .caixa-barcode {
      padding: 2px 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      flex: 1;
    }
    .barcode-svg-wrap svg {
      max-height: 24px;
      width: auto;
    }
    .barcode-number {
      font-size: 8.5px;
      font-weight: bold;
      letter-spacing: 1px;
      margin-top: 2px;
      color: #000000;
    }
  </style>
</head>

<body>
  <div class="documento-carne-container">
    ${htmlParcelas}
  </div>
</body>
</html>
  `.trim();
}

/**
 * =========================================================================
 * 2. GERADOR DE NOTA PROMISSÓRIA (LAYOUT 100% IDÊNTICO À IMAGEM DE REFERÊNCIA)
 * =========================================================================
 */
export function gerarHtmlPromissoria(dados: DadosDocumentoCrediario): string {
  const { loja, cliente, contrato, parcelas } = dados;
  const totalParcs = contrato.qtdParcelas || parcelas.length || 1;
  const dataEmissaoInfo = dataPorExtenso(contrato.dataEmissao);
  const dataEmissaoFormatada = dataEmissaoInfo.dataFormatada;
  const cidadeUfLoja = [loja.cidade || 'CIDADE', loja.estado || 'UF'].filter(Boolean).join(' - ').toUpperCase();

  let htmlPromissorias = '';

  parcelas.forEach((p, idx) => {
    const numDoc = p.numDocumento || `NF-${contrato.vendaId}-${contrato.id}-${p.numero}/${totalParcs}`;
    const valorNum = p.valor;
    const valorExtenso = numeroParaExtenso(valorNum);
    const valorSimples = formatarValorSimples(valorNum);
    const vencimentoInfo = dataPorExtenso(p.dataVencimento);
    const barcodeNumber = p.barcodeNumber || gerarNumeroCodigoBarrasParcela(contrato.vendaId, contrato.id, p.numero, p.id);
    const barcodeSvg = gerarSvgCode128(barcodeNumber, { larguraBarra: 1.3, altura: 30 });

    const isLastItemOnPage = (idx + 1) % 2 === 0 && idx < parcelas.length - 1;
    const hasDashedDivider = idx < parcelas.length - 1;

    htmlPromissorias += `
      <div class="promissoria-wrapper ${isLastItemOnPage ? 'quebra-pagina-depois' : ''}">
        <div class="promissoria-cartao">
          
          <!-- COLUNA ESQUERDA VERTICAL: AVALISTAS -->
          <div class="col-avalistas">
            <div class="avalistas-vertical-texto">AVALISTAS</div>
            <div class="avalistas-campos">
              <div class="avalista-linha">
                <span class="avalista-rotulo">CPF</span>
                <span class="avalista-pontos">....................</span>
              </div>
              <div class="avalista-linha">
                <span class="avalista-rotulo">ENDEREÇO</span>
                <span class="avalista-pontos">....................</span>
              </div>
              <div class="avalista-linha espaco-topo">
                <span class="avalista-rotulo">CPF</span>
                <span class="avalista-pontos">....................</span>
              </div>
              <div class="avalista-linha">
                <span class="avalista-rotulo">ENDEREÇO</span>
                <span class="avalista-pontos">....................</span>
              </div>
            </div>
          </div>

          <!-- CORPO PRINCIPAL DA PROMISSÓRIA -->
          <div class="promissoria-corpo">
            
            <!-- LINHA 1: CABEÇALHO (TÍTULO, NUM DOC, VALOR, VENCIMENTO) -->
            <div class="prom-cabecalho">
              <div class="prom-titulo">NOTA PROMISSÓRIA</div>
              <div class="caixa-cinza-doc">${numDoc}</div>
              <div class="prom-cifrao">R$</div>
              <div class="caixa-cinza-valor">${valorSimples}</div>
              <div class="prom-vencimento-top">
                <span class="venc-lbl">Vencimento</span>
                <span class="venc-val">${vencimentoInfo.dataCompletaExtenso}</span>
              </div>
            </div>

            <!-- LINHA 2: TEXTO LEGAL COM VALOR POR EXTENSO -->
            <div class="prom-texto-legal">
              Ao dia ${vencimentoInfo.diaExtenso} de ${vencimentoInfo.mesExtenso} de ${vencimentoInfo.anoExtenso}, pagarei por esta única via de NOTA PROMISSÓRIA<br/>
              a <strong>${(loja.nome || loja.razaoSocial || 'LOJA HIPER').toUpperCase()}</strong> de CNPJ: <strong>${loja.cnpj || '00.000.000/0001-00'}</strong>, ou à sua ordem,<br/>
              <div class="bloco-quantia">
                <span class="lbl-quantia">a quantia de</span>
                <div class="caixa-cinza-extenso">${valorExtenso}</div>
              </div>
              em moeda corrente deste país, pagável em <strong>${cidadeUfLoja}</strong>
            </div>

            <!-- LINHA 3: DADOS DO EMITENTE / DEVEDOR -->
            <div class="prom-dados-emitente">
              <div class="emit-linha"><strong>Emitente</strong> <span>${(cliente.nome || 'CONSUMIDOR PADRÃO').toUpperCase()}</span></div>
              <div class="emit-linha"><strong>Endereço</strong> <span>${(cliente.endereco || 'ENDEREÇO NÃO INFORMADO').toUpperCase()}</span></div>
              <div class="emit-linha"><strong>CPF</strong> <span class="font-mono">${cliente.cpfCnpj || '000.000.000-00'}</span></div>
              <div class="emit-linha"><strong>Data de emissão</strong> <span>${dataEmissaoFormatada}</span></div>
            </div>

            <!-- LINHA 4: ASSINATURA E CÓDIGO DE BARRAS -->
            <div class="prom-rodape">
              <div class="prom-bloco-assinatura">
                <div class="linha-assinatura"></div>
                <div class="nome-assinante">${(cliente.nome || 'CONSUMIDOR PADRÃO').toUpperCase()}</div>
              </div>

              <div class="prom-bloco-barcode">
                <div class="barcode-svg">${barcodeSvg}</div>
                <div class="barcode-txt">${barcodeNumber}</div>
              </div>
            </div>

          </div>

        </div>
        ${hasDashedDivider ? '<div class="linha-separadora-tracejada"></div>' : ''}
      </div>
    `;
  });

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Nota Promissória - ${loja.nome}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: #ffffff !important;
      color: #000000 !important;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.25;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .documento-promissoria-container {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
    }
    .promissoria-wrapper {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: 15px;
    }
    .quebra-pagina-depois {
      page-break-after: always;
      break-after: page;
    }
    .linha-separadora-tracejada {
      border-bottom: 1px dashed #000000;
      margin: 15px 0;
      width: 100%;
      height: 1px;
    }
    .promissoria-cartao {
      border: 2px solid #000000;
      padding: 3px;
      background-color: #ffffff;
      display: flex;
    }
    .col-avalistas {
      width: 110px;
      border: 1px solid #000000;
      border-right: 1px solid #000000;
      display: flex;
      padding: 6px 4px;
      background-color: #ffffff;
      margin-right: 6px;
    }
    .avalistas-vertical-texto {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      font-size: 11px;
      font-weight: bold;
      letter-spacing: 2px;
      text-align: center;
      padding-right: 4px;
      border-left: 1px solid #cccccc;
    }
    .avalistas-campos {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 6px;
      font-size: 8px;
      margin-left: 4px;
    }
    .avalista-linha {
      display: flex;
      flex-direction: column;
    }
    .avalista-rotulo {
      font-weight: bold;
      font-size: 7.5px;
    }
    .avalista-pontos {
      font-size: 7px;
      letter-spacing: 1px;
      color: #555555;
    }
    .espaco-topo {
      margin-top: 8px;
    }
    .promissoria-corpo {
      flex: 1;
      border: 1px solid #000000;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background-color: #ffffff;
    }
    .prom-cabecalho {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .prom-titulo {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 0.5px;
    }
    .caixa-cinza-doc {
      background-color: #d1d5db;
      border: 1px solid #000000;
      padding: 3px 10px;
      font-size: 12px;
      font-weight: bold;
      letter-spacing: 0.5px;
    }
    .prom-cifrao {
      font-size: 13px;
      font-weight: bold;
    }
    .caixa-cinza-valor {
      background-color: #d1d5db;
      border: 1px solid #000000;
      padding: 3px 12px;
      font-size: 13px;
      font-weight: bold;
    }
    .prom-vencimento-top {
      margin-left: auto;
      text-align: right;
      font-size: 10px;
    }
    .venc-lbl {
      font-weight: bold;
      margin-right: 6px;
    }
    .venc-val {
      font-weight: normal;
    }
    .prom-texto-legal {
      font-size: 9.5px;
      line-height: 1.5;
      text-align: justify;
    }
    .bloco-quantia {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 4px 0;
    }
    .lbl-quantia {
      white-space: nowrap;
    }
    .caixa-cinza-extenso {
      background-color: #d1d5db;
      border: 1px solid #000000;
      padding: 2px 8px;
      font-size: 9.5px;
      font-weight: bold;
      flex: 1;
    }
    .prom-dados-emitente {
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 9.5px;
    }
    .emit-linha {
      display: flex;
      gap: 8px;
    }
    .emit-linha strong {
      width: 120px;
    }
    .prom-rodape {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-top: 6px;
    }
    .prom-bloco-assinatura {
      width: 220px;
      text-align: center;
    }
    .linha-assinatura {
      border-top: 1.5px solid #000000;
      width: 100%;
      margin-bottom: 3px;
    }
    .nome-assinante {
      font-size: 8.5px;
      font-weight: bold;
    }
    .prom-bloco-barcode {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .barcode-svg svg {
      max-height: 28px;
      width: auto;
    }
    .barcode-txt {
      font-size: 9px;
      font-weight: bold;
      letter-spacing: 1px;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="documento-promissoria-container">
    ${htmlPromissorias}
  </div>
</body>
</html>
  `.trim();
}

/**
 * =========================================================================
 * 3. GERADOR DE DUPLICATA COMERCIAL
 * =========================================================================
 */
export function gerarHtmlDuplicata(dados: DadosDocumentoCrediario): string {
  const { loja, cliente, contrato, parcelas } = dados;
  const totalParcs = contrato.qtdParcelas || parcelas.length || 1;
  const dataEmissaoFormatada = formatarDataSimples(contrato.dataEmissao);
  const cidadeUfLoja = [loja.cidade || 'CIDADE', loja.estado || 'UF'].filter(Boolean).join(' - ').toUpperCase();

  let htmlDuplicatas = '';

  parcelas.forEach((p, idx) => {
    const numDoc = p.numDocumento || `NF-${contrato.vendaId}-${contrato.id}-${p.numero}/${totalParcs}`;
    const valorNum = p.valor;
    const valorExtenso = numeroParaExtenso(valorNum);
    const valorMoeda = formatarMoeda(valorNum);
    const vencimentoStr = formatarDataSimples(p.dataVencimento);
    const barcodeNumber = p.barcodeNumber || gerarNumeroCodigoBarrasParcela(contrato.vendaId, contrato.id, p.numero, p.id);
    const barcodeSvg = gerarSvgCode128(barcodeNumber, { larguraBarra: 1.3, altura: 28 });

    const isLastItemOnPage = (idx + 1) % 2 === 0 && idx < parcelas.length - 1;
    const hasDashedDivider = idx < parcelas.length - 1;

    htmlDuplicatas += `
      <div class="duplicata-wrapper ${isLastItemOnPage ? 'quebra-pagina-depois' : ''}">
        <div class="duplicata-cartao">
          <div class="dup-header">
            <div class="dup-loja-info">
              <h2 class="dup-loja-nome">${(loja.nome || loja.razaoSocial || 'LOJA EMISSORA').toUpperCase()}</h2>
              <div class="dup-loja-cnpj">CNPJ: ${loja.cnpj || '00.000.000/0001-00'} • ${cidadeUfLoja}</div>
            </div>
            <div class="dup-titulo-bloco">
              <div class="dup-titulo">FATURA / DUPLICATA</div>
              <div class="dup-num-doc">${numDoc}</div>
            </div>
          </div>

          <div class="dup-tabela-resumo">
            <div class="dup-col-resumo">
              <span class="dup-lbl">VALOR DA DUPLICATA</span>
              <span class="dup-val-destaque">${valorMoeda}</span>
            </div>
            <div class="dup-col-resumo">
              <span class="dup-lbl">DATA DE EMISSÃO</span>
              <span class="dup-val">${dataEmissaoFormatada}</span>
            </div>
            <div class="dup-col-resumo">
              <span class="dup-lbl">DATA DE VENCIMENTO</span>
              <span class="dup-val-destaque">${vencimentoStr}</span>
            </div>
            <div class="dup-col-resumo">
              <span class="dup-lbl">PARCELA</span>
              <span class="dup-val">${p.numero} de ${totalParcs}</span>
            </div>
          </div>

          <div class="dup-extenso-bloco">
            <strong>Valor por extenso:</strong> ${valorExtenso}
          </div>

          <div class="dup-sacado-bloco">
            <div class="dup-linha-sac"><strong>SACADO (COMPRADOR):</strong> ${(cliente.nome || 'CONSUMIDOR PADRÃO').toUpperCase()}</div>
            <div class="dup-linha-sac"><strong>CPF/CNPJ:</strong> ${cliente.cpfCnpj || '000.000.000-00'} • <strong>TELEFONE:</strong> ${cliente.telefone || '—'}</div>
            <div class="dup-linha-sac"><strong>ENDEREÇO:</strong> ${(cliente.endereco || '—').toUpperCase()}</div>
            <div class="dup-linha-sac"><strong>PRAÇA DE PAGAMENTO:</strong> ${cidadeUfLoja}</div>
          </div>

          <div class="dup-declaracao">
            Reconheço(emos) a exatidão desta DUPLICATA DE VENDA MERCANTIL na importância acima discriminada, a qual me comprometo a pagar no vencimento indicado.
          </div>

          <div class="dup-rodape">
            <div class="dup-assinatura-bloco">
              <div class="dup-linha-ass"></div>
              <div class="dup-ass-nome">${(cliente.nome || 'CONSUMIDOR PADRÃO').toUpperCase()}</div>
              <div class="dup-ass-sub">Assinatura do Sacado (Aceite)</div>
            </div>
            <div class="dup-barcode-bloco">
              <div class="barcode-svg">${barcodeSvg}</div>
              <div class="barcode-txt">${barcodeNumber}</div>
            </div>
          </div>
        </div>
        ${hasDashedDivider ? '<div class="linha-separadora-tracejada"></div>' : ''}
      </div>
    `;
  });

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Duplicata Comercial - ${loja.nome}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: #ffffff !important;
      color: #000000 !important;
      font-family: 'Courier New', Courier, monospace;
      font-size: 10.5px;
      line-height: 1.2;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .documento-duplicata-container {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
    }
    .duplicata-wrapper {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: 15px;
    }
    .quebra-pagina-depois {
      page-break-after: always;
      break-after: page;
    }
    .linha-separadora-tracejada {
      border-bottom: 1px dashed #000000;
      margin: 15px 0;
      width: 100%;
      height: 1px;
    }
    .duplicata-cartao {
      border: 1.5px solid #000000;
      padding: 10px;
      background-color: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .dup-header {
      display: flex;
      justify-content: space-between;
      border-bottom: 1.5px solid #000000;
      padding-bottom: 6px;
    }
    .dup-loja-nome {
      font-size: 13px;
      font-weight: bold;
    }
    .dup-loja-cnpj {
      font-size: 9px;
      color: #333333;
    }
    .dup-titulo-bloco {
      text-align: right;
    }
    .dup-titulo {
      font-size: 12px;
      font-weight: 900;
    }
    .dup-num-doc {
      font-size: 11px;
      font-weight: bold;
      background-color: #e2e8f0;
      padding: 2px 6px;
      border: 1px solid #000000;
      display: inline-block;
      margin-top: 2px;
    }
    .dup-tabela-resumo {
      display: flex;
      border: 1px solid #000000;
    }
    .dup-col-resumo {
      flex: 1;
      padding: 4px 6px;
      border-right: 1px solid #000000;
    }
    .dup-col-resumo:last-child {
      border-right: none;
    }
    .dup-lbl {
      font-size: 7.5px;
      display: block;
      color: #333333;
    }
    .dup-val {
      font-size: 10px;
      font-weight: bold;
    }
    .dup-val-destaque {
      font-size: 11px;
      font-weight: 900;
    }
    .dup-extenso-bloco {
      background-color: #f1f5f9;
      border: 1px solid #000000;
      padding: 4px 8px;
      font-size: 9.5px;
    }
    .dup-sacado-bloco {
      border: 1px solid #000000;
      padding: 6px 8px;
      font-size: 9.5px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .dup-declaracao {
      font-size: 8.5px;
      text-align: justify;
      line-height: 1.3;
      padding: 2px 0;
    }
    .dup-rodape {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 4px;
    }
    .dup-assinatura-bloco {
      width: 220px;
      text-align: center;
    }
    .dup-linha-ass {
      border-top: 1px solid #000000;
      margin-bottom: 2px;
    }
    .dup-ass-nome {
      font-size: 8.5px;
      font-weight: bold;
    }
    .dup-ass-sub {
      font-size: 7.5px;
      color: #555555;
    }
    .dup-barcode-bloco {
      text-align: center;
    }
    .dup-barcode-bloco svg {
      max-height: 26px;
      width: auto;
    }
    .barcode-txt {
      font-size: 8.5px;
      font-weight: bold;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="documento-duplicata-container">
    ${htmlDuplicatas}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Ponto de entrada unificado para renderização de qualquer documento de Crediário
 */
export function gerarHtmlDocumento(
  tipo: 'carne' | 'duplicata' | 'promissoria',
  dados: DadosDocumentoCrediario
): string {
  switch (tipo) {
    case 'carne':
      return gerarHtmlCarne(dados);
    case 'promissoria':
      return gerarHtmlPromissoria(dados);
    case 'duplicata':
      return gerarHtmlDuplicata(dados);
    default:
      return gerarHtmlCarne(dados);
  }
}

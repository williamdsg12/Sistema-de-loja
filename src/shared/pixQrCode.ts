/**
 * Gerador de Payload PIX (BR Code / EMVCo) e QR Code em SVG puro.
 * 100% offline, funciona tanto no Electron (Node.js) quanto no React (Browser).
 */

// =========================================================================
// 1. GERAÇÃO DE PAYLOAD PIX (EMVCo TLV + CRC-16/CCITT-FALSE)
// =========================================================================

function formatarTLV(id: string, valor: string): string {
  const tamanho = valor.length.toString().padStart(2, '0');
  return `${id}${tamanho}${valor}`;
}

function normalizarTexto(texto: string, maxLen: number): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .toUpperCase()
    .substring(0, maxLen);
}

export function calcularCrc16Pix(payloadSemCrc: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payloadSemCrc.length; i++) {
    crc ^= payloadSemCrc.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface OpcoesPayloadPix {
  chavePix: string;
  nomeRecebedor: string;
  cidadeRecebedor?: string;
  valor?: number;
  txid?: string;
  descricao?: string;
}

export function gerarPayloadPix(opcoes: OpcoesPayloadPix): string {
  const chave = opcoes.chavePix.trim();
  const nome = normalizarTexto(opcoes.nomeRecebedor || 'RECEBEDOR', 25) || 'RECEBEDOR';
  const cidade = normalizarTexto(opcoes.cidadeRecebedor || 'BRASIL', 15) || 'BRASIL';
  const txid = normalizarTexto(opcoes.txid || '***', 25) || '***';

  // Subcampos da Conta do Beneficiário (Tag 26)
  let subTag26 = formatarTLV('00', 'BR.GOV.BCB.PIX') + formatarTLV('01', chave);
  if (opcoes.descricao) {
    const desc = normalizarTexto(opcoes.descricao, 40);
    if (desc) subTag26 += formatarTLV('02', desc);
  }

  // Subcampos de Informações Adicionais (Tag 62)
  const subTag62 = formatarTLV('05', txid);

  let payload = '';
  payload += formatarTLV('00', '01'); // Payload Format Indicator
  payload += formatarTLV('26', subTag26); // Merchant Account Information
  payload += formatarTLV('52', '0000'); // Merchant Category Code
  payload += formatarTLV('53', '986'); // Currency (BRL)

  if (opcoes.valor && opcoes.valor > 0) {
    payload += formatarTLV('54', opcoes.valor.toFixed(2));
  }

  payload += formatarTLV('58', 'BR'); // Country Code
  payload += formatarTLV('59', nome); // Merchant Name
  payload += formatarTLV('60', cidade); // Merchant City
  payload += formatarTLV('62', subTag62); // Additional Data Field (txid)
  payload += '6304'; // CRC16 Header

  const crc = calcularCrc16Pix(payload);
  return payload + crc;
}

// =========================================================================
// 2. GERADOR COMPACTO DE MATRIZ DE QR CODE EM SVG PURO
// =========================================================================

// Reed-Solomon GF(256) Math
const GF_EXP: number[] = new Array(512);
const GF_LOG: number[] = new Array(256);
(function initGFTables() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_EXP[i + 255] = x;
    GF_LOG[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
  }
  GF_LOG[0] = 0;
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function rsGenPoly(numEcBytes: number): number[] {
  let poly = [1];
  for (let i = 0; i < numEcBytes; i++) {
    const root = GF_EXP[i];
    const nextPoly = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      nextPoly[j] ^= gfMul(poly[j], root);
      nextPoly[j + 1] ^= poly[j];
    }
    poly = nextPoly;
  }
  return poly;
}

function rsCalcEc(data: number[], numEcBytes: number): number[] {
  const gen = rsGenPoly(numEcBytes);
  const res = new Array(numEcBytes).fill(0);
  for (const byte of data) {
    const factor = byte ^ res[0];
    res.shift();
    res.push(0);
    if (factor !== 0) {
      for (let i = 0; i < numEcBytes; i++) {
        res[i] ^= gfMul(gen[i], factor);
      }
    }
  }
  return res;
}

// Especificação de Versões do QR Code (Byte mode, Correção Nível M)
interface QrVersionSpec {
  version: number;
  size: number;
  totalBytes: number;
  dataBytes: number;
  ecBytesPerBlock: number;
  blocks: number;
  alignPos: number[];
}

const QR_SPECS_M: QrVersionSpec[] = [
  { version: 1, size: 21, totalBytes: 26, dataBytes: 16, ecBytesPerBlock: 10, blocks: 1, alignPos: [] },
  { version: 2, size: 25, totalBytes: 44, dataBytes: 28, ecBytesPerBlock: 16, blocks: 1, alignPos: [6, 18] },
  { version: 3, size: 29, totalBytes: 70, dataBytes: 44, ecBytesPerBlock: 26, blocks: 1, alignPos: [6, 22] },
  { version: 4, size: 33, totalBytes: 100, dataBytes: 64, ecBytesPerBlock: 18, blocks: 2, alignPos: [6, 26] },
  { version: 5, size: 37, totalBytes: 134, dataBytes: 86, ecBytesPerBlock: 24, blocks: 2, alignPos: [6, 30] },
  { version: 6, size: 41, totalBytes: 172, dataBytes: 108, ecBytesPerBlock: 16, blocks: 4, alignPos: [6, 34] },
  { version: 7, size: 45, totalBytes: 196, dataBytes: 124, ecBytesPerBlock: 18, blocks: 4, alignPos: [6, 22, 38] },
  { version: 8, size: 49, totalBytes: 242, dataBytes: 154, ecBytesPerBlock: 22, blocks: 4, alignPos: [6, 24, 42] },
  { version: 9, size: 53, totalBytes: 292, dataBytes: 182, ecBytesPerBlock: 22, blocks: 5, alignPos: [6, 26, 46] },
  { version: 10, size: 57, totalBytes: 346, dataBytes: 216, ecBytesPerBlock: 26, blocks: 5, alignPos: [6, 28, 50] }
];

export function gerarMatrizQrCode(texto: string): boolean[][] {
  const utf8Bytes = Array.from(new TextEncoder().encode(texto));
  const len = utf8Bytes.length;

  // Seleciona a menor versão capaz de armazenar os bytes
  let spec: QrVersionSpec | null = null;
  for (const s of QR_SPECS_M) {
    // Modo Byte: 4 bits mode + 8/16 bits length + len*8 bits dados + 4 bits terminator
    const headerBits = 4 + (s.version <= 9 ? 8 : 16);
    const requiredBytes = Math.ceil((headerBits + len * 8 + 4) / 8);
    if (requiredBytes <= s.dataBytes) {
      spec = s;
      break;
    }
  }

  if (!spec) {
    spec = QR_SPECS_M[QR_SPECS_M.length - 1];
  }

  // 1. Bitstream
  const bits: number[] = [];
  const pushBits = (val: number, numBits: number) => {
    for (let i = numBits - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  pushBits(0b0100, 4); // Byte Mode
  pushBits(len, spec.version <= 9 ? 8 : 16);
  for (const b of utf8Bytes) {
    pushBits(b, 8);
  }
  pushBits(0, Math.min(4, spec.dataBytes * 8 - bits.length)); // Terminator
  while (bits.length % 8 !== 0) bits.push(0);

  // Padding
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < spec.dataBytes * 8) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Converte bits em bytes
  const dataBytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    dataBytes.push(byte);
  }

  // Divide em blocos e calcula Reed-Solomon EC
  const numBlocks = spec.blocks;
  const dataPerBlock = Math.floor(spec.dataBytes / numBlocks);
  const ecPerBlock = spec.ecBytesPerBlock;
  const blocksData: number[][] = [];
  const blocksEc: number[][] = [];

  let byteOffset = 0;
  for (let i = 0; i < numBlocks; i++) {
    const extra = i >= numBlocks - (spec.dataBytes % numBlocks) ? 1 : 0;
    const bData = dataBytes.slice(byteOffset, byteOffset + dataPerBlock + extra);
    byteOffset += dataPerBlock + extra;
    blocksData.push(bData);
    blocksEc.push(rsCalcEc(bData, ecPerBlock));
  }

  // Interleave
  const finalSequence: number[] = [];
  const maxBlockLen = Math.max(...blocksData.map((b) => b.length));
  for (let i = 0; i < maxBlockLen; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i < blocksData[b].length) finalSequence.push(blocksData[b][i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (let b = 0; b < numBlocks; b++) {
      finalSequence.push(blocksEc[b][i]);
    }
  }

  // Montagem da Matriz
  const N = spec.size;
  const matrix: (boolean | null)[][] = Array.from({ length: N }, () => new Array(N).fill(null));
  const isReserved: boolean[][] = Array.from({ length: N }, () => new Array(N).fill(false));

  const setModule = (r: number, c: number, val: boolean) => {
    matrix[r][c] = val;
    isReserved[r][c] = true;
  };

  // Finder Patterns
  const addFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          const isBlack = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          setModule(nr, nc, isBlack);
        } else {
          setModule(nr, nc, false); // Separador
        }
      }
    }
  };

  addFinder(0, 0);
  addFinder(0, N - 7);
  addFinder(N - 7, 0);

  // Alignment Patterns
  for (const r of spec.alignPos) {
    for (const c of spec.alignPos) {
      if (isReserved[r][c]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isBlack = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
          setModule(r + dr, c + dc, isBlack);
        }
      }
    }
  }

  // Timing Patterns
  for (let i = 8; i < N - 8; i++) {
    if (!isReserved[6][i]) setModule(6, i, i % 2 === 0);
    if (!isReserved[i][6]) setModule(i, 6, i % 2 === 0);
  }
  setModule(N - 8, 8, true); // Dark module

  // Format Info Reservation
  for (let i = 0; i <= 8; i++) {
    if (!isReserved[8][i]) { isReserved[8][i] = true; }
    if (!isReserved[i][8]) { isReserved[i][8] = true; }
  }
  for (let i = 0; i < 8; i++) {
    if (!isReserved[8][N - 1 - i]) { isReserved[8][N - 1 - i] = true; }
    if (!isReserved[N - 1 - i][8]) { isReserved[N - 1 - i][8] = true; }
  }

  // Colocação de Dados (Ziguezague)
  const dataBits: number[] = [];
  for (const byte of finalSequence) {
    for (let i = 7; i >= 0; i--) dataBits.push((byte >> i) & 1);
  }
  let bitIdx = 0;
  let upwards = true;

  for (let right = N - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Pula timing vertical
    const rows = upwards
      ? Array.from({ length: N }, (_, i) => N - 1 - i)
      : Array.from({ length: N }, (_, i) => i);

    for (const r of rows) {
      for (const col of [right, right - 1]) {
        if (!isReserved[r][col]) {
          const bit = bitIdx < dataBits.length ? dataBits[bitIdx++] : 0;
          // Máscara 0: (r + col) % 2 === 0
          const mask = (r + col) % 2 === 0;
          matrix[r][col] = (bit === 1) !== mask;
        }
      }
    }
    upwards = !upwards;
  }

  // Informação de Formato: Nível M (00) + Máscara 0 (000) => Format Bits 0b101010000010010
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i] === 1;
  matrix[8][7] = formatBits[6] === 1;
  matrix[8][8] = formatBits[7] === 1;
  matrix[7][8] = formatBits[8] === 1;
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = formatBits[i] === 1;

  for (let i = 0; i < 8; i++) matrix[N - 1 - i][8] = formatBits[i] === 1;
  for (let i = 8; i < 15; i++) matrix[8][N - 15 + i] = formatBits[i] === 1;

  return matrix.map((row) => row.map((cell) => cell ?? false));
}

/**
 * Gera um SVG vetorial nítido do QR Code
 */
export function gerarSvgQrCode(
  texto: string,
  opcoes?: {
    tamanho?: number;
    corFundo?: string;
    corModulo?: string;
    margem?: number;
  }
): string {
  const matrix = gerarMatrizQrCode(texto);
  const N = matrix.length;
  const margem = opcoes?.margem ?? 2;
  const tamanhoTotal = N + margem * 2;
  const dim = opcoes?.tamanho ?? 110;
  const corFundo = opcoes?.corFundo ?? '#ffffff';
  const corModulo = opcoes?.corModulo ?? '#000000';

  let rects = '';
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${c + margem}" y="${r + margem}" width="1" height="1" fill="${corModulo}"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tamanhoTotal} ${tamanhoTotal}" width="${dim}" height="${dim}" shape-rendering="crispEdges">
    <rect width="${tamanhoTotal}" height="${tamanhoTotal}" fill="${corFundo}"/>
    ${rects}
  </svg>`;
}

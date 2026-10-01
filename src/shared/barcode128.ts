/**
 * Gerador determinístico de código de barras CODE 128 em SVG puro.
 * Funciona no Node.js (backend) e no navegador (frontend) sem depender de DOM ou Canvas.
 */

// Tabela de padrões Code 128 (107 caracteres de dados + stop)
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (106 = STOP)
];

const START_B = 104;
const STOP = 106;

/**
 * Codifica uma string ASCII em Code 128 (Conjunto B)
 */
function codificarCode128B(texto: string): number[] {
  const codes: number[] = [START_B];
  let checksum = START_B;

  for (let i = 0; i < texto.length; i++) {
    const charCode = texto.charCodeAt(i);
    const val = charCode - 32;
    codes.push(val);
    checksum += val * (i + 1);
  }

  const checkDigit = checksum % 103;
  codes.push(checkDigit);
  codes.push(STOP);

  return codes;
}

/**
 * Gera o SVG do código de barras Code 128
 */
export function gerarSvgCode128(
  texto: string,
  opcoes?: {
    larguraBarra?: number;
    altura?: number;
    incluirTexto?: boolean;
    tamanhoFonte?: number;
  }
): string {
  const larguraBarra = opcoes?.larguraBarra || 1.3;
  const altura = opcoes?.altura || 30;
  const incluirTexto = opcoes?.incluirTexto ?? false;
  const tamanhoFonte = opcoes?.tamanhoFonte || 9;

  const codes = codificarCode128B(texto);
  let xPos = 0;
  const rects: string[] = [];

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    const pattern = CODE128_PATTERNS[code] || '111111';

    for (let j = 0; j < pattern.length; j++) {
      const barWidth = parseInt(pattern[j], 10) * larguraBarra;
      // Barras pretas são nos índices pares (0, 2, 4...)
      if (j % 2 === 0) {
        rects.push(`<rect x="${xPos.toFixed(2)}" y="0" width="${barWidth.toFixed(2)}" height="${altura}" fill="#000000" />`);
      }
      xPos += barWidth;
    }
  }

  const totalWidth = xPos;
  const totalHeight = incluirTexto ? altura + tamanhoFonte + 4 : altura;

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(2)} ${totalHeight}" width="${totalWidth.toFixed(2)}" height="${totalHeight}" style="display:inline-block; vertical-align:middle;">`;
  svgContent += rects.join('');

  if (incluirTexto) {
    svgContent += `<text x="${(totalWidth / 2).toFixed(2)}" y="${(altura + tamanhoFonte + 2)}" font-family="'Courier New', monospace" font-size="${tamanhoFonte}" font-weight="bold" text-anchor="middle" fill="#000000">${texto}</text>`;
  }

  svgContent += `</svg>`;
  return svgContent;
}

/**
 * Gera um número de código de barras único para a parcela
 * Formato determinístico: 07 + 8 dígitos + dígito verificador = 10 dígitos escaneáveis
 */
export function gerarNumeroCodigoBarrasParcela(
  vendaId: number,
  contratoId: number,
  parcelaNumero: number,
  parcelaId?: number
): string {
  const v = String(vendaId || 0).padStart(4, '0').slice(-4);
  const c = String(contratoId || 1).padStart(2, '0').slice(-2);
  const p = String(parcelaNumero || 1).padStart(2, '0').slice(-2);
  const base = `07${v}${c}${p}`;
  
  // Cálculo de dígito verificador Modulo 10
  let soma = 0;
  for (let i = 0; i < base.length; i++) {
    const num = parseInt(base[i], 10);
    soma += (i % 2 === 0) ? num * 1 : num * 3;
  }
  const dv = (10 - (soma % 10)) % 10;
  
  return `${base}${dv}`;
}

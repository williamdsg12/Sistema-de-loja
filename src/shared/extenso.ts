/**
 * Conversor de valores numéricos monetários para texto por extenso em Português do Brasil.
 * Exemplos:
 * - 83.33 -> "OITENTA E TRÊS REAIS E TRINTA E TRÊS CENTAVOS"
 * - 1.00  -> "UM REAL"
 * - 0.50  -> "CINQUENTA CENTAVOS"
 * - 1000.00 -> "UM MIL REAIS"
 * - 14.84 -> "QUATORZE REAIS E OITENTA E QUATRO CENTAVOS"
 */

const UNIDADES = [
  '',
  'UM',
  'DOIS',
  'TRÊS',
  'QUATRO',
  'CINCO',
  'SEIS',
  'SETE',
  'OITO',
  'NOVE'
];

const DEZ_A_DEZENOVE = [
  'DEZ',
  'ONZE',
  'DOZE',
  'TREZE',
  'QUATORZE',
  'QUINZE',
  'DEZESSEIS',
  'DEZESSETE',
  'DEZOITO',
  'DEZENOVE'
];

const DEZENAS = [
  '',
  '',
  'VINTE',
  'TRINTA',
  'QUARENTA',
  'CINQUENTA',
  'SESSENTA',
  'SETENTA',
  'OITENTA',
  'NOVENTA'
];

const CENTENAS = [
  '',
  'CEM',
  'DUZENTOS',
  'TREZENTOS',
  'QUATROCENTOS',
  'QUINHENTOS',
  'SEISCENTOS',
  'SETECENTOS',
  'OITOCENTOS',
  'NOVECENTOS'
];

function converterTresDigitos(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CEM';

  const c = Math.floor(n / 100);
  const d = Math.floor((n % 100) / 10);
  const u = n % 10;

  const partes: string[] = [];

  if (c > 0) {
    if (c === 1 && (d > 0 || u > 0)) {
      partes.push('CENTO');
    } else {
      partes.push(CENTENAS[c]);
    }
  }

  if (d === 1) {
    partes.push(DEZ_A_DEZENOVE[u]);
  } else {
    if (d > 1) {
      partes.push(DEZENAS[d]);
    }
    if (u > 0) {
      partes.push(UNIDADES[u]);
    }
  }

  return partes.join(' E ');
}

export function numeroParaExtenso(valor: number): string {
  if (isNaN(valor) || valor === null || valor === undefined) return 'ZERO REAL';
  
  const valorAbs = Math.abs(valor);
  const parteInteira = Math.floor(valorAbs);
  const parteCentavos = Math.round((valorAbs - parteInteira) * 100);

  const partesTexto: string[] = [];

  if (parteInteira > 0) {
    const bilhoes = Math.floor(parteInteira / 1000000000);
    const milhoes = Math.floor((parteInteira % 1000000000) / 1000000);
    const milhares = Math.floor((parteInteira % 1000000) / 1000);
    const unidades = parteInteira % 1000;

    if (bilhoes > 0) {
      const txt = converterTresDigitos(bilhoes);
      partesTexto.push(bilhoes === 1 ? `${txt} BILHÃO` : `${txt} BILHÕES`);
    }

    if (milhoes > 0) {
      const txt = converterTresDigitos(milhoes);
      partesTexto.push(milhoes === 1 ? `${txt} MILHÃO` : `${txt} MILHÕES`);
    }

    if (milhares > 0) {
      const txt = converterTresDigitos(milhares);
      partesTexto.push(milhares === 1 ? 'UM MIL' : `${txt} MIL`);
    }

    if (unidades > 0) {
      const txt = converterTresDigitos(unidades);
      partesTexto.push(txt);
    }

    const textoReais = partesTexto.join(' E ');
    const moeda = parteInteira === 1 ? 'REAL' : 'REAIS';
    partesTexto.length = 0;
    partesTexto.push(`${textoReais} ${moeda}`);
  }

  if (parteCentavos > 0) {
    const txtCentavos = converterTresDigitos(parteCentavos);
    const moedaCentavos = parteCentavos === 1 ? 'CENTAVO' : 'CENTAVOS';
    partesTexto.push(`${txtCentavos} ${moedaCentavos}`);
  }

  if (partesTexto.length === 0) {
    return 'ZERO REAL';
  }

  return partesTexto.join(' E ');
}

export function dataPorExtenso(dataIsoOuBr: string): {
  diaExtenso: string;
  mesExtenso: string;
  anoExtenso: string;
  dataCompletaExtenso: string;
  dataFormatada: string;
} {
  let dia = 1;
  let mes = 1;
  let ano = 2026;

  if (dataIsoOuBr.includes('-')) {
    const parts = dataIsoOuBr.split('T')[0].split('-');
    ano = parseInt(parts[0], 10);
    mes = parseInt(parts[1], 10);
    dia = parseInt(parts[2], 10);
  } else if (dataIsoOuBr.includes('/')) {
    const parts = dataIsoOuBr.split('/');
    dia = parseInt(parts[0], 10);
    mes = parseInt(parts[1], 10);
    ano = parseInt(parts[2], 10);
  }

  const meses = [
    '',
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro'
  ];

  const diasExtenso = [
    '',
    'primeiro',
    'dois',
    'três',
    'quatro',
    'cinco',
    'seis',
    'sete',
    'oito',
    'nove',
    'dez',
    'onze',
    'doze',
    'treze',
    'quatorze',
    'quinze',
    'dezesseis',
    'dezessete',
    'dezoito',
    'dezenove',
    'vinte',
    'vinte e um',
    'vinte e dois',
    'vinte e três',
    'vinte e quatro',
    'vinte e cinco',
    'vinte e seis',
    'vinte e sete',
    'vinte e oito',
    'vinte e nove',
    'trinta',
    'trinta e um'
  ];

  const anosExtenso: { [ano: number]: string } = {
    2020: 'dois mil e vinte',
    2021: 'dois mil e vinte e um',
    2022: 'dois mil e vinte e dois',
    2023: 'dois mil e vinte e três',
    2024: 'dois mil e vinte e quatro',
    2025: 'dois mil e vinte e cinco',
    2026: 'dois mil e vinte e seis',
    2027: 'dois mil e vinte e sete',
    2028: 'dois mil e vinte e oito',
    2029: 'dois mil e vinte e nove',
    2030: 'dois mil e trinta'
  };

  const diaExt = diasExtenso[dia] || converterTresDigitos(dia).toLowerCase();
  const mesExt = meses[mes] || 'janeiro';
  const anoExt = anosExtenso[ano] || `ano de ${ano}`;

  return {
    diaExtenso: diaExt,
    mesExtenso: mesExt,
    anoExtenso: anoExt,
    dataCompletaExtenso: `${dia} de ${mesExt} de ${ano}`,
    dataFormatada: `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`
  };
}

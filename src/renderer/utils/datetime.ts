/**
 * Utilitário de Data e Hora com fuso horário fixo em America/Sao_Paulo (Frontend)
 */

export const TIMEZONE_SP = 'America/Sao_Paulo';

/**
 * Retorna a data e hora atual no fuso America/Sao_Paulo no formato 'YYYY-MM-DD HH:mm:ss'
 */
export function getNowSaoPauloSql(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: TIMEZONE_SP,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };

  const formatter = new Intl.DateTimeFormat('en-CA', options);
  const parts = formatter.formatToParts(now);

  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');
  const second = getPart('second');

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * Retorna apenas a data atual em America/Sao_Paulo no formato 'YYYY-MM-DD'
 */
export function getTodaySaoPauloDate(): string {
  return getNowSaoPauloSql().split(' ')[0];
}

/**
 * Retorna a hora atual em America/Sao_Paulo no formato 'HH:mm:ss' ou 'HH:mm'
 */
export function getNowSaoPauloTime(showSeconds: boolean = true): string {
  const time = getNowSaoPauloSql().split(' ')[1];
  return showSeconds ? time : time.slice(0, 5);
}

/**
 * Formata qualquer data UTC/ISO para o formato visual brasileiro 'DD/MM/YYYY HH:mm'
 */
export function formatarDataHoraBR(dataStr?: string | Date | null): string {
  if (!dataStr) return '—';
  try {
    const d = typeof dataStr === 'string' ? new Date(dataStr.replace(' ', 'T')) : dataStr;
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: TIMEZONE_SP,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d);
  } catch (e) {
    return String(dataStr);
  }
}

/**
 * Formata apenas a data no padrão 'DD/MM/YYYY'
 */
export function formatarDataBR(dataStr?: string | Date | null): string {
  if (!dataStr) return '—';
  try {
    const d = typeof dataStr === 'string' ? new Date(dataStr.replace(' ', 'T')) : dataStr;
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: TIMEZONE_SP,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d);
  } catch (e) {
    return String(dataStr);
  }
}

/**
 * Formata valores numéricos para padrão monetário Real brasileiro (R$ 1.234,56)
 */
export function formatarMoedaBR(valor?: number | string | null): string {
  const num = Number(valor) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(num);
}

/**
 * Utilitário de Validação e Formatação de Documentos e Contatos Brasileiros
 * (CPF, CNPJ, Telefone, CEP) — 100% tolerante a valores nulos, indefinidos ou parciais.
 */

/**
 * Remove qualquer caractere não numérico
 */
export function limparMascara(valor?: string | number | null): string {
  if (valor === null || valor === undefined) return '';
  return String(valor).replace(/\D/g, '').trim();
}

/**
 * Valida se um CPF é matematicamente válido calculando seus dois dígitos verificadores
 */
export function validarCPF(cpfInput?: string | number | null): boolean {
  const cpf = limparMascara(cpfInput);
  if (cpf.length !== 11) return false;

  // Rejeita sequências de dígitos repetidos conhecidos (ex: 111.111.111-11, 000.000.000-00)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // Cálculo do 1º dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i), 10) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9), 10)) return false;

  // Cálculo do 2º dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i), 10) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10), 10)) return false;

  return true;
}

/**
 * Valida se um CNPJ é matematicamente válido calculando seus dois dígitos verificadores
 */
export function validarCNPJ(cnpjInput?: string | number | null): boolean {
  const cnpj = limparMascara(cnpjInput);
  if (cnpj.length !== 14) return false;

  // Rejeita sequências repetidas
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  // Cálculo do 1º dígito verificador
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0), 10)) return false;

  // Cálculo do 2º dígito verificador
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1), 10)) return false;

  return true;
}

/**
 * Valida CPF ou CNPJ conforme o tamanho
 */
export function validarCpfCnpj(doc?: string | number | null): boolean {
  const limpo = limparMascara(doc);
  if (limpo.length === 11) return validarCPF(limpo);
  if (limpo.length === 14) return validarCNPJ(limpo);
  return false;
}

/**
 * Aplica máscara formatada de CPF (000.000.000-00)
 */
export function formatarCpf(valor?: string | number | null): string {
  const v = limparMascara(valor);
  if (!v) return '';
  if (v.length === 11) {
    return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (v.length <= 3) return v;
  if (v.length <= 6) return v.replace(/(\d{3})(\d+)/, '$1.$2');
  if (v.length <= 9) return v.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
  return v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
}

/**
 * Aplica máscara de CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00) de forma resiliente
 */
export function formatarCpfCnpj(valor?: string | number | null): string {
  const v = limparMascara(valor);
  if (!v) return '';

  if (v.length <= 11) {
    if (v.length === 11) {
      return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return v
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    if (v.length === 14) {
      return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return v
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
}

/**
 * Formata telefone brasileiro com DDD (celular 9 dígitos ou fixo 8 dígitos)
 */
export function formatarTelefone(valor?: string | number | null): string {
  const v = limparMascara(valor);
  if (!v) return '';

  if (v.length === 11) {
    return v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (v.length === 10) {
    return v.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  if (v.length === 9) {
    return v.replace(/(\d{5})(\d{4})/, '$1-$2');
  }
  if (v.length === 8) {
    return v.replace(/(\d{4})(\d{4})/, '$1-$2');
  }
  if (v.length > 2 && v.length < 10) {
    return `(${v.substring(0, 2)}) ${v.substring(2)}`;
  }

  return v;
}

/**
 * Formata CEP (00000-000)
 */
export function formatarCep(valor?: string | number | null): string {
  const v = limparMascara(valor);
  if (!v) return '';
  if (v.length === 8) {
    return v.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  return v.replace(/^(\d{5})(\d{1,3})$/, '$1-$2');
}

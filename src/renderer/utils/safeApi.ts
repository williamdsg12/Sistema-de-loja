/**
 * Helper resiliente para chamadas a APIs expostas no window.api
 * Garante que falhas de rede, IPC ou funções ausentes nunca quebrem a interface do React.
 */
export async function safeApiCall<T>(
  fn: () => Promise<T>,
  fallback: T,
  contextMessage?: string
): Promise<T> {
  try {
    if (typeof fn !== 'function') {
      console.warn(`[safeApiCall] A função não está definida ou não é uma função válida: ${contextMessage || ''}`);
      return fallback;
    }
    const result = await fn();
    return result !== undefined && result !== null ? result : fallback;
  } catch (error) {
    console.error(`[safeApiCall] Erro ao executar ${contextMessage || 'chamada de API'}:`, error);
    return fallback;
  }
}

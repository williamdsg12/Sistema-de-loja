import { executarJobDiarioCrediario } from './crediarioService';

let schedulerTimer: NodeJS.Timeout | null = null;

export function iniciarAgendadorCrediario(intervaloHoras: number = 4) {
  console.log('[CrediarioScheduler] Inicializando agendador de cobrança e job diário...');

  // Executa imediatamente na inicialização
  try {
    const resultado = executarJobDiarioCrediario(1);
    console.log('[CrediarioScheduler] Job Diário executado na inicialização:', resultado);
  } catch (err) {
    console.error('[CrediarioScheduler] Erro ao executar job diário inicial:', err);
  }

  // Configura o intervalo contínuo
  const intervaloMs = intervaloHoras * 60 * 60 * 1000;
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
  }

  schedulerTimer = setInterval(() => {
    try {
      console.log('[CrediarioScheduler] Executando Job Diário periódico de Crediário...');
      const res = executarJobDiarioCrediario(1);
      console.log('[CrediarioScheduler] Resultado do Job periódico:', res);
    } catch (err) {
      console.error('[CrediarioScheduler] Falha na execução periódica:', err);
    }
  }, intervaloMs);
}

export function pararAgendadorCrediario() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log('[CrediarioScheduler] Agendador parado.');
  }
}

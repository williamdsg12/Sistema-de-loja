import { dbAll, dbGet, dbRun, dbTransaction } from '../db/database';
import { getNowSaoPauloSql, getTodaySaoPauloDate } from '../utils/datetime';
import { obterDadosLoja } from '../db/queries';
import { gerarNumeroCodigoBarrasParcela } from '../../shared/barcode128';
import type { DadosDocumentoCrediario, ParcelaDocumento } from '../../shared/documentosCrediarioGenerator';
import type {
  CrediarioConfig,
  CrediarioContrato,
  CrediarioParcela,
  CrediarioPagamento,
  CrediarioHistoricoCliente,
  SimulacaoCrediario
} from '../types';

// ==========================================
// 1. CONFIGURAÇÕES DO CREDIÁRIO
// ==========================================

export function getCrediarioConfig(lojaId: number = 1): CrediarioConfig {
  let config = dbGet<CrediarioConfig>('SELECT * FROM crediario_config WHERE loja_id = ?', [lojaId]);
  if (!config) {
    dbRun(
      `INSERT INTO crediario_config (
        loja_id, juros_mensal_percentual, multa_atraso_percentual,
        dias_carencia, max_parcelas, intervalo_dias_parcelas,
        dias_para_bloquear_cliente, exige_aprovacao_gerente_acima_do_limite,
        entrada_minima_percentual
      ) VALUES (?, 2.5, 2.0, 3, 12, 30, 15, 1, 0.0)`,
      [lojaId]
    );
    config = dbGet<CrediarioConfig>('SELECT * FROM crediario_config WHERE loja_id = ?', [lojaId]);
  }
  return config!;
}

export function salvarCrediarioConfig(dados: Partial<CrediarioConfig>, lojaId: number = 1): void {
  const atual = getCrediarioConfig(lojaId);
  const novo = { ...atual, ...dados };
  
  dbRun(
    `UPDATE crediario_config SET
      juros_mensal_percentual = ?,
      multa_atraso_percentual = ?,
      dias_carencia = ?,
      max_parcelas = ?,
      intervalo_dias_parcelas = ?,
      dias_para_bloquear_cliente = ?,
      exige_aprovacao_gerente_acima_do_limite = ?,
      entrada_minima_percentual = ?,
      regua_texto_lembrete = ?,
      regua_texto_atraso_1 = ?,
      regua_texto_atraso_2 = ?,
      regua_texto_atraso_3 = ?,
      atualizado_em = ?
    WHERE loja_id = ?`,
    [
      novo.juros_mensal_percentual ?? 2.5,
      novo.multa_atraso_percentual ?? 2.0,
      novo.dias_carencia ?? 3,
      novo.max_parcelas ?? 12,
      novo.intervalo_dias_parcelas ?? 30,
      novo.dias_para_bloquear_cliente ?? 15,
      novo.exige_aprovacao_gerente_acima_do_limite ?? 1,
      novo.entrada_minima_percentual ?? 0.0,
      novo.regua_texto_lembrete ?? null,
      novo.regua_texto_atraso_1 ?? null,
      novo.regua_texto_atraso_2 ?? null,
      novo.regua_texto_atraso_3 ?? null,
      getNowSaoPauloSql(),
      lojaId
    ]
  );
}

// ==========================================
// 2. CÁLCULO E SIMULAÇÃO DE PARCELAS (PRICE / LINEAR)
// ==========================================

export function somarMeses(dataBase: string, mesesParaAdicionar: number): string {
  const partes = dataBase.split('-');
  const ano = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1;
  const dia = parseInt(partes[2], 10);

  const dataAlvo = new Date(ano, mes + mesesParaAdicionar, dia);
  
  if (dataAlvo.getDate() !== dia) {
    dataAlvo.setDate(0);
  }

  const y = dataAlvo.getFullYear();
  const m = String(dataAlvo.getMonth() + 1).padStart(2, '0');
  const d = String(dataAlvo.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function simularCrediario(
  valorTotal: number,
  valorEntrada: number = 0,
  qtdParcelas: number = 1,
  taxaJurosMensal?: number,
  dataPrimeiraParcela?: string,
  lojaId: number = 1
): SimulacaoCrediario {
  const config = getCrediarioConfig(lojaId);
  const taxaJuros = taxaJurosMensal !== undefined ? taxaJurosMensal : config.juros_mensal_percentual;
  
  const valorFinanciado = Math.max(0, Math.round((valorTotal - valorEntrada) * 100) / 100);
  const n = Math.max(1, Math.min(qtdParcelas, config.max_parcelas || 24));
  
  const hoje = getTodaySaoPauloDate();
  const dataPrimeira = dataPrimeiraParcela || somarMeses(hoje, 1);

  let valorParcelaPadrao = 0;
  let totalComJuros = 0;
  let totalJuros = 0;

  if (valorFinanciado <= 0) {
    return {
      valorTotal,
      valorFinanciado: 0,
      valorEntrada,
      taxaJurosMensal: taxaJuros,
      qtdParcelas: n,
      valorParcela: 0,
      totalComJuros: valorEntrada,
      totalJuros: 0,
      parcelas: []
    };
  }

  if (taxaJuros > 0) {
    // Tabela Price: PMT = PV * [i * (1+i)^n] / [(1+i)^n - 1]
    const i = taxaJuros / 100;
    const fator = Math.pow(1 + i, n);
    const pmt = valorFinanciado * ((i * fator) / (fator - 1));
    valorParcelaPadrao = Math.round(pmt * 100) / 100;
    totalComJuros = Math.round(valorParcelaPadrao * n * 100) / 100;
    totalJuros = Math.max(0, Math.round((totalComJuros - valorFinanciado) * 100) / 100);
  } else {
    // Linear sem juros
    valorParcelaPadrao = Math.round((valorFinanciado / n) * 100) / 100;
    totalComJuros = valorFinanciado;
    totalJuros = 0;
  }

  const parcelas: { numero: number; dataVencimento: string; valor: number }[] = [];
  let somaPrimeiras = 0;

  for (let k = 1; k <= n; k++) {
    const dataVenc = somarMeses(dataPrimeira, k - 1);
    if (k < n) {
      parcelas.push({
        numero: k,
        dataVencimento: dataVenc,
        valor: valorParcelaPadrao
      });
      somaPrimeiras += valorParcelaPadrao;
    } else {
      const valorUltima = Math.round((totalComJuros - somaPrimeiras) * 100) / 100;
      parcelas.push({
        numero: k,
        dataVencimento: dataVenc,
        valor: valorUltima
      });
    }
  }

  return {
    valorTotal,
    valorFinanciado,
    valorEntrada,
    taxaJurosMensal: taxaJuros,
    qtdParcelas: n,
    valorParcela: valorParcelaPadrao,
    totalComJuros: Math.round((valorEntrada + totalComJuros) * 100) / 100,
    totalJuros,
    parcelas
  };
}

// ==========================================
// 3. MOTOR DE LIMITE DE CRÉDITO
// ==========================================

export interface RespostaLimiteCliente {
  permitido: boolean;
  limiteTotal: number;
  saldoDevedor: number;
  limiteDisponivel: number;
  statusCrediario: string;
  temParcelasAtrasadas: boolean;
  qtdAtrasadas: number;
  exigeAprovacaoGerente: boolean;
  mensagem?: string;
}

export function verificarLimiteCliente(
  clienteId: number,
  valorDesejado: number,
  lojaId: number = 1
): RespostaLimiteCliente {
  const cliente = dbGet<any>(
    'SELECT id, nome, limite_credito, status_crediario FROM clientes WHERE id = ?',
    [clienteId]
  );

  if (!cliente) {
    return {
      permitido: false,
      limiteTotal: 0,
      saldoDevedor: 0,
      limiteDisponivel: 0,
      statusCrediario: 'inexistente',
      temParcelasAtrasadas: false,
      qtdAtrasadas: 0,
      exigeAprovacaoGerente: false,
      mensagem: 'Cliente não encontrado no sistema.'
    };
  }

  const config = getCrediarioConfig(lojaId);
  const hoje = getTodaySaoPauloDate();

  // Dívida ativa: soma de saldo_restante de parcelas abertas, atrasadas ou parciais
  const rowDivida = dbGet<any>(
    `SELECT 
      COALESCE(SUM(p.saldo_restante), 0) as saldo_devedor,
      COUNT(CASE WHEN p.status = 'atrasada' OR (p.status IN ('aberta', 'parcial') AND p.data_vencimento < ?) THEN 1 END) as qtd_atrasadas,
      MIN(CASE WHEN p.status = 'atrasada' OR (p.status IN ('aberta', 'parcial') AND p.data_vencimento < ?) THEN p.data_vencimento END) as data_mais_antiga_atraso
    FROM crediario_parcelas p
    JOIN crediario_contratos c ON c.id = p.contrato_id
    WHERE c.cliente_id = ? AND p.loja_id = ? AND p.status IN ('aberta', 'parcial', 'atrasada')`,
    [hoje, hoje, clienteId, lojaId]
  );

  const limiteTotal = Number(cliente.limite_credito) || 0;
  const saldoDevedor = Math.round((Number(rowDivida?.saldo_devedor) || 0) * 100) / 100;
  const limiteDisponivel = Math.max(0, Math.round((limiteTotal - saldoDevedor) * 100) / 100);
  const qtdAtrasadas = Number(rowDivida?.qtd_atrasadas) || 0;
  const temParcelasAtrasadas = qtdAtrasadas > 0;
  const statusCrediario = cliente.status_crediario || 'ativo';

  if (statusCrediario === 'bloqueado') {
    return {
      permitido: false,
      limiteTotal,
      saldoDevedor,
      limiteDisponivel,
      statusCrediario,
      temParcelasAtrasadas,
      qtdAtrasadas,
      exigeAprovacaoGerente: config.exige_aprovacao_gerente_acima_do_limite === 1,
      mensagem: 'O crediário deste cliente está BLOQUEADO pela administração.'
    };
  }

  if (temParcelasAtrasadas && rowDivida?.data_mais_antiga_atraso) {
    const dataVencMaisAntiga = new Date(rowDivida.data_mais_antiga_atraso);
    const dataHoje = new Date(hoje);
    const diffDias = Math.floor((dataHoje.getTime() - dataVencMaisAntiga.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDias >= (config.dias_para_bloquear_cliente || 15)) {
      return {
        permitido: false,
        limiteTotal,
        saldoDevedor,
        limiteDisponivel,
        statusCrediario: 'bloqueado',
        temParcelasAtrasadas: true,
        qtdAtrasadas,
        exigeAprovacaoGerente: config.exige_aprovacao_gerente_acima_do_limite === 1,
        mensagem: `Cliente possui ${qtdAtrasadas} parcela(s) em atraso há mais de ${diffDias} dias (limite: ${config.dias_para_bloquear_cliente} dias).`
      };
    }
  }

  if (valorDesejado > limiteDisponivel) {
    const exigeAprovacao = config.exige_aprovacao_gerente_acima_do_limite === 1;
    return {
      permitido: false,
      limiteTotal,
      saldoDevedor,
      limiteDisponivel,
      statusCrediario,
      temParcelasAtrasadas,
      qtdAtrasadas,
      exigeAprovacaoGerente: exigeAprovacao,
      mensagem: `Valor desejado (R$ ${valorDesejado.toFixed(2)}) ultrapassa o limite disponível (R$ ${limiteDisponivel.toFixed(2)}).`
    };
  }

  return {
    permitido: true,
    limiteTotal,
    saldoDevedor,
    limiteDisponivel,
    statusCrediario,
    temParcelasAtrasadas,
    qtdAtrasadas,
    exigeAprovacaoGerente: false,
    mensagem: 'Limite de crédito aprovado para esta operação.'
  };
}

export interface SaldoCreditoDetalhes {
  limite: number;
  utilizado: number;
  disponivel: number;
  emAtraso: number;
  diasMaiorAtraso: number;
  bloqueado: boolean;
  saldoHaver: number;
  saldo: number;
}

export function getSaldoCreditoCompleto(clienteId: number, lojaId: number = 1): SaldoCreditoDetalhes {
  const cliente = dbGet<any>(
    'SELECT id, nome, limite_credito, status_crediario FROM clientes WHERE id = ?',
    [clienteId]
  );

  const limiteTotal = Number(cliente?.limite_credito) || 0;
  const statusCrediario = cliente?.status_crediario || 'ativo';
  const bloqueado = statusCrediario === 'bloqueado';

  const hoje = getTodaySaoPauloDate();
  const row = dbGet<any>(
    `SELECT 
      COALESCE(SUM(p.saldo_restante), 0) as utilizado,
      COALESCE(SUM(CASE WHEN p.status = 'atrasada' OR (p.status IN ('aberta', 'parcial') AND p.data_vencimento < ?) THEN p.saldo_restante ELSE 0 END), 0) as em_atraso,
      MIN(CASE WHEN p.status = 'atrasada' OR (p.status IN ('aberta', 'parcial') AND p.data_vencimento < ?) THEN p.data_vencimento END) as data_mais_antiga_atraso
    FROM crediario_parcelas p
    JOIN crediario_contratos c ON c.id = p.contrato_id
    WHERE c.cliente_id = ? AND p.loja_id = ? AND p.status IN ('aberta', 'parcial', 'atrasada') AND c.status = 'ativo'`,
    [hoje, hoje, clienteId, lojaId]
  );

  const utilizado = Math.round((Number(row?.utilizado) || 0) * 100) / 100;
  const disponivel = Math.max(0, Math.round((limiteTotal - utilizado) * 100) / 100);
  const emAtraso = Math.round((Number(row?.em_atraso) || 0) * 100) / 100;

  let diasMaiorAtraso = 0;
  if (row?.data_mais_antiga_atraso) {
    const dataVenc = new Date(row.data_mais_antiga_atraso);
    const dataHoje = new Date(hoje);
    diasMaiorAtraso = Math.max(0, Math.floor((dataHoje.getTime() - dataVenc.getTime()) / (1000 * 60 * 60 * 24)));
  }

  let saldoHaver = 0;
  try {
    const resHaver = dbGet<{ saldo: number }>(
      `SELECT COALESCE(SUM(CASE WHEN tipo = 'credito' THEN valor ELSE -valor END), 0) as saldo
       FROM creditos_cliente WHERE cliente_id = ?`,
      [clienteId]
    );
    saldoHaver = resHaver ? Math.max(0, Number(resHaver.saldo)) : 0;
  } catch (e) {}

  return {
    limite: limiteTotal,
    utilizado,
    disponivel,
    emAtraso,
    diasMaiorAtraso,
    bloqueado,
    saldoHaver,
    saldo: disponivel
  };
}

// ==========================================
// 4. CÁLCULO DE JUROS E MULTAS POR ATRASO
// ==========================================

export interface CalculoAtrasoParcela {
  diasAtraso: number;
  taxaMultaPercentual: number;
  multaValor: number;
  taxaJurosMensal: number;
  jurosValor: number;
  saldoOriginal: number;
  totalDevidoAtualizado: number;
}

export function calcularJurosMultaParcela(
  parcela: CrediarioParcela,
  dataCalculo?: string,
  config?: CrediarioConfig
): CalculoAtrasoParcela {
  const cfg = config || getCrediarioConfig(parcela.loja_id || 1);
  const hoje = dataCalculo || getTodaySaoPauloDate();

  const saldo = Number(parcela.saldo_restante) || 0;
  if (saldo <= 0 || !parcela.data_vencimento) {
    return {
      diasAtraso: 0,
      taxaMultaPercentual: 0,
      multaValor: 0,
      taxaJurosMensal: 0,
      jurosValor: 0,
      saldoOriginal: saldo,
      totalDevidoAtualizado: saldo
    };
  }

  const dtVenc = new Date(parcela.data_vencimento);
  const dtCalc = new Date(hoje);
  const diffTime = dtCalc.getTime() - dtVenc.getTime();
  const diasAtraso = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  if (diasAtraso <= (cfg.dias_carencia || 0)) {
    return {
      diasAtraso,
      taxaMultaPercentual: 0,
      multaValor: 0,
      taxaJurosMensal: 0,
      jurosValor: 0,
      saldoOriginal: saldo,
      totalDevidoAtualizado: saldo
    };
  }

  const taxaMulta = Number(cfg.multa_atraso_percentual) || 0;
  const multaValor = Math.round(saldo * (taxaMulta / 100) * 100) / 100;

  const taxaJurosMensal = Number(cfg.juros_mensal_percentual) || 0;
  const taxaDiaria = (taxaJurosMensal / 30) / 100;
  const jurosValor = Math.round(saldo * taxaDiaria * diasAtraso * 100) / 100;

  const totalDevidoAtualizado = Math.round((saldo + multaValor + jurosValor) * 100) / 100;

  return {
    diasAtraso,
    taxaMultaPercentual: taxaMulta,
    multaValor,
    taxaJurosMensal,
    jurosValor,
    saldoOriginal: saldo,
    totalDevidoAtualizado
  };
}

// ==========================================
// 5. ATUALIZAÇÃO DO HISTÓRICO E SCORE DO CLIENTE
// ==========================================

export function atualizarHistoricoCliente(clienteId: number, lojaId: number = 1): CrediarioHistoricoCliente {
  const hoje = getTodaySaoPauloDate();

  const statsContratos = dbGet<any>(
    `SELECT 
      COALESCE(SUM(valor_total), 0) as total_compras,
      COUNT(*) as qtd_contratos
    FROM crediario_contratos
    WHERE cliente_id = ? AND loja_id = ? AND status != 'cancelado'`,
    [clienteId, lojaId]
  );

  const statsPagamentos = dbGet<any>(
    `SELECT 
      COALESCE(SUM(p.valor), 0) as total_pago
    FROM crediario_pagamentos p
    JOIN crediario_parcelas par ON par.id = p.parcela_id
    JOIN crediario_contratos c ON c.id = par.contrato_id
    WHERE c.cliente_id = ? AND p.loja_id = ?`,
    [clienteId, lojaId]
  );

  const statsParcelas = dbGet<any>(
    `SELECT
      COUNT(CASE WHEN p.status IN ('aberta', 'parcial', 'atrasada') THEN 1 END) as qtd_em_aberto,
      COALESCE(SUM(CASE WHEN p.status IN ('aberta', 'parcial', 'atrasada') THEN p.saldo_restante ELSE 0 END), 0) as saldo_devedor_atual,
      COALESCE(SUM(CASE WHEN p.status = 'atrasada' OR (p.status IN ('aberta', 'parcial') AND p.data_vencimento < ?) THEN p.saldo_restante ELSE 0 END), 0) as total_em_atraso,
      COUNT(CASE WHEN p.status = 'atrasada' OR (p.status IN ('aberta', 'parcial') AND p.data_vencimento < ?) THEN 1 END) as qtd_atrasos,
      COUNT(CASE WHEN p.status = 'paga' THEN 1 END) as qtd_parcelas_pagas
    FROM crediario_parcelas p
    JOIN crediario_contratos c ON c.id = p.contrato_id
    WHERE c.cliente_id = ? AND p.loja_id = ?`,
    [hoje, hoje, clienteId, lojaId]
  );

  const totalComprado = Number(statsContratos?.total_compras) || 0;
  const totalPago = Number(statsPagamentos?.total_pago) || 0;
  const saldoDevedorAtual = Number(statsParcelas?.saldo_devedor_atual) || 0;
  const qtdContratos = Number(statsContratos?.qtd_contratos) || 0;
  const qtdParcelasPagas = Number(statsParcelas?.qtd_parcelas_pagas) || 0;
  const qtdAtrasos = Number(statsParcelas?.qtd_atrasos) || 0;

  // Score de 0 a 1000
  let score = 600;
  score += Math.min(300, qtdParcelasPagas * 30);
  score -= qtdAtrasos * 50;
  if (saldoDevedorAtual > 0 && qtdAtrasos > 0) score -= 150;
  score = Math.max(0, Math.min(1000, score));

  const agoraSql = getNowSaoPauloSql();

  const existe = dbGet<any>(
    'SELECT cliente_id FROM crediario_historico_cliente WHERE cliente_id = ? AND loja_id = ?',
    [clienteId, lojaId]
  );

  if (existe) {
    dbRun(
      `UPDATE crediario_historico_cliente SET
        total_comprado = ?,
        total_pago = ?,
        saldo_devedor_atual = ?,
        qtd_contratos = ?,
        qtd_parcelas_pagas = ?,
        qtd_atrasos = ?,
        score_calculado = ?,
        atualizado_em = ?
      WHERE cliente_id = ? AND loja_id = ?`,
      [
        totalComprado,
        totalPago,
        saldoDevedorAtual,
        qtdContratos,
        qtdParcelasPagas,
        qtdAtrasos,
        score,
        agoraSql,
        clienteId,
        lojaId
      ]
    );
  } else {
    dbRun(
      `INSERT INTO crediario_historico_cliente (
        cliente_id, loja_id, total_comprado, total_pago,
        saldo_devedor_atual, qtd_contratos, qtd_parcelas_pagas,
        qtd_atrasos, score_calculado, atualizado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clienteId,
        lojaId,
        totalComprado,
        totalPago,
        saldoDevedorAtual,
        qtdContratos,
        qtdParcelasPagas,
        qtdAtrasos,
        score,
        agoraSql
      ]
    );
  }

  return dbGet<CrediarioHistoricoCliente>(
    'SELECT * FROM crediario_historico_cliente WHERE cliente_id = ? AND loja_id = ?',
    [clienteId, lojaId]
  )!;
}

// ==========================================
// 6. CRIAÇÃO DE CONTRATO E PARCELAS
// ==========================================

export interface CriarContratoParams {
  clienteId: number;
  vendaId?: number;
  valorTotal: number;
  valorEntrada: number;
  qtdParcelas: number;
  dataPrimeiraParcela: string;
  taxaJurosMensal?: number;
  usuarioId: number;
  aprovadoPorUsuarioId?: number;
  motivoAprovacao?: string;
  lojaId?: number;
}

export function criarContratoCrediario(dados: CriarContratoParams): {
  contratoId: number;
  contrato: CrediarioContrato;
  parcelas: CrediarioParcela[];
} {
  const lojaId = dados.lojaId || 1;
  const valorFinanciado = Math.max(0, dados.valorTotal - dados.valorEntrada);

  const simulacao = simularCrediario(
    dados.valorTotal,
    dados.valorEntrada,
    dados.qtdParcelas,
    dados.taxaJurosMensal,
    dados.dataPrimeiraParcela,
    lojaId
  );

  return dbTransaction(() => {
    const agoraSql = getNowSaoPauloSql();

    // 1. Inserir Contrato
    const resContrato = dbRun(
      `INSERT INTO crediario_contratos (
        loja_id, cliente_id, venda_id,
        valor_total, valor_entrada, valor_financiado,
        taxa_juros_mensal, total_com_juros, qtd_parcelas,
        data_primeira_parcela, status,
        aprovado_por_usuario_id, motivo_aprovacao,
        criado_por, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo', ?, ?, ?, ?)`,
      [
        lojaId,
        dados.clienteId,
        dados.vendaId || null,
        dados.valorTotal,
        dados.valorEntrada,
        valorFinanciado,
        simulacao.taxaJurosMensal,
        simulacao.totalComJuros,
        dados.qtdParcelas,
        dados.dataPrimeiraParcela,
        dados.aprovadoPorUsuarioId || null,
        dados.motivoAprovacao || null,
        dados.usuarioId,
        agoraSql
      ]
    );

    const contratoId = resContrato.lastInsertRowid;

    // 2. Inserir Parcelas
    for (const p of simulacao.parcelas) {
      dbRun(
        `INSERT INTO crediario_parcelas (
          loja_id, contrato_id, numero,
          valor, valor_pago, saldo_restante,
          data_vencimento, status, criado_em
        ) VALUES (?, ?, ?, ?, 0.0, ?, ?, 'aberta', ?)`,
        [
          lojaId,
          contratoId,
          p.numero,
          p.valor,
          p.valor,
          p.dataVencimento,
          agoraSql
        ]
      );
    }

    // 3. Se houve aprovação de gerente
    if (dados.aprovadoPorUsuarioId) {
      dbRun(
        `INSERT INTO auditoria_crediario (
          loja_id, usuario_id, acao, entidade_tipo, entidade_id,
          detalhes_json, justificativa, criado_em
        ) VALUES (?, ?, 'aprovacao_limite', 'crediario_contratos', ?, ?, ?, ?)`,
        [
          lojaId,
          dados.aprovadoPorUsuarioId,
          contratoId,
          JSON.stringify({
            valorTotal: dados.valorTotal,
            limiteExcedido: true
          }),
          dados.motivoAprovacao || 'Aprovação manual de limite',
          agoraSql
        ]
      );
    }

    // 4. Atualizar Histórico do Cliente
    atualizarHistoricoCliente(dados.clienteId, lojaId);

    const contrato = dbGet<CrediarioContrato>(
      'SELECT * FROM crediario_contratos WHERE id = ?',
      [contratoId]
    )!;

    const parcelas = dbAll<CrediarioParcela>(
      'SELECT * FROM crediario_parcelas WHERE contrato_id = ? ORDER BY numero ASC',
      [contratoId]
    );

    return { contratoId, contrato, parcelas };
  });
}

// ==========================================
// 7. BAIXA TOTAL OU PARCIAL DE PARCELAS
// ==========================================

export interface BaixarParcelaParams {
  parcelaId: number;
  valorPago: number;
  formaPagamento: 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'transferencia' | 'credito_cliente' | string;
  dataPagamento?: string;
  caixaSessaoId?: number;
  usuarioId: number;
  jurosCobrado?: number;
  multaCobrada?: number;
  desconto?: number;
  observacao?: string;
  lojaId?: number;
}

export function baixarParcelaCrediario(dados: BaixarParcelaParams): {
  pagamentoId: number;
  parcelaAtualizada: CrediarioParcela;
  contratoQuitado: boolean;
} {
  const lojaId = dados.lojaId || 1;
  const agoraSql = getNowSaoPauloSql();
  const dataPagamento = dados.dataPagamento || agoraSql;

  return dbTransaction(() => {
    const parcela = dbGet<CrediarioParcela>(
      'SELECT * FROM crediario_parcelas WHERE id = ? AND loja_id = ?',
      [dados.parcelaId, lojaId]
    );

    if (!parcela) {
      throw new Error('Parcela não encontrada no sistema.');
    }

    if (parcela.status === 'paga' || parcela.status === 'cancelada') {
      throw new Error(`Esta parcela já está com status: ${parcela.status.toUpperCase()}`);
    }

    const valorPago = Number(dados.valorPago) || 0;
    const desconto = Number(dados.desconto) || 0;
    const jurosCobrado = Number(dados.jurosCobrado) || 0;
    const multaCobrada = Number(dados.multaCobrada) || 0;

    const valorAmortizacao = Math.max(0, (valorPago + desconto) - (jurosCobrado + multaCobrada));
    const novoSaldo = Math.max(0, Math.round((parcela.saldo_restante - valorAmortizacao) * 100) / 100);
    const novoValorPagoAcumulado = Math.round((parcela.valor_pago + valorPago) * 100) / 100;
    
    const novoStatus = novoSaldo <= 0.01 ? 'paga' : 'parcial';

    // 1. Atualizar a parcela
    dbRun(
      `UPDATE crediario_parcelas SET
        valor_pago = ?,
        saldo_restante = ?,
        status = ?,
        data_pagamento = ?
      WHERE id = ?`,
      [
        novoValorPagoAcumulado,
        novoSaldo,
        novoStatus,
        dataPagamento,
        dados.parcelaId
      ]
    );

    // 2. Registrar o pagamento
    const resPag = dbRun(
      `INSERT INTO crediario_pagamentos (
        loja_id, parcela_id, caixa_sessao_id,
        valor, forma_pagamento, data, recebido_por,
        juros_cobrado, multa_cobrada, desconto,
        observacao, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lojaId,
        dados.parcelaId,
        dados.caixaSessaoId || null,
        valorPago,
        dados.formaPagamento,
        dataPagamento,
        dados.usuarioId,
        jurosCobrado,
        multaCobrada,
        desconto,
        dados.observacao || null,
        agoraSql
      ]
    );

    const pagamentoId = resPag.lastInsertRowid;

    // 3. Auditoria se houve desconto
    if (desconto > 0) {
      dbRun(
        `INSERT INTO auditoria_crediario (
          loja_id, usuario_id, acao, entidade_tipo, entidade_id,
          detalhes_json, justificativa, criado_em
        ) VALUES (?, ?, 'desconto_pagamento', 'crediario_pagamentos', ?, ?, ?, ?)`,
        [
          lojaId,
          dados.usuarioId,
          pagamentoId,
          JSON.stringify({
            parcelaId: dados.parcelaId,
            descontoConcedido: desconto,
            valorPago
          }),
          dados.observacao || 'Desconto concedido no pagamento',
          agoraSql
        ]
      );
    }

    // 4. Verificar quitação do contrato
    const parcelasRestantes = dbGet<any>(
      `SELECT COUNT(*) as abertas FROM crediario_parcelas WHERE contrato_id = ? AND status != 'paga' AND status != 'cancelada'`,
      [parcela.contrato_id]
    );

    let contratoQuitado = false;
    if (Number(parcelasRestantes?.abertas) === 0) {
      contratoQuitado = true;
      dbRun(
        `UPDATE crediario_contratos SET status = 'quitado' WHERE id = ?`,
        [parcela.contrato_id]
      );
    }

    // 5. Atualizar histórico do cliente
    const contrato = dbGet<CrediarioContrato>('SELECT cliente_id FROM crediario_contratos WHERE id = ?', [parcela.contrato_id]);
    if (contrato) {
      atualizarHistoricoCliente(contrato.cliente_id, lojaId);
    }

    const parcelaAtualizada = dbGet<CrediarioParcela>(
      'SELECT * FROM crediario_parcelas WHERE id = ?',
      [dados.parcelaId]
    )!;

    return {
      pagamentoId,
      parcelaAtualizada,
      contratoQuitado
    };
  });
}

// ==========================================
// 8. ESTORNO DE PAGAMENTO
// ==========================================

export function estornarPagamentoCrediario(
  pagamentoId: number,
  usuarioId: number,
  justificativa: string,
  lojaId: number = 1
): void {
  const agoraSql = getNowSaoPauloSql();

  dbTransaction(() => {
    const pag = dbGet<CrediarioPagamento>(
      'SELECT * FROM crediario_pagamentos WHERE id = ? AND loja_id = ?',
      [pagamentoId, lojaId]
    );

    if (!pag) {
      throw new Error('Pagamento não encontrado.');
    }

    if (pag.parcela_id) {
      const parcela = dbGet<CrediarioParcela>(
        'SELECT * FROM crediario_parcelas WHERE id = ?',
        [pag.parcela_id]
      );

      if (parcela) {
        const valorAmortizado = Math.max(0, (pag.valor + (pag.desconto || 0)) - ((pag.juros_cobrado || 0) + (pag.multa_cobrada || 0)));
        const saldoRestaurado = Math.round((parcela.saldo_restante + valorAmortizado) * 100) / 100;
        const valorPagoRestaurado = Math.max(0, Math.round((parcela.valor_pago - pag.valor) * 100) / 100);
        
        const hoje = getTodaySaoPauloDate();
        let novoStatus = 'aberta';
        if (parcela.data_vencimento < hoje) {
          novoStatus = 'atrasada';
        } else if (valorPagoRestaurado > 0) {
          novoStatus = 'parcial';
        }

        dbRun(
          `UPDATE crediario_parcelas SET
            valor_pago = ?,
            saldo_restante = ?,
            status = ?,
            data_pagamento = NULL
          WHERE id = ?`,
          [valorPagoRestaurado, saldoRestaurado, novoStatus, parcela.id]
        );

        dbRun(
          `UPDATE crediario_contratos SET status = 'ativo' WHERE id = ?`,
          [parcela.contrato_id]
        );

        const contrato = dbGet<CrediarioContrato>('SELECT cliente_id FROM crediario_contratos WHERE id = ?', [parcela.contrato_id]);
        if (contrato) {
          atualizarHistoricoCliente(contrato.cliente_id, lojaId);
        }
      }
    }

    // Auditoria
    dbRun(
      `INSERT INTO auditoria_crediario (
        loja_id, usuario_id, acao, entidade_tipo, entidade_id,
        detalhes_json, justificativa, criado_em
      ) VALUES (?, ?, 'estorno_pagamento', 'crediario_pagamentos', ?, ?, ?, ?)`,
      [
        lojaId,
        usuarioId,
        pagamentoId,
        JSON.stringify(pag),
        justificativa,
        agoraSql
      ]
    );

    // Deleta o registro de pagamento
    dbRun('DELETE FROM crediario_pagamentos WHERE id = ?', [pagamentoId]);
  });
}

// ==========================================
// 9. RENEGOCIAÇÃO DE DÍVIDAS / CONTRATO
// ==========================================

export interface RenegociarContratoParams {
  contratoOrigemId: number;
  parcelasIds: number[];
  novoValorEntrada: number;
  novaQtdParcelas: number;
  novaDataPrimeiraParcela: string;
  novaTaxaJuros?: number;
  usuarioId: number;
  justificativa: string;
  lojaId?: number;
}

export function renegociarContratoCrediario(dados: RenegociarContratoParams): { novoContratoId: number } {
  const lojaId = dados.lojaId || 1;
  const agoraSql = getNowSaoPauloSql();

  return dbTransaction(() => {
    const contratoOrigem = dbGet<CrediarioContrato>(
      'SELECT * FROM crediario_contratos WHERE id = ? AND loja_id = ?',
      [dados.contratoOrigemId, lojaId]
    );

    if (!contratoOrigem) {
      throw new Error('Contrato de origem não encontrado.');
    }

    if (dados.parcelasIds.length === 0) {
      throw new Error('Selecione ao menos uma parcela para renegociação.');
    }

    let totalDividaRenegociar = 0;
    const config = getCrediarioConfig(lojaId);

    for (const pId of dados.parcelasIds) {
      const parcela = dbGet<CrediarioParcela>('SELECT * FROM crediario_parcelas WHERE id = ?', [pId]);
      if (parcela && (parcela.status === 'aberta' || parcela.status === 'parcial' || parcela.status === 'atrasada')) {
        const calculo = calcularJurosMultaParcela(parcela, undefined, config);
        totalDividaRenegociar += calculo.totalDevidoAtualizado;

        dbRun(
          `UPDATE crediario_parcelas SET status = 'cancelada' WHERE id = ?`,
          [pId]
        );
      }
    }

    totalDividaRenegociar = Math.round(totalDividaRenegociar * 100) / 100;

    const parcelasAbertasRestantes = dbGet<any>(
      `SELECT COUNT(*) as count FROM crediario_parcelas WHERE contrato_id = ? AND status IN ('aberta', 'parcial', 'atrasada')`,
      [dados.contratoOrigemId]
    );

    if (Number(parcelasAbertasRestantes?.count) === 0) {
      dbRun(
        `UPDATE crediario_contratos SET status = 'renegociado' WHERE id = ?`,
        [dados.contratoOrigemId]
      );
    }

    const resultadoNovoContrato = criarContratoCrediario({
      clienteId: contratoOrigem.cliente_id,
      valorTotal: totalDividaRenegociar,
      valorEntrada: dados.novoValorEntrada,
      qtdParcelas: dados.novaQtdParcelas,
      dataPrimeiraParcela: dados.novaDataPrimeiraParcela,
      taxaJurosMensal: dados.novaTaxaJuros,
      usuarioId: dados.usuarioId,
      lojaId
    });

    const novoContratoId = resultadoNovoContrato.contratoId;

    dbRun(
      `UPDATE crediario_contratos SET contrato_origem_renegociacao_id = ? WHERE id = ?`,
      [dados.contratoOrigemId, novoContratoId]
    );

    dbRun(
      `INSERT INTO auditoria_crediario (
        loja_id, usuario_id, acao, entidade_tipo, entidade_id,
        detalhes_json, justificativa, criado_em
      ) VALUES (?, ?, 'renegociacao_divida', 'crediario_contratos', ?, ?, ?, ?)`,
      [
        lojaId,
        dados.usuarioId,
        novoContratoId,
        JSON.stringify({
          contratoOrigemId: dados.contratoOrigemId,
          parcelasIds: dados.parcelasIds,
          totalDividaRenegociada: totalDividaRenegociar,
          novoValorEntrada: dados.novoValorEntrada,
          novaQtdParcelas: dados.novaQtdParcelas
        }),
        dados.justificativa,
        agoraSql
      ]
    );

    return { novoContratoId };
  });
}

// ==========================================
// 10. CONSULTAS E LISTAGENS DE CONTRATOS E PARCELAS
// ==========================================

export function listarContratosCrediario(filtros?: {
  clienteId?: number;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
  lojaId?: number;
}): CrediarioContrato[] {
  const lojaId = filtros?.lojaId || 1;
  let sql = `
    SELECT 
      c.*,
      cli.nome as cliente_nome,
      cli.cpf_cnpj as cliente_cpf,
      cli.telefone as cliente_telefone,
      u.nome as criado_por_nome,
      ap.nome as aprovado_por_nome
    FROM crediario_contratos c
    LEFT JOIN clientes cli ON cli.id = c.cliente_id
    LEFT JOIN usuarios u ON u.id = c.criado_por
    LEFT JOIN usuarios ap ON ap.id = c.aprovado_por_usuario_id
    WHERE c.loja_id = ?
  `;
  const params: any[] = [lojaId];

  if (filtros?.clienteId) {
    sql += ' AND c.cliente_id = ?';
    params.push(filtros.clienteId);
  }

  if (filtros?.status && filtros.status !== 'todos') {
    sql += ' AND c.status = ?';
    params.push(filtros.status);
  }

  if (filtros?.dataInicio) {
    sql += ' AND c.criado_em >= ?';
    params.push(filtros.dataInicio);
  }

  if (filtros?.dataFim) {
    sql += ' AND c.criado_em <= ?';
    params.push(filtros.dataFim);
  }

  sql += ' ORDER BY c.id DESC';
  return dbAll<CrediarioContrato>(sql, params);
}

export function getContratoDetalhes(contratoId: number, lojaId: number = 1): {
  contrato: CrediarioContrato;
  parcelas: CrediarioParcela[];
  pagamentos: CrediarioPagamento[];
} {
  const contrato = dbGet<CrediarioContrato>(
    `SELECT 
      c.*,
      cli.nome as cliente_nome,
      cli.cpf_cnpj as cliente_cpf,
      cli.telefone as cliente_telefone
    FROM crediario_contratos c
    LEFT JOIN clientes cli ON cli.id = c.cliente_id
    WHERE c.id = ? AND c.loja_id = ?`,
    [contratoId, lojaId]
  );

  if (!contrato) {
    throw new Error('Contrato não encontrado.');
  }

  const parcelas = dbAll<CrediarioParcela>(
    'SELECT * FROM crediario_parcelas WHERE contrato_id = ? ORDER BY numero ASC',
    [contratoId]
  );

  const pagamentos = dbAll<CrediarioPagamento>(
    `SELECT 
      p.*,
      u.nome as recebido_por_nome
    FROM crediario_pagamentos p
    JOIN crediario_parcelas par ON par.id = p.parcela_id
    LEFT JOIN usuarios u ON u.id = p.recebido_por
    WHERE par.contrato_id = ?
    ORDER BY p.id DESC`,
    [contratoId]
  );

  return { contrato, parcelas, pagamentos };
}

export function listarParcelasCrediario(filtros?: {
  status?: string;
  clienteId?: number;
  contratoId?: number;
  dataInicio?: string;
  dataFim?: string;
  apenasVencidas?: boolean;
  lojaId?: number;
}): CrediarioParcela[] {
  const lojaId = filtros?.lojaId || 1;
  const hoje = getTodaySaoPauloDate();

  let sql = `
    SELECT 
      p.*,
      c.cliente_id,
      c.venda_id,
      cli.nome as cliente_nome,
      cli.cpf_cnpj as cliente_cpf,
      cli.telefone as cliente_telefone
    FROM crediario_parcelas p
    JOIN crediario_contratos c ON c.id = p.contrato_id
    JOIN clientes cli ON cli.id = c.cliente_id
    WHERE p.loja_id = ?
  `;
  const params: any[] = [lojaId];

  if (filtros?.clienteId) {
    sql += ' AND c.cliente_id = ?';
    params.push(filtros.clienteId);
  }

  if (filtros?.contratoId) {
    sql += ' AND p.contrato_id = ?';
    params.push(filtros.contratoId);
  }

  if (filtros?.status && filtros.status !== 'todos') {
    sql += ' AND p.status = ?';
    params.push(filtros.status);
  }

  if (filtros?.apenasVencidas) {
    sql += ` AND (p.status = 'atrasada' OR (p.status IN ('aberta', 'parcial') AND p.data_vencimento < ?))`;
    params.push(hoje);
  }

  if (filtros?.dataInicio) {
    sql += ' AND p.data_vencimento >= ?';
    params.push(filtros.dataInicio);
  }

  if (filtros?.dataFim) {
    sql += ' AND p.data_vencimento <= ?';
    params.push(filtros.dataFim);
  }

  sql += ' ORDER BY p.data_vencimento ASC, p.numero ASC';

  const rows = dbAll<any>(sql, params);
  const config = getCrediarioConfig(lojaId);

  return rows.map((row) => {
    if (row.status === 'aberta' || row.status === 'parcial' || row.status === 'atrasada') {
      const calc = calcularJurosMultaParcela(row, hoje, config);
      return {
        ...row,
        dias_atraso: calc.diasAtraso,
        multa_estimada: calc.multaValor,
        juros_estimado: calc.jurosValor,
        total_devido: calc.totalDevidoAtualizado
      };
    }
    return {
      ...row,
      dias_atraso: 0,
      multa_estimada: 0,
      juros_estimado: 0,
      total_devido: row.saldo_restante
    };
  });
}

// ==========================================
// 11. RÉGUA DE COBRANÇA, WHATSAPP & ANTI-DUPLICAÇÃO
// ==========================================

export function limparTelefone(tel?: string): string {
  if (!tel) return '';
  const apenasDigitos = tel.replace(/\D/g, '');
  if (apenasDigitos.length === 10 || apenasDigitos.length === 11) {
    return `55${apenasDigitos}`;
  }
  return apenasDigitos;
}

export function formatarTextoCobranca(
  templateOriginal: string,
  variaveis: {
    nome: string;
    valor: number;
    vencimento: string;
    numero: number;
    loja: string;
    pix: string;
    diasAtraso: number;
  }
): string {
  const valorFormatado = variaveis.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const vencFormatado = variaveis.vencimento.includes('-')
    ? variaveis.vencimento.split('-').reverse().join('/')
    : variaveis.vencimento;

  return templateOriginal
    .replace(/\{nome\}/g, variaveis.nome)
    .replace(/\{valor\}/g, valorFormatado)
    .replace(/\{vencimento\}/g, vencFormatado)
    .replace(/\{numero\}/g, String(variaveis.numero))
    .replace(/\{loja\}/g, variaveis.loja)
    .replace(/\{pix\}/g, variaveis.pix)
    .replace(/\{dias_atraso\}/g, String(variaveis.diasAtraso));
}

export function getTemplatePadraoCobranca(
  tipo: 'lembrete' | 'atraso_1' | 'atraso_2' | 'atraso_3',
  config: CrediarioConfig
): string {
  switch (tipo) {
    case 'lembrete':
      return (
        config.regua_texto_lembrete ||
        'Olá, {nome}! Lembramos que sua parcela #{numero} no valor de {valor} na {loja} vence em {vencimento}. Chave PIX para pagamento: {pix}'
      );
    case 'atraso_1':
      return (
        config.regua_texto_atraso_1 ||
        'Olá, {nome}! Constatamos que sua parcela #{numero} ({valor}) na {loja} venceu em {vencimento}. Evite juros e regularize via PIX: {pix}'
      );
    case 'atraso_2':
      return (
        config.regua_texto_atraso_2 ||
        '{nome}, sua parcela #{numero} na {loja} no valor de {valor} está com {dias_atraso} dias de atraso. Favor entrar em contato para combinarmos a regularização.'
      );
    case 'atraso_3':
      return (
        config.regua_texto_atraso_3 ||
        'AVISO DE BLOQUEIO: {nome}, seu crediário na {loja} possui parcela com {dias_atraso} dias de atraso ({valor}). Evite o bloqueio de novas compras regularizando sua pendência.'
      );
  }
}

export function gerarLinkWhatsAppCobranca(
  parcelaId: number,
  tipoMensagem: 'lembrete' | 'atraso_1' | 'atraso_2' | 'atraso_3',
  lojaId: number = 1
): {
  telefone: string;
  mensagem: string;
  linkWhatsApp: string;
  clienteNome: string;
} {
  const config = getCrediarioConfig(lojaId);
  const loja = dbGet<any>('SELECT nome_fantasia, telefone, whatsapp, cnpj_cpf FROM lojas WHERE id = ?', [lojaId]);
  const chavePix = loja?.whatsapp || loja?.telefone || loja?.cnpj_cpf || 'Consulte nosso WhatsApp';
  const nomeLoja = loja?.nome_fantasia || 'WS Gestão PDV';

  const row = dbGet<any>(
    `SELECT 
      p.*,
      c.cliente_id,
      cli.nome as cliente_nome,
      cli.telefone as cliente_telefone,
      cli.telefone_whatsapp as cliente_whatsapp
    FROM crediario_parcelas p
    JOIN crediario_contratos c ON c.id = p.contrato_id
    JOIN clientes cli ON cli.id = c.cliente_id
    WHERE p.id = ? AND p.loja_id = ?`,
    [parcelaId, lojaId]
  );

  if (!row) {
    throw new Error('Parcela não encontrada.');
  }

  const hoje = getTodaySaoPauloDate();
  const dtVenc = new Date(row.data_vencimento);
  const dtHoje = new Date(hoje);
  const diasAtraso = Math.max(0, Math.floor((dtHoje.getTime() - dtVenc.getTime()) / (1000 * 60 * 60 * 24)));

  const template = getTemplatePadraoCobranca(tipoMensagem, config);
  const mensagem = formatarTextoCobranca(template, {
    nome: row.cliente_nome,
    valor: row.saldo_restante,
    vencimento: row.data_vencimento,
    numero: row.numero,
    loja: nomeLoja,
    pix: chavePix,
    diasAtraso
  });

  const rawTel = row.cliente_whatsapp || row.cliente_telefone || '';
  const telefoneSanitizado = limparTelefone(rawTel);
  const linkWhatsApp = telefoneSanitizado
    ? `https://wa.me/${telefoneSanitizado}?text=${encodeURIComponent(mensagem)}`
    : '';

  return {
    telefone: rawTel,
    mensagem,
    linkWhatsApp,
    clienteNome: row.cliente_nome
  };
}

export function registrarEnvioCobrancaLog(dados: {
  lojaId?: number;
  parcelaId: number;
  clienteId: number;
  tipoMensagem: 'lembrete' | 'atraso_1' | 'atraso_2' | 'atraso_3';
  canal?: 'whatsapp' | 'sms' | 'email';
  telefoneOuEmail?: string;
  mensagem: string;
  statusEnvio?: 'pendente' | 'enviado' | 'falha';
}): number {
  const lojaId = dados.lojaId || 1;
  const agoraSql = getNowSaoPauloSql();

  const res = dbRun(
    `INSERT INTO crediario_cobrancas_log (
      loja_id, parcela_id, cliente_id, tipo_mensagem, canal,
      telefone_ou_email, mensagem_enviada, enviada_em, status_envio
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      lojaId,
      dados.parcelaId,
      dados.clienteId,
      dados.tipoMensagem,
      dados.canal || 'whatsapp',
      dados.telefoneOuEmail || null,
      dados.mensagem,
      agoraSql,
      dados.statusEnvio || 'enviado'
    ]
  );

  return res.lastInsertRowid;
}

export function listarLogsCobranca(filtros?: {
  clienteId?: number;
  parcelaId?: number;
  tipoMensagem?: string;
  limite?: number;
  lojaId?: number;
}): any[] {
  const lojaId = filtros?.lojaId || 1;
  let sql = `
    SELECT 
      l.*,
      cli.nome as cliente_nome,
      par.numero as numero_parcela,
      par.valor as valor_parcela,
      par.data_vencimento
    FROM crediario_cobrancas_log l
    LEFT JOIN clientes cli ON cli.id = l.cliente_id
    LEFT JOIN crediario_parcelas par ON par.id = l.parcela_id
    WHERE l.loja_id = ?
  `;
  const params: any[] = [lojaId];

  if (filtros?.clienteId) {
    sql += ' AND l.cliente_id = ?';
    params.push(filtros.clienteId);
  }

  if (filtros?.parcelaId) {
    sql += ' AND l.parcela_id = ?';
    params.push(filtros.parcelaId);
  }

  if (filtros?.tipoMensagem) {
    sql += ' AND l.tipo_mensagem = ?';
    params.push(filtros.tipoMensagem);
  }

  sql += ' ORDER BY l.id DESC LIMIT ?';
  params.push(filtros?.limite || 100);

  return dbAll<any>(sql, params);
}

// ==========================================
// 12. JOB DIÁRIO AUTOMATIZADO E RÉGUA
// ==========================================

export function executarJobDiarioCrediario(lojaId: number = 1): {
  parcelasAtrasadasMarcadas: number;
  clientesBloqueados: number;
  mensagensEnviadas: number;
  logsRégua: {
    lembretes: number;
    atraso1: number;
    atraso2: number;
    atraso3: number;
  };
} {
  const hoje = getTodaySaoPauloDate();
  const config = getCrediarioConfig(lojaId);
  const loja = dbGet<any>('SELECT nome_fantasia, telefone, whatsapp, cnpj_cpf FROM lojas WHERE id = ?', [lojaId]);
  const chavePix = loja?.whatsapp || loja?.telefone || loja?.cnpj_cpf || 'Consulte nosso WhatsApp';
  const nomeLoja = loja?.nome_fantasia || 'WS Gestão PDV';

  return dbTransaction(() => {
    // 1. Marca parcelas vencidas como 'atrasada'
    const resAtrasadas = dbRun(
      `UPDATE crediario_parcelas
       SET status = 'atrasada'
       WHERE loja_id = ?
         AND status IN ('aberta', 'parcial')
         AND data_vencimento < ?`,
      [lojaId, hoje]
    );

    // 2. Bloqueio automático de inadimplentes
    let clientesBloqueados = 0;
    const diasBloqueio = config.dias_para_bloquear_cliente || 15;
    const dtLim = new Date();
    dtLim.setDate(dtLim.getDate() - diasBloqueio);
    const dataCorteStr = dtLim.toISOString().split('T')[0];

    const clientesParaBloquear = dbAll<any>(
      `SELECT DISTINCT c.cliente_id 
       FROM crediario_parcelas p
       JOIN crediario_contratos c ON c.id = p.contrato_id
       WHERE p.loja_id = ?
         AND p.status IN ('aberta', 'parcial', 'atrasada')
         AND p.data_vencimento <= ?`,
      [lojaId, dataCorteStr]
    );

    for (const cli of clientesParaBloquear) {
      dbRun(
        `UPDATE clientes SET status_crediario = 'bloqueado' WHERE id = ? AND status_crediario != 'bloqueado'`,
        [cli.cliente_id]
      );
      clientesBloqueados++;
    }

    // 3. Processamento da Régua de Cobrança com Anti-duplicação
    const logsRégua = {
      lembretes: 0,
      atraso1: 0,
      atraso2: 0,
      atraso3: 0
    };

    const todasParcelas = dbAll<any>(
      `SELECT 
        p.*,
        c.cliente_id,
        cli.nome as cliente_nome,
        cli.telefone as cliente_telefone,
        cli.telefone_whatsapp as cliente_whatsapp
      FROM crediario_parcelas p
      JOIN crediario_contratos c ON c.id = p.contrato_id
      JOIN clientes cli ON cli.id = c.cliente_id
      WHERE p.loja_id = ? AND p.status IN ('aberta', 'parcial', 'atrasada')`,
      [lojaId]
    );

    const hojeTime = new Date(hoje).getTime();
    const diasAvisoLembrete = config.dias_carencia || 3;

    for (const p of todasParcelas) {
      const vencTime = new Date(p.data_vencimento).getTime();
      const diffDias = Math.floor((hojeTime - vencTime) / (1000 * 60 * 60 * 24)); // > 0 = atrasado, < 0 = a vencer

      let tipoElegivel: 'lembrete' | 'atraso_1' | 'atraso_2' | 'atraso_3' | null = null;

      if (diffDias === -diasAvisoLembrete || (diffDias < 0 && diffDias >= -3)) {
        tipoElegivel = 'lembrete';
      } else if (diffDias >= 1 && diffDias <= 5) {
        tipoElegivel = 'atraso_1';
      } else if (diffDias >= 7 && diffDias <= 10) {
        tipoElegivel = 'atraso_2';
      } else if (diffDias >= 15) {
        tipoElegivel = 'atraso_3';
      }

      if (tipoElegivel) {
        // Checagem de Anti-duplicação nos últimos 3 dias
        const dtCorteAntiDup = new Date();
        dtCorteAntiDup.setDate(dtCorteAntiDup.getDate() - 3);
        const dtCorteAntiDupStr = dtCorteAntiDup.toISOString().split('T')[0];

        const logRecente = dbGet<any>(
          `SELECT id FROM crediario_cobrancas_log 
           WHERE parcela_id = ? AND tipo_mensagem = ? AND enviada_em >= ?`,
          [p.id, tipoElegivel, dtCorteAntiDupStr]
        );

        if (!logRecente) {
          const template = getTemplatePadraoCobranca(tipoElegivel, config);
          const mensagem = formatarTextoCobranca(template, {
            nome: p.cliente_nome,
            valor: p.saldo_restante,
            vencimento: p.data_vencimento,
            numero: p.numero,
            loja: nomeLoja,
            pix: chavePix,
            diasAtraso: Math.max(0, diffDias)
          });

          const tel = p.cliente_whatsapp || p.cliente_telefone || '';
          registrarEnvioCobrancaLog({
            lojaId,
            parcelaId: p.id,
            clienteId: p.cliente_id,
            tipoMensagem: tipoElegivel,
            canal: 'whatsapp',
            telefoneOuEmail: tel,
            mensagem,
            statusEnvio: 'enviado'
          });

          if (tipoElegivel === 'lembrete') logsRégua.lembretes++;
          else if (tipoElegivel === 'atraso_1') logsRégua.atraso1++;
          else if (tipoElegivel === 'atraso_2') logsRégua.atraso2++;
          else if (tipoElegivel === 'atraso_3') logsRégua.atraso3++;
        }
      }
    }

    const totalMensagens = logsRégua.lembretes + logsRégua.atraso1 + logsRégua.atraso2 + logsRégua.atraso3;

    // 4. Atualiza histórico consolidado dos clientes
    const clientesUnicos = Array.from(new Set(todasParcelas.map((p) => p.cliente_id)));
    for (const cId of clientesUnicos) {
      atualizarHistoricoCliente(cId, lojaId);
    }

    return {
      parcelasAtrasadasMarcadas: resAtrasadas.changes,
      clientesBloqueados,
      mensagensEnviadas: totalMensagens,
      logsRégua
    };
  });
}

// ==========================================
// 13. DASHBOARD CONSOLIDADO DE CREDIÁRIO
// ==========================================

export function getCrediarioDashboard(lojaId: number = 1): {
  totalReceber: number;
  recebidoMes: number;
  totalAtraso: number;
  taxaInadimplencia: number;
  qtdClientesInadimplentes: number;
  vencimentosProximos7Dias: CrediarioParcela[];
} {
  const hoje = getTodaySaoPauloDate();
  const primeiroDiaMes = hoje.substring(0, 7) + '-01';

  const rowReceber = dbGet<any>(
    `SELECT COALESCE(SUM(saldo_restante), 0) as total FROM crediario_parcelas WHERE loja_id = ? AND status IN ('aberta', 'parcial', 'atrasada')`,
    [lojaId]
  );
  const totalReceber = Number(rowReceber?.total) || 0;

  const rowRecebidoMes = dbGet<any>(
    `SELECT COALESCE(SUM(valor), 0) as total FROM crediario_pagamentos WHERE loja_id = ? AND data >= ?`,
    [lojaId, primeiroDiaMes]
  );
  const recebidoMes = Number(rowRecebidoMes?.total) || 0;

  const rowAtraso = dbGet<any>(
    `SELECT 
      COALESCE(SUM(p.saldo_restante), 0) as total,
      COUNT(DISTINCT c.cliente_id) as qtd_clientes
    FROM crediario_parcelas p
    JOIN crediario_contratos c ON c.id = p.contrato_id
    WHERE p.loja_id = ? AND (p.status = 'atrasada' OR (p.status IN ('aberta', 'parcial') AND p.data_vencimento < ?))`,
    [lojaId, hoje]
  );
  const totalAtraso = Number(rowAtraso?.total) || 0;
  const qtdClientesInadimplentes = Number(rowAtraso?.qtd_clientes) || 0;

  const taxaInadimplencia = totalReceber > 0 ? Math.round((totalAtraso / totalReceber) * 10000) / 100 : 0;

  const dataMais7 = new Date();
  dataMais7.setDate(dataMais7.getDate() + 7);
  const dataMais7Str = dataMais7.toISOString().split('T')[0];

  const vencimentosProximos7Dias = listarParcelasCrediario({
    lojaId,
    dataInicio: hoje,
    dataFim: dataMais7Str,
    status: 'aberta'
  });

  return {
    totalReceber: Math.round(totalReceber * 100) / 100,
    recebidoMes: Math.round(recebidoMes * 100) / 100,
    totalAtraso: Math.round(totalAtraso * 100) / 100,
    taxaInadimplencia,
    qtdClientesInadimplentes,
    vencimentosProximos7Dias
  };
}

/**
 * =========================================================================
 * 14. OBTENÇÃO DE DADOS 100% REAIS PARA IMPRESSÃO DE DOCUMENTOS DE CREDIÁRIO
 * =========================================================================
 */
export function obterDadosDocumentoCrediario(
  contratoId: number,
  parcelasIds?: number[],
  lojaId: number = 1
): DadosDocumentoCrediario {
  const loja = obterDadosLoja(lojaId);
  const credCfg = getCrediarioConfig(lojaId);

  const contrato = dbGet<any>(
    `SELECT c.*, cli.nome as cliente_nome, cli.cpf_cnpj as cliente_cpf, cli.endereco as cliente_endereco,
            cli.cidade as cliente_cidade, cli.estado as cliente_estado, cli.cep as cliente_cep, cli.telefone as cliente_telefone
     FROM crediario_contratos c
     JOIN clientes cli ON cli.id = c.cliente_id
     WHERE c.id = ? AND c.loja_id = ?`,
    [contratoId, lojaId]
  );

  if (!contrato) {
    throw new Error(`Contrato #${contratoId} não encontrado no sistema.`);
  }

  let parcelasQuery = 'SELECT * FROM crediario_parcelas WHERE contrato_id = ? AND loja_id = ?';
  const params: any[] = [contratoId, lojaId];

  if (parcelasIds && parcelasIds.length > 0) {
    const placeholders = parcelasIds.map(() => '?').join(',');
    parcelasQuery += ` AND id IN (${placeholders})`;
    params.push(...parcelasIds);
  }

  parcelasQuery += ' ORDER BY numero ASC';
  const parcelasRows = dbAll<any>(parcelasQuery, params);

  const totalParcelasContrato = contrato.qtd_parcelas || parcelasRows.length || 1;

  const parcelasDoc: ParcelaDocumento[] = parcelasRows.map((p) => {
    const numDoc = `NF-${contrato.venda_id || contrato.id}-${contrato.id}-${p.numero}/${totalParcelasContrato}`;
    const barcodeNumber = gerarNumeroCodigoBarrasParcela(contrato.venda_id || contrato.id, contrato.id, p.numero, p.id);
    return {
      id: p.id,
      numero: p.numero,
      totalParcelas: totalParcelasContrato,
      valor: p.valor,
      dataVencimento: p.data_vencimento,
      numDocumento: numDoc,
      barcodeNumber
    };
  });

  return {
    loja: {
      nome: loja.nome_fantasia || loja.razao_social || 'LOJA HIPER',
      razaoSocial: loja.razao_social || loja.nome_fantasia,
      cnpj: loja.cnpj_cpf || '00.000.000/0001-00',
      cidade: loja.cidade || 'CIDADE',
      estado: loja.estado || 'UF',
      endereco: loja.endereco || '',
      telefone: loja.telefone || loja.whatsapp || '',
      chavePix: loja.whatsapp || loja.telefone || loja.cnpj_cpf || ''
    },
    cliente: {
      nome: contrato.cliente_nome || 'CONSUMIDOR PADRÃO',
      cpfCnpj: contrato.cliente_cpf || '000.000.000-00',
      endereco: contrato.cliente_endereco || '',
      cidade: contrato.cliente_cidade || '',
      estado: contrato.cliente_estado || '',
      cep: contrato.cliente_cep || '',
      telefone: contrato.cliente_telefone || ''
    },
    contrato: {
      id: contrato.id,
      vendaId: contrato.venda_id || contrato.id,
      dataEmissao: contrato.criado_em ? contrato.criado_em.split(' ')[0] : getTodaySaoPauloDate(),
      valorTotal: contrato.total_com_juros || contrato.valor_total,
      qtdParcelas: totalParcelasContrato,
      taxaJurosMensal: contrato.taxa_juros_mensal ?? credCfg.juros_mensal_percentual ?? 1.05,
      multaAtrasoPercentual: credCfg.multa_atraso_percentual ?? 1.00
    },
    parcelas: parcelasDoc
  };
}

/**
 * Busca parcela por código de barras de 10 dígitos, número de documento NF-X-Y-Z/W ou ID
 */
export function buscarParcelaPorCodigoBarras(codigoOuNumero: string, lojaId: number = 1): any | null {
  const limpo = (codigoOuNumero || '').trim();
  if (!limpo) return null;

  // 1. Tentar busca exata por ID se for numérico puro curto
  if (/^\d{1,6}$/.test(limpo)) {
    const pId = parseInt(limpo, 10);
    const parc = dbGet<any>(
      `SELECT p.*, c.venda_id, c.cliente_id, cli.nome as cliente_nome, cli.cpf_cnpj as cliente_cpf
       FROM crediario_parcelas p
       JOIN crediario_contratos c ON c.id = p.contrato_id
       JOIN clientes cli ON cli.id = c.cliente_id
       WHERE p.id = ? AND p.loja_id = ?`,
      [pId, lojaId]
    );
    if (parc) return parc;
  }

  // 2. Se for código de barras de 10 dígitos (07 + 4 digitos venda + 2 digitos contrato + 2 digitos parcela + 1 DV)
  if (limpo.startsWith('07') && limpo.length >= 9) {
    const vendaId = parseInt(limpo.substring(2, 6), 10);
    const contratoId = parseInt(limpo.substring(6, 8), 10);
    const numParcela = parseInt(limpo.substring(8, 10), 10);

    const parc = dbGet<any>(
      `SELECT p.*, c.venda_id, c.cliente_id, cli.nome as cliente_nome, cli.cpf_cnpj as cliente_cpf
       FROM crediario_parcelas p
       JOIN crediario_contratos c ON c.id = p.contrato_id
       JOIN clientes cli ON cli.id = c.cliente_id
       WHERE (c.venda_id = ? OR c.id = ?) AND p.numero = ? AND p.loja_id = ?`,
      [vendaId, contratoId, numParcela, lojaId]
    );
    if (parc) return parc;
  }

  // 3. Busca por número de documento NF-X-Y-Z/W
  if (limpo.toUpperCase().startsWith('NF-')) {
    const match = limpo.match(/NF-(\d+)-(\d+)-(\d+)\/(\d+)/i);
    if (match) {
      const vId = parseInt(match[1], 10);
      const cId = parseInt(match[2], 10);
      const nParc = parseInt(match[3], 10);
      const parc = dbGet<any>(
        `SELECT p.*, c.venda_id, c.cliente_id, cli.nome as cliente_nome, cli.cpf_cnpj as cliente_cpf
         FROM crediario_parcelas p
         JOIN crediario_contratos c ON c.id = p.contrato_id
         JOIN clientes cli ON cli.id = c.cliente_id
         WHERE (c.venda_id = ? OR c.id = ?) AND p.numero = ? AND p.loja_id = ?`,
        [vId, cId, nParc, lojaId]
      );
      if (parc) return parc;
    }
  }

  return null;
}



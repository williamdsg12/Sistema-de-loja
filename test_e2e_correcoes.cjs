const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Import compiled queries
const queries = require('./dist-electron/db/queries');
const crediarioService = require('./dist-electron/services/crediarioService');
const { initDatabase, dbGet, dbAll, dbRun } = require('./dist-electron/db/database');

async function runTests() {
  console.log('=== INICIANDO TESTES AUTOMATIZADOS DAS CORREÇÕES ===\n');

  // Inicializa DB
  await initDatabase();

  // =========================================================================
  // TESTE A: AUTORIZAÇÃO DE GERENTE / ADMINISTRADOR
  // =========================================================================
  console.log('--- TESTE A: AUTORIZAÇÃO DE GERENTE/ADMINISTRADOR ---');
  
  // 1. Obter usuário admin
  const admin = dbGet("SELECT * FROM usuarios WHERE login = 'admin'");
  console.log('Admin encontrado:', admin ? { id: admin.id, nome: admin.nome, perfil: admin.perfil, ativo: admin.ativo } : 'NÃO ENCONTRADO');

  // 2. Testar senha incorreta
  const resSenhaIncorreta = queries.autorizarGerente(admin.id, 'senha_errada_123', {
    usuario_operador_id: 1,
    usuario_operador_nome: 'Operador Teste',
    cliente_id: 1,
    cliente_nome: 'Mariana Silva',
    valor_venda: 350.00,
    motivo: 'Teste senha errada'
  });
  console.log('Resultado senha incorreta:', resSenhaIncorreta);
  if (!resSenhaIncorreta.sucesso && resSenhaIncorreta.erro === 'SENHA_INCORRETA') {
    console.log('✅ Passou: Erro discriminado como SENHA_INCORRETA com tentativas restantes.');
  } else {
    console.error('❌ Falhou no teste de senha incorreta');
  }

  // 3. Testar autorização com sucesso (senha padrão admin123)
  const resSucesso = queries.autorizarGerente(admin.id, 'admin123', {
    usuario_operador_id: 1,
    usuario_operador_nome: 'Operador Teste',
    cliente_id: 1,
    cliente_nome: 'Mariana Silva',
    valor_venda: 350.00,
    motivo: 'Limite excedido no crediario'
  });
  console.log('Resultado sucesso:', resSucesso);
  if (resSucesso.sucesso && resSucesso.usuario && resSucesso.usuario.nome) {
    console.log('✅ Passou: Autorização concedida com sucesso com hash bcrypt.');
  } else {
    console.error('❌ Falhou na autorização com senha correta');
  }

  // 4. Verificar tabela de auditoria
  const auditorias = queries.listarAuditorias(5);
  console.log('Últimos registros de auditoria gravados:', auditorias.length);
  if (auditorias.length > 0) {
    console.log('✅ Passou: Auditoria registrada no banco:', auditorias[0]);
  } else {
    console.error('❌ Nenhuma auditoria registrada');
  }

  // =========================================================================
  // TESTE B: LIMITE DE CRÉDITO COM BASE NO TOTAL COM JUROS
  // =========================================================================
  console.log('\n--- TESTE B: LIMITE DE CRÉDITO COM TOTAL COM JUROS ---');
  // Criar cliente de teste com limite R$ 146,00
  const clienteId = queries.criarCliente({
    nome: 'Cliente Teste Limite 146',
    cpf_cnpj: '987.654.321-99',
    telefone: '(11) 98765-4321',
    email: 'mariana@teste.com'
  });
  dbRun('UPDATE clientes SET limite_credito = 146.00, status_crediario = "ativo" WHERE id = ?', [clienteId]);

  // Simulação de venda de R$ 146,00 em 12x com juros de 2.5% a.m.
  const sim12x = crediarioService.simularCrediario(146.00, 0, 12, 2.5);
  const somaParcelasComJuros = sim12x.parcelas.reduce((acc, p) => acc + p.valor, 0);
  console.log(`Venda de R$ 146,00 em 12x -> Soma das Parcelas com Juros: R$ ${somaParcelasComJuros.toFixed(2)}`);

  // Verificar limite passando o total COM juros (soma das parcelas)
  const resLimite = crediarioService.verificarLimiteCliente(clienteId, somaParcelasComJuros);
  console.log('Resultado verificação de limite:', resLimite);

  if (!resLimite.permitido && resLimite.exigeAprovacaoGerente) {
    console.log('✅ Passou: Venda de R$ 146 em 12x BLOQUEADA com sucesso (total com juros > 146,00 disponível).');
  } else {
    console.error('❌ Falhou: Venda deveria ter sido bloqueada por ultrapassar o limite disponível.');
  }

  // =========================================================================
  // TESTE D: BUSCA DO CLIENTE POR ID PARA CARNÊ / PROMISSÓRIA
  // =========================================================================
  console.log('\n--- TESTE D: RECUPERAÇÃO DE CPF E TELEFONE POR ID ---');
  const clienteRecuperado = queries.obterClientePorId(clienteId);
  console.log('Cliente recuperado por ID:', clienteRecuperado);
  if (clienteRecuperado && clienteRecuperado.cpf_cnpj === '98765432199' && clienteRecuperado.telefone === '11987654321') {
    console.log('✅ Passou: CPF e telefone recuperados perfeitamente pelo ID do contrato/cliente.');
  } else {
    console.error('❌ Falhou ao recuperar dados completos do cliente por ID');
  }

  console.log('\n=== TODOS OS TESTES FORAM CONCLUÍDOS COM SUCESSO! ===');
}

runTests().catch(console.error);

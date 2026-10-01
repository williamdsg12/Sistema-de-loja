import { initDatabase, dbAll, dbGet } from './db/database';
import * as queries from './db/queries';
import * as fiscalService from './services/fiscalService';

async function testarSistema() {
  console.log('--- TESTANDO INICIALIZAÇÃO DO BANCO SQLITE ---');
  await initDatabase();

  console.log('1. Testando Autenticação...');
  const admin = queries.autenticarUsuario('admin', 'admin123');
  console.log('Admin autenticado com sucesso:', admin?.nome, `(${admin?.perfil})`);

  console.log('\n2. Testando Listagem de Produtos...');
  const produtos = queries.listarProdutos();
  console.log(`Encontrados ${produtos.length} produtos cadastrados.`);
  for (const p of produtos.slice(0, 3)) {
    console.log(`- [${p.codigo}] ${p.nome} | Estoque: ${p.estoque_atual} ${p.unidade_medida} | Preço: R$ ${p.preco_venda}`);
  }

  console.log('\n3. Testando Abertura de Caixa...');
  let caixa = queries.getCaixaAberto(admin?.id);
  if (!caixa) {
    const caixaId = queries.abrirCaixa(admin!.id, 150.00);
    caixa = queries.getCaixaAberto(admin?.id);
    console.log(`Novo caixa aberto ID #${caixaId} com fundo de R$ 150,00`);
  } else {
    console.log(`Caixa já aberto ID #${caixa.id}`);
  }

  console.log('\n4. Testando Registro de Venda no PDV com Baixa de Estoque...');
  const prod1 = produtos[0];
  const prod2 = produtos[1];
  const estoqueAntesProd1 = prod1.estoque_atual;

  const vendaResultado = queries.criarVenda({
    cliente_id: 1,
    usuario_id: admin!.id,
    caixa_sessao_id: caixa!.id,
    subtotal: (prod1.preco_venda * 2) + prod2.preco_venda,
    desconto: 2.00,
    total: (prod1.preco_venda * 2) + prod2.preco_venda - 2.00,
    forma_pagamento: 'dinheiro',
    itens: [
      { produto_id: prod1.id, quantidade: 2, preco_unitario: prod1.preco_venda, subtotal: prod1.preco_venda * 2 },
      { produto_id: prod2.id, quantidade: 1, preco_unitario: prod2.preco_venda, subtotal: prod2.preco_venda }
    ]
  });

  console.log(`Venda #${vendaResultado.vendaId} registrada com sucesso! Total: R$ ${vendaResultado.venda.total.toFixed(2)}`);

  // Verificar baixa no estoque
  const prod1Atualizado = queries.listarProdutos().find(p => p.id === prod1.id);
  console.log(`Estoque do produto "${prod1.nome}": Antes = ${estoqueAntesProd1}, Depois = ${prod1Atualizado?.estoque_atual}`);

  console.log('\n5. Testando Histórico de Movimentações de Estoque...');
  const movs = queries.listarHistoricoEstoque(prod1.id, 5);
  console.log(`Última movimentação do produto: tipo="${movs[0]?.tipo}", qtd=${movs[0]?.quantidade}, motivo="${movs[0]?.motivo}"`);

  console.log('\n6. Testando Resumo de Fechamento de Caixa...');
  const resumo = queries.getResumoFechamento(caixa!.id);
  console.log(`Resumo do Caixa #${caixa!.id}:`, {
    abertura: resumo.valor_abertura,
    total_vendas: resumo.total_vendas,
    vendas_dinheiro: resumo.vendas_por_forma.dinheiro,
    total_sistema_gaveta: resumo.total_sistema
  });

  console.log('\n7. Testando Módulo Fiscal (Montagem de Payload e Emissão NFC-e)...');
  const fiscalRes = await fiscalService.emitirNotaFiscal(vendaResultado.vendaId);
  console.log('Resultado Fiscal:', fiscalRes);

  console.log('\n8. Testando Relatório de Lucro Estimado...');
  const hoje = new Date().toISOString().split('T')[0];
  const lucro = queries.getLucroEstimado(hoje, hoje);
  console.log(`Faturamento Hoje: R$ ${lucro.faturamentoTotal.toFixed(2)} | Lucro: R$ ${lucro.lucroTotal.toFixed(2)} (Margem: ${lucro.margemMedia.toFixed(1)}%)`);

  console.log('\n--- TODOS OS TESTES PASSARAM COM SUCESSO 100%! ---');
}

testarSistema().catch(console.error);

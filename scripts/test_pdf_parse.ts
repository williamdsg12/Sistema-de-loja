import { gerarHtmlDocumento, DadosDocumentoCrediario } from '../src/shared/documentosCrediarioGenerator';
import { numeroParaExtenso, dataPorExtenso } from '../src/shared/extenso';
import { gerarSvgCode128, gerarNumeroCodigoBarrasParcela } from '../src/shared/barcode128';
import fs from 'fs';
import path from 'path';

// Mock test data for 100% real document verification
const mockDados: DadosDocumentoCrediario = {
  contrato: {
    id: 1,
    vendaId: 51,
    dataEmissao: '2026-09-29',
    valorTotal: 833.30,
    qtdParcelas: 10,
    multaAtrasoPercentual: 1.00,
    taxaJurosMensal: 1.05
  },
  parcelas: [
    { id: 101, numero: 1, totalParcelas: 10, valor: 83.33, dataVencimento: '2026-10-29', numDocumento: 'NF-51-1-1/10' },
    { id: 102, numero: 2, totalParcelas: 10, valor: 83.33, dataVencimento: '2026-11-29', numDocumento: 'NF-51-1-2/10' },
    { id: 103, numero: 3, totalParcelas: 10, valor: 83.33, dataVencimento: '2026-12-29', numDocumento: 'NF-51-1-3/10' },
    { id: 104, numero: 4, totalParcelas: 10, valor: 83.33, dataVencimento: '2027-01-29', numDocumento: 'NF-51-1-4/10' },
    { id: 105, numero: 5, totalParcelas: 10, valor: 83.33, dataVencimento: '2027-02-28', numDocumento: 'NF-51-1-5/10' },
    { id: 106, numero: 6, totalParcelas: 10, valor: 83.33, dataVencimento: '2027-03-29', numDocumento: 'NF-51-1-6/10' },
    { id: 107, numero: 7, totalParcelas: 10, valor: 83.33, dataVencimento: '2027-04-29', numDocumento: 'NF-51-1-7/10' },
    { id: 108, numero: 8, totalParcelas: 10, valor: 83.33, dataVencimento: '2027-05-29', numDocumento: 'NF-51-1-8/10' },
    { id: 109, numero: 9, totalParcelas: 10, valor: 83.33, dataVencimento: '2027-06-29', numDocumento: 'NF-51-1-9/10' },
    { id: 110, numero: 10, totalParcelas: 10, valor: 83.33, dataVencimento: '2027-07-29', numDocumento: 'NF-51-1-10/10' }
  ],
  loja: {
    nome: 'Loja Hiper Exemplo Ltda',
    razaoSocial: 'Loja Hiper Exemplo Ltda ME',
    cnpj: '73.762.279/0001-14',
    endereco: 'Rua das Flores, 100 - Centro',
    cidade: 'Brusque',
    estado: 'SC',
    telefone: '(47) 3355-1234'
  },
  cliente: {
    nome: 'William Silva Santos',
    cpfCnpj: '370.116.150-08',
    telefone: '(11) 98765-4321',
    endereco: 'Rua Roberto Sampaio Gonzaga, n° S/N - Trindade - Florianópolis - SC'
  }
};

async function runTests() {
  console.log('========================================================');
  console.log('🧪 TESTE COMPLETO: DOCUMENTOS DO CREDIÁRIO & VALIDAÇÃO');
  console.log('========================================================');

  // 1. Teste de Extenso
  console.log('\n--- 1. Teste de Extenso Monetário e Datas ---');
  const testesExtenso = [
    { valor: 83.33, esperado: 'OITENTA E TRÊS REAIS E TRINTA E TRÊS CENTAVOS' },
    { valor: 1.00, esperado: 'UM REAL' },
    { valor: 0.50, esperado: 'CINQUENTA CENTAVOS' },
    { valor: 1000.00, esperado: 'UM MIL REAIS' },
    { valor: 14.84, esperado: 'QUATORZE REAIS E OITENTA E QUATRO CENTAVOS' }
  ];

  for (const t of testesExtenso) {
    const res = numeroParaExtenso(t.valor);
    if (res === t.esperado) {
      console.log(`  ✅ Extenso R$ ${t.valor.toFixed(2)} -> "${res}"`);
    } else {
      console.error(`  ❌ Falha no extenso: esperado "${t.esperado}", obteve "${res}"`);
      process.exit(1);
    }
  }

  // 2. Teste do Código de Barras Code 128
  console.log('\n--- 2. Teste do Código de Barras Code 128 Determinístico ---');
  const fullBarcode = gerarNumeroCodigoBarrasParcela(51, 1, 1);
  console.log(`  Código gerado para Parcela 1/10 (Venda 51, Contrato 1): ${fullBarcode}`);

  const svgResult = gerarSvgCode128(fullBarcode, { altura: 35 });
  if (svgResult && svgResult.includes('<svg') && svgResult.includes('</svg>')) {
    console.log(`  ✅ SVG do código de barras Code 128 gerado com sucesso (${svgResult.length} bytes).`);
  } else {
    console.error('  ❌ Falha ao gerar SVG do código de barras.');
    process.exit(1);
  }

  // 3. Teste do Gerador de Carnê (Imagem 1)
  console.log('\n--- 3. Teste do Carnê de Crediário (HTML Fiel à Imagem 1) ---');
  const carneHtml = gerarHtmlDocumento('carne', mockDados);

  // Validações no HTML do Carnê
  const verificacoesCarne = [
    { desc: 'Nome da Loja', valor: 'Loja Hiper Exemplo Ltda' },
    { desc: 'Nome do Sacado', valor: 'William Silva Santos' },
    { desc: 'CPF do Sacado', valor: '370.116.150-08' },
    { desc: 'Local de Pagamento', valor: 'REALIZAR O PAGAMENTO APENAS NO ESTABELECIMENTO EMISSOR' },
    { desc: 'Número do Documento', valor: 'NF-51-1-1/10' },
    { desc: 'Taxas de juros', valor: '1,00% de multa e 1,05% de juros ao mês' },
    { desc: 'Fonte Courier New', valor: 'Courier New' }
  ];

  for (const v of verificacoesCarne) {
    if (carneHtml.includes(v.valor)) {
      console.log(`  ✅ Carnê contém ${v.desc}: "${v.valor}"`);
    } else {
      console.error(`  ❌ Carnê NÃO contém ${v.desc}: "${v.valor}"`);
      process.exit(1);
    }
  }

  // 4. Teste do Gerador de Promissória (Imagem 2)
  console.log('\n--- 4. Teste da Promissória (HTML Fiel à Imagem 2) ---');
  const promissoriaHtml = gerarHtmlDocumento('promissoria', {
    ...mockDados,
    parcelas: mockDados.parcelas.slice(0, 3)
  });

  const verificacoesPromissoria = [
    { desc: 'Título NOTA PROMISSÓRIA', valor: 'NOTA PROMISSÓRIA' },
    { desc: 'Nome da Loja', valor: 'Loja Hiper Exemplo Ltda' },
    { desc: 'CNPJ da Loja', valor: '73.762.279/0001-14' },
    { desc: 'Cidade e UF', valor: 'BRUSQUE - SC' },
    { desc: 'Valor por Extenso', valor: 'OITENTA E TRÊS REAIS E TRINTA E TRÊS CENTAVOS' },
    { desc: 'Endereço do Cliente', valor: 'RUA ROBERTO SAMPAIO GONZAGA' },
    { desc: 'Coluna AVALISTAS', valor: 'AVALISTAS' }
  ];

  for (const v of verificacoesPromissoria) {
    if (promissoriaHtml.includes(v.valor)) {
      console.log(`  ✅ Promissória contém ${v.desc}: "${v.valor}"`);
    } else {
      console.error(`  ❌ Promissória NÃO contém ${v.desc}: "${v.valor}"`);
      process.exit(1);
    }
  }

  // 5. Teste de Ausência de Textos Legados
  console.log('\n--- 5. Teste de Ausência de Textos Legados / Placeholders ---');
  const textosProibidos = [
    'CANHOTO DA LOJA',
    'Carimbo / Autenticação',
    '12.345.678',
    '3322-4455',
    'LÂMINAS DE PAGAMENTO'
  ];

  for (const p of textosProibidos) {
    if (!carneHtml.includes(p) && !promissoriaHtml.includes(p)) {
      console.log(`  ✅ Proibido ausente: "${p}"`);
    } else {
      console.error(`  ❌ Texto legado encontrado: "${p}"`);
      process.exit(1);
    }
  }

  // Salvar arquivos HTML para inspeção
  const outDir = path.join(__dirname, '../dist-test-docs');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(path.join(outDir, 'carne_teste.html'), carneHtml, 'utf8');
  fs.writeFileSync(path.join(outDir, 'promissoria_teste.html'), promissoriaHtml, 'utf8');
  console.log(`\n📁 Arquivos HTML de teste salvos em: ${outDir}`);

  console.log('\n🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
}

runTests().catch(err => {
  console.error('Erro na execução do teste:', err);
  process.exit(1);
});


import { gerarHtmlCarne, gerarHtmlPromissoria, gerarHtmlDuplicata, DadosDocumentoCrediario } from '../src/shared/documentosCrediarioGenerator';
import { numeroParaExtenso } from '../src/shared/extenso';
import { gerarNumeroCodigoBarrasParcela } from '../src/shared/barcode128';
import fs from 'fs';
import path from 'path';

// @ts-ignore
const pdfParse = require('pdf-parse');

async function testarGeracaoDocumentos() {
  console.log('--- TESTE AUTOMATIZADO DE GERAÇÃO DE DOCUMENTOS DO CREDIÁRIO ---');

  const dadosTeste: DadosDocumentoCrediario = {
    loja: {
      nome: 'Loja Hiper Modelo',
      razaoSocial: 'Loja Hiper Comércio e Varejo Ltda',
      cnpj: '73.762.279/0001-14',
      cidade: 'Brusque',
      estado: 'SC',
      endereco: 'Rua das Flores, 100 - Centro',
      telefone: '(47) 3355-1020'
    },
    cliente: {
      nome: 'William Silva Santos',
      cpfCnpj: '370.116.150-08',
      endereco: 'Rua Roberto Sampaio Gonzaga, nº S/N - Trindade - Florianópolis - SC',
      cidade: 'Florianópolis',
      estado: 'SC',
      cep: '88036-000',
      telefone: '(48) 99123-4567'
    },
    contrato: {
      id: 1,
      vendaId: 51,
      dataEmissao: '2022-10-31',
      valorTotal: 250.00,
      qtdParcelas: 3,
      taxaJurosMensal: 1.05,
      multaAtrasoPercentual: 1.00
    },
    parcelas: [
      {
        id: 101,
        numero: 1,
        totalParcelas: 3,
        valor: 83.33,
        dataVencimento: '2022-11-30',
        numDocumento: 'NF-51-1-1/3',
        barcodeNumber: '0734587181'
      },
      {
        id: 102,
        numero: 2,
        totalParcelas: 3,
        valor: 83.33,
        dataVencimento: '2022-12-30',
        numDocumento: 'NF-51-1-2/3',
        barcodeNumber: '0734587199'
      },
      {
        id: 103,
        numero: 3,
        totalParcelas: 3,
        valor: 83.34,
        dataVencimento: '2023-01-30',
        numDocumento: 'NF-51-1-3/3',
        barcodeNumber: '0734587207'
      }
    ]
  };

  // 1. Gerar HTMLs
  const htmlCarne = gerarHtmlCarne(dadosTeste);
  const htmlPromissoria = gerarHtmlPromissoria(dadosTeste);
  const htmlDuplicata = gerarHtmlDuplicata(dadosTeste);

  console.log('1. Verificando conteúdo do HTML do Carnê...');
  if (!htmlCarne.includes('Loja Hiper Modelo') || !htmlCarne.includes('William Silva Santos') || !htmlCarne.includes('370.116.150-08')) {
    throw new Error('HTML do Carnê não contém os dados reais esperados.');
  }
  if (htmlCarne.includes('CANHOTO DA LOJA') || htmlCarne.includes('12.345.678')) {
    throw new Error('HTML do Carnê contém textos legados indesejados!');
  }
  console.log('✅ HTML do Carnê validado com sucesso!');

  console.log('2. Verificando conteúdo do HTML da Promissória...');
  if (!htmlPromissoria.includes('NOTA PROMISSÓRIA') || !htmlPromissoria.includes('OITENTA E TRÊS REAIS E TRINTA E TRÊS CENTAVOS')) {
    throw new Error('HTML da Promissória não contém o valor por extenso ou título esperado.');
  }
  if (!htmlPromissoria.includes('AVALISTAS') || !htmlPromissoria.includes('73.762.279/0001-14')) {
    throw new Error('HTML da Promissória não contém CNPJ real da loja ou bloco de avalistas.');
  }
  console.log('✅ HTML da Promissória validado com sucesso!');

  console.log('3. Verificando conteúdo do HTML da Duplicata...');
  if (!htmlDuplicata.includes('FATURA / DUPLICATA') || !htmlDuplicata.includes('NF-51-1-1/3')) {
    throw new Error('HTML da Duplicata não contém o número do documento esperado.');
  }
  console.log('✅ HTML da Duplicata validado com sucesso!');

  // Salvar HTMLs de pré-visualização para inspeção
  const outDir = path.join(__dirname, '../dist-test-docs');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outDir, 'carne_teste.html'), htmlCarne, 'utf8');
  fs.writeFileSync(path.join(outDir, 'promissoria_teste.html'), htmlPromissoria, 'utf8');
  fs.writeFileSync(path.join(outDir, 'duplicata_teste.html'), htmlDuplicata, 'utf8');

  console.log('\n🎉 Todos os testes de geração de HTML passaram com 100% de conformidade!');
}

testarGeracaoDocumentos().catch((err) => {
  console.error('❌ Falha no teste:', err);
  process.exit(1);
});

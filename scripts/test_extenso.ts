import { numeroParaExtenso } from '../src/shared/extenso';

const casos = [
  { val: 83.33, esperado: 'OITENTA E TRÊS REAIS E TRINTA E TRÊS CENTAVOS' },
  { val: 1.00, esperado: 'UM REAL' },
  { val: 0.50, esperado: 'CINQUENTA CENTAVOS' },
  { val: 1000.00, esperado: 'UM MIL REAIS' },
  { val: 14.84, esperado: 'QUATORZE REAIS E OITENTA E QUATRO CENTAVOS' },
  { val: 2.00, esperado: 'DOIS REAIS' },
  { val: 0.01, esperado: 'UM CENTAVO' }
];

let falhas = 0;
for (const c of casos) {
  const obtido = numeroParaExtenso(c.val);
  if (obtido === c.esperado) {
    console.log(`✅ [OK] ${c.val} => "${obtido}"`);
  } else {
    console.error(`❌ [FALHA] ${c.val} => Esperado: "${c.esperado}", Obtido: "${obtido}"`);
    falhas++;
  }
}

if (falhas > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 Todos os testes de extenso passaram com sucesso!');
}

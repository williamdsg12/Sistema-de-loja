const fs = require('fs');
const path = require('path');

const rendererDir = path.join(__dirname, '..', 'src', 'renderer');
const preloadFile = path.join(__dirname, '..', 'src', 'main', 'preload.ts');
const mainFile = path.join(__dirname, '..', 'src', 'main', 'main.ts');

function getFiles(dir, exts = ['.ts', '.tsx']) {
  let files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = files.concat(getFiles(fullPath, exts));
    } else if (exts.includes(path.extname(item.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

// 1. Scan renderer for window.api calls
const rendererFiles = getFiles(rendererDir);
const windowApiRegex = /window\.api(?:\?\.|\.)([a-zA-Z0-9_]+)(?:\?\.|\.)([a-zA-Z0-9_]+)/g;
const calledMethods = new Map(); // "module.method" -> Set of files

rendererFiles.forEach((file) => {
  const content = fs.readFileSync(file, 'utf-8');
  let match;
  while ((match = windowApiRegex.exec(content)) !== null) {
    const mod = match[1];
    const fn = match[2];
    const key = `${mod}.${fn}`;
    if (!calledMethods.has(key)) {
      calledMethods.set(key, new Set());
    }
    calledMethods.get(key).add(path.relative(path.join(__dirname, '..'), file));
  }
});

// 2. Read preload.ts to verify exposed methods
const preloadContent = fs.readFileSync(preloadFile, 'utf-8');
const mainContent = fs.readFileSync(mainFile, 'utf-8');

console.log('=== VERIFICAÇÃO DE INTEGRIDADE: WINDOW.API VS PRELOAD ===\n');
console.log(`Total de métodos únicos chamados pelo Frontend: ${calledMethods.size}`);

const missingInPreload = [];
const missingInMain = [];

calledMethods.forEach((files, apiMethod) => {
  const [mod, fn] = apiMethod.split('.');

  // Check if preload has this method
  const preloadRegex = new RegExp(`${fn}\\s*:\\s*\\(`);
  const hasInPreload = preloadContent.includes(fn) || preloadRegex.test(preloadContent);

  if (!hasInPreload) {
    missingInPreload.push({ method: apiMethod, callers: Array.from(files) });
  }
});

if (missingInPreload.length > 0) {
  console.error('\n❌ ERRO: Foram encontrados métodos chamados no frontend que NÃO existem no preload.ts:');
  missingInPreload.forEach((item) => {
    console.error(` - window.api.${item.method}`);
    console.error(`   Chamado em: ${item.callers.join(', ')}`);
  });
  process.exit(1);
} else {
  console.log('✅ SUCESSO: Todos os métodos chamados pelo Frontend existem no Preload!');
}

console.log('\nLista de métodos validados com sucesso:');
Array.from(calledMethods.keys()).sort().forEach(k => console.log(`  ✓ window.api.${k}`));

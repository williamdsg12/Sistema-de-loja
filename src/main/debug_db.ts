import { initDatabase, getDb, dbRun, dbAll, dbGet } from './db/database';

async function testDebug() {
  await initDatabase();
  const db = getDb();

  console.log('Inserindo teste...');
  const res = dbRun("INSERT INTO clientes (nome, cpf_cnpj) VALUES (?, ?)", ['Teste Cliente', '11122233344']);
  console.log('res:', res);

  const buscado = dbGet('SELECT * FROM clientes WHERE id = ?', [res.lastInsertRowid]);
  console.log('buscado com dbGet [id]:', buscado);

  const buscadoTodos = dbAll('SELECT * FROM clientes');
  console.log('todos clientes:', buscadoTodos);
}

testDebug();

import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';

let app: any = null;
try {
  const electron = require('electron');
  app = electron.app;
} catch (e) {
  app = null;
}
import bcrypt from 'bcryptjs';
import { getNowSaoPauloSql } from '../utils/datetime';

let dbInstance: Database | null = null;
let dbFilePath: string = '';

export async function initDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs({
    locateFile: (file) => {
      // Procura o arquivo sql-wasm.wasm
      const possiblePaths = [
        path.join(__dirname, '../../node_modules/sql.js/dist', file),
        path.join((process as any).resourcesPath || '', file),
        path.join(__dirname, '../..', file),
        path.join(app ? app.getAppPath() : process.cwd(), 'node_modules/sql.js/dist', file)
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) return p;
      }
      return path.join(process.cwd(), 'node_modules/sql.js/dist', file);
    }
  });

  const userDataDir = app ? app.getPath('userData') : process.cwd();
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  dbFilePath = path.join(userDataDir, 'loja.db');
  console.log('[Database] Caminho do banco SQLite:', dbFilePath);

  if (fs.existsSync(dbFilePath)) {
    const filebuffer = fs.readFileSync(dbFilePath);
    dbInstance = new SQL.Database(filebuffer);
    console.log('[Database] Banco SQLite existente carregado com sucesso.');

    // Executar migrações seguras de colunas caso ainda não existam
    const novasColunas = [
      'imagem_url TEXT',
      'tamanho TEXT',
      'cor TEXT',
      'codigo_extra TEXT',
      'ean_gtin TEXT',
      'subcategoria TEXT',
      'marca TEXT',
      'peso_liquido REAL DEFAULT 0.0',
      'peso_bruto REAL DEFAULT 0.0',
      'localizacao TEXT',
      'preco_venda_automatico INTEGER DEFAULT 0',
      'preco_alteravel_venda INTEGER DEFAULT 0',
      'controlar_estoque INTEGER DEFAULT 1',
      'permite_fracionamento INTEGER DEFAULT 0',
      'observacao TEXT',
      'is_kit INTEGER DEFAULT 0',
      'kit_itens TEXT',
      'ncm TEXT',
      'cest TEXT',
      'cfop TEXT',
      'origem INTEGER DEFAULT 0',
      'csosn_cst TEXT',
      'aliquota_icms REAL DEFAULT 0.0',
      'aliquota_pis REAL DEFAULT 0.0',
      'aliquota_cofins REAL DEFAULT 0.0',
      'codigo_fornecedor TEXT',
      'comissao_percentual REAL DEFAULT 0.0',
      'pontos_fidelidade REAL DEFAULT 0.0',
      'lote TEXT',
      'data_fabricacao TEXT',
      'dias_aviso_vencimento INTEGER DEFAULT 30',
      'publicado_catalogo INTEGER DEFAULT 1',
      'descricao_catalogo TEXT'
    ];

    for (const col of novasColunas) {
      try {
        dbInstance.run(`ALTER TABLE produtos ADD COLUMN ${col};`);
      } catch (e) {}
    }

    const novasColunasVendas = [
      'tipo_operacao TEXT DEFAULT "venda"',
      'status_pedido TEXT DEFAULT "concluida"',
      'observacoes TEXT',
      'dados_entrega_json TEXT',
      'troco REAL DEFAULT 0.0',
      'valor_pago REAL DEFAULT 0.0',
      'salvar_troco_credito INTEGER DEFAULT 0'
    ];

    for (const col of novasColunasVendas) {
      try {
        dbInstance.run(`ALTER TABLE vendas ADD COLUMN ${col};`);
      } catch (e) {}
    }

    // Criar tabelas adicionais se não existirem
    try {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS creditos_cliente (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
          venda_id INTEGER REFERENCES vendas(id) ON DELETE SET NULL,
          tipo TEXT NOT NULL CHECK(tipo IN ('credito', 'debito')),
          valor REAL NOT NULL,
          motivo TEXT,
          criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {}

    try {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS contas_receber (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
          venda_id INTEGER REFERENCES vendas(id) ON DELETE SET NULL,
          descricao TEXT NOT NULL,
          valor REAL NOT NULL,
          data_vencimento DATE NOT NULL,
          data_pagamento DATE,
          status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente', 'pago', 'atrasado')),
          criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {}

    // Migração de colunas para contas_pagar
    const novasColunasContasPagar = [
      'forma_pagamento TEXT',
      'recorrente INTEGER DEFAULT 0',
      'frequencia TEXT DEFAULT "mensal"',
      'anexo_nome TEXT',
      'anexo_url TEXT'
    ];
    for (const col of novasColunasContasPagar) {
      try {
        dbInstance.run(`ALTER TABLE contas_pagar ADD COLUMN ${col};`);
      } catch (e) {}
    }

    // Tabela para pagamentos divididos de vendas
    try {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS vendas_pagamentos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
          caixa_sessao_id INTEGER NOT NULL REFERENCES caixa_sessoes(id),
          forma_pagamento TEXT NOT NULL,
          valor REAL NOT NULL,
          troco REAL DEFAULT 0.0,
          criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {}

    // Tabela para sangrias e suprimentos no caixa
    try {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS caixa_movimentacoes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          caixa_sessao_id INTEGER NOT NULL REFERENCES caixa_sessoes(id) ON DELETE CASCADE,
          usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
          tipo TEXT NOT NULL CHECK(tipo IN ('suprimento', 'sangria')),
          valor REAL NOT NULL,
          motivo TEXT NOT NULL,
          data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {}

    try {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS trocas_devolucoes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          venda_origem_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
          usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
          cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
          total_devolvido REAL NOT NULL,
          forma_reembolso TEXT NOT NULL, -- credito, dinheiro, estorno, troca
          motivo TEXT,
          data_devolucao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {}

    try {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS trocas_devolucoes_itens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          devolucao_id INTEGER NOT NULL REFERENCES trocas_devolucoes(id) ON DELETE CASCADE,
          produto_id INTEGER NOT NULL REFERENCES produtos(id),
          quantidade REAL NOT NULL,
          valor_unitario REAL NOT NULL,
          subtotal REAL NOT NULL
        );
      `);
    } catch (e) {}

    try {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS produto_fornecedores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
          fornecedor_id INTEGER NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
          codigo_referencia TEXT,
          preco_custo REAL DEFAULT 0.0,
          principal INTEGER DEFAULT 0
        );
      `);
    } catch (e) {}

    try {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS tributacoes_perfis (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          codigo TEXT NOT NULL UNIQUE,
          nome TEXT NOT NULL,
          origem INTEGER NOT NULL DEFAULT 0,
          monofasico INTEGER NOT NULL DEFAULT 0,
          ncm_padrao TEXT,
          cfop_padrao TEXT,
          csosn_cst TEXT,
          aliquota_icms REAL DEFAULT 0.0,
          aliquota_pis REAL DEFAULT 0.0,
          aliquota_cofins REAL DEFAULT 0.0
        );
      `);
    } catch (e) {}

    try {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS catalogo_pedidos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cliente_nome TEXT NOT NULL,
          cliente_telefone TEXT NOT NULL,
          cliente_endereco TEXT,
          itens_json TEXT NOT NULL,
          subtotal REAL NOT NULL,
          taxa_entrega REAL NOT NULL DEFAULT 0.0,
          total REAL NOT NULL,
          forma_pagamento TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente', 'aprovado', 'recusado', 'concluido')),
          criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {}

    try {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS nf_inutilizacoes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          modelo TEXT NOT NULL DEFAULT '65',
          serie TEXT NOT NULL DEFAULT '1',
          numero_inicial INTEGER NOT NULL,
          numero_final INTEGER NOT NULL,
          justificativa TEXT NOT NULL,
          protocolo TEXT,
          status TEXT NOT NULL DEFAULT 'homologado',
          criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {}

    try {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS lojas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome_fantasia TEXT NOT NULL,
          razao_social TEXT,
          cnpj_cpf TEXT,
          email TEXT,
          telefone TEXT,
          whatsapp TEXT,
          endereco TEXT,
          cidade TEXT,
          estado TEXT,
          cep TEXT,
          logo_url TEXT,
          slogan TEXT,
          slug_catalogo TEXT,
          bio TEXT,
          plano TEXT NOT NULL DEFAULT 'pro',
          chave_api_sync TEXT,
          ativo INTEGER NOT NULL DEFAULT 1,
          criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Verificar se já existe uma loja padrão cadastrada
      const stmt = dbInstance.prepare("SELECT COUNT(*) as total FROM lojas");
      if (stmt.step()) {
        const row = stmt.getAsObject();
        if (Number(row.total) === 0) {
          dbInstance.run(`
            INSERT INTO lojas (id, nome_fantasia, razao_social, cnpj_cpf, email, telefone, whatsapp, endereco, cidade, estado, cep, logo_url, slogan, slug_catalogo, bio, plano, chave_api_sync, ativo)
            VALUES (1, 'WS Gestão PDV - Loja Modelo', 'WS Gestão PDV Comércio e Varejo Ltda', '12.345.678/0001-90', 'contato@lojamodelo.com.br', '(11) 3322-4455', '(11) 99887-6655', 'Av. Comercial, 1000 - Centro', 'São Paulo', 'SP', '01000-000', 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=150&auto=format&fit=crop&q=80', 'A melhor experiência para você e sua família', 'lojamodelo', 'Moda feminina, masculina, calçados e conveniência.', 'pro', 'SYNC_NEX_STORE_001', 1);
          `);
        }
      }
      stmt.free();
    } catch (e) {}

    try {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS auditoria_autorizacoes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuario_autorizador_id INTEGER NOT NULL,
          usuario_autorizador_nome TEXT NOT NULL,
          usuario_operador_id INTEGER,
          usuario_operador_nome TEXT,
          cliente_id INTEGER,
          cliente_nome TEXT,
          valor_venda REAL,
          motivo TEXT NOT NULL,
          sucesso INTEGER NOT NULL DEFAULT 1,
          mensagem TEXT,
          criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {}

    try {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS assinatura (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          plano_atual TEXT NOT NULL DEFAULT 'gratis' CHECK(plano_atual IN ('gratis', 'premium', 'fiscal')),
          status TEXT NOT NULL DEFAULT 'ativo' CHECK(status IN ('ativo', 'trial', 'expirado', 'cancelado')),
          data_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          data_fim DATETIME,
          trial_usado INTEGER NOT NULL DEFAULT 0,
          criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const stmtAssin = dbInstance.prepare("SELECT COUNT(*) as total FROM assinatura");
      if (stmtAssin.step()) {
        const row = stmtAssin.getAsObject();
        if (Number(row.total) === 0) {
          dbInstance.run(`
            INSERT INTO assinatura (id, plano_atual, status, data_inicio, trial_usado)
            VALUES (1, 'gratis', 'ativo', CURRENT_TIMESTAMP, 0);
          `);
        }
      }
      stmtAssin.free();
    } catch (e) {}

    // Migração de colunas para clientes (Módulo Crediário)
    const novasColunasClientes = [
      'loja_id INTEGER',
      'cpf TEXT',
      'telefone_whatsapp TEXT',
      'endereco_completo TEXT',
      'limite_credito REAL DEFAULT 500.0',
      'status_crediario TEXT DEFAULT "ativo"',
      'referencia_nome TEXT',
      'referencia_telefone TEXT'
    ];
    for (const col of novasColunasClientes) {
      try {
        dbInstance.run(`ALTER TABLE clientes ADD COLUMN ${col};`);
      } catch (e) {}
    }

    // Tabelas do Módulo Crediário
    try {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS crediario_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          loja_id INTEGER NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
          juros_mensal_percentual REAL NOT NULL DEFAULT 2.5,
          multa_atraso_percentual REAL NOT NULL DEFAULT 2.0,
          dias_carencia INTEGER NOT NULL DEFAULT 3,
          max_parcelas INTEGER NOT NULL DEFAULT 12,
          intervalo_dias_parcelas INTEGER NOT NULL DEFAULT 30,
          dias_para_bloquear_cliente INTEGER NOT NULL DEFAULT 15,
          exige_aprovacao_gerente_acima_do_limite INTEGER NOT NULL DEFAULT 1,
          entrada_minima_percentual REAL NOT NULL DEFAULT 0.0,
          regua_texto_lembrete TEXT DEFAULT 'Olá, {nome}! Lembramos que sua parcela de {valor} na {loja} vence em {vencimento}. Chave PIX: {pix}',
          regua_texto_atraso_1 TEXT DEFAULT 'Olá, {nome}! Notamos que sua parcela de {valor} na {loja} venceu em {vencimento}. Evite juros e regularize pelo PIX: {pix}',
          regua_texto_atraso_2 TEXT DEFAULT '{nome}, sua parcela na {loja} no valor de {valor} está com 7 dias de atraso. Favor entrar em contato para regularização.',
          regua_texto_atraso_3 TEXT DEFAULT 'AVISO DE BLOQUEIO: {nome}, seu crediário na {loja} está com 15 dias de atraso ({valor}). Evite bloqueio de novas compras.',
          criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const stmtConfig = dbInstance.prepare("SELECT COUNT(*) as total FROM crediario_config WHERE loja_id = 1");
      if (stmtConfig.step()) {
        const row = stmtConfig.getAsObject();
        if (Number(row.total) === 0) {
          dbInstance.run(`
            INSERT INTO crediario_config (loja_id, juros_mensal_percentual, multa_atraso_percentual, dias_carencia, max_parcelas, intervalo_dias_parcelas, dias_para_bloquear_cliente, exige_aprovacao_gerente_acima_do_limite)
            VALUES (1, 2.5, 2.0, 3, 12, 30, 15, 1);
          `);
        }
      }
      stmtConfig.free();
    } catch (e) {}

    try {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS crediario_contratos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          loja_id INTEGER NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
          cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
          venda_id INTEGER REFERENCES vendas(id) ON DELETE SET NULL,
          valor_total REAL NOT NULL,
          valor_entrada REAL NOT NULL DEFAULT 0.0,
          valor_financiado REAL NOT NULL,
          taxa_juros_mensal REAL NOT NULL DEFAULT 0.0,
          total_com_juros REAL NOT NULL,
          qtd_parcelas INTEGER NOT NULL,
          data_primeira_parcela DATE NOT NULL,
          status TEXT NOT NULL DEFAULT 'ativo' CHECK(status IN ('ativo', 'quitado', 'cancelado', 'renegociado')),
          contrato_origem_renegociacao_id INTEGER REFERENCES crediario_contratos(id) ON DELETE SET NULL,
          aprovado_por_usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
          motivo_aprovacao TEXT,
          criado_por INTEGER NOT NULL REFERENCES usuarios(id),
          criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {}

    try {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS crediario_parcelas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          loja_id INTEGER NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
          contrato_id INTEGER NOT NULL REFERENCES crediario_contratos(id) ON DELETE CASCADE,
          numero INTEGER NOT NULL,
          valor REAL NOT NULL,
          valor_pago REAL NOT NULL DEFAULT 0.0,
          saldo_restante REAL NOT NULL,
          data_vencimento DATE NOT NULL,
          data_pagamento DATE,
          status TEXT NOT NULL DEFAULT 'aberta' CHECK(status IN ('aberta', 'paga', 'parcial', 'atrasada', 'cancelada')),
          criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {}

    try {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS crediario_pagamentos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          loja_id INTEGER NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
          parcela_id INTEGER NOT NULL REFERENCES crediario_parcelas(id) ON DELETE CASCADE,
          caixa_sessao_id INTEGER REFERENCES caixa_sessoes(id) ON DELETE SET NULL,
          valor REAL NOT NULL,
          forma_pagamento TEXT NOT NULL CHECK(forma_pagamento IN ('dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'transferencia', 'credito_cliente')),
          data DATE NOT NULL,
          recebido_por INTEGER NOT NULL REFERENCES usuarios(id),
          juros_cobrado REAL NOT NULL DEFAULT 0.0,
          multa_cobrada REAL NOT NULL DEFAULT 0.0,
          desconto REAL NOT NULL DEFAULT 0.0,
          observacao TEXT,
          criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {}

    try {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS crediario_historico_cliente (
          cliente_id INTEGER PRIMARY KEY REFERENCES clientes(id) ON DELETE CASCADE,
          loja_id INTEGER NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
          total_comprado REAL NOT NULL DEFAULT 0.0,
          total_pago REAL NOT NULL DEFAULT 0.0,
          saldo_devedor_atual REAL NOT NULL DEFAULT 0.0,
          qtd_contratos INTEGER NOT NULL DEFAULT 0,
          qtd_parcelas_pagas INTEGER NOT NULL DEFAULT 0,
          qtd_atrasos INTEGER NOT NULL DEFAULT 0,
          maior_atraso_dias INTEGER NOT NULL DEFAULT 0,
          ultimo_atraso_em DATETIME,
          score_calculado INTEGER NOT NULL DEFAULT 100,
          atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {}

    try {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS crediario_cobrancas_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          loja_id INTEGER NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
          parcela_id INTEGER NOT NULL REFERENCES crediario_parcelas(id) ON DELETE CASCADE,
          cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
          tipo_mensagem TEXT NOT NULL CHECK(tipo_mensagem IN ('lembrete', 'atraso_1', 'atraso_2', 'atraso_3')),
          canal TEXT NOT NULL CHECK(canal IN ('whatsapp', 'sms', 'email')),
          telefone_ou_email TEXT,
          mensagem_enviada TEXT,
          enviada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          status_envio TEXT NOT NULL DEFAULT 'enviado' CHECK(status_envio IN ('pendente', 'enviado', 'falha'))
        );
      `);
    } catch (e) {}

    try {
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS auditoria_crediario (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          loja_id INTEGER NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
          usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
          acao TEXT NOT NULL,
          entidade_tipo TEXT NOT NULL,
          entidade_id INTEGER NOT NULL,
          detalhes_json TEXT,
          justificativa TEXT,
          criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {}

    // Criar índices do Crediário
    try {
      dbInstance.run(`CREATE INDEX IF NOT EXISTS idx_crediario_contratos_loja ON crediario_contratos(loja_id);`);
      dbInstance.run(`CREATE INDEX IF NOT EXISTS idx_crediario_contratos_cli ON crediario_contratos(cliente_id);`);
      dbInstance.run(`CREATE INDEX IF NOT EXISTS idx_crediario_contratos_status ON crediario_contratos(status);`);
      dbInstance.run(`CREATE INDEX IF NOT EXISTS idx_crediario_parcelas_loja ON crediario_parcelas(loja_id);`);
      dbInstance.run(`CREATE INDEX IF NOT EXISTS idx_crediario_parcelas_contrato ON crediario_parcelas(contrato_id);`);
      dbInstance.run(`CREATE INDEX IF NOT EXISTS idx_crediario_parcelas_venc ON crediario_parcelas(data_vencimento);`);
      dbInstance.run(`CREATE INDEX IF NOT EXISTS idx_crediario_parcelas_status ON crediario_parcelas(status);`);
      dbInstance.run(`CREATE INDEX IF NOT EXISTS idx_crediario_pagamentos_loja ON crediario_pagamentos(loja_id);`);
      dbInstance.run(`CREATE INDEX IF NOT EXISTS idx_crediario_pagamentos_parc ON crediario_pagamentos(parcela_id);`);
      dbInstance.run(`CREATE INDEX IF NOT EXISTS idx_crediario_pagamentos_data ON crediario_pagamentos(data);`);
      dbInstance.run(`CREATE INDEX IF NOT EXISTS idx_crediario_cobrancas_duplicidade ON crediario_cobrancas_log(parcela_id, tipo_mensagem);`);
      dbInstance.run(`CREATE INDEX IF NOT EXISTS idx_auditoria_crediario_loja ON auditoria_crediario(loja_id);`);
    } catch (e) {}

    saveDatabase();
  } else {
    dbInstance = new SQL.Database();
    console.log('[Database] Novo banco SQLite criado em memória.');
    
    // Ler schema.sql e executar
    const schemaPath = path.join(__dirname, '../../schema.sql');
    let schemaSql = '';
    if (fs.existsSync(schemaPath)) {
      schemaSql = fs.readFileSync(schemaPath, 'utf8');
    } else {
      const rootSchema = path.join(process.cwd(), 'schema.sql');
      if (fs.existsSync(rootSchema)) {
        schemaSql = fs.readFileSync(rootSchema, 'utf8');
      }
    }

    if (schemaSql) {
      dbInstance.run(schemaSql);
      console.log('[Database] Schema executado com sucesso.');
      await seedDefaultData(dbInstance);
      saveDatabase();
    }
  }

  return dbInstance;
}

let inTransaction = false;

export function saveDatabase(): void {
  if (inTransaction || !dbInstance || !dbFilePath) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbFilePath, buffer);
  } catch (err) {
    console.error('[Database] Erro ao salvar banco no disco:', err);
  }
}

export function getDb(): Database {
  if (!dbInstance) {
    throw new Error('Banco de dados não inicializado. Chame initDatabase() primeiro.');
  }
  return dbInstance;
}

// Helper para executar consultas que retornam múltiplos registros
export function dbAll<T = any>(sql: string, params: any[] = []): T[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return results;
}

// Helper para consulta de um único registro
export function dbGet<T = any>(sql: string, params: any[] = []): T | null {
  const list = dbAll<T>(sql, params);
  return list.length > 0 ? list[0] : null;
}

// Helper para insert/update/delete
export function dbRun(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
  const db = getDb();
  if (params && params.length > 0) {
    db.run(sql, params);
  } else {
    db.run(sql);
  }
  
  let lastInsertRowid = 0;
  let changes = 0;
  try {
    const res = db.exec('SELECT last_insert_rowid() as id, changes() as count');
    if (res && res.length > 0 && res[0].values && res[0].values.length > 0) {
      lastInsertRowid = Number(res[0].values[0][0]) || 0;
      changes = Number(res[0].values[0][1]) || 0;
    }
  } catch (e) {
    // fallback
  }

  saveDatabase();
  return {
    lastInsertRowid,
    changes
  };
}

// Transação atômica
export function dbTransaction<T>(callback: () => T): T {
  const db = getDb();
  inTransaction = true;
  try {
    db.run('BEGIN TRANSACTION;');
  } catch (e) {
    // Caso já esteja em transação
  }
  try {
    const result = callback();
    try {
      db.run('COMMIT;');
    } catch (cErr) {
      // Ignora caso autocommit
    }
    inTransaction = false;
    saveDatabase();
    return result;
  } catch (error) {
    try {
      db.run('ROLLBACK;');
    } catch (rbErr) {
      // Ignora erro se a transação já foi abortada pelo SQLite
    }
    inTransaction = false;
    console.error('[Database Transaction Error]:', error);
    throw error;
  }
}

// Seed de dados iniciais caso o banco seja novo
async function seedDefaultData(db: Database): Promise<void> {
  console.log('[Database] Inserindo dados iniciais (seed)...');
  
  // Hash das senhas
  const hashAdmin = bcrypt.hashSync('admin123', 8);
  const hashVendedor = bcrypt.hashSync('123456', 8);

  // 1. Usuários padrão
  db.run(
    `INSERT INTO usuarios (nome, login, senha_hash, perfil, ativo) VALUES 
      (?, ?, ?, ?, 1),
      (?, ?, ?, ?, 1);`,
    ['Administrador', 'admin', hashAdmin, 'admin', 'Vendedor Padrão', 'vendedor', hashVendedor, 'vendedor']
  );

  // 2. Fornecedores padrão
  db.run(
    `INSERT INTO fornecedores (nome, cnpj, telefone, email, endereco) VALUES
      ('Confecções & Moda Brasil', '12.345.678/0001-90', '(11) 98765-4321', 'vendas@modabrasil.com.br', 'Rua das Confecções, 500 - Brás, SP'),
      ('Calçados & Acessórios Express', '98.765.432/0001-10', '(11) 3322-1100', 'contato@calcados.com.br', 'Av. das Fábricas, 120 - Franca, SP'),
      ('Distribuidora Nacional de Bebidas & Conveniência', '45.123.789/0001-55', '(11) 4002-8922', 'suporte@distribuidora.com.br', 'Av. Comercial, 88 - SP');`
  );

  // 3. Clientes padrão com CPFs válidos
  db.run(
    `INSERT INTO clientes (nome, cpf_cnpj, telefone, email, endereco, cidade, estado, cep) VALUES
      ('Consumidor Final', '000.000.000-00', '(11) 90000-0000', 'consumidor@wsgestao.com.br', 'Balcão da Loja', 'São Paulo', 'SP', '01000-000'),
      ('Carlos Eduardo Silva', '073.492.839-44', '(11) 99887-7665', 'carlos.silva@email.com', 'Rua Augusta, 1500, Apto 42', 'São Paulo', 'SP', '01305-100'),
      ('Mariana Souza Lima', '924.582.170-80', '(11) 97112-3344', 'mariana.souza@email.com', 'Av. Paulista, 2000, Cj 51', 'São Paulo', 'SP', '01310-200');`
  );

  // 4. Produtos padrão com Fotos e Tamanhos
  db.run(
    `INSERT INTO produtos (codigo, nome, descricao, categoria, unidade_medida, tamanho, cor, imagem_url, preco_custo, preco_venda, estoque_atual, estoque_minimo, estoque_maximo, data_validade, fornecedor_id, ativo) VALUES
      ('7891001001', 'Camiseta Básica 100% Algodão', 'Camiseta unissex fio 30 penteado premium', 'Vestuário', 'UN', 'M', 'Preto', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=60', 25.00, 59.90, 35, 10, 100, NULL, 1, 1),
      ('7891001002', 'Camiseta Básica 100% Algodão', 'Camiseta unissex fio 30 penteado premium', 'Vestuário', 'UN', 'G', 'Branco', 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500&auto=format&fit=crop&q=60', 25.00, 59.90, 28, 10, 100, NULL, 1, 1),
      ('7891002001', 'Calça Jeans Slim Confort', 'Jeans com elastano lavagem moderna', 'Vestuário', 'UN', '42', 'Azul Escuro', 'https://images.unsplash.com/photo-1542272604-780c96856592?w=500&auto=format&fit=crop&q=60', 55.00, 129.90, 18, 5, 50, NULL, 1, 1),
      ('7891002002', 'Vestido Floral Verão Elegance', 'Tecido leve e fresco com estampa floral', 'Vestuário', 'UN', 'P', 'Estampado', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&auto=format&fit=crop&q=60', 48.00, 119.00, 12, 4, 30, NULL, 1, 1),
      ('7891003001', 'Tênis Esportivo Casual Street', 'Solado macio amortecimento em EVA', 'Calçados', 'PAR', '41', 'Cinza/Branco', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&auto=format&fit=crop&q=60', 79.00, 179.90, 14, 4, 40, NULL, 2, 1),
      ('7891004001', 'Boné Aba Curva Trucker', 'Fecho ajustável bordado frontal', 'Acessórios', 'UN', 'Único', 'Preto', 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&auto=format&fit=crop&q=60', 18.00, 45.00, 22, 6, 60, NULL, 2, 1),
      ('78920001001', 'Refrigerante Coca-Cola 350ml', 'Lata de alumínio 350ml gelada', 'Bebidas', 'UN', '350ml', 'Padrão', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60', 2.80, 6.00, 48, 12, 120, '2027-12-31', 3, 1),
      ('78920002001', 'Chocolate Barra Nestlé Classic 80g', 'Chocolate ao leite', 'Doces', 'UN', '80g', 'Ao Leite', 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&auto=format&fit=crop&q=60', 3.20, 7.50, 8, 15, 50, '2027-03-20', 3, 1);`
  );

  // 5. Configurações da Loja
  db.run(
    `INSERT INTO configuracoes (chave, valor) VALUES
      ('nome_loja', 'WS Gestão PDV - Loja Modelo'),
      ('cnpj', '12.345.678/0001-90'),
      ('telefone', '(11) 3322-4455'),
      ('endereco', 'Av. Comercial, 1000 - Centro'),
      ('cidade_uf', 'São Paulo - SP'),
      ('logo_url', 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=150&auto=format&fit=crop&q=80'),
      ('mostrar_logo_fundo_pdv', '1'),
      ('rodape_cupom', 'Obrigado pela preferência! Volte sempre.'),
      ('fiscal_provider', 'focus_nfe'),
      ('fiscal_url', 'https://api.focusnfe.com.br/v2'),
      ('fiscal_token', 'TOKEN_DEMO_WSGESTAO_2026'),
      ('fiscal_ambiente', 'homologacao');`
  );

  // 6. Loja Inicial Vinculada
  try {
    db.run(
      `INSERT INTO lojas (id, nome_fantasia, razao_social, cnpj_cpf, email, telefone, whatsapp, endereco, cidade, estado, cep, logo_url, slogan, slug_catalogo, bio, plano, chave_api_sync, ativo)
       VALUES (1, 'NexPDV - Moda & Loja Modelo', 'NexPDV Comércio e Varejo Ltda', '12.345.678/0001-90', 'contato@lojamodelo.com.br', '(11) 3322-4455', '(11) 99887-6655', 'Av. Comercial, 1000 - Centro', 'São Paulo', 'SP', '01000-000', 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=150&auto=format&fit=crop&q=80', 'A melhor experiência para você e sua família', 'lojamodelo', 'Moda feminina, masculina, calçados e conveniência.', 'pro', 'SYNC_NEX_STORE_001', 1);`
    );
  } catch (e) {}

  // 7. Assinatura Padrão (Plano Grátis)
  try {
    db.run(
      `INSERT INTO assinatura (id, plano_atual, status, data_inicio, trial_usado)
       VALUES (1, 'gratis', 'ativo', CURRENT_TIMESTAMP, 0);`
    );
  } catch (e) {}

  console.log('[Database] Seed concluído com sucesso.');
}

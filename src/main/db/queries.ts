import bcrypt from 'bcryptjs';
import { dbAll, dbGet, dbRun, dbTransaction } from './database';
import { getNowSaoPauloSql, getTodaySaoPauloDate } from '../utils/datetime';

// ==========================================
// 1. USUÁRIOS & AUTENTICAÇÃO
// ==========================================
export interface Usuario {
  id: number;
  nome: string;
  login: string;
  perfil: 'admin' | 'gerente' | 'vendedor';
  ativo: number;
  criado_em: string;
}

export function autenticarUsuario(login: string, senhaPlana: string): Usuario | null {
  const usuario = dbGet<any>('SELECT * FROM usuarios WHERE login = ? AND ativo = 1', [login]);
  if (!usuario) return null;

  let senhaValida = false;
  try {
    senhaValida = bcrypt.compareSync(senhaPlana, usuario.senha_hash);
  } catch (e) {
    senhaValida = false;
  }
  if (!senhaValida && usuario.senha_hash === senhaPlana) {
    senhaValida = true;
    try {
      const novoHash = bcrypt.hashSync(senhaPlana, 8);
      dbRun('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [novoHash, usuario.id]);
    } catch (e) {}
  }
  if (!senhaValida) return null;

  const { senha_hash, ...dadosPublicos } = usuario;
  return dadosPublicos as Usuario;
}

export function listarUsuarios(): Usuario[] {
  return dbAll<Usuario>('SELECT id, nome, login, perfil, ativo, criado_em FROM usuarios ORDER BY nome ASC');
}

export function criarUsuario(nome: string, login: string, senhaPlana: string, perfil: 'admin' | 'gerente' | 'vendedor'): number {
  const hash = bcrypt.hashSync(senhaPlana, 8);
  const res = dbRun('INSERT INTO usuarios (nome, login, senha_hash, perfil, ativo) VALUES (?, ?, ?, ?, 1)', [
    nome,
    login,
    hash,
    perfil
  ]);
  return res.lastInsertRowid;
}

export function atualizarUsuario(id: number, nome: string, perfil: 'admin' | 'gerente' | 'vendedor', ativo: number, novaSenha?: string): void {
  if (novaSenha && novaSenha.trim().length > 0) {
    const hash = bcrypt.hashSync(novaSenha, 8);
    dbRun('UPDATE usuarios SET nome = ?, perfil = ?, ativo = ?, senha_hash = ? WHERE id = ?', [
      nome,
      perfil,
      ativo,
      hash,
      id
    ]);
  } else {
    dbRun('UPDATE usuarios SET nome = ?, perfil = ?, ativo = ? WHERE id = ?', [
      nome,
      perfil,
      ativo,
      id
    ]);
  }
}

// Controle de tentativas de liberação em memória (5 falhas = 60s de bloqueio)
const tentativasGerenteMap = new Map<number, { falhas: number; bloqueadoAte?: number }>();

export interface ResultadoAutorizacaoGerente {
  sucesso: boolean;
  erro?: 'USUARIO_NAO_ENCONTRADO' | 'SENHA_INCORRETA' | 'PERFIL_INVALIDO' | 'USUARIO_INATIVO' | 'BLOQUEADO_TENTATIVAS';
  mensagem: string;
  usuario?: {
    id: number;
    nome: string;
    perfil: string;
  };
  tentativasRestantes?: number;
  tempoBloqueioRestante?: number;
}

export function autorizarGerente(
  usuarioId: number,
  senhaPlana: string,
  dadosAuditoria: {
    usuario_operador_id?: number;
    usuario_operador_nome?: string;
    cliente_id?: number;
    cliente_nome?: string;
    valor_venda?: number;
    motivo?: string;
  }
): ResultadoAutorizacaoGerente {
  const agora = Date.now();
  const registro = tentativasGerenteMap.get(usuarioId) || { falhas: 0 };

  // 1. Verificar se está bloqueado por excesso de tentativas
  if (registro.bloqueadoAte && registro.bloqueadoAte > agora) {
    const segRestantes = Math.ceil((registro.bloqueadoAte - agora) / 1000);
    return {
      sucesso: false,
      erro: 'BLOQUEADO_TENTATIVAS',
      mensagem: `Usuário temporariamente bloqueado por excesso de tentativas. Aguarde ${segRestantes} segundos.`,
      tempoBloqueioRestante: segRestantes
    };
  }

  // 2. Buscar usuário no banco
  const usuario = dbGet<any>('SELECT * FROM usuarios WHERE id = ?', [usuarioId]);
  if (!usuario) {
    dbRun(
      `INSERT INTO auditoria_autorizacoes 
      (usuario_autorizador_id, usuario_autorizador_nome, usuario_operador_id, usuario_operador_nome, cliente_id, cliente_nome, valor_venda, motivo, sucesso, mensagem)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        usuarioId,
        'Desconhecido',
        dadosAuditoria.usuario_operador_id || null,
        dadosAuditoria.usuario_operador_nome || null,
        dadosAuditoria.cliente_id || null,
        dadosAuditoria.cliente_nome || null,
        dadosAuditoria.valor_venda || null,
        dadosAuditoria.motivo || 'Autorização de Gerente',
        'Usuário não encontrado.'
      ]
    );
    return {
      sucesso: false,
      erro: 'USUARIO_NAO_ENCONTRADO',
      mensagem: 'Usuário não encontrado.'
    };
  }

  // 3. Verificar se está ativo
  if (!usuario.ativo) {
    return {
      sucesso: false,
      erro: 'USUARIO_INATIVO',
      mensagem: 'Este usuário está inativo no sistema.'
    };
  }

  // 4. Verificar perfil (admin ou gerente case-insensitive)
  const perfilNorm = (usuario.perfil || '').toLowerCase().trim();
  const isGerenteOuAdmin = perfilNorm === 'admin' || perfilNorm === 'gerente' || perfilNorm === 'administrador';
  if (!isGerenteOuAdmin) {
    dbRun(
      `INSERT INTO auditoria_autorizacoes 
      (usuario_autorizador_id, usuario_autorizador_nome, usuario_operador_id, usuario_operador_nome, cliente_id, cliente_nome, valor_venda, motivo, sucesso, mensagem)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        usuario.id,
        usuario.nome,
        dadosAuditoria.usuario_operador_id || null,
        dadosAuditoria.usuario_operador_nome || null,
        dadosAuditoria.cliente_id || null,
        dadosAuditoria.cliente_nome || null,
        dadosAuditoria.valor_venda || null,
        dadosAuditoria.motivo || 'Autorização de Gerente',
        'Usuário sem permissão de Gerente/Administrador.'
      ]
    );
    return {
      sucesso: false,
      erro: 'PERFIL_INVALIDO',
      mensagem: 'Usuário sem permissão de Gerente/Administrador.'
    };
  }

  // 5. Validar senha via hash bcrypt (com fallback seguro para texto plano legado)
  let senhaValida = false;
  try {
    senhaValida = bcrypt.compareSync(senhaPlana, usuario.senha_hash);
  } catch (e) {
    senhaValida = false;
  }
  if (!senhaValida && usuario.senha_hash === senhaPlana) {
    senhaValida = true;
    try {
      const novoHash = bcrypt.hashSync(senhaPlana, 8);
      dbRun('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [novoHash, usuario.id]);
    } catch (e) {}
  }

  if (!senhaValida) {
    registro.falhas = (registro.falhas || 0) + 1;
    if (registro.falhas >= 5) {
      registro.bloqueadoAte = agora + 60000; // 60 segundos de bloqueio
      registro.falhas = 0;
      tentativasGerenteMap.set(usuarioId, registro);
      dbRun(
        `INSERT INTO auditoria_autorizacoes 
        (usuario_autorizador_id, usuario_autorizador_nome, usuario_operador_id, usuario_operador_nome, cliente_id, cliente_nome, valor_venda, motivo, sucesso, mensagem)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          usuario.id,
          usuario.nome,
          dadosAuditoria.usuario_operador_id || null,
          dadosAuditoria.usuario_operador_nome || null,
          dadosAuditoria.cliente_id || null,
          dadosAuditoria.cliente_nome || null,
          dadosAuditoria.valor_venda || null,
          dadosAuditoria.motivo || 'Autorização de Gerente',
          'Senha incorreta - Bloqueado por 60 segundos.'
        ]
      );
      return {
        sucesso: false,
        erro: 'BLOQUEADO_TENTATIVAS',
        mensagem: 'Senha incorreta. Limite de 5 tentativas excedido. Usuário bloqueado por 60 segundos.',
        tempoBloqueioRestante: 60
      };
    } else {
      tentativasGerenteMap.set(usuarioId, registro);
      const restantes = 5 - registro.falhas;
      dbRun(
        `INSERT INTO auditoria_autorizacoes 
        (usuario_autorizador_id, usuario_autorizador_nome, usuario_operador_id, usuario_operador_nome, cliente_id, cliente_nome, valor_venda, motivo, sucesso, mensagem)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          usuario.id,
          usuario.nome,
          dadosAuditoria.usuario_operador_id || null,
          dadosAuditoria.usuario_operador_nome || null,
          dadosAuditoria.cliente_id || null,
          dadosAuditoria.cliente_nome || null,
          dadosAuditoria.valor_venda || null,
          dadosAuditoria.motivo || 'Autorização de Gerente',
          `Senha incorreta. Restam ${restantes} tentativa(s).`
        ]
      );
      return {
        sucesso: false,
        erro: 'SENHA_INCORRETA',
        mensagem: `Senha incorreta. Você possui mais ${restantes} tentativa(s).`,
        tentativasRestantes: restantes
      };
    }
  }

  // 6. Sucesso
  tentativasGerenteMap.delete(usuarioId);
  dbRun(
    `INSERT INTO auditoria_autorizacoes 
    (usuario_autorizador_id, usuario_autorizador_nome, usuario_operador_id, usuario_operador_nome, cliente_id, cliente_nome, valor_venda, motivo, sucesso, mensagem)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      usuario.id,
      usuario.nome,
      dadosAuditoria.usuario_operador_id || null,
      dadosAuditoria.usuario_operador_nome || null,
      dadosAuditoria.cliente_id || null,
      dadosAuditoria.cliente_nome || null,
      dadosAuditoria.valor_venda || null,
      dadosAuditoria.motivo || 'Autorização de Gerente',
      'Autorização concedida com sucesso.'
    ]
  );

  return {
    sucesso: true,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      perfil: usuario.perfil
    },
    mensagem: `Operação autorizada com sucesso por ${usuario.nome}!`
  };
}

export function listarAuditorias(limite: number = 50): any[] {
  return dbAll<any>(
    'SELECT * FROM auditoria_autorizacoes ORDER BY criado_em DESC LIMIT ?',
    [limite]
  );
}

// ==========================================
// 2. FORNECEDORES
// ==========================================
export interface Fornecedor {
  id: number;
  nome: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  criado_em: string;
}

export function listarFornecedores(termo?: string): Fornecedor[] {
  if (termo && termo.trim()) {
    const query = `%${termo.trim()}%`;
    return dbAll<Fornecedor>(
      'SELECT * FROM fornecedores WHERE nome LIKE ? OR cnpj LIKE ? OR email LIKE ? ORDER BY nome ASC',
      [query, query, query]
    );
  }
  return dbAll<Fornecedor>('SELECT * FROM fornecedores ORDER BY nome ASC');
}

export function criarFornecedor(dados: Omit<Fornecedor, 'id' | 'criado_em'>): number {
  const res = dbRun(
    'INSERT INTO fornecedores (nome, cnpj, telefone, email, endereco) VALUES (?, ?, ?, ?, ?)',
    [dados.nome, dados.cnpj || null, dados.telefone || null, dados.email || null, dados.endereco || null]
  );
  return res.lastInsertRowid;
}

export function atualizarFornecedor(id: number, dados: Omit<Fornecedor, 'id' | 'criado_em'>): void {
  dbRun(
    'UPDATE fornecedores SET nome = ?, cnpj = ?, telefone = ?, email = ?, endereco = ? WHERE id = ?',
    [dados.nome, dados.cnpj || null, dados.telefone || null, dados.email || null, dados.endereco || null, id]
  );
}

export function excluirFornecedor(id: number): void {
  dbRun('DELETE FROM fornecedores WHERE id = ?', [id]);
}

// ==========================================
// 3. CLIENTES
// ==========================================
export interface Cliente {
  id: number;
  nome: string;
  cpf_cnpj?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  criado_em: string;
}

export function listarClientes(termo?: string): Cliente[] {
  if (termo && termo.trim()) {
    const query = `%${termo.trim()}%`;
    return dbAll<Cliente>(
      'SELECT * FROM clientes WHERE nome LIKE ? OR cpf_cnpj LIKE ? OR telefone LIKE ? ORDER BY nome ASC',
      [query, query, query]
    );
  }
  return dbAll<Cliente>('SELECT * FROM clientes ORDER BY nome ASC');
}

export function obterClientePorId(id: number): Cliente | null {
  return dbGet<Cliente>('SELECT * FROM clientes WHERE id = ?', [id]) || null;
}

export function criarCliente(dados: Omit<Cliente, 'id' | 'criado_em'>): number {
  const cpfLimpo = dados.cpf_cnpj ? String(dados.cpf_cnpj).replace(/\D/g, '') : null;
  const telLimpo = dados.telefone ? String(dados.telefone).replace(/\D/g, '') : null;
  const cepLimpo = dados.cep ? String(dados.cep).replace(/\D/g, '') : null;

  const res = dbRun(
    'INSERT INTO clientes (nome, cpf_cnpj, telefone, email, endereco, cidade, estado, cep) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      dados.nome,
      cpfLimpo || null,
      telLimpo || null,
      dados.email || null,
      dados.endereco || null,
      dados.cidade || null,
      dados.estado || null,
      cepLimpo || null
    ]
  );
  return res.lastInsertRowid;
}

export function atualizarCliente(id: number, dados: Omit<Cliente, 'id' | 'criado_em'>): void {
  const cpfLimpo = dados.cpf_cnpj ? String(dados.cpf_cnpj).replace(/\D/g, '') : null;
  const telLimpo = dados.telefone ? String(dados.telefone).replace(/\D/g, '') : null;
  const cepLimpo = dados.cep ? String(dados.cep).replace(/\D/g, '') : null;

  dbRun(
    'UPDATE clientes SET nome = ?, cpf_cnpj = ?, telefone = ?, email = ?, endereco = ?, cidade = ?, estado = ?, cep = ? WHERE id = ?',
    [
      dados.nome,
      cpfLimpo || null,
      telLimpo || null,
      dados.email || null,
      dados.endereco || null,
      dados.cidade || null,
      dados.estado || null,
      cepLimpo || null,
      id
    ]
  );
}

export function excluirCliente(id: number): void {
  dbRun('DELETE FROM clientes WHERE id = ?', [id]);
}

// ==========================================
// 4. PRODUTOS
// ==========================================
export interface Produto {
  id: number;
  codigo?: string;
  codigo_extra?: string;
  ean_gtin?: string;
  nome: string;
  descricao?: string;
  categoria?: string;
  subcategoria?: string;
  marca?: string;
  peso_liquido?: number;
  peso_bruto?: number;
  localizacao?: string;
  unidade_medida: string;
  tamanho?: string;
  cor?: string;
  imagem_url?: string;
  preco_custo: number;
  preco_venda: number;
  preco_venda_automatico?: number;
  preco_alteravel_venda?: number;
  controlar_estoque?: number;
  estoque_atual: number;
  estoque_minimo: number;
  estoque_maximo: number;
  permite_fracionamento?: number;
  observacao?: string;
  is_kit?: number;
  kit_itens?: string;
  ncm?: string;
  cest?: string;
  cfop?: string;
  origem?: number;
  csosn_cst?: string;
  aliquota_icms?: number;
  aliquota_pis?: number;
  aliquota_cofins?: number;
  codigo_fornecedor?: string;
  comissao_percentual?: number;
  pontos_fidelidade?: number;
  lote?: string;
  data_fabricacao?: string;
  data_validade?: string;
  dias_aviso_vencimento?: number;
  fornecedor_id?: number;
  fornecedor_nome?: string;
  ativo: number;
  criado_em: string;
}

export function listarProdutos(termo?: string, apenasAtivos: boolean = true): Produto[] {
  let sql = `
    SELECT p.*, f.nome as fornecedor_nome 
    FROM produtos p 
    LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (apenasAtivos) {
    sql += ' AND p.ativo = 1';
  }

  if (termo && termo.trim()) {
    const q = `%${termo.trim()}%`;
    sql += ' AND (p.nome LIKE ? OR p.codigo LIKE ? OR p.codigo_extra LIKE ? OR p.ean_gtin LIKE ? OR p.categoria LIKE ? OR p.marca LIKE ? OR p.tamanho LIKE ? OR p.cor LIKE ?)';
    params.push(q, q, q, q, q, q, q, q);
  }

  sql += ' ORDER BY p.nome ASC';
  return dbAll<Produto>(sql, params);
}

export function buscarProdutoPorCodigoOuNome(busca: string): Produto | null {
  const b = busca.trim();
  const exato = dbGet<Produto>(
    `SELECT p.*, f.nome as fornecedor_nome 
     FROM produtos p 
     LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
     WHERE (p.codigo = ? OR p.codigo_extra = ? OR p.ean_gtin = ? OR p.nome = ?) AND p.ativo = 1 LIMIT 1`,
    [b, b, b, b]
  );
  if (exato) return exato;

  // Tenta por like
  return dbGet<Produto>(
    `SELECT p.*, f.nome as fornecedor_nome 
     FROM produtos p 
     LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
     WHERE (p.codigo LIKE ? OR p.codigo_extra LIKE ? OR p.ean_gtin LIKE ? OR p.nome LIKE ?) AND p.ativo = 1 LIMIT 1`,
    [`%${b}%`, `%${b}%`, `%${b}%`, `%${b}%`]
  );
}

export function criarProduto(dados: Omit<Produto, 'id' | 'criado_em' | 'fornecedor_nome'>): number {
  const res = dbRun(
    `INSERT INTO produtos (
      codigo, codigo_extra, ean_gtin, nome, descricao, categoria, subcategoria, marca,
      peso_liquido, peso_bruto, localizacao, unidade_medida, tamanho, cor, imagem_url,
      preco_custo, preco_venda, preco_venda_automatico, preco_alteravel_venda,
      controlar_estoque, estoque_atual, estoque_minimo, estoque_maximo,
      permite_fracionamento, observacao, is_kit, kit_itens,
      ncm, cest, cfop, origem, csosn_cst, aliquota_icms, aliquota_pis, aliquota_cofins,
      codigo_fornecedor, comissao_percentual, pontos_fidelidade,
      lote, data_fabricacao, data_validade, dias_aviso_vencimento, fornecedor_id, ativo
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )`,
    [
      dados.codigo || null,
      dados.codigo_extra || null,
      dados.ean_gtin || null,
      dados.nome,
      dados.descricao || null,
      dados.categoria || 'Geral',
      dados.subcategoria || null,
      dados.marca || null,
      Number(dados.peso_liquido) || 0,
      Number(dados.peso_bruto) || 0,
      dados.localizacao || null,
      dados.unidade_medida || 'UN',
      dados.tamanho || null,
      dados.cor || null,
      dados.imagem_url || null,
      Number(dados.preco_custo) || 0,
      Number(dados.preco_venda) || 0,
      dados.preco_venda_automatico ? 1 : 0,
      dados.preco_alteravel_venda ? 1 : 0,
      dados.controlar_estoque !== undefined ? (dados.controlar_estoque ? 1 : 0) : 1,
      Number(dados.estoque_atual) || 0,
      Number(dados.estoque_minimo) || 0,
      Number(dados.estoque_maximo) || 0,
      dados.permite_fracionamento ? 1 : 0,
      dados.observacao || null,
      dados.is_kit ? 1 : 0,
      dados.kit_itens || null,
      dados.ncm || null,
      dados.cest || null,
      dados.cfop || null,
      Number(dados.origem) || 0,
      dados.csosn_cst || null,
      Number(dados.aliquota_icms) || 0,
      Number(dados.aliquota_pis) || 0,
      Number(dados.aliquota_cofins) || 0,
      dados.codigo_fornecedor || null,
      Number(dados.comissao_percentual) || 0,
      Number(dados.pontos_fidelidade) || 0,
      dados.lote || null,
      dados.data_fabricacao || null,
      dados.data_validade || null,
      Number(dados.dias_aviso_vencimento) || 30,
      dados.fornecedor_id || null,
      dados.ativo !== undefined ? dados.ativo : 1
    ]
  );
  return res.lastInsertRowid;
}

export function atualizarProduto(id: number, dados: Omit<Produto, 'id' | 'criado_em' | 'fornecedor_nome'>): void {
  dbRun(
    `UPDATE produtos SET 
      codigo = ?, codigo_extra = ?, ean_gtin = ?, nome = ?, descricao = ?, categoria = ?, subcategoria = ?, marca = ?,
      peso_liquido = ?, peso_bruto = ?, localizacao = ?, unidade_medida = ?, tamanho = ?, cor = ?, imagem_url = ?,
      preco_custo = ?, preco_venda = ?, preco_venda_automatico = ?, preco_alteravel_venda = ?,
      controlar_estoque = ?, estoque_atual = ?, estoque_minimo = ?, estoque_maximo = ?,
      permite_fracionamento = ?, observacao = ?, is_kit = ?, kit_itens = ?,
      ncm = ?, cest = ?, cfop = ?, origem = ?, csosn_cst = ?, aliquota_icms = ?, aliquota_pis = ?, aliquota_cofins = ?,
      codigo_fornecedor = ?, comissao_percentual = ?, pontos_fidelidade = ?,
      lote = ?, data_fabricacao = ?, data_validade = ?, dias_aviso_vencimento = ?, fornecedor_id = ?, ativo = ?
    WHERE id = ?`,
    [
      dados.codigo || null,
      dados.codigo_extra || null,
      dados.ean_gtin || null,
      dados.nome,
      dados.descricao || null,
      dados.categoria || 'Geral',
      dados.subcategoria || null,
      dados.marca || null,
      Number(dados.peso_liquido) || 0,
      Number(dados.peso_bruto) || 0,
      dados.localizacao || null,
      dados.unidade_medida || 'UN',
      dados.tamanho || null,
      dados.cor || null,
      dados.imagem_url || null,
      Number(dados.preco_custo) || 0,
      Number(dados.preco_venda) || 0,
      dados.preco_venda_automatico ? 1 : 0,
      dados.preco_alteravel_venda ? 1 : 0,
      dados.controlar_estoque !== undefined ? (dados.controlar_estoque ? 1 : 0) : 1,
      Number(dados.estoque_atual) || 0,
      Number(dados.estoque_minimo) || 0,
      Number(dados.estoque_maximo) || 0,
      dados.permite_fracionamento ? 1 : 0,
      dados.observacao || null,
      dados.is_kit ? 1 : 0,
      dados.kit_itens || null,
      dados.ncm || null,
      dados.cest || null,
      dados.cfop || null,
      Number(dados.origem) || 0,
      dados.csosn_cst || null,
      Number(dados.aliquota_icms) || 0,
      Number(dados.aliquota_pis) || 0,
      Number(dados.aliquota_cofins) || 0,
      dados.codigo_fornecedor || null,
      Number(dados.comissao_percentual) || 0,
      Number(dados.pontos_fidelidade) || 0,
      dados.lote || null,
      dados.data_fabricacao || null,
      dados.data_validade || null,
      Number(dados.dias_aviso_vencimento) || 30,
      dados.fornecedor_id || null,
      dados.ativo !== undefined ? dados.ativo : 1,
      id
    ]
  );
}

export function excluirProduto(id: number): void {
  dbRun('DELETE FROM produtos WHERE id = ?', [id]);
}

// ==========================================
// 5. CAIXA & SESSÕES
// ==========================================
export interface CaixaSessao {
  id: number;
  usuario_id: number;
  usuario_nome?: string;
  data_abertura: string;
  valor_abertura: number;
  data_fechamento?: string;
  valor_fechamento_informado?: number;
  valor_fechamento_sistema?: number;
  diferenca?: number;
  status: 'aberto' | 'fechado';
}

export interface CaixaMovimentacao {
  id: number;
  caixa_sessao_id: number;
  usuario_id: number;
  usuario_nome?: string;
  tipo: 'suprimento' | 'sangria';
  valor: number;
  motivo: string;
  data_hora: string;
}

export function getCaixaAberto(usuarioId?: number): CaixaSessao | null {
  let sql = `
    SELECT c.*, u.nome as usuario_nome 
    FROM caixa_sessoes c 
    JOIN usuarios u ON c.usuario_id = u.id 
    WHERE c.status = 'aberto'
  `;
  const params: any[] = [];
  if (usuarioId) {
    sql += ' AND c.usuario_id = ?';
    params.push(usuarioId);
  }
  sql += ' ORDER BY c.id DESC LIMIT 1';
  return dbGet<CaixaSessao>(sql, params);
}

export function abrirCaixa(usuarioId: number, valorAbertura: number): number {
  const atual = getCaixaAberto(usuarioId);
  if (atual) {
    throw new Error(`Já existe uma sessão de caixa aberta (ID #${atual.id}) para este usuário.`);
  }

  const dataAbertura = getNowSaoPauloSql();
  const res = dbRun(
    'INSERT INTO caixa_sessoes (usuario_id, valor_abertura, status, data_abertura) VALUES (?, ?, "aberto", ?)',
    [usuarioId, Number(valorAbertura) || 0, dataAbertura]
  );
  return res.lastInsertRowid;
}

export function registrarSuprimento(caixaId: number, usuarioId: number, valor: number, motivo: string): number {
  const caixa = dbGet<CaixaSessao>('SELECT * FROM caixa_sessoes WHERE id = ? AND status = "aberto"', [caixaId]);
  if (!caixa) {
    throw new Error('Sessão de caixa não encontrada ou já encerrada.');
  }
  if (!valor || Number(valor) <= 0) {
    throw new Error('O valor do suprimento deve ser maior que zero.');
  }

  const dataHora = getNowSaoPauloSql();
  const res = dbRun(
    'INSERT INTO caixa_movimentacoes (caixa_sessao_id, usuario_id, tipo, valor, motivo, data_hora) VALUES (?, ?, "suprimento", ?, ?, ?)',
    [caixaId, usuarioId, Number(valor), motivo || 'Suprimento de caixa', dataHora]
  );
  return res.lastInsertRowid;
}

export function registrarSangria(caixaId: number, usuarioId: number, valor: number, motivo: string): number {
  const caixa = dbGet<CaixaSessao>('SELECT * FROM caixa_sessoes WHERE id = ? AND status = "aberto"', [caixaId]);
  if (!caixa) {
    throw new Error('Sessão de caixa não encontrada ou já encerrada.');
  }
  if (!valor || Number(valor) <= 0) {
    throw new Error('O valor da sangria deve ser maior que zero.');
  }

  const dataHora = getNowSaoPauloSql();
  const res = dbRun(
    'INSERT INTO caixa_movimentacoes (caixa_sessao_id, usuario_id, tipo, valor, motivo, data_hora) VALUES (?, ?, "sangria", ?, ?, ?)',
    [caixaId, usuarioId, Number(valor), motivo || 'Sangria de caixa', dataHora]
  );
  return res.lastInsertRowid;
}

export function listarMovimentacoesCaixa(caixaId: number): CaixaMovimentacao[] {
  return dbAll<CaixaMovimentacao>(
    `SELECT m.*, u.nome as usuario_nome
     FROM caixa_movimentacoes m
     JOIN usuarios u ON m.usuario_id = u.id
     WHERE m.caixa_sessao_id = ?
     ORDER BY m.id ASC`,
    [caixaId]
  );
}

export interface ResumoFechamentoCaixa {
  caixa_id: number;
  valor_abertura: number;
  total_suprimentos: number;
  total_sangrias: number;
  total_vendas: number;
  vendas_por_forma: { [forma: string]: number };
  total_sistema: number; // Abertura + Suprimentos - Sangrias + Vendas em Dinheiro
  qtd_vendas: number;
  movimentacoes: CaixaMovimentacao[];
}

export function getResumoFechamento(caixaId: number): ResumoFechamentoCaixa {
  const caixa = dbGet<CaixaSessao>('SELECT * FROM caixa_sessoes WHERE id = ?', [caixaId]);
  if (!caixa) throw new Error('Sessão de caixa não encontrada.');

  const movimentacoes = listarMovimentacoesCaixa(caixaId);
  let total_suprimentos = 0;
  let total_sangrias = 0;

  for (const mov of movimentacoes) {
    if (mov.tipo === 'suprimento') {
      total_suprimentos += Number(mov.valor) || 0;
    } else if (mov.tipo === 'sangria') {
      total_sangrias += Number(mov.valor) || 0;
    }
  }

  // 1. Buscar formas a partir de vendas_pagamentos vinculadas a este caixa e vendas concluídas
  const pagamentos = dbAll<{ forma_pagamento: string; valor: number }>(
    `SELECT vp.forma_pagamento, vp.valor
     FROM vendas_pagamentos vp
     JOIN vendas v ON vp.venda_id = v.id
     WHERE vp.caixa_sessao_id = ? AND v.status = 'concluida'`,
    [caixaId]
  );

  const vendas_por_forma: { [forma: string]: number } = {
    dinheiro: 0,
    cartao_credito: 0,
    cartao_debito: 0,
    pix: 0,
    crediario: 0,
    fiado: 0,
    cheque: 0,
    outros: 0
  };

  let total_vendas = 0;

  if (pagamentos.length > 0) {
    for (const p of pagamentos) {
      const forma = p.forma_pagamento || 'dinheiro';
      vendas_por_forma[forma] = (vendas_por_forma[forma] || 0) + Number(p.valor);
      total_vendas += Number(p.valor);
    }
  } else {
    // Fallback para vendas que não tiveram pagamentos registrados em vendas_pagamentos
    const vendas = dbAll<{ total: number; forma_pagamento: string }>(
      'SELECT total, forma_pagamento FROM vendas WHERE caixa_sessao_id = ? AND status = "concluida"',
      [caixaId]
    );
    for (const v of vendas) {
      const forma = v.forma_pagamento || 'dinheiro';
      vendas_por_forma[forma] = (vendas_por_forma[forma] || 0) + Number(v.total);
      total_vendas += Number(v.total);
    }
  }

  const qtdVendasRow = dbGet<{ total_vendas: number }>(
    'SELECT COUNT(id) as total_vendas FROM vendas WHERE caixa_sessao_id = ? AND status = "concluida"',
    [caixaId]
  );
  const qtd_vendas = Number(qtdVendasRow?.total_vendas) || 0;

  // Total do sistema em caixa físico (Dinheiro em gaveta = abertura + suprimentos - sangrias + vendas em dinheiro)
  const total_dinheiro_gaveta = (caixa.valor_abertura || 0) + total_suprimentos - total_sangrias + (vendas_por_forma.dinheiro || 0);

  return {
    caixa_id: caixaId,
    valor_abertura: caixa.valor_abertura || 0,
    total_suprimentos,
    total_sangrias,
    total_vendas,
    vendas_por_forma,
    total_sistema: total_dinheiro_gaveta,
    qtd_vendas,
    movimentacoes
  };
}

export function fecharCaixa(caixaId: number, valorInformadoDinheiro: number): CaixaSessao {
  return dbTransaction(() => {
    const resumo = getResumoFechamento(caixaId);
    const diferenca = Number(valorInformadoDinheiro) - resumo.total_sistema;
    const dataFechamento = getNowSaoPauloSql();

    dbRun(
      `UPDATE caixa_sessoes SET 
        data_fechamento = ?,
        valor_fechamento_informado = ?,
        valor_fechamento_sistema = ?,
        diferenca = ?,
        status = 'fechado'
      WHERE id = ?`,
      [dataFechamento, Number(valorInformadoDinheiro), resumo.total_sistema, diferenca, caixaId]
    );

    const atualizado = dbGet<CaixaSessao>('SELECT * FROM caixa_sessoes WHERE id = ?', [caixaId]);
    return atualizado!;
  });
}

export function listarSessoesCaixa(limit: number = 30): CaixaSessao[] {
  return dbAll<CaixaSessao>(
    `SELECT c.*, u.nome as usuario_nome 
     FROM caixa_sessoes c 
     JOIN usuarios u ON c.usuario_id = u.id 
     ORDER BY c.id DESC LIMIT ?`,
    [limit]
  );
}

// ==========================================
// 6. PDV & VENDAS
// ==========================================
export interface ItemVendaPayload {
  produto_id: number;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

export interface VendaPagamentoPayload {
  forma_pagamento: string;
  valor: number;
  troco?: number;
}

export interface VendaPayload {
  cliente_id?: number;
  usuario_id: number;
  caixa_sessao_id: number;
  tipo_operacao?: 'venda' | 'pedido' | 'orcamento' | 'devolucao';
  status_pedido?: 'concluida' | 'aberto' | 'em_separacao' | 'entregue' | 'cancelado' | 'orcamento';
  subtotal: number;
  desconto: number;
  total: number;
  forma_pagamento: string; // 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'crediario' | 'fiado' | 'cheque' | 'multiplo'
  valor_pago?: number;
  troco?: number;
  salvar_troco_credito?: number;
  observacoes?: string;
  dados_entrega_json?: string;
  pagamentos?: VendaPagamentoPayload[];
  itens: ItemVendaPayload[];
}

export interface Venda {
  id: number;
  cliente_id?: number;
  cliente_nome?: string;
  usuario_id: number;
  usuario_nome?: string;
  caixa_sessao_id: number;
  tipo_operacao: 'venda' | 'pedido' | 'orcamento' | 'devolucao';
  status_pedido?: 'concluida' | 'aberto' | 'em_separacao' | 'entregue' | 'cancelado' | 'orcamento';
  data_venda: string;
  subtotal: number;
  desconto: number;
  total: number;
  forma_pagamento: string;
  valor_pago?: number;
  troco?: number;
  salvar_troco_credito?: number;
  observacoes?: string;
  dados_entrega_json?: string;
  status: 'concluida' | 'cancelada';
  nota_fiscal_id?: number;
}

export interface ItemVenda {
  id: number;
  venda_id: number;
  produto_id: number;
  produto_nome: string;
  produto_codigo?: string;
  unidade_medida: string;
  tamanho?: string;
  cor?: string;
  imagem_url?: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

export interface VendaPagamento {
  id: number;
  venda_id: number;
  caixa_sessao_id: number;
  forma_pagamento: string;
  valor: number;
  troco?: number;
  criado_em: string;
}

export function criarVenda(payload: VendaPayload): { vendaId: number; venda: Venda; itens: ItemVenda[]; pagamentos: VendaPagamento[] } {
  // 1. Validar se o caixa está aberto (apenas se for venda ou pedido real)
  const isOrcamento = payload.tipo_operacao === 'orcamento';
  if (!isOrcamento) {
    const caixa = dbGet<CaixaSessao>('SELECT * FROM caixa_sessoes WHERE id = ?', [payload.caixa_sessao_id]);
    if (!caixa || caixa.status !== 'aberto') {
      throw new Error('Não é possível registrar venda: a sessão de caixa está fechada ou inválida.');
    }
  }

  if (!payload.itens || payload.itens.length === 0) {
    throw new Error('A operação deve conter pelo menos um produto.');
  }

  const tipoOperacao = payload.tipo_operacao || 'venda';
  const statusPedido = payload.status_pedido || (tipoOperacao === 'orcamento' ? 'orcamento' : (tipoOperacao === 'pedido' ? 'aberto' : 'concluida'));
  const dataVenda = getNowSaoPauloSql();

  const vendaId = dbTransaction(() => {
    // 2. Inserir registro principal em vendas
    const resVenda = dbRun(
      `INSERT INTO vendas (
        cliente_id, usuario_id, caixa_sessao_id, tipo_operacao, status_pedido,
        data_venda, subtotal, desconto, total, forma_pagamento,
        valor_pago, troco, salvar_troco_credito, observacoes, dados_entrega_json, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'concluida')`,
      [
        payload.cliente_id || null,
        payload.usuario_id,
        payload.caixa_sessao_id,
        tipoOperacao,
        statusPedido,
        dataVenda,
        payload.subtotal,
        payload.desconto,
        payload.total,
        payload.forma_pagamento,
        Number(payload.valor_pago) || payload.total,
        Number(payload.troco) || 0,
        payload.salvar_troco_credito ? 1 : 0,
        payload.observacoes || null,
        payload.dados_entrega_json || null
      ]
    );

    const vId = resVenda.lastInsertRowid;

    // 3. Inserir itens
    for (const item of payload.itens) {
      dbRun(
        `INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, subtotal) 
         VALUES (?, ?, ?, ?, ?)`,
        [vId, item.produto_id, item.quantidade, item.preco_unitario, item.subtotal]
      );

      // Apenas baixa estoque se NÃO for orcamento
      if (tipoOperacao !== 'orcamento') {
        // Baixa no estoque do produto
        dbRun(
          'UPDATE produtos SET estoque_atual = estoque_atual - ? WHERE id = ?',
          [item.quantidade, item.produto_id]
        );

        // Movimentação de estoque
        dbRun(
          `INSERT INTO estoque_movimentacoes (
            produto_id, tipo, quantidade, motivo, referencia_tipo, referencia_id, data_movimentacao
          ) VALUES (?, 'venda', ?, ?, 'venda', ?, ?)`,
          [item.produto_id, item.quantidade, `${tipoOperacao === 'pedido' ? 'Pedido' : 'Venda'} #${vId}`, vId, dataVenda]
        );
      }
    }

    // 4. Inserir pagamentos detalhados em vendas_pagamentos
    if (tipoOperacao !== 'orcamento') {
      if (payload.pagamentos && payload.pagamentos.length > 0) {
        for (const pag of payload.pagamentos) {
          dbRun(
            `INSERT INTO vendas_pagamentos (
              venda_id, caixa_sessao_id, forma_pagamento, valor, troco, criado_em
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [vId, payload.caixa_sessao_id, pag.forma_pagamento, Number(pag.valor), Number(pag.troco) || 0, dataVenda]
          );
        }
      } else {
        dbRun(
          `INSERT INTO vendas_pagamentos (
            venda_id, caixa_sessao_id, forma_pagamento, valor, troco, criado_em
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [vId, payload.caixa_sessao_id, payload.forma_pagamento, payload.total, Number(payload.troco) || 0, dataVenda]
        );
      }
    }

    // 5. Salvar troco como crédito se configurado
    if (payload.salvar_troco_credito && Number(payload.troco) > 0 && payload.cliente_id) {
      dbRun(
        `INSERT INTO creditos_cliente (cliente_id, venda_id, tipo, valor, motivo, criado_em)
         VALUES (?, ?, 'credito', ?, ?, ?)`,
        [payload.cliente_id, vId, Number(payload.troco), `Troco da Venda #${vId} salvo como crédito`, dataVenda]
      );
    }

    // 6. Se for fiado, gera conta a receber vinculada ao cliente
    if (payload.forma_pagamento === 'fiado' && payload.cliente_id) {
      const dataVenc = new Date();
      dataVenc.setDate(dataVenc.getDate() + 30);
      const dataVencStr = dataVenc.toISOString().split('T')[0];

      dbRun(
        `INSERT INTO contas_receber (cliente_id, venda_id, descricao, valor, data_vencimento, status, criado_em)
         VALUES (?, ?, ?, ?, ?, 'pendente', ?)`,
        [payload.cliente_id, vId, `Venda Fiado #${vId}`, payload.total, dataVencStr, dataVenda]
      );
    }

    return vId;
  });

  const detalhes = getVendaDetalhes(vendaId);
  return {
    vendaId,
    venda: detalhes.venda,
    itens: detalhes.itens,
    pagamentos: detalhes.pagamentos
  };
}

export function cancelarVenda(vendaId: number, usuarioId: number): void {
  const usuario = dbGet<Usuario>('SELECT * FROM usuarios WHERE id = ?', [usuarioId]);
  if (!usuario || (usuario.perfil !== 'admin' && usuario.perfil !== 'gerente')) {
    throw new Error('Apenas Administradores e Gerentes possuem permissão para cancelar vendas.');
  }

  const venda = dbGet<Venda>('SELECT * FROM vendas WHERE id = ?', [vendaId]);
  if (!venda) throw new Error('Venda não encontrada.');
  if (venda.status === 'cancelada') throw new Error('Esta venda já foi cancelada anteriormente.');

  const dataCancelamento = getNowSaoPauloSql();

  dbTransaction(() => {
    // 1. Atualizar status da venda
    dbRun('UPDATE vendas SET status = "cancelada" WHERE id = ?', [vendaId]);

    // 2. Estornar estoque dos itens
    const itens = dbAll<{ produto_id: number; quantidade: number }>(
      'SELECT produto_id, quantidade FROM itens_venda WHERE venda_id = ?',
      [vendaId]
    );

    for (const item of itens) {
      dbRun('UPDATE produtos SET estoque_atual = estoque_atual + ? WHERE id = ?', [item.quantidade, item.produto_id]);

      dbRun(
        `INSERT INTO estoque_movimentacoes (
          produto_id, tipo, quantidade, motivo, referencia_tipo, referencia_id, data_movimentacao
        ) VALUES (?, 'cancelamento_venda', ?, ?, 'venda', ?, ?)`,
        [item.produto_id, item.quantidade, `Cancelamento da Venda #${vendaId}`, vendaId, dataCancelamento]
      );
    }
  });
}

export function listarVendas(filtros?: { dataInicio?: string; dataFim?: string; limit?: number }): Venda[] {
  let sql = `
    SELECT v.*, c.nome as cliente_nome, u.nome as usuario_nome
    FROM vendas v
    LEFT JOIN clientes c ON v.cliente_id = c.id
    JOIN usuarios u ON v.usuario_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filtros?.dataInicio) {
    sql += ' AND date(v.data_venda) >= date(?)';
    params.push(filtros.dataInicio);
  }
  if (filtros?.dataFim) {
    sql += ' AND date(v.data_venda) <= date(?)';
    params.push(filtros.dataFim);
  }

  sql += ' ORDER BY v.id DESC LIMIT ?';
  params.push(filtros?.limit || 50);

  return dbAll<Venda>(sql, params);
}

export function getVendaDetalhes(vendaId: number): { venda: Venda; itens: ItemVenda[]; pagamentos: VendaPagamento[] } {
  const venda = dbGet<Venda>(
    `SELECT v.*, c.nome as cliente_nome, u.nome as usuario_nome
     FROM vendas v
     LEFT JOIN clientes c ON v.cliente_id = c.id
     JOIN usuarios u ON v.usuario_id = u.id
     WHERE v.id = ?`,
    [vendaId]
  );
  if (!venda) throw new Error('Venda não encontrada.');

  const itens = dbAll<ItemVenda>(
    `SELECT iv.*, p.nome as produto_nome, p.codigo as produto_codigo, p.unidade_medida, p.tamanho, p.cor, p.imagem_url
     FROM itens_venda iv
     JOIN produtos p ON iv.produto_id = p.id
     WHERE iv.venda_id = ?
     ORDER BY iv.id ASC`,
    [vendaId]
  );

  const pagamentos = dbAll<VendaPagamento>(
    'SELECT * FROM vendas_pagamentos WHERE venda_id = ? ORDER BY id ASC',
    [vendaId]
  );

  return { venda, itens, pagamentos };
}

// ==========================================
// 7. CONTROLE DE ESTOQUE & MOVIMENTAÇÕES
// ==========================================
export interface EstoqueMovimentacao {
  id: number;
  produto_id: number;
  produto_nome?: string;
  produto_codigo?: string;
  tipo: 'entrada' | 'saida' | 'ajuste' | 'venda' | 'cancelamento_venda';
  quantidade: number;
  motivo?: string;
  referencia_tipo?: string;
  referencia_id?: number;
  data_movimentacao: string;
}

export function registrarEntradaEstoque(
  produtoId: number,
  quantidade: number,
  motivo?: string,
  novoPrecoCusto?: number,
  fornecedorId?: number
): void {
  const dataMov = getNowSaoPauloSql();
  dbTransaction(() => {
    let sql = 'UPDATE produtos SET estoque_atual = estoque_atual + ?';
    const params: any[] = [quantidade];

    if (novoPrecoCusto !== undefined && Number(novoPrecoCusto) > 0) {
      sql += ', preco_custo = ?';
      params.push(Number(novoPrecoCusto));
    }
    if (fornecedorId) {
      sql += ', fornecedor_id = ?';
      params.push(fornecedorId);
    }

    sql += ' WHERE id = ?';
    params.push(produtoId);
    dbRun(sql, params);

    dbRun(
      `INSERT INTO estoque_movimentacoes (
        produto_id, tipo, quantidade, motivo, referencia_tipo, referencia_id, data_movimentacao
      ) VALUES (?, 'entrada', ?, ?, 'compra_fornecedor', ?, ?)`,
      [produtoId, quantidade, motivo || 'Entrada manual / Compra', fornecedorId || null, dataMov]
    );
  });
}

export function registrarAjusteEstoque(produtoId: number, novoEstoque: number, motivo: string): void {
  const dataMov = getNowSaoPauloSql();
  dbTransaction(() => {
    const prod = dbGet<Produto>('SELECT estoque_atual FROM produtos WHERE id = ?', [produtoId]);
    if (!prod) throw new Error('Produto não encontrado');

    const diferenca = Number(novoEstoque) - Number(prod.estoque_atual);

    dbRun('UPDATE produtos SET estoque_atual = ? WHERE id = ?', [Number(novoEstoque), produtoId]);

    dbRun(
      `INSERT INTO estoque_movimentacoes (
        produto_id, tipo, quantidade, motivo, referencia_tipo, data_movimentacao
      ) VALUES (?, 'ajuste', ?, ?, 'ajuste_manual', ?)`,
      [produtoId, diferenca, motivo || 'Ajuste de inventário', dataMov]
    );
  });
}

export function listarHistoricoEstoque(produtoId?: number, limit: number = 100): EstoqueMovimentacao[] {
  let sql = `
    SELECT m.*, p.nome as produto_nome, p.codigo as produto_codigo
    FROM estoque_movimentacoes m
    JOIN produtos p ON m.produto_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (produtoId) {
    sql += ' AND m.produto_id = ?';
    params.push(produtoId);
  }
  sql += ' ORDER BY m.id DESC LIMIT ?';
  params.push(limit);

  return dbAll<EstoqueMovimentacao>(sql, params);
}

export function getAlertasEstoque(): {
  estoqueBaixo: Produto[];
  validadeProxima: Produto[];
} {
  // 1. Estoque baixo
  const estoqueBaixo = dbAll<Produto>(
    `SELECT * FROM produtos 
     WHERE ativo = 1 AND estoque_atual <= estoque_minimo 
     ORDER BY (estoque_atual - estoque_minimo) ASC`
  );

  // 2. Validade próxima (próximos 30 dias ou já vencidos)
  const validadeProxima = dbAll<Produto>(
    `SELECT * FROM produtos 
     WHERE ativo = 1 AND data_validade IS NOT NULL 
     AND date(data_validade) <= date('now', '+30 days')
     ORDER BY data_validade ASC`
  );

  return { estoqueBaixo, validadeProxima };
}

// ==========================================
// 8. CONTAS A PAGAR
// ==========================================
export interface ContaPagar {
  id: number;
  fornecedor_id?: number;
  fornecedor_nome?: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento?: string;
  forma_pagamento?: string;
  recorrente?: number;
  frequencia?: string;
  anexo_nome?: string;
  anexo_url?: string;
  status: 'pendente' | 'pago' | 'atrasado';
}

export function listarContasPagar(statusFiltro?: string): ContaPagar[] {
  const hoje = getTodaySaoPauloDate();
  let sql = `
    SELECT c.*, f.nome as fornecedor_nome,
      CASE 
        WHEN c.status = 'pago' THEN 'pago'
        WHEN date(c.data_vencimento) < date(?) THEN 'atrasado'
        ELSE 'pendente'
      END as status_calculado
    FROM contas_pagar c
    LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
    WHERE 1=1
  `;
  const params: any[] = [hoje];

  if (statusFiltro && statusFiltro !== 'todos') {
    if (statusFiltro === 'pago') {
      sql += ' AND c.status = "pago"';
    } else if (statusFiltro === 'atrasado') {
      sql += ' AND c.status = "pendente" AND date(c.data_vencimento) < date(?)';
      params.push(hoje);
    } else if (statusFiltro === 'pendente') {
      sql += ' AND c.status = "pendente" AND date(c.data_vencimento) >= date(?)';
      params.push(hoje);
    }
  }

  sql += ' ORDER BY c.data_vencimento ASC';
  const rows = dbAll<any>(sql, params);
  return rows.map(r => ({
    ...r,
    status: r.status_calculado as 'pendente' | 'pago' | 'atrasado'
  }));
}

export function criarContaPagar(dados: {
  fornecedor_id?: number;
  descricao: string;
  valor: number;
  data_vencimento: string;
  forma_pagamento?: string;
  recorrente?: number;
  frequencia?: string;
  anexo_nome?: string;
  anexo_url?: string;
}): number {
  const res = dbRun(
    `INSERT INTO contas_pagar (
      fornecedor_id, descricao, valor, data_vencimento, forma_pagamento, recorrente, frequencia, anexo_nome, anexo_url, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente')`,
    [
      dados.fornecedor_id || null,
      dados.descricao,
      Number(dados.valor) || 0,
      dados.data_vencimento,
      dados.forma_pagamento || null,
      dados.recorrente ? 1 : 0,
      dados.frequencia || 'mensal',
      dados.anexo_nome || null,
      dados.anexo_url || null
    ]
  );
  return res.lastInsertRowid;
}

export function atualizarContaPagar(id: number, dados: {
  fornecedor_id?: number;
  descricao: string;
  valor: number;
  data_vencimento: string;
  forma_pagamento?: string;
  recorrente?: number;
  frequencia?: string;
  anexo_nome?: string;
  anexo_url?: string;
}): void {
  dbRun(
    `UPDATE contas_pagar SET 
      fornecedor_id = ?, descricao = ?, valor = ?, data_vencimento = ?, 
      forma_pagamento = ?, recorrente = ?, frequencia = ?, anexo_nome = ?, anexo_url = ?
    WHERE id = ?`,
    [
      dados.fornecedor_id || null,
      dados.descricao,
      Number(dados.valor) || 0,
      dados.data_vencimento,
      dados.forma_pagamento || null,
      dados.recorrente ? 1 : 0,
      dados.frequencia || 'mensal',
      dados.anexo_nome || null,
      dados.anexo_url || null,
      id
    ]
  );
}

export function pagarConta(id: number, dataPagamento?: string): void {
  const data = dataPagamento || getTodaySaoPauloDate();
  dbRun('UPDATE contas_pagar SET status = "pago", data_pagamento = ? WHERE id = ?', [data, id]);
}

export function baixarContaPagar(
  id: number,
  valorPago?: number,
  dataPagamento?: string,
  formaPagamento?: string,
  caixaSessaoId?: number
): void {
  const data = dataPagamento || getTodaySaoPauloDate();
  dbRun(
    'UPDATE contas_pagar SET status = "pago", data_pagamento = ?, forma_pagamento = COALESCE(?, forma_pagamento) WHERE id = ?',
    [data, formaPagamento || null, id]
  );
}

export function excluirContaPagar(id: number): void {
  dbRun('DELETE FROM contas_pagar WHERE id = ?', [id]);
}

// ==========================================
// 9. RELATÓRIOS & DASHBOARD
// ==========================================
export interface ResumoDashboard {
  faturamentoHoje: number;
  vendasHoje: number;
  ticketMedioHoje: number;
  contasPendentesValor: number;
  contasAtrasadasQtd: number;
  produtosEstoqueBaixoQtd: number;
  produtosValidadeProximaQtd: number;
  caixaAberto: boolean;
}

export function getResumoDashboard(): ResumoDashboard {
  const hoje = getTodaySaoPauloDate();

  const vendasHoje = dbGet<{ total: number; qtd: number }>(
    'SELECT SUM(total) as total, COUNT(id) as qtd FROM vendas WHERE date(data_venda) = date(?) AND status = "concluida"',
    [hoje]
  );

  const fatHoje = Number(vendasHoje?.total) || 0;
  const qtdHoje = Number(vendasHoje?.qtd) || 0;
  const ticketMedio = qtdHoje > 0 ? fatHoje / qtdHoje : 0;

  const contas = dbGet<{ pendentes_valor: number; atrasadas_qtd: number }>(
    `SELECT 
      SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as pendentes_valor,
      COUNT(CASE WHEN status = 'pendente' AND date(data_vencimento) < date(?) THEN 1 END) as atrasadas_qtd
     FROM contas_pagar`,
    [hoje]
  );

  const alertas = getAlertasEstoque();
  const caixa = getCaixaAberto();

  return {
    faturamentoHoje: fatHoje,
    vendasHoje: qtdHoje,
    ticketMedioHoje: ticketMedio,
    contasPendentesValor: Number(contas?.pendentes_valor) || 0,
    contasAtrasadasQtd: Number(contas?.atrasadas_qtd) || 0,
    produtosEstoqueBaixoQtd: alertas.estoqueBaixo.length,
    produtosValidadeProximaQtd: alertas.validadeProxima.length,
    caixaAberto: !!caixa
  };
}

export function getRelatorioFaturamento(dataInicio: string, dataFim: string): {
  faturamentoTotal: number;
  totalVendas: number;
  descontoTotal: number;
  porDia: { data: string; total: number; qtd: number }[];
  porFormaPagamento: { forma: string; total: number; qtd: number }[];
} {
  const totais = dbGet<{ faturamento: number; qtd: number; desconto: number }>(
    `SELECT SUM(total) as faturamento, COUNT(id) as qtd, SUM(desconto) as desconto 
     FROM vendas 
     WHERE date(data_venda) >= date(?) AND date(data_venda) <= date(?) AND status = 'concluida'`,
    [dataInicio, dataFim]
  );

  const porDia = dbAll<{ data: string; total: number; qtd: number }>(
    `SELECT date(data_venda) as data, SUM(total) as total, COUNT(id) as qtd 
     FROM vendas 
     WHERE date(data_venda) >= date(?) AND date(data_venda) <= date(?) AND status = 'concluida'
     GROUP BY date(data_venda) 
     ORDER BY data ASC`,
    [dataInicio, dataFim]
  );

  const porFormaPagamento = dbAll<{ forma: string; total: number; qtd: number }>(
    `SELECT forma_pagamento as forma, SUM(total) as total, COUNT(id) as qtd 
     FROM vendas 
     WHERE date(data_venda) >= date(?) AND date(data_venda) <= date(?) AND status = 'concluida'
     GROUP BY forma_pagamento 
     ORDER BY total DESC`,
    [dataInicio, dataFim]
  );

  return {
    faturamentoTotal: Number(totais?.faturamento) || 0,
    totalVendas: Number(totais?.qtd) || 0,
    descontoTotal: Number(totais?.desconto) || 0,
    porDia,
    porFormaPagamento
  };
}

export function getProdutosMaisVendidos(dataInicio: string, dataFim: string, limit: number = 10): {
  produto_id: number;
  produto_nome: string;
  produto_codigo: string;
  quantidade_total: number;
  faturamento_total: number;
}[] {
  return dbAll(
    `SELECT 
      p.id as produto_id, 
      p.nome as produto_nome, 
      p.codigo as produto_codigo,
      SUM(iv.quantidade) as quantidade_total,
      SUM(iv.subtotal) as faturamento_total
     FROM itens_venda iv
     JOIN vendas v ON iv.venda_id = v.id
     JOIN produtos p ON iv.produto_id = p.id
     WHERE date(v.data_venda) >= date(?) AND date(v.data_venda) <= date(?) AND v.status = 'concluida'
     GROUP BY p.id
     ORDER BY quantidade_total DESC
     LIMIT ?`,
    [dataInicio, dataFim, limit]
  );
}

export function getLucroEstimado(dataInicio: string, dataFim: string): {
  lucroTotal: number;
  faturamentoTotal: number;
  custoTotal: number;
  margemMedia: number;
  itens: {
    produto_nome: string;
    quantidade: number;
    preco_custo_medio: number;
    preco_venda_medio: number;
    receita: number;
    custo: number;
    lucro: number;
    margem: number;
  }[];
} {
  const rows = dbAll<{
    produto_nome: string;
    quantidade: number;
    preco_custo: number;
    receita: number;
  }>(
    `SELECT 
      p.nome as produto_nome,
      p.preco_custo,
      SUM(iv.quantidade) as quantidade,
      SUM(iv.subtotal) as receita
     FROM itens_venda iv
     JOIN vendas v ON iv.venda_id = v.id
     JOIN produtos p ON iv.produto_id = p.id
     WHERE date(v.data_venda) >= date(?) AND date(v.data_venda) <= date(?) AND v.status = 'concluida'
     GROUP BY p.id
     ORDER BY receita DESC`,
    [dataInicio, dataFim]
  );

  let faturamentoTotal = 0;
  let custoTotal = 0;

  const itens = rows.map(r => {
    const custo = Number(r.quantidade) * Number(r.preco_custo || 0);
    const receita = Number(r.receita);
    const lucro = receita - custo;
    const margem = receita > 0 ? (lucro / receita) * 100 : 0;

    faturamentoTotal += receita;
    custoTotal += custo;

    return {
      produto_nome: r.produto_nome,
      quantidade: Number(r.quantidade),
      preco_custo_medio: Number(r.preco_custo || 0),
      preco_venda_medio: r.quantidade > 0 ? receita / Number(r.quantidade) : 0,
      receita,
      custo,
      lucro,
      margem
    };
  });

  const lucroTotal = faturamentoTotal - custoTotal;
  const margemMedia = faturamentoTotal > 0 ? (lucroTotal / faturamentoTotal) * 100 : 0;

  return {
    lucroTotal,
    faturamentoTotal,
    custoTotal,
    margemMedia,
    itens
  };
}

// ==========================================
// 10. NOTAS FISCAIS
// ==========================================
export interface NotaFiscal {
  id: number;
  venda_id?: number;
  numero?: string;
  serie?: string;
  chave_acesso?: string;
  status: 'pendente' | 'autorizada' | 'rejeitada' | 'cancelada';
  xml_url?: string;
  danfe_url?: string;
  mensagem_erro?: string;
  criado_em: string;
}

export function listarNotasFiscais(limit: number = 50): (NotaFiscal & { cliente_nome?: string; total?: number })[] {
  return dbAll(
    `SELECT nf.*, v.total, c.nome as cliente_nome
     FROM notas_fiscais nf
     LEFT JOIN vendas v ON nf.venda_id = v.id
     LEFT JOIN clientes c ON v.cliente_id = c.id
     ORDER BY nf.id DESC LIMIT ?`,
    [limit]
  );
}

export function criarOuAtualizarNotaFiscal(dados: {
  venda_id: number;
  numero: string;
  serie: string;
  chave_acesso: string;
  status: 'pendente' | 'autorizada' | 'rejeitada' | 'cancelada';
  xml_url?: string;
  danfe_url?: string;
  mensagem_erro?: string;
}): number {
  const existente = dbGet<NotaFiscal>('SELECT id FROM notas_fiscais WHERE venda_id = ?', [dados.venda_id]);

  if (existente) {
    dbRun(
      `UPDATE notas_fiscais SET 
        numero = ?, serie = ?, chave_acesso = ?, status = ?, xml_url = ?, danfe_url = ?, mensagem_erro = ?
       WHERE id = ?`,
      [
        dados.numero,
        dados.serie,
        dados.chave_acesso,
        dados.status,
        dados.xml_url || null,
        dados.danfe_url || null,
        dados.mensagem_erro || null,
        existente.id
      ]
    );
    // Atualiza id da nota na venda
    dbRun('UPDATE vendas SET nota_fiscal_id = ? WHERE id = ?', [existente.id, dados.venda_id]);
    return existente.id;
  } else {
    const res = dbRun(
      `INSERT INTO notas_fiscais (venda_id, numero, serie, chave_acesso, status, xml_url, danfe_url, mensagem_erro)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dados.venda_id,
        dados.numero,
        dados.serie,
        dados.chave_acesso,
        dados.status,
        dados.xml_url || null,
        dados.danfe_url || null,
        dados.mensagem_erro || null
      ]
    );
    dbRun('UPDATE vendas SET nota_fiscal_id = ? WHERE id = ?', [res.lastInsertRowid, dados.venda_id]);
    return res.lastInsertRowid;
  }
}

// ==========================================
// 12. TROCAS E DEVOLUÇÕES
// ==========================================
export function buscarVendasParaDevolucao(criterio: string, valor: string): any[] {
  const v = valor.trim();
  if (!v) return [];

  let sql = `
    SELECT v.*, c.nome as cliente_nome, c.cpf_cnpj as cliente_cpf
    FROM vendas v
    LEFT JOIN clientes c ON v.cliente_id = c.id
    WHERE v.status = 'concluida'
  `;
  const params: any[] = [];

  if (criterio === 'numero') {
    sql += ' AND v.id = ?';
    params.push(parseInt(v) || 0);
  } else if (criterio === 'cliente') {
    sql += ' AND (c.nome LIKE ? OR c.cpf_cnpj LIKE ?)';
    params.push(`%${v}%`, `%${v}%`);
  } else if (criterio === 'data') {
    sql += ' AND date(v.data_venda) = date(?)';
    params.push(v);
  } else if (criterio === 'produto') {
    sql += ` AND v.id IN (
      SELECT iv.venda_id FROM itens_venda iv 
      JOIN produtos p ON iv.produto_id = p.id 
      WHERE p.nome LIKE ? OR p.codigo LIKE ?
    )`;
    params.push(`%${v}%`, `%${v}%`);
  } else {
    // Busca geral
    sql += ' AND (v.id = ? OR c.nome LIKE ? OR c.cpf_cnpj LIKE ?)';
    params.push(parseInt(v) || 0, `%${v}%`, `%${v}%`);
  }

  sql += ' ORDER BY v.id DESC LIMIT 20';
  const vendas = dbAll<any>(sql, params);

  // Anexa itens de cada venda encontrada
  return vendas.map((venda) => {
    const itens = dbAll<any>(
      `SELECT iv.*, p.nome as produto_nome, p.codigo as produto_codigo, p.unidade_medida
       FROM itens_venda iv
       JOIN produtos p ON iv.produto_id = p.id
       WHERE iv.venda_id = ?`,
      [venda.id]
    );
    return { ...venda, itens };
  });
}

export function processarDevolucao(payload: {
  vendaOrigemId: number;
  usuarioId: number;
  clienteId?: number;
  formaReembolso: string; // 'credito' | 'dinheiro' | 'estorno' | 'troca'
  motivo: string;
  itens: { produtoId: number; quantidade: number; valorUnitario: number; subtotal: number }[];
  totalDevolvido: number;
}): { devolucaoId: number } {
  if (!payload.itens || payload.itens.length === 0) {
    throw new Error('Nenhum item selecionado para devolução.');
  }

  return dbTransaction(() => {
    // 1. Inserir registro principal de devolução
    const resDev = dbRun(
      `INSERT INTO trocas_devolucoes (
        venda_origem_id, usuario_id, cliente_id, total_devolvido, forma_reembolso, motivo, data_devolucao
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        payload.vendaOrigemId,
        payload.usuarioId,
        payload.clienteId || null,
        payload.totalDevolvido,
        payload.formaReembolso,
        payload.motivo || 'Devolução no Balcão'
      ]
    );

    const devId = resDev.lastInsertRowid;

    // 2. Inserir itens da devolução e estornar estoque
    for (const item of payload.itens) {
      dbRun(
        `INSERT INTO trocas_devolucoes_itens (devolucao_id, produto_id, quantidade, valor_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [devId, item.produtoId, item.quantidade, item.valorUnitario, item.subtotal]
      );

      // Devolve produto ao estoque
      dbRun(
        'UPDATE produtos SET estoque_atual = estoque_atual + ? WHERE id = ?',
        [item.quantidade, item.produtoId]
      );

      // Movimentação de estoque (entrada por devolução)
      dbRun(
        `INSERT INTO estoque_movimentacoes (
          produto_id, tipo, quantidade, motivo, referencia_tipo, referencia_id, data_movimentacao
        ) VALUES (?, 'devolucao', ?, ?, 'devolucao', ?, CURRENT_TIMESTAMP)`,
        [item.produtoId, item.quantidade, `Devolução/Troca #${devId} (Ref Venda #${payload.vendaOrigemId})`, devId]
      );
    }

    // 3. Se forma de reembolso for 'credito', credita na conta do cliente
    if (payload.formaReembolso === 'credito' && payload.clienteId) {
      dbRun(
        `INSERT INTO creditos_cliente (cliente_id, venda_id, tipo, valor, motivo, criado_em)
         VALUES (?, ?, 'credito', ?, ?, CURRENT_TIMESTAMP)`,
        [payload.clienteId, payload.vendaOrigemId, payload.totalDevolvido, `Crédito gerado pela Devolução #${devId}`]
      );
    }

    return { devolucaoId: devId };
  });
}

export function listarDevolucoes(limit: number = 50): any[] {
  return dbAll(
    `SELECT td.*, u.nome as usuario_nome, c.nome as cliente_nome
     FROM trocas_devolucoes td
     LEFT JOIN usuarios u ON td.usuario_id = u.id
     LEFT JOIN clientes c ON td.cliente_id = c.id
     ORDER BY td.id DESC LIMIT ?`,
    [limit]
  );
}

// ==========================================
// 13. CRÉDITOS DE CLIENTES
// ==========================================
export function getSaldoCreditoCliente(clienteId: number): number {
  const res = dbGet<{ saldo: number }>(
    `SELECT 
      COALESCE(SUM(CASE WHEN tipo = 'credito' THEN valor ELSE -valor END), 0) as saldo
     FROM creditos_cliente WHERE cliente_id = ?`,
    [clienteId]
  );
  return res ? Math.max(0, Number(res.saldo)) : 0;
}

export function adicionarCreditoCliente(clienteId: number, valor: number, motivo: string, vendaId?: number): void {
  dbRun(
    `INSERT INTO creditos_cliente (cliente_id, venda_id, tipo, valor, motivo, criado_em)
     VALUES (?, ?, 'credito', ?, ?, CURRENT_TIMESTAMP)`,
    [clienteId, vendaId || null, Number(valor), motivo]
  );
}

export function usarCreditoCliente(clienteId: number, valor: number, motivo: string, vendaId?: number): void {
  const saldoAtual = getSaldoCreditoCliente(clienteId);
  if (saldoAtual < Number(valor)) {
    throw new Error(`Saldo insuficiente de crédito. Saldo atual: R$ ${saldoAtual.toFixed(2)}`);
  }

  dbRun(
    `INSERT INTO creditos_cliente (cliente_id, venda_id, tipo, valor, motivo, criado_em)
     VALUES (?, ?, 'debito', ?, ?, CURRENT_TIMESTAMP)`,
    [clienteId, vendaId || null, Number(valor), motivo]
  );
}

export function listarCreditosPorCliente(clienteId: number): any[] {
  return dbAll(
    'SELECT * FROM creditos_cliente WHERE cliente_id = ? ORDER BY id DESC',
    [clienteId]
  );
}

// ==========================================
// 14. CONTAS A RECEBER (FIADO / PRAZO)
// ==========================================
export function listarContasReceber(status?: string, clienteId?: number): any[] {
  let sql = `
    SELECT cr.*, c.nome as cliente_nome, c.telefone as cliente_telefone
    FROM contas_receber cr
    JOIN clientes c ON cr.cliente_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status && status !== 'todos') {
    sql += ' AND cr.status = ?';
    params.push(status);
  }
  if (clienteId) {
    sql += ' AND cr.cliente_id = ?';
    params.push(clienteId);
  }

  sql += ' ORDER BY cr.data_vencimento ASC';
  return dbAll(sql, params);
}

export function criarContaReceber(dados: {
  cliente_id: number;
  descricao: string;
  valor: number;
  data_vencimento: string;
  venda_id?: number;
}): number {
  const res = dbRun(
    `INSERT INTO contas_receber (cliente_id, venda_id, descricao, valor, data_vencimento, status, criado_em)
     VALUES (?, ?, ?, ?, ?, 'pendente', CURRENT_TIMESTAMP)`,
    [dados.cliente_id, dados.venda_id || null, dados.descricao, dados.valor, dados.data_vencimento]
  );
  return res.lastInsertRowid;
}

export function receberConta(id: number, dataPagamento?: string): void {
  const dataPgto = dataPagamento || new Date().toISOString().split('T')[0];
  dbRun(
    'UPDATE contas_receber SET status = "pago", data_pagamento = ? WHERE id = ?',
    [dataPgto, id]
  );
}

export function excluirContaReceber(id: number): void {
  dbRun('DELETE FROM contas_receber WHERE id = ?', [id]);
}

// ==========================================
// 15. PERFIS TRIBUTÁRIOS REUTILIZÁVEIS
// ==========================================
export function listarPerfisTributacao(): any[] {
  return dbAll('SELECT * FROM tributacoes_perfis ORDER BY nome ASC');
}

export function criarPerfilTributacao(dados: any): number {
  const res = dbRun(
    `INSERT INTO tributacoes_perfis (
      codigo, nome, origem, monofasico, ncm_padrao, cfop_padrao, csosn_cst, aliquota_icms, aliquota_pis, aliquota_cofins
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      dados.codigo,
      dados.nome,
      Number(dados.origem) || 0,
      dados.monofasico ? 1 : 0,
      dados.ncm_padrao || null,
      dados.cfop_padrao || '5102',
      dados.csosn_cst || '102',
      Number(dados.aliquota_icms) || 0,
      Number(dados.aliquota_pis) || 0,
      Number(dados.aliquota_cofins) || 0
    ]
  );
  return res.lastInsertRowid;
}

export function atualizarPerfilTributacao(id: number, dados: any): void {
  dbRun(
    `UPDATE tributacoes_perfis SET
      codigo = ?, nome = ?, origem = ?, monofasico = ?, ncm_padrao = ?, cfop_padrao = ?,
      csosn_cst = ?, aliquota_icms = ?, aliquota_pis = ?, aliquota_cofins = ?
     WHERE id = ?`,
    [
      dados.codigo,
      dados.nome,
      Number(dados.origem) || 0,
      dados.monofasico ? 1 : 0,
      dados.ncm_padrao || null,
      dados.cfop_padrao || '5102',
      dados.csosn_cst || '102',
      Number(dados.aliquota_icms) || 0,
      Number(dados.aliquota_pis) || 0,
      Number(dados.aliquota_cofins) || 0,
      id
    ]
  );
}

export function excluirPerfilTributacao(id: number): void {
  dbRun('DELETE FROM tributacoes_perfis WHERE id = ?', [id]);
}

// ==========================================
// 16. CATÁLOGO ONLINE & LOJA VIRTUAL
// ==========================================
export function listarPedidosCatalogo(): any[] {
  return dbAll('SELECT * FROM catalogo_pedidos ORDER BY id DESC');
}

export function atualizarStatusPedidoCatalogo(id: number, status: string): void {
  dbRun('UPDATE catalogo_pedidos SET status = ? WHERE id = ?', [status, id]);
}

export function togglePublicacaoProduto(produtoId: number, publicado: boolean): void {
  dbRun('UPDATE produtos SET publicado_catalogo = ? WHERE id = ?', [publicado ? 1 : 0, produtoId]);
}

// ==========================================
// 17. INUTILIZAÇÃO DE NOTA FISCAL
// ==========================================
export function listarInutilizacoes(): any[] {
  return dbAll('SELECT * FROM nf_inutilizacoes ORDER BY id DESC');
}

export function criarInutilizacao(dados: {
  modelo: string;
  serie: string;
  numero_inicial: number;
  numero_final: number;
  justificativa: string;
}): number {
  const protocolo = `PRT-${Date.now()}`;
  const res = dbRun(
    `INSERT INTO nf_inutilizacoes (modelo, serie, numero_inicial, numero_final, justificativa, protocolo, status, criado_em)
     VALUES (?, ?, ?, ?, ?, ?, 'homologado', CURRENT_TIMESTAMP)`,
    [
      dados.modelo || '65',
      dados.serie || '1',
      Number(dados.numero_inicial),
      Number(dados.numero_final),
      dados.justificativa,
      protocolo
    ]
  );
  return res.lastInsertRowid;
}

// ==========================================
// 18. ATUALIZAÇÃO DE STATUS DE PEDIDOS
// ==========================================
export function atualizarStatusPedido(vendaId: number, novoStatus: string): void {
  dbRun('UPDATE vendas SET status_pedido = ? WHERE id = ?', [novoStatus, vendaId]);
}

// ==========================================
// 19. CONFIGURAÇÕES
// ==========================================
export function getConfiguracoes(): Record<string, string> {
  const rows = dbAll<{ chave: string; valor: string }>('SELECT chave, valor FROM configuracoes');
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.chave] = row.valor;
  }
  return result;
}

export function salvarConfiguracao(chave: string, valor: string): void {
  dbRun('INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = ?', [chave, valor, valor]);
}

// ==========================================
// 20. GESTÃO E VINCULAÇÃO DE LOJAS (CADASTRO WEB & SYNC)
// ==========================================
export interface Loja {
  id: number;
  nome_fantasia: string;
  razao_social?: string;
  cnpj_cpf?: string;
  email?: string;
  telefone?: string;
  whatsapp?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  logo_url?: string;
  slogan?: string;
  slug_catalogo?: string;
  bio?: string;
  plano: string;
  chave_api_sync?: string;
  ativo: number;
  criado_em: string;
  atualizado_em?: string;
}

export function obterDadosLoja(lojaId: number = 1): Loja {
  let loja = dbGet<Loja>('SELECT * FROM lojas WHERE id = ?', [lojaId]);
  if (!loja) {
    loja = dbGet<Loja>('SELECT * FROM lojas ORDER BY id ASC LIMIT 1');
  }
  if (!loja) {
    dbRun(`
      INSERT INTO lojas (id, nome_fantasia, razao_social, cnpj_cpf, email, telefone, whatsapp, endereco, cidade, estado, cep, logo_url, slogan, slug_catalogo, bio, plano, chave_api_sync, ativo)
      VALUES (1, 'NexPDV - Moda & Loja Modelo', 'NexPDV Comércio e Varejo Ltda', '12.345.678/0001-90', 'contato@lojamodelo.com.br', '(11) 3322-4455', '(11) 99887-6655', 'Av. Comercial, 1000 - Centro', 'São Paulo', 'SP', '01000-000', 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=150&auto=format&fit=crop&q=80', 'A melhor experiência para você e sua família', 'lojamodelo', 'Moda feminina, masculina, calçados e conveniência.', 'pro', 'SYNC_NEX_STORE_001', 1)
    `);
    loja = dbGet<Loja>('SELECT * FROM lojas WHERE id = 1');
  }
  return loja!;
}

export function atualizarDadosLoja(dados: Partial<Loja>, lojaId: number = 1): Loja {
  const lojaAtual = obterDadosLoja(lojaId);
  const nome = dados.nome_fantasia !== undefined ? dados.nome_fantasia : lojaAtual.nome_fantasia;
  const razao = dados.razao_social !== undefined ? dados.razao_social : lojaAtual.razao_social;
  const cnpj = dados.cnpj_cpf !== undefined ? dados.cnpj_cpf : lojaAtual.cnpj_cpf;
  const email = dados.email !== undefined ? dados.email : lojaAtual.email;
  const tel = dados.telefone !== undefined ? dados.telefone : lojaAtual.telefone;
  const zap = dados.whatsapp !== undefined ? dados.whatsapp : lojaAtual.whatsapp;
  const end = dados.endereco !== undefined ? dados.endereco : lojaAtual.endereco;
  const cid = dados.cidade !== undefined ? dados.cidade : lojaAtual.cidade;
  const est = dados.estado !== undefined ? dados.estado : lojaAtual.estado;
  const cep = dados.cep !== undefined ? dados.cep : lojaAtual.cep;
  const logo = dados.logo_url !== undefined ? dados.logo_url : lojaAtual.logo_url;
  const slogan = dados.slogan !== undefined ? dados.slogan : lojaAtual.slogan;
  const slug = dados.slug_catalogo !== undefined ? dados.slug_catalogo : lojaAtual.slug_catalogo;
  const bio = dados.bio !== undefined ? dados.bio : lojaAtual.bio;

  dbRun(`
    UPDATE lojas SET 
      nome_fantasia = ?, razao_social = ?, cnpj_cpf = ?, email = ?, telefone = ?, whatsapp = ?,
      endereco = ?, cidade = ?, estado = ?, cep = ?, logo_url = ?, slogan = ?, slug_catalogo = ?, bio = ?,
      atualizado_em = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [nome, razao, cnpj, email, tel, zap, end, cid, est, cep, logo, slogan, slug, bio, lojaAtual.id]);

  if (nome) salvarConfiguracao('nome_loja', nome);
  if (cnpj) salvarConfiguracao('cnpj', cnpj);
  if (tel) salvarConfiguracao('telefone', tel);
  if (end) salvarConfiguracao('endereco', end);
  if (logo) salvarConfiguracao('logo_url', logo);

  return obterDadosLoja(lojaAtual.id);
}

export function vincularContaWeb(email: string, tokenOuSenha?: string): Loja {
  const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const nomeGerado = email.split('@')[0].replace(/[._-]/g, ' ').toUpperCase();

  const lojaAtual = obterDadosLoja(1);
  return atualizarDadosLoja({
    email,
    nome_fantasia: lojaAtual.nome_fantasia || `Loja ${nomeGerado}`,
    slug_catalogo: lojaAtual.slug_catalogo || slug,
    chave_api_sync: `SYNC_WEB_${Date.now()}`
  }, 1);
}

// ==========================================
// 21. ASSINATURA E CONTROLE DE PLANOS (GRÁTIS, PREMIUM, FISCAL)
// ==========================================
export interface Assinatura {
  id: number;
  plano_atual: 'gratis' | 'premium' | 'fiscal';
  status: 'ativo' | 'trial' | 'expirado' | 'cancelado';
  data_inicio: string;
  data_fim?: string;
  trial_usado: number;
  dias_restantes_trial?: number;
}

export function obterAssinatura(): Assinatura {
  let assin = dbGet<Assinatura>('SELECT * FROM assinatura WHERE id = 1');
  if (!assin) {
    dbRun(`INSERT INTO assinatura (id, plano_atual, status, data_inicio, trial_usado) VALUES (1, 'gratis', 'ativo', CURRENT_TIMESTAMP, 0)`);
    assin = dbGet<Assinatura>('SELECT * FROM assinatura WHERE id = 1');
  }

  // Se estiver em trial, verificar se expirou os 7 dias
  if (assin && assin.status === 'trial' && assin.data_fim) {
    const agora = new Date().getTime();
    const fim = new Date(assin.data_fim).getTime();
    const diffDias = Math.ceil((fim - agora) / (1000 * 60 * 60 * 24));
    if (agora > fim) {
      dbRun(`UPDATE assinatura SET plano_atual = 'gratis', status = 'expirado', atualizado_em = CURRENT_TIMESTAMP WHERE id = 1`);
      assin = dbGet<Assinatura>('SELECT * FROM assinatura WHERE id = 1');
    } else {
      assin.dias_restantes_trial = Math.max(0, diffDias);
    }
  }

  return assin!;
}

export function alterarPlano(plano: 'gratis' | 'premium' | 'fiscal', diasDuracao?: number, status: 'ativo' | 'trial' = 'ativo'): Assinatura {
  let dataFimSql: string | null = null;
  if (diasDuracao && diasDuracao > 0) {
    const dataFim = new Date();
    dataFim.setDate(dataFim.getDate() + diasDuracao);
    dataFimSql = dataFim.toISOString().replace('T', ' ').substring(0, 19);
  }

  dbRun(`
    UPDATE assinatura SET
      plano_atual = ?,
      status = ?,
      data_inicio = CURRENT_TIMESTAMP,
      data_fim = ?,
      atualizado_em = CURRENT_TIMESTAMP
    WHERE id = 1
  `, [plano, status, dataFimSql]);

  return obterAssinatura();
}

export function iniciarTrial7Dias(): { sucesso: boolean; mensagem: string; assinatura?: Assinatura } {
  const assin = obterAssinatura();
  if (assin.trial_usado === 1) {
    return {
      sucesso: false,
      mensagem: 'O período de teste gratuito de 7 dias já foi utilizado anteriormente nesta loja.'
    };
  }

  const dataFim = new Date();
  dataFim.setDate(dataFim.getDate() + 7);
  const dataFimStr = dataFim.toISOString().replace('T', ' ').substring(0, 19);

  dbRun(`
    UPDATE assinatura SET
      plano_atual = 'premium',
      status = 'trial',
      data_inicio = CURRENT_TIMESTAMP,
      data_fim = ?,
      trial_usado = 1,
      atualizado_em = CURRENT_TIMESTAMP
    WHERE id = 1
  `, [dataFimStr]);

  const atualizada = obterAssinatura();
  return {
    sucesso: true,
    mensagem: 'Período de teste de 7 dias do Plano Premium iniciado com sucesso!',
    assinatura: atualizada
  };
}





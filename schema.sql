-- ==========================================================
-- SCHEMA OFICIAL SQLITE - SISTEMA DE GESTÃO DE LOJA (PDV)
-- ==========================================================

-- 0. Lojas (Multi-loja / Cadastro Web & Sincronização)
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

-- 1. Usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loja_id INTEGER REFERENCES lojas(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    login TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    perfil TEXT NOT NULL CHECK(perfil IN ('admin', 'gerente', 'vendedor')),
    ativo INTEGER NOT NULL DEFAULT 1,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cnpj TEXT,
    telefone TEXT,
    email TEXT,
    endereco TEXT,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loja_id INTEGER REFERENCES lojas(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    cpf_cnpj TEXT,
    cpf TEXT,
    telefone TEXT,
    telefone_whatsapp TEXT,
    email TEXT,
    endereco TEXT,
    endereco_completo TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    limite_credito REAL NOT NULL DEFAULT 500.0,
    status_crediario TEXT NOT NULL DEFAULT 'ativo' CHECK(status_crediario IN ('ativo', 'bloqueado')),
    referencia_nome TEXT,
    referencia_telefone TEXT,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Produtos
CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE,
    codigo_extra TEXT,
    ean_gtin TEXT,
    nome TEXT NOT NULL,
    descricao TEXT,
    categoria TEXT,
    subcategoria TEXT,
    marca TEXT,
    peso_liquido REAL DEFAULT 0.0,
    peso_bruto REAL DEFAULT 0.0,
    localizacao TEXT,
    unidade_medida TEXT NOT NULL DEFAULT 'UN',
    tamanho TEXT, -- P, M, G, GG, 38, 40, etc.
    cor TEXT,     -- Preto, Azul, etc.
    imagem_url TEXT, -- URL ou Base64 Data URL da foto
    preco_custo REAL NOT NULL DEFAULT 0.0,
    preco_venda REAL NOT NULL DEFAULT 0.0,
    preco_venda_automatico INTEGER NOT NULL DEFAULT 0,
    preco_alteravel_venda INTEGER NOT NULL DEFAULT 0,
    controlar_estoque INTEGER NOT NULL DEFAULT 1,
    estoque_atual REAL NOT NULL DEFAULT 0.0,
    estoque_minimo REAL NOT NULL DEFAULT 0.0,
    estoque_maximo REAL NOT NULL DEFAULT 0.0,
    permite_fracionamento INTEGER NOT NULL DEFAULT 0,
    observacao TEXT,
    is_kit INTEGER NOT NULL DEFAULT 0,
    kit_itens TEXT,
    ncm TEXT,
    cest TEXT,
    cfop TEXT,
    origem INTEGER NOT NULL DEFAULT 0,
    csosn_cst TEXT,
    aliquota_icms REAL NOT NULL DEFAULT 0.0,
    aliquota_pis REAL NOT NULL DEFAULT 0.0,
    aliquota_cofins REAL NOT NULL DEFAULT 0.0,
    codigo_fornecedor TEXT,
    comissao_percentual REAL NOT NULL DEFAULT 0.0,
    pontos_fidelidade REAL NOT NULL DEFAULT 0.0,
    lote TEXT,
    data_fabricacao TEXT,
    data_validade TEXT,
    dias_aviso_vencimento INTEGER NOT NULL DEFAULT 30,
    fornecedor_id INTEGER REFERENCES fornecedores(id) ON DELETE SET NULL,
    ativo INTEGER NOT NULL DEFAULT 1,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Caixa Sessões (Abertura e Fechamento)
CREATE TABLE IF NOT EXISTS caixa_sessoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    data_abertura DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valor_abertura REAL NOT NULL DEFAULT 0.0,
    data_fechamento DATETIME,
    valor_fechamento_informado REAL,
    valor_fechamento_sistema REAL,
    diferenca REAL,
    status TEXT NOT NULL DEFAULT 'aberto' CHECK(status IN ('aberto', 'fechado'))
);

-- 6. Vendas & Pedidos & Orçamentos
CREATE TABLE IF NOT EXISTS vendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    caixa_sessao_id INTEGER NOT NULL REFERENCES caixa_sessoes(id),
    tipo_operacao TEXT NOT NULL DEFAULT 'venda', -- venda, pedido, orcamento, devolucao
    status_pedido TEXT NOT NULL DEFAULT 'concluida', -- concluida, aberto, em_separacao, entregue, cancelado, orcamento
    data_venda DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    subtotal REAL NOT NULL DEFAULT 0.0,
    desconto REAL NOT NULL DEFAULT 0.0,
    total REAL NOT NULL DEFAULT 0.0,
    forma_pagamento TEXT NOT NULL, -- dinheiro, cartao_credito, cartao_debito, pix, fiado, cheque, multiplo
    valor_pago REAL DEFAULT 0.0,
    troco REAL DEFAULT 0.0,
    salvar_troco_credito INTEGER DEFAULT 0,
    observacoes TEXT,
    dados_entrega_json TEXT,
    status TEXT NOT NULL DEFAULT 'concluida' CHECK(status IN ('concluida', 'cancelada')),
    nota_fiscal_id INTEGER
);

-- 7. Itens da Venda
CREATE TABLE IF NOT EXISTS itens_venda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    quantidade REAL NOT NULL,
    preco_unitario REAL NOT NULL,
    subtotal REAL NOT NULL
);

-- 8. Movimentações de Estoque
CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'saida', 'ajuste', 'venda', 'cancelamento_venda', 'devolucao')),
    quantidade REAL NOT NULL,
    motivo TEXT,
    referencia_tipo TEXT, -- 'venda', 'compra_fornecedor', 'ajuste_manual', 'devolucao'
    referencia_id INTEGER,
    data_movimentacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Contas a Pagar
CREATE TABLE IF NOT EXISTS contas_pagar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fornecedor_id INTEGER REFERENCES fornecedores(id) ON DELETE SET NULL,
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    forma_pagamento TEXT,
    recorrente INTEGER DEFAULT 0,
    frequencia TEXT DEFAULT 'mensal',
    anexo_nome TEXT,
    anexo_url TEXT,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente', 'pago', 'atrasado'))
);

-- 9.1 Pagamentos das Vendas (Divisão de Pagamentos / Múltiplas Formas)
CREATE TABLE IF NOT EXISTS vendas_pagamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    caixa_sessao_id INTEGER NOT NULL REFERENCES caixa_sessoes(id),
    forma_pagamento TEXT NOT NULL,
    valor REAL NOT NULL,
    troco REAL DEFAULT 0.0,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9.2 Movimentações do Caixa (Suprimentos e Sangrias)
CREATE TABLE IF NOT EXISTS caixa_movimentacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    caixa_sessao_id INTEGER NOT NULL REFERENCES caixa_sessoes(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    tipo TEXT NOT NULL CHECK(tipo IN ('suprimento', 'sangria')),
    valor REAL NOT NULL,
    motivo TEXT NOT NULL,
    data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Contas a Receber (Fiado / A Prazo)
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

-- 11. Créditos de Cliente (Troco em Conta / Devoluções)
CREATE TABLE IF NOT EXISTS creditos_cliente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    venda_id INTEGER REFERENCES vendas(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('credito', 'debito')),
    valor REAL NOT NULL,
    motivo TEXT,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. Trocas e Devoluções
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

CREATE TABLE IF NOT EXISTS trocas_devolucoes_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    devolucao_id INTEGER NOT NULL REFERENCES trocas_devolucoes(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    quantidade REAL NOT NULL,
    valor_unitario REAL NOT NULL,
    subtotal REAL NOT NULL
);

-- 13. Perfis Fiscais & Tributações Reutilizáveis
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

-- 14. Pedidos do Catálogo Online
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

-- 15. Inutilizações de Numeração de NF
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

-- 16. Notas Fiscais (Emissão via API Externa)
CREATE TABLE IF NOT EXISTS notas_fiscais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venda_id INTEGER REFERENCES vendas(id) ON DELETE SET NULL,
    numero TEXT,
    serie TEXT,
    chave_acesso TEXT,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente', 'autorizada', 'rejeitada', 'cancelada')),
    xml_url TEXT,
    danfe_url TEXT,
    mensagem_erro TEXT,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 17. Configurações do Sistema
CREATE TABLE IF NOT EXISTS configuracoes (
    chave TEXT PRIMARY KEY,
    valor TEXT
);

-- 18. Assinatura e Planos (Grátis, Premium, Fiscal)
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

-- ==========================================================
-- MÓDULO CREDIÁRIO (FINANCIAMENTO DIRETO & CONTAS A RECEBER)
-- ==========================================================

-- 19. Configuração de Crediário por Loja
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

-- 20. Contratos Mestre de Crediário
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

-- 21. Parcelas de Crediário
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

-- 22. Histórico de Pagamentos e Baixas de Parcelas
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

-- 23. Histórico e Score Consolidado do Cliente
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

-- 24. Log e Controle de Duplicidade de Cobranças
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

-- 25. Auditoria de Ações Críticas do Crediário
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

-- Índices para otimização de consultas no PDV, Crediário e Relatórios
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(codigo);
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_caixa ON vendas(caixa_sessao_id);
CREATE INDEX IF NOT EXISTS idx_estoque_prod ON estoque_movimentacoes(produto_id);
CREATE INDEX IF NOT EXISTS idx_contas_venc ON contas_pagar(data_vencimento);

-- Índices do Crediário
CREATE INDEX IF NOT EXISTS idx_crediario_contratos_loja ON crediario_contratos(loja_id);
CREATE INDEX IF NOT EXISTS idx_crediario_contratos_cli ON crediario_contratos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crediario_contratos_status ON crediario_contratos(status);
CREATE INDEX IF NOT EXISTS idx_crediario_parcelas_loja ON crediario_parcelas(loja_id);
CREATE INDEX IF NOT EXISTS idx_crediario_parcelas_contrato ON crediario_parcelas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_crediario_parcelas_venc ON crediario_parcelas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_crediario_parcelas_status ON crediario_parcelas(status);
CREATE INDEX IF NOT EXISTS idx_crediario_pagamentos_loja ON crediario_pagamentos(loja_id);
CREATE INDEX IF NOT EXISTS idx_crediario_pagamentos_parc ON crediario_pagamentos(parcela_id);
CREATE INDEX IF NOT EXISTS idx_crediario_pagamentos_data ON crediario_pagamentos(data);
CREATE INDEX IF NOT EXISTS idx_crediario_cobrancas_duplicidade ON crediario_cobrancas_log(parcela_id, tipo_mensagem);
CREATE INDEX IF NOT EXISTS idx_auditoria_crediario_loja ON auditoria_crediario(loja_id);

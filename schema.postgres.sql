-- ==========================================================
-- SCHEMA OFICIAL SUPABASE / POSTGRESQL - MULTI-TENANT (SAAS)
-- SISTEMA WS GESTÃO PDV & LOJA VIRTUAL
-- ==========================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------
-- 0. TABELA DE PLANOS DO SAAS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS planos (
    id VARCHAR(50) PRIMARY KEY, -- 'gratis', 'premium', 'fiscal'
    nome VARCHAR(100) NOT NULL,
    preco NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    descricao TEXT,
    recursos JSONB NOT NULL DEFAULT '[]'::jsonb,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------
-- 1. TABELA DE LOJAS (TENANTS)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS lojas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255),
    nome_fantasia VARCHAR(255),
    razao_social VARCHAR(255),
    cnpj_cpf VARCHAR(30),
    slug VARCHAR(100),
    slug_catalogo VARCHAR(100),
    email VARCHAR(150),
    telefone VARCHAR(30),
    whatsapp VARCHAR(30),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(15),
    logo_url TEXT,
    slogan VARCHAR(255),
    bio TEXT,
    chave_api_sync VARCHAR(100),
    catalogo_ativo SMALLINT NOT NULL DEFAULT 1,
    taxa_entrega_padrao NUMERIC(10, 2) DEFAULT 0.0,
    permite_retirada SMALLINT NOT NULL DEFAULT 1,
    manter_sem_estoque SMALLINT NOT NULL DEFAULT 0,
    instrucoes_pagamento TEXT,
    instagram VARCHAR(100),
    ativo SMALLINT NOT NULL DEFAULT 1,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------
-- 2. VÍNCULO ENTRE USUÁRIOS AUTH SUPABASE E LOJAS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios_loja (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- auth.users(id)
    loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE,
    perfil VARCHAR(30) NOT NULL DEFAULT 'admin' CHECK(perfil IN ('superadmin', 'admin', 'gerente', 'vendedor')),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------
-- 3. ASSINATURAS E STATUS DE PLANOS POR LOJA
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS assinaturas (
    id SERIAL PRIMARY KEY,
    loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE,
    plano VARCHAR(50) NOT NULL DEFAULT 'gratis',
    status VARCHAR(30) NOT NULL DEFAULT 'ativa' CHECK(status IN ('ativa', 'teste', 'atrasada', 'cancelada')),
    data_inicio TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    data_fim TIMESTAMP WITH TIME ZONE,
    trial_usado SMALLINT NOT NULL DEFAULT 0,
    gateway_assinatura_id VARCHAR(100),
    gateway_provedor VARCHAR(50) DEFAULT 'mock',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------
-- 4. FORNECEDORES
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS fornecedores (
    id SERIAL PRIMARY KEY,
    loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(30),
    telefone VARCHAR(30),
    email VARCHAR(150),
    endereco TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------
-- 5. CLIENTES & CRÉDITOS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cpf_cnpj VARCHAR(30),
    cpf VARCHAR(20),
    telefone VARCHAR(30),
    telefone_whatsapp VARCHAR(30),
    email VARCHAR(150),
    endereco TEXT,
    endereco_completo TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(15),
    limite_credito NUMERIC(12, 2) NOT NULL DEFAULT 500.00,
    status_crediario VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK(status_crediario IN ('ativo', 'bloqueado')),
    referencia_nome VARCHAR(255),
    referencia_telefone VARCHAR(30),
    saldo_credito NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------
-- 6. PERFIS DE TRIBUTAÇÃO
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS tributacoes_perfis (
    id SERIAL PRIMARY KEY,
    loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    nome VARCHAR(150) NOT NULL,
    origem SMALLINT NOT NULL DEFAULT 0,
    monofasico SMALLINT NOT NULL DEFAULT 0,
    ncm_padrao VARCHAR(20),
    cfop_padrao VARCHAR(10),
    csosn_cst VARCHAR(10),
    aliquota_icms NUMERIC(6, 2) DEFAULT 0.0,
    aliquota_pis NUMERIC(6, 2) DEFAULT 0.0,
    aliquota_cofins NUMERIC(6, 2) DEFAULT 0.0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------
-- 7. PRODUTOS & CATÁLOGO
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,
    loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE,
    codigo VARCHAR(100),
    codigo_extra VARCHAR(100),
    ean_gtin VARCHAR(50),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(100),
    subcategoria VARCHAR(100),
    marca VARCHAR(100),
    peso_liquido NUMERIC(10, 3) DEFAULT 0.0,
    peso_bruto NUMERIC(10, 3) DEFAULT 0.0,
    localizacao VARCHAR(100),
    unidade_medida VARCHAR(10) NOT NULL DEFAULT 'UN',
    tamanho VARCHAR(30),
    cor VARCHAR(50),
    imagem_url TEXT,
    preco_custo NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    preco_venda NUMERIC(12, 2) NOT NULL,
    margem_lucro NUMERIC(6, 2) DEFAULT 0.0,
    preco_promocional NUMERIC(12, 2),
    estoque_atual NUMERIC(12, 3) NOT NULL DEFAULT 0.0,
    estoque_minimo NUMERIC(12, 3) NOT NULL DEFAULT 0.0,
    controla_estoque SMALLINT NOT NULL DEFAULT 1,
    permite_venda_fracionada SMALLINT NOT NULL DEFAULT 0,
    ativo SMALLINT NOT NULL DEFAULT 1,
    publicado_catalogo SMALLINT NOT NULL DEFAULT 1,
    descricao_catalogo TEXT,
    is_kit SMALLINT NOT NULL DEFAULT 0,
    data_validade DATE,
    tributacao_perfil_id INTEGER REFERENCES tributacoes_perfis(id) ON DELETE SET NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------
-- 8. PEDIDOS DO CATÁLOGO ONLINE (RECEBIDOS NA NUVEM)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos_catalogo (
    id SERIAL PRIMARY KEY,
    loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE,
    cliente VARCHAR(255) NOT NULL,
    cliente_telefone VARCHAR(50) NOT NULL,
    cliente_endereco TEXT,
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    taxa_entrega NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    total NUMERIC(12, 2) NOT NULL,
    entrega VARCHAR(50) NOT NULL DEFAULT 'entrega',
    pagamento VARCHAR(50) NOT NULL DEFAULT 'pix',
    status VARCHAR(30) NOT NULL DEFAULT 'novo',
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------
-- 9. CAIXA & SESSÕES
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS caixas_sessoes (
    id SERIAL PRIMARY KEY,
    loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE,
    usuario_id INTEGER,
    data_abertura TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    data_fechamento TIMESTAMP WITH TIME ZONE,
    saldo_inicial NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    saldo_final_informado NUMERIC(12, 2),
    saldo_final_sistema NUMERIC(12, 2),
    diferenca NUMERIC(12, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'aberto',
    observacoes TEXT
);

-- ----------------------------------------------------------
-- 10. VENDAS & PEDIDOS PDV
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendas (
    id SERIAL PRIMARY KEY,
    loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE,
    caixa_sessao_id INTEGER REFERENCES caixas_sessoes(id) ON DELETE SET NULL,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    usuario_id INTEGER,
    tipo_operacao VARCHAR(30) NOT NULL DEFAULT 'venda',
    status_pedido VARCHAR(30) NOT NULL DEFAULT 'concluida',
    subtotal NUMERIC(12, 2) NOT NULL,
    desconto NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    taxa_entrega NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    total NUMERIC(12, 2) NOT NULL,
    valor_pago NUMERIC(12, 2) DEFAULT 0.0,
    troco NUMERIC(12, 2) DEFAULT 0.0,
    salvar_troco_credito SMALLINT DEFAULT 0,
    forma_pagamento VARCHAR(50) NOT NULL,
    observacoes TEXT,
    dados_entrega_json TEXT,
    data_venda TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------
-- 11. ITENS DA VENDA
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS itens_venda (
    id SERIAL PRIMARY KEY,
    loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE,
    venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES produtos(id) ON DELETE SET NULL,
    quantidade NUMERIC(12, 3) NOT NULL,
    preco_unitario NUMERIC(12, 2) NOT NULL,
    desconto NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    subtotal NUMERIC(12, 2) NOT NULL
);

-- ----------------------------------------------------------
-- 12. CONTAS A PAGAR
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS contas_pagar (
    id SERIAL PRIMARY KEY,
    loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE,
    fornecedor_id INTEGER REFERENCES fornecedores(id) ON DELETE SET NULL,
    descricao VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'Mercadoria',
    valor NUMERIC(12, 2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente',
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------
-- 13. CONFIGURAÇÕES POR LOJA
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracoes_loja (
    id SERIAL PRIMARY KEY,
    loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE,
    chave VARCHAR(100) NOT NULL,
    valor TEXT
);

-- ----------------------------------------------------------
-- 14. CONFIGURAÇÃO DE CREDIÁRIO POR LOJA
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS crediario_config (
    id SERIAL PRIMARY KEY,
    loja_id INTEGER NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
    juros_mensal_percentual NUMERIC(6, 2) NOT NULL DEFAULT 2.50,
    multa_atraso_percentual NUMERIC(6, 2) NOT NULL DEFAULT 2.00,
    dias_carencia INTEGER NOT NULL DEFAULT 3,
    max_parcelas INTEGER NOT NULL DEFAULT 12,
    intervalo_dias_parcelas INTEGER NOT NULL DEFAULT 30,
    dias_para_bloquear_cliente INTEGER NOT NULL DEFAULT 15,
    exige_aprovacao_gerente_acima_do_limite SMALLINT NOT NULL DEFAULT 1,
    entrada_minima_percentual NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    regua_texto_lembrete TEXT DEFAULT 'Olá, {nome}! Lembramos que sua parcela de {valor} na {loja} vence em {vencimento}. Chave PIX: {pix}',
    regua_texto_atraso_1 TEXT DEFAULT 'Olá, {nome}! Notamos que sua parcela de {valor} na {loja} venceu em {vencimento}. Evite juros e regularize pelo PIX: {pix}',
    regua_texto_atraso_2 TEXT DEFAULT '{nome}, sua parcela na {loja} no valor de {valor} está com 7 dias de atraso. Favor entrar em contato para regularização.',
    regua_texto_atraso_3 TEXT DEFAULT 'AVISO DE BLOQUEIO: {nome}, seu crediário na {loja} está com 15 dias de atraso ({valor}). Evite bloqueio de novas compras.',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------
-- 15. CONTRATOS MESTRE DE CREDIÁRIO
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS crediario_contratos (
    id SERIAL PRIMARY KEY,
    loja_id INTEGER NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    venda_id INTEGER REFERENCES vendas(id) ON DELETE SET NULL,
    valor_total NUMERIC(12, 2) NOT NULL,
    valor_entrada NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    valor_financiado NUMERIC(12, 2) NOT NULL,
    taxa_juros_mensal NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    total_com_juros NUMERIC(12, 2) NOT NULL,
    qtd_parcelas INTEGER NOT NULL,
    data_primeira_parcela DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK(status IN ('ativo', 'quitado', 'cancelado', 'renegociado')),
    contrato_origem_renegociacao_id INTEGER REFERENCES crediario_contratos(id) ON DELETE SET NULL,
    aprovado_por_usuario_id INTEGER,
    motivo_aprovacao TEXT,
    criado_por INTEGER,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------
-- 16. PARCELAS DE CREDIÁRIO
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS crediario_parcelas (
    id SERIAL PRIMARY KEY,
    loja_id INTEGER NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
    contrato_id INTEGER NOT NULL REFERENCES crediario_contratos(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    valor NUMERIC(12, 2) NOT NULL,
    valor_pago NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    saldo_restante NUMERIC(12, 2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'aberta' CHECK(status IN ('aberta', 'paga', 'parcial', 'atrasada', 'cancelada')),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------
-- 17. HISTÓRICO DE PAGAMENTOS E BAIXAS DE PARCELAS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS crediario_pagamentos (
    id SERIAL PRIMARY KEY,
    loja_id INTEGER NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
    parcela_id INTEGER NOT NULL REFERENCES crediario_parcelas(id) ON DELETE CASCADE,
    caixa_sessao_id INTEGER,
    valor NUMERIC(12, 2) NOT NULL,
    forma_pagamento VARCHAR(30) NOT NULL CHECK(forma_pagamento IN ('dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'transferencia', 'credito_cliente')),
    data DATE NOT NULL,
    recebido_por INTEGER,
    juros_cobrado NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    multa_cobrada NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    desconto NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    observacao TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------
-- 18. HISTÓRICO E SCORE CONSOLIDADO DO CLIENTE
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS crediario_historico_cliente (
    cliente_id INTEGER PRIMARY KEY REFERENCES clientes(id) ON DELETE CASCADE,
    loja_id INTEGER NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
    total_comprado NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_pago NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    saldo_devedor_atual NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    qtd_contratos INTEGER NOT NULL DEFAULT 0,
    qtd_parcelas_pagas INTEGER NOT NULL DEFAULT 0,
    qtd_atrasos INTEGER NOT NULL DEFAULT 0,
    maior_atraso_dias INTEGER NOT NULL DEFAULT 0,
    ultimo_atraso_em TIMESTAMP WITH TIME ZONE,
    score_calculado INTEGER NOT NULL DEFAULT 100,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------
-- 19. LOG E CONTROLE DE DUPLICIDADE DE COBRANÇAS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS crediario_cobrancas_log (
    id SERIAL PRIMARY KEY,
    loja_id INTEGER NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
    parcela_id INTEGER NOT NULL REFERENCES crediario_parcelas(id) ON DELETE CASCADE,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    tipo_mensagem VARCHAR(30) NOT NULL CHECK(tipo_mensagem IN ('lembrete', 'atraso_1', 'atraso_2', 'atraso_3')),
    canal VARCHAR(20) NOT NULL CHECK(canal IN ('whatsapp', 'sms', 'email')),
    telefone_ou_email VARCHAR(150),
    mensagem_enviada TEXT,
    enviada_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status_envio VARCHAR(20) NOT NULL DEFAULT 'enviado' CHECK(status_envio IN ('pendente', 'enviado', 'falha'))
);

-- ----------------------------------------------------------
-- 20. AUDITORIA DE AÇÕES CRÍTICAS DO CREDIÁRIO
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria_crediario (
    id SERIAL PRIMARY KEY,
    loja_id INTEGER NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
    usuario_id INTEGER,
    acao VARCHAR(50) NOT NULL,
    entidade_tipo VARCHAR(50) NOT NULL,
    entidade_id INTEGER NOT NULL,
    detalhes_json TEXT,
    justificativa TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================================
-- MIGRAÇÕES / GARANTIA DE COLUNAS EM TABELAS EXISTENTES
-- ==========================================================
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS nome VARCHAR(255);
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS nome_fantasia VARCHAR(255);
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS razao_social VARCHAR(255);
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS cnpj_cpf VARCHAR(30);
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS slug_catalogo VARCHAR(100);
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS telefone VARCHAR(30);
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(30);
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS cidade VARCHAR(100);
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS estado VARCHAR(2);
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS cep VARCHAR(15);
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS slogan VARCHAR(255);
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS chave_api_sync VARCHAR(100);
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS catalogo_ativo SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS taxa_entrega_padrao NUMERIC(10, 2) DEFAULT 0.0;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS permite_retirada SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS manter_sem_estoque SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS instrucoes_pagamento TEXT;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS instagram VARCHAR(100);
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS ativo SMALLINT NOT NULL DEFAULT 1;

-- Sincroniza nome / nome_fantasia e slug / slug_catalogo se um deles estiver preenchido
UPDATE lojas SET nome = COALESCE(nome, nome_fantasia, 'Loja Sem Nome') WHERE nome IS NULL;
UPDATE lojas SET nome_fantasia = COALESCE(nome_fantasia, nome, 'Loja Sem Nome') WHERE nome_fantasia IS NULL;
UPDATE lojas SET slug = COALESCE(slug, slug_catalogo, 'loja-' || id) WHERE slug IS NULL;
UPDATE lojas SET slug_catalogo = COALESCE(slug_catalogo, slug, 'loja-' || id) WHERE slug_catalogo IS NULL;

-- Garante colunas em produtos
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS publicado_catalogo SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS descricao_catalogo TEXT;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS tributacao_perfil_id INTEGER REFERENCES tributacoes_perfis(id) ON DELETE SET NULL;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS is_kit SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS data_validade DATE;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ativo SMALLINT NOT NULL DEFAULT 1;

-- Garante colunas em clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS saldo_credito NUMERIC(12, 2) NOT NULL DEFAULT 0.0;

-- Garante colunas em vendas
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS tipo_operacao VARCHAR(30) NOT NULL DEFAULT 'venda';
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS status_pedido VARCHAR(30) NOT NULL DEFAULT 'concluida';
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS troco NUMERIC(12, 2) DEFAULT 0.0;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS valor_pago NUMERIC(12, 2) DEFAULT 0.0;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS salvar_troco_credito SMALLINT DEFAULT 0;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS dados_entrega_json TEXT;

-- Garante colunas em pedidos_catalogo
ALTER TABLE pedidos_catalogo ADD COLUMN IF NOT EXISTS loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE;
ALTER TABLE pedidos_catalogo ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'novo';
ALTER TABLE pedidos_catalogo ADD COLUMN IF NOT EXISTS taxa_entrega NUMERIC(12, 2) NOT NULL DEFAULT 0.0;
ALTER TABLE pedidos_catalogo ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.0;

-- Garante colunas em fornecedores, caixas, contas_pagar, tributações, itens_venda, crediario
ALTER TABLE IF EXISTS fornecedores ADD COLUMN IF NOT EXISTS loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS caixas_sessoes ADD COLUMN IF NOT EXISTS loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS contas_pagar ADD COLUMN IF NOT EXISTS loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS tributacoes_perfis ADD COLUMN IF NOT EXISTS loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS itens_venda ADD COLUMN IF NOT EXISTS loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS configuracoes_loja ADD COLUMN IF NOT EXISTS loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE;

-- Garante colunas em crediario caso já existam tabelas prévias
ALTER TABLE IF EXISTS crediario_config ADD COLUMN IF NOT EXISTS loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS crediario_contratos ADD COLUMN IF NOT EXISTS loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS crediario_parcelas ADD COLUMN IF NOT EXISTS loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS crediario_pagamentos ADD COLUMN IF NOT EXISTS loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS crediario_historico_cliente ADD COLUMN IF NOT EXISTS loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS crediario_cobrancas_log ADD COLUMN IF NOT EXISTS loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS auditoria_crediario ADD COLUMN IF NOT EXISTS loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE;

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) PARA MULTI-TENANCY SEGURO
-- ==========================================================

ALTER TABLE lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_loja ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tributacoes_perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixas_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_loja ENABLE ROW LEVEL SECURITY;
ALTER TABLE crediario_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE crediario_contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE crediario_parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE crediario_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE crediario_historico_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE crediario_cobrancas_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_crediario ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para extrair lojas do usuário logado
CREATE OR REPLACE FUNCTION get_lojas_usuario()
RETURNS SETOF INTEGER AS $$
    SELECT loja_id FROM usuarios_loja WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Função para verificar se o usuário é superadmin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM usuarios_loja 
        WHERE user_id = auth.uid() AND perfil = 'superadmin'
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- Políticas para LOJAS
DROP POLICY IF EXISTS "Lojas: Leitura por membros ou superadmin" ON lojas;
CREATE POLICY "Lojas: Leitura por membros ou superadmin" ON lojas
    FOR SELECT USING (id IN (SELECT get_lojas_usuario()) OR is_superadmin());

DROP POLICY IF EXISTS "Lojas: Leitura pública para catálogo" ON lojas;
CREATE POLICY "Lojas: Leitura pública para catálogo" ON lojas
    FOR SELECT USING (ativo = 1 AND catalogo_ativo = 1);

DROP POLICY IF EXISTS "Lojas: Atualização por admin" ON lojas;
CREATE POLICY "Lojas: Atualização por admin" ON lojas
    FOR UPDATE USING (
        id IN (SELECT loja_id FROM usuarios_loja WHERE user_id = auth.uid() AND perfil IN ('admin', 'superadmin'))
        OR is_superadmin()
    );

-- Políticas para USUARIOS_LOJA
DROP POLICY IF EXISTS "Usuarios_Loja: Gerenciamento por admin ou superadmin" ON usuarios_loja;
CREATE POLICY "Usuarios_Loja: Gerenciamento por admin ou superadmin" ON usuarios_loja
    FOR ALL USING (loja_id IN (SELECT get_lojas_usuario()) OR is_superadmin());

-- Políticas para ASSINATURAS
DROP POLICY IF EXISTS "Assinaturas: Leitura por membro" ON assinaturas;
CREATE POLICY "Assinaturas: Leitura por membro" ON assinaturas
    FOR SELECT USING (loja_id IN (SELECT get_lojas_usuario()) OR is_superadmin());

DROP POLICY IF EXISTS "Assinaturas: Edição por superadmin" ON assinaturas;
CREATE POLICY "Assinaturas: Edição por superadmin" ON assinaturas
    FOR ALL USING (is_superadmin());

-- Políticas para PRODUTOS
DROP POLICY IF EXISTS "Produtos: Membros da loja" ON produtos;
CREATE POLICY "Produtos: Membros da loja" ON produtos
    FOR ALL USING (loja_id IN (SELECT get_lojas_usuario()) OR is_superadmin());

DROP POLICY IF EXISTS "Produtos: Leitura pública catálogo" ON produtos;
CREATE POLICY "Produtos: Leitura pública catálogo" ON produtos
    FOR SELECT USING (ativo = 1 AND publicado_catalogo = 1);

-- Políticas para PEDIDOS_CATALOGO
DROP POLICY IF EXISTS "Pedidos_Catalogo: Inserção pública" ON pedidos_catalogo;
CREATE POLICY "Pedidos_Catalogo: Inserção pública" ON pedidos_catalogo
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Pedidos_Catalogo: Membros da loja" ON pedidos_catalogo;
CREATE POLICY "Pedidos_Catalogo: Membros da loja" ON pedidos_catalogo
    FOR ALL USING (loja_id IN (SELECT get_lojas_usuario()) OR is_superadmin());

-- Políticas para outras tabelas operacionais
DROP POLICY IF EXISTS "Fornecedores: Isolamento por loja" ON fornecedores;
CREATE POLICY "Fornecedores: Isolamento por loja" ON fornecedores
    FOR ALL USING (loja_id IN (SELECT get_lojas_usuario()) OR is_superadmin());

DROP POLICY IF EXISTS "Clientes: Isolamento por loja" ON clientes;
CREATE POLICY "Clientes: Isolamento por loja" ON clientes
    FOR ALL USING (loja_id IN (SELECT get_lojas_usuario()) OR is_superadmin());

DROP POLICY IF EXISTS "Tributacoes: Isolamento por loja" ON tributacoes_perfis;
CREATE POLICY "Tributacoes: Isolamento por loja" ON tributacoes_perfis
    FOR ALL USING (loja_id IN (SELECT get_lojas_usuario()) OR is_superadmin());

DROP POLICY IF EXISTS "Caixas: Isolamento por loja" ON caixas_sessoes;
CREATE POLICY "Caixas: Isolamento por loja" ON caixas_sessoes
    FOR ALL USING (loja_id IN (SELECT get_lojas_usuario()) OR is_superadmin());

DROP POLICY IF EXISTS "Vendas: Isolamento por loja" ON vendas;
CREATE POLICY "Vendas: Isolamento por loja" ON vendas
    FOR ALL USING (loja_id IN (SELECT get_lojas_usuario()) OR is_superadmin());

DROP POLICY IF EXISTS "Itens_Venda: Isolamento por loja" ON itens_venda;
CREATE POLICY "Itens_Venda: Isolamento por loja" ON itens_venda
    FOR ALL USING (loja_id IN (SELECT get_lojas_usuario()) OR is_superadmin());

DROP POLICY IF EXISTS "Contas_Pagar: Isolamento por loja" ON contas_pagar;
CREATE POLICY "Contas_Pagar: Isolamento por loja" ON contas_pagar
    FOR ALL USING (loja_id IN (SELECT get_lojas_usuario()) OR is_superadmin());

DROP POLICY IF EXISTS "Configuracoes_Loja: Isolamento por loja" ON configuracoes_loja;
CREATE POLICY "Configuracoes_Loja: Isolamento por loja" ON configuracoes_loja
    FOR ALL USING (loja_id IN (SELECT get_lojas_usuario()) OR is_superadmin());

-- Políticas para MÓDULO CREDIÁRIO
DROP POLICY IF EXISTS "Crediario_Config: Isolamento por loja" ON crediario_config;
CREATE POLICY "Crediario_Config: Isolamento por loja" ON crediario_config
    FOR ALL USING (loja_id IN (SELECT get_lojas_usuario()) OR is_superadmin());

DROP POLICY IF EXISTS "Crediario_Contratos: Isolamento por loja" ON crediario_contratos;
CREATE POLICY "Crediario_Contratos: Isolamento por loja" ON crediario_contratos
    FOR ALL USING (loja_id IN (SELECT get_lojas_usuario()) OR is_superadmin());

DROP POLICY IF EXISTS "Crediario_Parcelas: Isolamento por loja" ON crediario_parcelas;
CREATE POLICY "Crediario_Parcelas: Isolamento por loja" ON crediario_parcelas
    FOR ALL USING (loja_id IN (SELECT get_lojas_usuario()) OR is_superadmin());

DROP POLICY IF EXISTS "Crediario_Pagamentos: Isolamento por loja" ON crediario_pagamentos;
CREATE POLICY "Crediario_Pagamentos: Isolamento por loja" ON crediario_pagamentos
    FOR ALL USING (loja_id IN (SELECT get_lojas_usuario()) OR is_superadmin());

DROP POLICY IF EXISTS "Crediario_Historico: Isolamento por loja" ON crediario_historico_cliente;
CREATE POLICY "Crediario_Historico: Isolamento por loja" ON crediario_historico_cliente
    FOR ALL USING (loja_id IN (SELECT get_lojas_usuario()) OR is_superadmin());

DROP POLICY IF EXISTS "Crediario_Cobrancas: Isolamento por loja" ON crediario_cobrancas_log;
CREATE POLICY "Crediario_Cobrancas: Isolamento por loja" ON crediario_cobrancas_log
    FOR ALL USING (loja_id IN (SELECT get_lojas_usuario()) OR is_superadmin());

DROP POLICY IF EXISTS "Auditoria_Crediario: Isolamento por loja" ON auditoria_crediario;
CREATE POLICY "Auditoria_Crediario: Isolamento por loja" ON auditoria_crediario
    FOR ALL USING (loja_id IN (SELECT get_lojas_usuario()) OR is_superadmin());

-- ==========================================================
-- ÍNDICES DE PERFORMANCE
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_lojas_slug ON lojas(slug);
CREATE INDEX IF NOT EXISTS idx_produtos_loja ON produtos(loja_id);
CREATE INDEX IF NOT EXISTS idx_produtos_catalogo ON produtos(publicado_catalogo, ativo);
CREATE INDEX IF NOT EXISTS idx_pedidos_catalogo_loja ON pedidos_catalogo(loja_id, status);
CREATE INDEX IF NOT EXISTS idx_vendas_loja ON vendas(loja_id, data_venda);
CREATE INDEX IF NOT EXISTS idx_clientes_loja ON clientes(loja_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_loja ON contas_pagar(loja_id, data_vencimento);

-- Índices do Crediário
CREATE INDEX IF NOT EXISTS idx_pg_crediario_contratos_loja ON crediario_contratos(loja_id);
CREATE INDEX IF NOT EXISTS idx_pg_crediario_contratos_cli ON crediario_contratos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pg_crediario_contratos_status ON crediario_contratos(status);
CREATE INDEX IF NOT EXISTS idx_pg_crediario_parcelas_loja ON crediario_parcelas(loja_id);
CREATE INDEX IF NOT EXISTS idx_pg_crediario_parcelas_contrato ON crediario_parcelas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_pg_crediario_parcelas_venc ON crediario_parcelas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_pg_crediario_parcelas_status ON crediario_parcelas(status);
CREATE INDEX IF NOT EXISTS idx_pg_crediario_pagamentos_loja ON crediario_pagamentos(loja_id);
CREATE INDEX IF NOT EXISTS idx_pg_crediario_pagamentos_parc ON crediario_pagamentos(parcela_id);
CREATE INDEX IF NOT EXISTS idx_pg_crediario_pagamentos_data ON crediario_pagamentos(data);
CREATE INDEX IF NOT EXISTS idx_pg_crediario_cobrancas_dup ON crediario_cobrancas_log(parcela_id, tipo_mensagem);
CREATE INDEX IF NOT EXISTS idx_pg_auditoria_crediario_loja ON auditoria_crediario(loja_id);

-- ==========================================================
-- SEEDS INICIAIS: PLANOS DO SAAS & LOJA MODELO
-- ==========================================================

INSERT INTO planos (id, nome, preco, descricao, recursos) VALUES
(
    'gratis',
    'Plano Grátis',
    0.00,
    'Ideal para começar: PDV essencial, estoque, clientes e vitrine do catálogo.',
    '["pdv_basico", "produtos", "clientes", "estoque", "caixa", "relatorios_basicos", "troca_devolucao", "catalogo_vitrine"]'::jsonb
),
(
    'premium',
    'Plano Premium',
    49.90,
    'Para lojas em crescimento: Pedidos, orçamentos, delivery, contas a pagar e pedidos do catálogo online.',
    '["pdv_basico", "produtos", "clientes", "estoque", "caixa", "relatorios_basicos", "troca_devolucao", "catalogo_vitrine", "venda_pedidos", "venda_orcamentos", "contas_pagar", "pedidos_catalogo", "relatorios_completos"]'::jsonb
),
(
    'fiscal',
    'Plano Fiscal',
    89.90,
    'Completo com emissão fiscal SEFAZ: NFC-e, NF-e, SPED, importação de XML e integração TEF.',
    '["pdv_basico", "produtos", "clientes", "estoque", "caixa", "relatorios_basicos", "troca_devolucao", "catalogo_vitrine", "venda_pedidos", "venda_orcamentos", "contas_pagar", "pedidos_catalogo", "relatorios_completos", "nota_fiscal", "tef_integrado", "sped_fiscal"]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    preco = EXCLUDED.preco,
    descricao = EXCLUDED.descricao,
    recursos = EXCLUDED.recursos;

-- Loja Modelo Inicial
INSERT INTO lojas (id, nome, nome_fantasia, slug, slug_catalogo, email, telefone, whatsapp, endereco, cidade, estado, cep, logo_url, slogan, bio, taxa_entrega_padrao, ativo, catalogo_ativo)
VALUES (
    1, 
    'WS Gestão PDV - Loja Modelo', 
    'WS Gestão PDV - Loja Modelo',
    'lojamodelo', 
    'lojamodelo',
    'contato@lojamodelo.com.br', 
    '(11) 3322-4455', 
    '(11) 99887-6655', 
    'Av. Comercial, 1000 - Centro', 
    'São Paulo', 
    'SP', 
    '01000-000', 
    'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=150&auto=format&fit=crop&q=80', 
    'A melhor experiência de compras da cidade', 
    'Loja modelo do sistema WS Gestão PDV SaaS.', 
    7.50, 
    1,
    1
)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    nome_fantasia = EXCLUDED.nome_fantasia,
    slug = EXCLUDED.slug,
    slug_catalogo = EXCLUDED.slug_catalogo,
    catalogo_ativo = EXCLUDED.catalogo_ativo;

-- Assinatura Inicial da Loja Modelo
INSERT INTO assinaturas (loja_id, plano, status, data_inicio, trial_usado)
VALUES (1, 'gratis', 'ativa', CURRENT_TIMESTAMP, 0)
ON CONFLICT (id) DO NOTHING;

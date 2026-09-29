# NexPDV — Sistema de Gestão para Loja & PDV (Windows Desktop Offline)

Sistema comercial completo para gestão de loja e frente de caixa (PDV), inspirado no **Nex (Nextar)**, desenvolvido com **Electron**, **React**, **TypeScript**, **TailwindCSS** e **SQLite local** (100% offline).

---

## 🚀 Tecnologias e Arquitetura

- **Desktop Shell:** Electron 33 (Windows x64 / x86).
- **Frontend / Renderer:** React 18 + Vite + TypeScript + TailwindCSS + Lucide Icons.
- **Banco de Dados:** SQLite binário local (`loja.db`) inicializado automaticamente a partir do [schema.sql](file:///d:/sistema%20em%20Desenvolvimento/app/SISTEMA%20DE%20LOJA/schema.sql) com transações ACID.
- **Comunicação Segura:** `contextBridge` + `ipcRenderer` isolado em [preload.ts](file:///d:/sistema%20em%20Desenvolvimento/app/SISTEMA%20DE%20LOJA/src/main/preload.ts).

---

## 📋 Módulos Implementados

1. **🔐 Login e Controle de Acesso:**
   - Perfis de permissão: `admin` (acesso irrestrito), `gerente` e `vendedor`.
   - Criptografia de senhas com `bcrypt`.
   - *Usuários de Demonstração*:
     - **Admin:** `admin` / senha: `admin123`
     - **Vendedor:** `vendedor` / senha: `123456`

2. **🛒 PDV (Frente de Caixa Rápido):**
   - Suporte a leitor de código de barras físico (EAN-13, etc.) ou digitação rápida.
   - Atalhos de teclado ágeis:
     - `F1`: Frente de Caixa / PDV
     - `F2`: Buscar Produto no Catálogo
     - `F3`: Aplicar Desconto (R$ ou %)
     - `F4`: Selecionar / Vincular Cliente
     - `F5`: Controle de Caixa
     - `F7` ou `Ctrl+Enter`: Finalizar Venda
   - Formas de pagamento: **Dinheiro** (com cálculo automático de troco e cédulas rápidas), **Cartão de Débito**, **Cartão de Crédito** e **PIX** (com QR Code simulado).
   - Bloqueio automático de vendas se o caixa estiver fechado.
   - Baixa automática no estoque e registro em `estoque_movimentacoes`.
   - Emissão de comprovante não fiscal (impressão térmica 80mm).

3. **💵 Controle de Caixa:**
   - Abertura de turno informando o fundo de troco inicial.
   - Fechamento de caixa assistido: totaliza vendas por forma de pagamento, compara com a contagem física informada e calcula quebra ou sobra de caixa.
   - Histórico completo de turnos anteriores.

4. **📦 Cadastro de Produtos:**
   - CRUD com código de barras, categoria, unidade de medida, preço de custo, preço de venda, cálculo automático de margem/markup, estoque atual, estoque mínimo, estoque máximo e data de validade.

5. **👥 Clientes e Fornecedores:**
   - Cadastro completo de clientes e distribuidores com CPF/CNPJ, telefone/WhatsApp, e-mail e endereço.

6. **📊 Controle de Estoque & Validade:**
   - Entrada manual de mercadorias vinculada a fornecedor com atualização de preço de custo.
   - Ajuste manual de inventário.
   - Alertas visuais para produtos abaixo do estoque mínimo.
   - Alerta para produtos próximos do vencimento (30 dias).
   - Histórico cronológico de movimentações.

7. **💳 Contas a Pagar:**
   - Lançamento de despesas e faturas de fornecedores com data de vencimento.
   - Classificação em tempo real de status: `pendente`, `pago` e `atrasado`.
   - Quitação rápida.

8. **📈 Relatórios & Lucratividade:**
   - Faturamento por período (Hoje, 7 dias, 30 dias, Mês Atual).
   - Evolução diária e distribuição por meio de pagamento.
   - Ranking dos produtos mais vendidos.
   - Lucro bruto estimado (Preço de Venda − Preço de Custo) e margem por item.

9. **🧾 Módulo Fiscal (NFC-e via API Terceirizada):**
   - Montagem de payload JSON completo no padrão SEFAZ (CFOP 5102, tributos Simples Nacional e meios de pagamento).
   - Função `emitirNotaFiscal(vendaId)` preparada para integração REST com **Focus NFe**, **PlugNotas** ou **eNotas**.
   - Modo de homologação/simulação offline com geração de chave de 44 dígitos e link do DANFE/XML.

---

## 🛠️ Como Executar o Projeto

### 1. Instalação de Dependências
```bash
npm install
```

### 2. Rodar em Modo Desenvolvimento (com Hot Reload)
```bash
npm run electron:dev
```

### 3. Rodar em Modo Produção Local
```bash
npm run build
npm run build:electron
npm start
```

---

## 📦 Como Gerar o Instalador `.exe` para Windows

Para gerar o arquivo executável instalável (`.exe` com instalador NSIS e versão portátil):

1. Execute o comando de empacotamento:
```bash
npm run dist
```

2. Os instaladores serão gerados automaticamente na pasta:
```
dist-installer/
  ├── NexPDV Gestão de Loja Setup 1.0.0.exe   (Instalador Oficial Windows)
  └── NexPDV Gestão de Loja 1.0.0.exe         (Executável Portátil / Portable)
```

O instalador cria atalho na Área de Trabalho e no Menu Iniciar do Windows com suporte a desinstalação padrão.

---

## 🗄️ Estrutura de Pastas

```
├── schema.sql                     # Schema oficial SQLite
├── package.json                   # Dependências e scripts de build
├── tsconfig.json                  # Configuração TS do Frontend
├── tsconfig.electron.json         # Configuração TS do Main Process
├── vite.config.ts                 # Configuração do Vite
├── tailwind.config.js             # Estilização visual moderna
├── src/
│   ├── main/                      # Electron Main Process (Backend)
│   │   ├── main.ts                # Janela, ciclo de vida e IPC Handlers
│   │   ├── preload.ts             # ContextBridge seguro para window.api
│   │   ├── db/
│   │   │   ├── database.ts        # Engine SQLite, persistência e transações ACID
│   │   │   └── queries.ts         # Métodos CRUD tipados e regras de negócio
│   │   └── services/
│   │       └── fiscalService.ts   # Montagem de payload NFC-e e chamada HTTP
│   └── renderer/                  # Interface do Usuário (React)
│       ├── App.tsx                # Roteamento por atalhos e layout
│       ├── context/               # AuthContext e CaixaContext
│       ├── components/            # Header, Sidebar, Modal, ReceiptModal
│       └── views/                 # PDV, Caixa, Produtos, Clientes, Estoque, Contas, Relatórios, Fiscal, Config
```
# Sistema-de-loja

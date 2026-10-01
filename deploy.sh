```bash
#!/bin/bash

# ==========================================================
# WS Gestão - Deploy automático para GitHub
# Repositório:
# https://github.com/williamdsg12/Sistema-de-loja.git
# ==========================================================

set -e

echo ""
echo "=========================================="
echo "   WS GESTÃO - DEPLOY PARA GITHUB"
echo "=========================================="
echo ""

# Verifica se estamos dentro de um repositório Git
if [ ! -d ".git" ]; then
    echo "❌ Repositório Git não inicializado."
    echo "Inicializando Git..."

    git init
    git branch -M main
fi

# Verifica se o remote origin existe
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "🔗 Configurando repositório remoto..."

    git remote add origin https://github.com/williamdsg12/Sistema-de-loja.git
else
    echo "✅ Repositório remoto já configurado."
fi

echo ""
echo "📦 Adicionando arquivos..."
git add .

echo ""
echo "📝 Verificando alterações..."

# Verifica se existem alterações para commit
if git diff --cached --quiet; then
    echo ""
    echo "ℹ️ Nenhuma alteração nova para enviar."
else

    # Permite informar uma mensagem personalizada:
    if [ -n "$1" ]; then
        COMMIT_MESSAGE="$1"
    else
        COMMIT_MESSAGE="Atualização do sistema - $(date '+%d/%m/%Y %H:%M')"
    fi

    echo ""
    echo "💾 Criando commit:"
    echo "\"$COMMIT_MESSAGE\""

    git commit -m "$COMMIT_MESSAGE"
fi

echo ""
echo "🚀 Enviando alterações para o GitHub..."
git branch -M main
git push -u origin main

echo ""
echo "=========================================="
echo "       ✅ DEPLOY CONCLUÍDO!"
echo "=========================================="
echo ""
echo "GitHub:"
echo "https://github.com/williamdsg12/Sistema-de-loja"
echo ""
```

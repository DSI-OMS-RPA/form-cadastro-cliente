#!/bin/bash

# Script de deploy para produção
# Garante que todas as dependências, banco de dados e ambiente estejam configurados

set -e

echo "🚀 Iniciando deploy..."

# 1. Definir variáveis de ambiente (ajuste conforme necessário)
export NODE_ENV="production"
export DATABASE_URL="file:../storage/cadastro.db"

echo "📦 Instalando dependências..."
npm ci --omit=dev

echo "🔨 Gerando cliente Prisma..."
npx prisma generate

echo "🗄️ Sincronizando banco de dados..."
npx prisma db push --skip-generate

echo "🏗️ Compilando aplicação..."
npm run build

echo "✅ Deploy concluído!"
echo "Para iniciar a aplicação, execute: npm start"

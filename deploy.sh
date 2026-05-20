#!/bin/bash

# Script de deploy para produção (Neon PostgreSQL)
# Garante que todas as dependências, banco de dados e ambiente estejam configurados

set -e

echo "🚀 Iniciando deploy para Neon PostgreSQL..."

# 1. Verificar se .env está configurado
if [ ! -f ".env" ]; then
  echo "❌ Erro: Ficheiro .env não encontrado!"
  echo "Crie um ficheiro .env na raiz do projeto com:"
  echo ""
  echo "  DATABASE_URL=\"postgresql://<user>:<password>@<host>/<database>?sslmode=require\""
  echo "  AUTH_SECRET=\"uma-string-longa-e-aleatoria\""
  echo "  COOKIE_SECURE=\"true\""
  echo ""
  exit 1
fi

# 2. Verificar se DATABASE_URL está definida
if [ -z "$DATABASE_URL" ] && ! grep -q "^DATABASE_URL=" .env; then
  echo "❌ Erro: DATABASE_URL não definida no .env!"
  exit 1
fi

# 3. Carregar variáveis do .env
export NODE_ENV="production"
set -a
source .env
set +a

echo "✅ Variáveis de ambiente carregadas"
echo "📦 Instalando dependências..."
npm ci --omit=dev

echo "🔨 Gerando cliente Prisma..."
npx prisma generate

echo "🗄️ Sincronizando schema na base PostgreSQL..."
npx prisma db push --skip-generate

echo "🏗️ Compilando aplicação..."
npm run build

echo "✅ Deploy concluído!"
echo "Para iniciar a aplicação, execute: npm start"

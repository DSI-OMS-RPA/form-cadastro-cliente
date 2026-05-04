# Cadastro de Cliente

Projeto GPON — IFT Cadastro Clientes

## Visão Geral

Aplicação web para cadastro de prédios/residências FTTH e gestão dos clientes associados a cada localização.

A aplicação permite ao operador registar uma residência/prédio, capturar e ajustar coordenadas GPS, e depois adicionar um ou mais clientes a esse registo. O administrador consegue visualizar todos os registos, identificar quem inseriu cada localização, acompanhar o registo de acessos e exportar os dados em CSV.

## Tecnologia

- **Next.js** com App Router
- **React** e **TypeScript**
- **Tailwind CSS**
- **Leaflet** — mapa satélite e ajuste manual do pin GPS
- **SQLite** via **Prisma ORM** — base de dados local em ficheiro `.db`
- Autenticação local com cookie assinado (HMAC-SHA256)
- Passwords encriptadas com **scrypt** (crypto nativo do Node.js)
- Sem dependências de base de dados externa

## Funcionalidades

- Autenticação por utilizador com sessão em cookie.
- Perfis `admin` e `operador` com permissões distintas.
- Paginação da lista de prédios/residências (10 por página).
- Pesquisa em tempo real na lista principal (ilha, concelho, bairro, rua, tipo, etc.).
- Listagem de prédios/residências em cards, ordenada do mais recente para o mais antigo.
- Criação de prédio/residência em modal.
- Comboboxes pesquisáveis e dependentes:
  - Ilha → Concelho → Zona/Cidade → Bairro
- Comboboxes pesquisáveis para tipo e estado da moradia e género do cliente.
- Captura de coordenadas GPS pelo navegador.
- Modal com mapa satélite para ajustar manualmente o pin.
- Adição de clientes a uma residência/prédio existente.
- Modal para visualizar os clientes cadastrados numa residência/prédio.
- Exportação completa dos dados em CSV (admin).
- Registo de acessos (login, logout, tentativas falhadas) com painel para admin.

## Perfis

### Admin

- Vê todos os prédios/residências e quem inseriu cada registo.
- Pode adicionar clientes a qualquer registo.
- Acesso ao painel de **Registo de acessos** (login/logout por utilizador).
- Acesso ao botão de **Exportar CSV**.

### Operador

- Vê apenas os prédios/residências inseridos pelo próprio.
- Pode adicionar clientes apenas aos seus próprios registos.

## Utilizadores

Os utilizadores são configurados em:

```text
config/users.json
```

Exemplo de entrada:

```json
{
  "username": "operador",
  "password": "scrypt:a1b2c3...:d4e5f6...",
  "name": "Operador",
  "role": "operador",
  "active": true
}
```

Campos:

| Campo | Descrição |
|---|---|
| `username` | Nome usado no login |
| `password` | Password encriptada com scrypt (ver abaixo) |
| `name` | Nome visível na aplicação |
| `role` | `admin` ou `operador` |
| `active` | `false` impede o login sem remover o utilizador |

### Adicionar ou alterar utilizadores

1. Edite `config/users.json` com a password em texto simples.
2. Corra o script de encriptação:

```bash
npm run hash-passwords
```

O script deteta entradas já encriptadas e não as processa novamente — é seguro correr várias vezes.

### Utilizadores iniciais (após encriptação)

- `admin` / `admin123`
- `operador` / `operador123`

> **Produção:** altere as passwords padrão e defina `AUTH_SECRET` com um valor forte (ver [Variáveis de Ambiente](#variáveis-de-ambiente)).

## Segurança das Passwords

As passwords são encriptadas com **scrypt**, função de derivação de chave resistente a ataques por força bruta e GPU, usando o módulo `crypto` nativo do Node.js (sem dependências extra).

Parâmetros usados:

| Parâmetro | Valor |
|---|---|
| N (custo CPU/memória) | 16 384 |
| r (tamanho do bloco) | 8 |
| p (paralelismo) | 1 |
| Comprimento da chave | 64 bytes |
| Salt | 32 bytes aleatórios por password |

Formato armazenado: `scrypt:<salt_hex>:<hash_hex>`

## Sessão

- Guardada em cookie `httpOnly` assinado com HMAC-SHA256.
- Expira após **30 minutos** de inatividade.
- Termina manualmente através do botão `Terminar sessão`.

## Registo de Acessos

O sistema regista automaticamente:

- **Login** com sucesso
- **Logout** manual
- **Tentativas de login falhadas** (com o nome de utilizador tentado)

O admin acede ao painel em `Registo de acessos`, onde pode:

- Ver os últimos 500 eventos em tabela paginada (20 por página).
- Pesquisar por utilizador, evento ou endereço IP.
- Exportar o histórico em CSV.

## Dados Administrativos

O ficheiro Excel original de unidades administrativas foi copiado para:

```text
data/source/unidades-administrativas-cabo-verde.xlsx
```

A aplicação não lê o Excel diretamente. Os dados foram convertidos para uma estrutura TypeScript em:

```text
data/locations.ts
```

Hierarquia: **Ilha → Concelho → Zona/Cidade → Bairro**

## Base de Dados

Os registos são guardados numa base de dados SQLite local gerida pelo Prisma:

```text
storage/cadastro.db
```

### Tabelas

| Tabela | Conteúdo |
|---|---|
| `Registration` | Prédios/residências com localização e GPS |
| `Client` | Clientes associados a cada registo |
| `AuditLog` | Eventos de login, logout e tentativas falhadas |

### Migrações

As migrações são versionadas em `prisma/migrations/` e aplicadas automaticamente.

Para aplicar novas migrações após alterações ao schema:

```bash
npm run db:migrate
```

Para explorar a base de dados visualmente:

```bash
npm run db:studio
```

A pasta `storage/` está no `.gitignore` para evitar versionar dados reais.

### Migração do JSONL legado

Se existir um ficheiro `storage/registrations.jsonl` de uma versão anterior, pode importar os dados para a base de dados com:

```bash
npm run db:seed
```

O script é idempotente — ignora registos já existentes.

## Exportação CSV

Todos os dados podem ser exportados pelo admin através do botão **Exportar CSV** no painel principal ou diretamente via:

```text
GET /api/export
```

Formato:

- Uma linha por cliente.
- Se uma residência/prédio não tiver clientes, aparece com campos de cliente vazios.
- Inclui identificação do utilizador que inseriu a localização.

> Em produção, proteja este endpoint ao nível da rede, proxy reverso ou firewall.

## Endpoints

```text
GET   /api/auth/me            Utilizador da sessão atual
POST  /api/auth/login         Autenticação
POST  /api/auth/logout        Terminar sessão
GET   /api/registrations      Listar prédios/residências
POST  /api/registrations      Criar prédio/residência
PATCH /api/registrations      Adicionar cliente a um registo
GET   /api/export             Exportar todos os dados em CSV
GET   /api/audit              Registo de acessos (admin)
```

## Variáveis de Ambiente

Defina no ficheiro `.env` (não versionar):

```env
DATABASE_URL="file:./storage/cadastro.db"
AUTH_SECRET="string-longa-e-aleatoria-para-producao"
```

`AUTH_SECRET` assina os cookies de sessão. Se omitido, usa um valor fixo de desenvolvimento — **não seguro em produção**.

## Como Executar

### Instalação

```bash
npm install
```

### Desenvolvimento

```bash
npm run dev
```

### Produção

```bash
npm run build
npm run start
```

Por padrão, `dev` e `start` escutam em `0.0.0.0:3000` (acessível na rede local).

### Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run hash-passwords` | Encripta passwords em texto simples no `users.json` |
| `npm run db:migrate` | Aplica migrações Prisma |
| `npm run db:studio` | Interface visual da base de dados |
| `npm run db:seed` | Importa dados legados do JSONL para SQLite |

## GPS e HTTPS

A captura de GPS requer contexto seguro no navegador.

| Contexto | GPS disponível |
|---|---|
| `https://...` | ✅ |
| `http://localhost` | ✅ |
| `http://IP_DO_SERVIDOR` | ❌ |
| `http://dominio-sem-https` | ❌ |

Em produção, coloque a aplicação atrás de HTTPS (ex: Nginx + Certbot/Let's Encrypt).

## Mapa Satélite

O mapa usa tiles da **Esri World Imagery**. O operador pode:

1. Capturar coordenadas GPS automaticamente.
2. Abrir o mapa satélite.
3. Arrastar o marcador ou clicar para reposicionar.
4. Confirmar a localização ajustada.

## Ficheiros Principais

```text
app/page.tsx                        Página principal (lista + formulários)
app/autenticacao/page.tsx           Página de login
app/api/auth/login/route.ts         Autenticação
app/api/auth/logout/route.ts        Logout
app/api/auth/me/route.ts            Sessão atual
app/api/registrations/route.ts      CRUD de prédios/residências
app/api/export/route.ts             Exportação CSV
app/api/audit/route.ts              Registo de acessos
components/SatelliteMapModal.tsx    Modal do mapa satélite
lib/auth.ts                         Sessão, hashing de passwords
lib/audit.ts                        Registo de eventos de acesso
lib/db.ts                           Cliente Prisma (singleton)
config/users.json                   Utilizadores e passwords (encriptadas)
data/locations.ts                   Dados administrativos (ilha/concelho/…)
prisma/schema.prisma                Schema da base de dados
storage/cadastro.db                 Base de dados SQLite (não versionada)
scripts/hash-passwords.mjs          Encripta passwords em texto simples
scripts/migrate-jsonl.mjs           Migra dados do formato JSONL legado
```

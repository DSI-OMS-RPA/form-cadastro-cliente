# Cadastro de Cliente

Projeto GPON - IFT Cadastro Clientes

## Visão Geral

Aplicação web para cadastro de prédios/residências FTTH e gestão dos clientes associados a cada localização.

A aplicação permite ao operador registar uma residência/prédio, capturar e ajustar coordenadas GPS, e depois adicionar um ou mais clientes a esse registo. O administrador consegue visualizar todos os registos e identificar quem inseriu cada localização.

## Tecnologia

- Next.js com App Router
- React e TypeScript
- Tailwind CSS
- Leaflet para mapa satélite e ajuste manual do pin
- Armazenamento local em ficheiro JSONL
- Autenticação local com cookie assinado
- Sem dependências de base de dados externa

## Funcionalidades

- Autenticação por utilizador.
- Perfis `admin` e `operador`.
- Listagem de prédios/residências em cards.
- Criação de prédio/residência em modal.
- Comboboxes pesquisáveis e dependentes:
  - Ilha
  - Concelho
  - Zona/Cidade
  - Bairro
- Comboboxes pesquisáveis para tipo e estado da moradia.
- Captura de coordenadas GPS pelo navegador.
- Modal com mapa satélite para ajustar manualmente o pin.
- Adição de clientes a uma residência/prédio existente.
- Modal para visualizar os clientes cadastrados numa residência/prédio.
- Exportação completa dos dados em CSV.

## Perfis

### Admin

- Vê todos os prédios/residências.
- Vê quem inseriu cada localização.
- Pode adicionar clientes aos registos.

### Operador

- Vê apenas os prédios/residências inseridos pelo próprio utilizador.
- Pode adicionar clientes apenas aos seus próprios registos.

## Utilizadores

Os utilizadores são configurados diretamente em:

```text
config/users.json
```

Exemplo:

```json
{
  "username": "operador",
  "password": "operador123",
  "name": "Operador",
  "role": "operador",
  "active": true
}
```

Campos:

- `username`: nome usado no login.
- `password`: palavra-passe.
- `name`: nome visível na aplicação.
- `role`: `admin` ou `operador`.
- `active`: se `false`, impede o login.

Utilizadores iniciais:

- `admin` / `admin123`
- `operador` / `operador123`

Em produção, altere as palavras-passe padrão e defina a variável de ambiente `AUTH_SECRET` com um valor forte.

## Sessão

A sessão é guardada em cookie assinado e expira após 30 minutos.

O utilizador também pode terminar a sessão manualmente através do botão `Terminar sessão`.

## Dados Administrativos

O ficheiro Excel original de unidades administrativas foi copiado para:

```text
data/source/unidades-administrativas-cabo-verde.xlsx
```

A aplicação não lê o Excel diretamente no browser. Os dados foram convertidos para uma estrutura TypeScript leve em:

```text
data/locations.ts
```

Hierarquia usada:

```text
Ilha -> Concelho -> Zona/Cidade -> Bairro
```

Esta abordagem melhora a performance dos comboboxes e evita dependências pesadas no frontend.

## Armazenamento Local

Os registos são gravados em:

```text
storage/registrations.jsonl
```

Cada linha contém um registo completo em JSON, incluindo:

- ID do registo;
- data/hora de criação;
- utilizador que inseriu;
- localização;
- coordenadas GPS;
- lista de clientes associados.

A pasta `storage/` está no `.gitignore` para evitar versionar dados reais.

## Exportação

Todos os dados podem ser exportados em CSV através do endpoint:

```text
/api/export
```

O endpoint não exige autenticação e devolve um ficheiro legível em Excel/LibreOffice.

Formato:

- Uma linha por cliente.
- Se uma residência/prédio ainda não tiver clientes, a localização aparece com campos de cliente vazios.
- Inclui identificação do utilizador que inseriu a localização.

Por expor todos os dados cadastrados, este endpoint deve ser protegido ao nível da rede, proxy reverso ou firewall quando usado em produção.

## Endpoints

```text
GET  /api/auth/me
POST /api/auth/login
POST /api/auth/logout
GET  /api/registrations
POST /api/registrations
PATCH /api/registrations
GET  /api/export
```

## Como Executar

Instalar dependências:

```bash
npm install
```

Executar em modo desenvolvimento:

```bash
npm run dev
```

Gerar build de produção:

```bash
npm run build
```

Executar build de produção:

```bash
npm run start
```

Por padrão, os scripts `dev` e `start` escutam em:

```text
0.0.0.0
```

## GPS e HTTPS

A captura de GPS requer contexto seguro no navegador.

Funciona em:

- `https://...`
- `http://localhost`

Normalmente não funciona em:

- `http://IP_DO_SERVIDOR`
- `http://dominio-sem-https`

Em produção, coloque a aplicação atrás de HTTPS, por exemplo com Nginx e Certbot/Let's Encrypt.

## Mapa Satélite

O mapa usa tiles externos da Esri World Imagery para visualização em camada satélite.

O operador pode:

- capturar GPS;
- abrir o mapa;
- arrastar o marcador;
- clicar no mapa para reposicionar o pin;
- confirmar a localização ajustada.

## Ficheiros Importantes

```text
app/page.tsx
app/autenticacao/page.tsx
app/api/registrations/route.ts
app/api/export/route.ts
lib/auth.ts
config/users.json
data/locations.ts
storage/registrations.jsonl
```

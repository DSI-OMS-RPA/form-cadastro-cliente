# Cadastro de Cliente

Projeto GPON - IFT Cadastro Clientes

## Visão geral

Aplicação web para registo de moradias/localizações FTTH e respetivos clientes associados. Cada registo contém os dados da localização, coordenadas GPS e um ou mais clientes cadastrados para essa moradia.

## Tecnologia

- Next.js com App Router
- React e TypeScript
- Tailwind CSS
- Leaflet para visualização e ajuste da localização em mapa satélite
- Base de dados local em ficheiro JSONL, sem dependências externas

## Funcionalidades

- Formulário de registo de localização FTTH.
- Comboboxes pesquisáveis e dependentes:
  - Ilha
  - Concelho
  - Zona/Cidade
  - Bairro
- Dados carregados a partir do ficheiro Excel de unidades administrativas.
- Captura de coordenadas GPS pelo navegador.
- Modal com mapa satélite para ajustar manualmente o pin da localização.
- Suporte a um ou mais clientes por moradia/localização.
- Gravação local dos registos submetidos.

## Dados administrativos

O ficheiro Excel original foi copiado para:

```text
data/source/unidades-administrativas-cabo-verde.xlsx
```

A aplicação não lê o Excel diretamente no browser. Os dados foram convertidos para uma estrutura TypeScript leve em:

```text
data/locations.ts
```

Esta abordagem evita dependências pesadas no frontend e melhora a performance dos comboboxes.

## Gravação dos registos

Os registos submetidos são guardados localmente em:

```text
storage/registrations.jsonl
```

Cada linha do ficheiro representa um registo completo em JSON, incluindo:

- identificador único;
- data/hora de criação;
- dados da localização;
- coordenadas GPS;
- lista de clientes associados.

A pasta `storage/` está no `.gitignore` para evitar versionar dados reais de clientes.

## Como executar

Instalar dependências:

```bash
npm install
```

Executar em modo desenvolvimento:

```bash
npm run dev
```

Abrir no navegador:

```text
http://127.0.0.1:3000
```

Gerar build de produção:

```bash
npm run build
```

## Observações

A captura de GPS requer permissão do navegador. Em produção, a geolocalização deve ser servida em contexto seguro, normalmente HTTPS.

O mapa satélite usa tiles externos da Esri World Imagery para visualização da localização.

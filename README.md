# HaruProduto

Frontend React/TypeScript conectado à Haru Produto API local.

## Requisitos

- Node.js 24
- Ambiente de `HaruProdutoAPI/docker` em execução e acessível em `http://localhost`
- Realm Keycloak `haru` com o cliente público `haru-api`

## Executar

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`. O Vite encaminha `/api`, `/auth`, `/v3` e `/nginx-health` para o Nginx do Docker local, evitando configuração de CORS durante o desenvolvimento.

## Autenticação

Login e cadastro utilizam o fluxo Authorization Code com PKCE do Keycloak. O cadastro próprio recebe o perfil `customer`; o perfil `admin` deve ser atribuído pelo console administrativo do Keycloak.

Variáveis opcionais podem ser copiadas de `.env.example` para `.env`:

```env
VITE_KEYCLOAK_REALM=haru
VITE_KEYCLOAK_CLIENT_ID=haru-api
```

O cliente Keycloak precisa aceitar `http://localhost:5173/*` como URI de redirecionamento e `http://localhost:5173` como origem web. O realm versionado da API já inclui essas entradas. Se o realm foi persistido antes da alteração, atualize o cliente no console administrativo.

## Contratos atuais da API

Todos os dados operacionais exibidos vêm da API. Na criação de um produto,
o backend gera automaticamente um SKU no formato `PRD-##########`; na edição,
esse valor é exibido somente para leitura. Produtos podem ser pesquisados por
nome, ID ou SKU em `GET /api/products/search`; ao selecionar um resultado, a
tela carrega os dados completos e a composição pelos endpoints do produto.
Ordens ainda são consultadas por ID, e a visão geral exibe somente o estado real
da conexão e da sessão porque ainda não há endpoints de listagem de ordens ou de
métricas agregadas.

## Verificação

```bash
npm run format
npm run verify
```

`npm run format` aplica o Oxfmt ao código-fonte. O comando `npm run lint`
executa as regras do Oxlint e também rejeita arquivos fora da formatação
definida em `.oxfmtrc.json`. Modelos de objeto, props e variáveis compostas
devem usar interfaces nomeadas; aliases `type` ficam reservados para uniões e
tipos derivados.

`npm run verify` executa lint, type-check dos testes, testes Vitest e o build de
produção.

## Testes automatizados

Os testes rápidos usam Vitest, React Testing Library e MSW. Eles validam
componentes, autenticação e roteamento, consultas dos domínios e o cliente HTTP,
incluindo autenticação Bearer e respostas Problem Details. O MSW intercepta as
requisições dentro do processo de teste; portanto, estes comandos não exigem o
Docker:

```bash
npm test
npm run test:watch
npm run test:coverage
```

O relatório HTML de cobertura é criado em `coverage/index.html`.

### Testes E2E

Os testes Playwright utilizam o frontend, o Keycloak e a API reais. Na primeira
execução, instale o navegador:

```bash
npm run test:e2e:install
```

Copie `.env.e2e.example` para `.env.e2e` e informe um usuário pertencente ao realm
`haru`:

```bash
cp .env.e2e.example .env.e2e
npm run test:e2e
```

O arquivo `.env.e2e` é carregado automaticamente e não é versionado. O usuário
`admin` com a senha de bootstrap é administrador do console do Keycloak, não um
usuário da aplicação no realm `haru`.

Os cenários de dados reais são somente de consulta e são habilitados pelas
variáveis `E2E_PRODUCT_QUERY`, `E2E_INVENTORY_PRODUCT_ID` e
`E2E_PRODUCTION_ORDER_ID`. Quando uma precondição não está configurada, o teste é
marcado como ignorado com a explicação correspondente.

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

Todos os dados operacionais exibidos vêm da API. Como ainda não existem endpoints para listar todos os produtos, listar todas as ordens ou obter métricas agregadas, produtos e ordens são consultados por ID e a visão geral exibe somente o estado real da conexão e da sessão.

## Verificação

```bash
npm run build
npm run lint
```

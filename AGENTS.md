# Project context for Codex

## Overview

HaruProduto is a React and TypeScript frontend for the Haru Product API. It is
an operational client, not a mock or static prototype. Runtime screens consume
the real local API and authenticate through the local Keycloak realm.

Current stack:

- Node.js 24, React 19, TypeScript, and Vite.
- React Router for protected application routes.
- TanStack Query for server state, caching, and invalidation.
- Keycloak JavaScript adapter using Authorization Code with PKCE.
- Vitest, React Testing Library, and MSW for automated frontend tests.
- Playwright for real login and end-to-end flows.
- Oxlint and Oxfmt for linting and formatting.

Do not assume a screen or API operation exists without inspecting the current
source and the backend contract.

## Language and presentation

- All user-visible interface text must be written in Portuguese.
- Source identifiers, component names, functions, variables, types, tests,
  comments, and technical documentation must be written in English.
- API field names and enum values must remain identical to the backend
  contract; translate them only through presentation labels.
- Preserve the existing responsive visual language and accessibility behavior.
- Interactive controls need accessible names, keyboard behavior, loading
  states, empty states, and error feedback.

## Repository map

- `src/App.tsx`: authentication routes, protected shell, navigation, and page
  routes.
- `src/api/client.ts`: authenticated HTTP client and Problem Details handling.
- `src/api/types.ts`: frontend representations of backend DTO contracts.
- `src/auth`: Keycloak initialization, roles, token refresh, and auth context.
- `src/components/ui.tsx`: shared form, modal, status, feedback, and layout
  primitives.
- `src/components/ProductPicker.tsx`: paginated product autocomplete by name,
  numeric ID, or SKU.
- `src/components/OffsetPagination.tsx`: reusable offset/limit pagination.
- `src/pages`: Dashboard, Products, Inventory, and Production screens.
- `src/domain.ts`: presentation labels and domain formatting helpers.
- `src/test`: shared Vitest and MSW setup.
- `e2e`: Playwright authentication, domain smoke, and live-data flows.
- `vite.config.ts`: local proxy for `/api`, `/auth`, `/v3`, and
  `/nginx-health`.

Keep domain orchestration in page components or focused domain hooks when they
become necessary. Keep reusable interaction patterns in components. Do not move
large types, request builders, or business methods inline into JSX.

## Runtime data and API contracts

- Application code must use the real API. Never add mock operational data,
  fabricated totals, placeholder domain records, or fake success responses to
  runtime code.
- Mocks are allowed only in automated tests and development infrastructure
  explicitly designed for testing.
- Every business request uses `apiRequest` so bearer-token refresh and
  sanitized Problem Details behavior remain consistent.
- PostgreSQL is the source of truth on the backend. Product search is served
  through the backend's Elasticsearch integration; the frontend must not query
  Elasticsearch directly.
- Paginated responses use `content`, `offset`, `limit`, `totalElements`,
  `hasPrevious`, and `hasNext`.
- Search screens send the query, offset, and limit to the backend. Do not load
  an entire domain collection and paginate or filter it in the browser.
- Product search supports name, numeric ID, and SKU. Name autocomplete is
  provided by the backend; do not reproduce search ranking locally.
- Product IDs are internal persistence identifiers. Product SKUs are generated
  by the backend, immutable, and displayed as stable catalog identifiers.

## Authentication and authorization

- Keycloak lives under `/auth`, using realm `haru` and public client
  `haru-api` by default.
- Login and registration use Authorization Code with PKCE. Credentials are
  never collected or persisted by React.
- The recognized application roles are `admin` and `customer`, read from realm
  and client roles.
- `admin` may see and invoke management actions. `customer` receives the
  read-only experience permitted by the backend.
- UI authorization improves usability but is not a security boundary. Never
  assume hiding a button replaces backend authorization.
- Preserve login, registration, logout redirects, token refresh, and Portuguese
  Keycloak locale behavior when changing authentication code.

## Server-state rules

- TanStack Query owns remote server state. Do not copy query results into local
  state unless editing or transient UI behavior requires it.
- Query keys must contain every query input that changes the response,
  including search text, status, product/order ID, offset, and limit.
- Pass the TanStack Query abort signal to searchable requests.
- Mutations must invalidate every affected view. In particular, production
  completion changes both Production and Inventory state.
- Product mutations invalidate product detail, composition, and relevant
  product searches.
- Inventory mutations invalidate inventory overview, availability, lots, and
  movements for affected products.
- Keep lot and movement pagination independent. Changing a product resets both
  histories to offset zero.
- Search-term, filter, or limit changes reset the associated offset to zero.
- The global QueryClient currently uses a 15-second stale time, one query retry,
  no mutation retry, and no refetch on window focus. Change these defaults only
  with an explicit UX reason and corresponding tests.

## Domain UI contracts

### Products

- List and search products by name, numeric ID, or SKU through
  `GET /api/products/search`.
- Creation never asks for or sends an SKU. Editing displays the generated SKU
  read-only.
- Selecting a product loads its detail and recursive composition.
- Adding a direct component uses `ProductPicker`; never require the user to
  discover or type an internal product ID.
- The parent product is unavailable as its own component. Backend BOM rules
  remain authoritative for duplicates, inactive products, service products,
  and direct or indirect cycles.

### Inventory

- The overview searches products by name, numeric ID, or SKU through the real
  paginated inventory endpoint.
- Display backend availability and lot counts; never derive authoritative
  balances from rendered rows.
- Lot creation uses `ProductPicker` and sends the selected internal ID.
- Lot and movement histories are independently paginated by the backend.
- Entries, adjustments, and direct consumption must refresh every affected
  inventory view.
- Movement references identify the originating business operation. Reserved
  system reference types are owned by the backend.

### Production

- Search orders by order ID, product ID, product name, or SKU, with optional
  backend status filtering and offset pagination.
- New orders use `ProductPicker`; never ask users to type a product ID.
- Preserve the `CREATED`, `IN_PROGRESS`, `COMPLETED`, and `CANCELLED` lifecycle
  represented by the backend.
- Completion creates inventory effects. Refresh production searches/details
  and all potentially affected inventory query families.
- Display trace data returned by the backend; do not reconstruct authoritative
  FEFO allocations in the browser.

### Dashboard

- The dashboard may display only information proven by real endpoints.
- The current environment health query refreshes every 30 seconds.
- Do not invent business metrics when aggregate endpoints are unavailable.

## Component and code conventions

- Reuse `ProductPicker` for product selection, `OffsetPagination` for paginated
  endpoints, and the primitives in `ui.tsx` for consistent forms and feedback.
- Prefer named interfaces for object shapes, component props, and compound
  variables. Reserve `type` aliases for unions and derived types.
- Keep request and response types in `src/api/types.ts`; do not redefine the
  same backend DTO differently in multiple pages.
- Keep domain labels and formatting centralized in `src/domain.ts`.
- Use exact numeric handling already established by the API contract; do not
  introduce floating-point calculations as an inventory or production source
  of truth.
- Keep user interactions responsive on desktop and mobile. Shared component
  changes require checking every page that consumes them.
- Never commit `.env`, `.env.e2e`, access tokens, passwords, or real user data.

## Test integrity policy

Automated tests are executable specifications. Preserve valid existing tests
and fix production code when one of those tests fails. Before changing behavior,
run the directly relevant tests when practical to establish the baseline.
After the change, run the affected tests and the complete repository
validation.

Never make an existing test pass by:

- deleting, disabling, skipping, or excluding it;
- adding `.only`, `.skip`, unconditional returns, or swallowed failures;
- removing assertions or replacing exact assertions with weaker checks;
- changing expected values merely to match incorrect application behavior;
- increasing timeouts merely to hide a race condition;
- mocking the integration boundary that the test exists to exercise;
- regenerating snapshots without reviewing and explaining the behavioral
  difference;
- changing Vitest, Playwright, TypeScript, lint, or package-script
  configuration to avoid a failing check.

An existing test may change only when the requested behavior intentionally
changes its contract, or when the test is demonstrably incorrect, obsolete,
nondeterministic, or coupled to an implementation detail that is no longer a
contract. In that case, explain why the old expectation is invalid, preserve
or strengthen its coverage, add coverage for the replacement behavior, and
report the changed test explicitly.

New features and bug fixes require meaningful behavior tests. Tests created for
a new change may be corrected while developing when their initial expectation
was wrong, but never weakened solely to obtain a green suite.

The required final frontend validation is:

```bash
npm run verify
```

This command must run lint, formatting verification, test TypeScript checks,
all Vitest tests, and the production build with zero failures. Focused Vitest
tests and `npm run test:watch` are useful during development but never replace
the final verification.

Do not mark Playwright tests as passed when only `playwright test --list` was
run. Execute `npm run test:e2e` when the task affects authentication, routing,
or real cross-domain flows and the required backend, browser, credentials, and
seed data are available. If an E2E precondition is unavailable, report the
missing requirement explicitly; do not disable or weaken the test to conceal
it.

## Working commands

Run commands from the repository root. Node.js 24 is required.

```bash
npm install
npm run dev
npm run test:watch
npm test
npm run test:coverage
npm run verify
npm run test:e2e
```

`npm run format` changes files mechanically; inspect the resulting diff. A
successful Vite build does not replace test execution. Always report the exact
validation commands run and any check that could not be executed.


To ask the owner for a settings change, use `converse permit` and make the change only when their confirmed answer reaches you.

# Premium Collections Control Tower: instructions for agents

Premium Collections ("premiums") is the collections module of The Brittany insurance intelligence suite, built to read as one suite with QuoteIQ, ClaimsIQ and TenderIQ (its shell and design system come from ClaimsIQ, `ciq` renamed `prm`). TypeScript everywhere, a React 18 SPA on Vite, deployed to Vercel as a static site. The API runs in the browser: a mock API over versioned synthetic fixtures, answering the typed contracts a real backend would.

## Where the truth lives

1. The product specifications (Complete Insurance Intelligence Build Pack; `01_Shared_Foundation_and_Sprint_Contract`, `02_Premium_Collections_Control_Tower_Requirements`; the synthetic TEST and DEMO data with `expected_metrics.json`). They define screens COL-01 to 05, requirements COL-FR-01 to 16, the rules of §7 and acceptance tests COL-AT-01 to 12, and they win on conflict. The fixtures the app runs on are in `fixtures/v2` (the collections files are the spec's, byte for byte apart from line endings; the DEMO claims files are ClaimsIQ's v2 so claim links match the hosted ClaimsIQ).
2. `docs/assumptions.md`: how the specs were turned into build decisions, and every gap filled.
3. `docs/technical.md`: how the code is built. Keep it in step with the code.

## Stack

- npm workspaces (`src/ui` = `@premiums/ui`, `e2e_tests` = `@premiums/e2e`), Node 24 (`.nvmrc`; Vercel runs 24.x). TypeScript ~6 strict ESM. Vitest is the test runner.
- SPA: React 18.3, Vite 8, Redux Toolkit 2, React Router 7, recharts 3, zod 4, decimal.js; Vitest + React Testing Library + jest-dom; Playwright + axe.
- Layers (pure TypeScript, lint-enforced boundaries): `src/contracts` (zod entities, facts, endpoints, money, time, personas, rule config) → `src/rules` (the collections engine: ledger, summary, exceptions, trend, suggestions) → `src/read-model` (fixture loader with quarantine, the reads every endpoint answers) → `src/mock-api` (routes, commands, changes kept in `localStorage`, Reset). The SPA calls only the typed endpoints through `src/ui/src/api/client.ts`; only `src/ui/src/api/mockTransport.ts` (and tests) import the mock API.

## Rules for every agent

- **No placeholders:** no TODO/FIXME, lorem ipsum, "coming soon", dead buttons or no-op handlers. Everything has loading, empty and error states, and a read-only state for the Executive Viewer.
- **Language:** never "fraud", never "collectible", never a legal lapse or cancellation: flags are advisory, the policy status is an imported fact no rule changes. Use "review", "exception", "advisory".
- **Money** is BWP, a decimal string with 2 decimals, summed with decimal.js (`sumMoney`); never a float sum. Receipt cash, allocations, premium written and premium due are different measures and never add up into one figure.
- **Dates:** the as-of date defaults to 2026-10-21 (switchable in the top bar), every instant is Africa/Gaborone (+02:00). Due today is not overdue. A missing due date is UNKNOWN: no bucket, never overdue, a data-quality exception.
- **Comments:** only a trap, an outside fact or a deliberate choice that looks wrong. No issue numbers in code.
- **Scratch files** go under `.qa-scratch/<label>/` (git-ignored).

## Code conventions

- No `any` (lint error). `import type` for type-only imports. The pure layers and scripts use NodeNext resolution: relative imports carry `.js`.
- Zod v4 at every boundary (request query and body, fixtures, stored changes).
- No `console.log`. Never log personal data.
- SPA: only the design system (`src/ui/src/theme`, `src/ui/src/components`): tokens, no raw hex. Every UI string goes through `t()`; each feature keeps its strings in `features/<feature>/i18n/en.ts`. A feature adds `features/<feature>/routes.tsx` and never edits a shared SPA file: the router and the sidebar build themselves from the registry. Shared collections code lives in `features/collections-scope` (filters, lookups, links, labels, chips, export) and `features/collections-tasks` (recovery action dialogs).
- Drill-through: every figure links to a list of exactly the records it counts (`collections-scope/links.ts`); the list's totals come from the API and equal the figure.
- Prettier (`src/ui/.prettierrc`) is checked by `npm run lint:ui`; ESLint warnings fail the lint.
- **Fewer, broader tests (owner's rule):** one test that walks a realistic flow with several assertions over many small ones. Names state behavior, condition and outcome. Root Vitest covers the pure layers and scripts; SPA tests are colocated `*.test.ts(x)` (jsdom; `renderApp(route)` renders the whole app over the real fixtures). Playwright runs the acceptance spec COL-AT-01 to 12 on a production build.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | The SPA on http://localhost:5283 |
| `npm run build` / `npm run preview` | Typecheck the pure layers, then the production build into `src/ui/dist` (Vercel's build) / serve it on 4283 |
| `npm run typecheck` / `typecheck:ui` / `typecheck:e2e` | Pure layers and scripts / SPA / Playwright suite |
| `npm run lint` / `lint:ui` / `format:ui` | Pure-layer lint / SPA lint + Prettier check / Prettier write |
| `npm test` / `npm run test:ui` | Pure-layer unit tests / SPA tests (jsdom needs Node ≥ 22.22) |
| `npm run test:e2e` | Playwright acceptance suite on a production build (port 5381) |
| `npm run ci:security` | Secret scan of the repository files + scan of the production bundle |
| `npm run verify` | typecheck → typecheck:ui → typecheck:e2e → lint → lint:ui → test → test:ui → build |

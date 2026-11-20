# Technical notes

## Architecture

```
fixtures/v2/{test,demo}/*.csv ──► src/read-model/fixtures (load, validate, quarantine)
                                        │
src/contracts (zod: entities, facts,    ▼
 endpoints, money, time, personas) ◄── src/rules (ledger → summary, exceptions, trend, suggestions)
                                        │
                                        ▼
                                  src/read-model/reads.ts (the answer of every read endpoint)
                                        │
                                        ▼
                                  src/mock-api (routes, commands, changes in localStorage, Reset)
                                        │  fetch-shaped transport
                                        ▼
                                  src/ui (React SPA: shell, features, typed API client)
```

- **Contracts** (`src/contracts`): every entity, computed fact and endpoint as a zod schema. The SPA's API client validates responses against them in development, so drift fails loudly.
- **Fixture loader** (`src/read-model/fixtures/load.ts`): each CSV row is checked against its entity schema, its references (a row pointing at a missing or rejected parent is rejected too), duplicate ids, date order and over-allocation of an invoice or a receipt. A rejected row is quarantined with file, row, field, problem and fix and never reaches a calculation; a missing due date loads with a warning and means UNKNOWN. The Data issues button in the top bar lists them.
- **Rules engine** (`src/rules`): pure functions, no I/O. `buildLedger` computes each invoice's applied amount, outstanding, days overdue, bucket, priority and flags, and each receipt's allocated and unapplied amounts, once per request as of the as-of date. `summarize`, `collectionExceptions` and `collectionsTrend` derive the screens' figures from the ledger and the scope filters. Money is a 2-decimal string summed with decimal.js.
- **Read model** (`src/read-model/reads.ts`): the answer of each read endpoint over a `ReadModel` (records, tasks, acknowledgements, rule config, data issues). A future server answers the same reads from its own rows.
- **Mock API** (`src/mock-api`): routes the typed endpoints, validates query and body, records the persona (`X-Persona`) as the actor of a command and refuses commands from the Executive Viewer (403). Recovery actions and acknowledgements are kept in `localStorage` under one key per data set; Reset removes the key. A retried create with the same `Idempotency-Key` returns the first task.
- **SPA** (`src/ui`): React 18, Redux Toolkit (session, data context, filters), React Router 7 routes built from the feature registry (`features/*/routes.tsx`), the ClaimsIQ design system renamed `prm`. Shared code: `features/collections-scope` (filters, lookups, links, labels, chips, CSV export) and `features/collections-tasks` (recovery action dialogs).

## Calculation rules (spec §7)

| Measure | Rule |
|---|---|
| Outstanding | max(0, issued − valid allocations) |
| Gross unpaid | Σ outstanding of every invoice in scope, future-due included |
| Overdue | Σ outstanding where due date < as-of (due today is not overdue) |
| Days overdue | max(0, as-of − due date) for an unpaid invoice with a due date |
| Aging | Current ≤ 0, 1-30, 31-60, 61-90, > 90 days; paid invoices excluded; unknown due date in no bucket |
| Received | Σ bank-confirmed receipts received in the period (by received date, never by allocation date) |
| Unapplied | per receipt max(0, received − valid allocations), validated/posted receipts only |
| Failed attempts | count of FAILED attempts in the period; never cash, never an allocation |
| COL-R01 | outstanding > 0 and days overdue > 30 |
| COL-R02 | ≥ 2 failed attempts on the invoice in the last 30 days |
| COL-R03 | outstanding > 0 and days overdue ≥ 60: review for potential cover implications |
| COL-R04 | receipt with unapplied cash |
| COL-R05 | failed payment attempt in the period |
| COL-R06 | invoice without a due date |

Thresholds come from `fixtures/v2/proposed_rule_config.json`.

## Testing

- `npm test`: the pure layers. `src/rules/rules.test.ts` reconciles the golden TEST fixture to `expected_metrics.json` (issued 48,000, applied 14,000, unpaid 34,000, overdue 29,000, aging 5/8/4/10/7k, October cash 7,500, unapplied 1,500), the bucket boundaries 0/1/30/31/60/61/90/91, due-today, unknown due date, failed attempts and non-cash receipts. The loader and mock API tests cover quarantine, duplicates, persistence, Reset and the read-only persona.
- `npm run test:ui`: each screen rendered whole over the real fixtures (jsdom).
- `npm run test:e2e`: Playwright runs COL-AT-01 to 12 against a production build, with an accessibility scan of each screen.

## Deployment

Vercel project `premiums` (team WMT), Git integration on `main`, Node 24. Vercel runs `npm ci` and `npm run build` and serves `src/ui/dist` with a rewrite of every path to `index.html`. The site is static: no environment variables, functions or secrets. Domain: premiums.thebrittany.ai.

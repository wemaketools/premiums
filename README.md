# Premium Collections Control Tower

The collections module of The Brittany insurance intelligence suite, alongside QuoteIQ, ClaimsIQ and TenderIQ. It gives general (short-term) insurers and brokers CFO-grade cash visibility and collection discipline. It answers: what premium is due, how much is overdue, what cash has arrived but is not yet applied, which payment attempts failed, which accounts merit review, and who will act.

**Live demo:** https://premiums.thebrittany.ai (synthetic data only; not a production finance system).

## What is in it

| Screen | Spec | What it does |
|---|---|---|
| Overview | COL-01 | Gross unpaid, overdue, overdue > 30 days, unapplied cash, cash received and failed attempts in the period; aging chart, priority exceptions, monthly trend. Every card opens the records it counts. |
| Aging & Exposure | COL-02 | Non-overlapping aging buckets and exposure by broker, channel, product, client and account owner, each reconciling to gross unpaid. |
| Invoices | (drill-through) | The receivables list behind every figure, with totals equal to the figure and CSV export. |
| Invoice detail | COL-04 | Issued − applied = outstanding with every allocation and receipt, payment attempts, advisory flags with rule ids, the account timeline, recovery actions, policy installments and linked claims. |
| Exceptions | COL-03 | Failed attempts, unapplied receipts, overdue > 30 days, lapse review, repeated failure and missing data, each with evidence, owner, severity, due date and acknowledgement. |
| Receipts | (drill-through) | Bank receipts by received date, applied and unapplied, and why bank cash does not reduce an invoice until it is allocated. |
| Action Queue | COL-05 | Recovery actions: create, assign, Open → In progress → Resolved, notes, actor and time on every change, "assigned to me". |
| Finance Digest | COL-FR-16 | A printable CFO summary with as-of date, scope and exact KPI definitions. |
| Rules & Definitions | handover | The rules COL-R01 to R06 with their thresholds, the KPI calculation notes and the assumptions. |

The top bar switches the data set (TEST: the golden fixture whose totals are documented; DEMO: a fictional insurer), the as-of date (default 21 Oct 2026) and the persona (CFO / MD, Finance / Credit Control, Broker Relationship Manager, Executive Viewer, Demo Admin), shows the data issues of the loaded fixture, and resets the demo. The persona is a demo convenience, never authentication; the Executive Viewer has no edit controls.

## How it works

Everything runs in the browser. The SPA calls typed endpoints (`src/contracts`) that an in-browser mock API (`src/mock-api`) answers over the CSV fixtures in `fixtures/v2`. A fixture loader validates every row and quarantines bad ones (unknown references, duplicate ids, over-allocation) with row, field, problem and fix. A pure, decimal-safe rules engine (`src/rules`) computes outstanding, aging, cash, flags and exceptions. Recovery actions and acknowledgements are kept in `localStorage` per data set until Reset. See `docs/technical.md`.

## Local development

Requires Node 24 (`.nvmrc`; Node ≥ 22.22 for the SPA tests).

```sh
npm ci
npm run dev          # http://localhost:5283
npm run verify       # typecheck, lint, unit and SPA tests, production build
npm run test:e2e     # Playwright acceptance suite COL-AT-01 to 12 on a production build
```

No environment variables, database or account is needed: the demo is self-contained.

## Documentation

- `docs/acceptance.md`: each acceptance scenario COL-AT-01 to 12 and the tests that prove it.
- `docs/demo-script.md`: the CFO demo journey on the named synthetic accounts.
- `docs/assumptions.md`: the assumption log and how gaps in the specification were filled.
- `docs/technical.md`: architecture, data flow, the calculation rules, testing and deployment.

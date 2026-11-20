# Acceptance scenarios

Each scenario of the specification (§11) and the automated tests that prove it. `e2e` is `e2e_tests/specs/acceptance.spec.ts` (Playwright on the production build); `unit` are the root Vitest suites; `ui` the SPA suites.

| Scenario | What must hold | Proven by |
|---|---|---|
| COL-AT-01 KPI | TEST as of 21 Oct 2026: unpaid P34k, overdue P29k, issued P48k, applied P14k; a card opens invoices summing exactly to it | unit `src/rules/rules.test.ts` (golden fixture); e2e "COL-AT-01, 02, 04"; ui `overview`, `invoices` |
| COL-AT-02 aging | 5/8/4/10/7 thousand in current/1-30/31-60/61-90/>90, each invoice in one bucket | unit `rules.test.ts` (incl. boundaries 0/1/30/31/60/61/90/91); e2e "COL-AT-01, 02, 04"; ui `aging` |
| COL-AT-03 as-of boundary | Due today counts as unpaid, not overdue | unit `rules.test.ts` "due-today"; e2e "COL-AT-03 and COL-AT-05" (as of 30 Oct, INV-004) |
| COL-AT-04 receipt | RCP-UNAPP P1.5k raises received this month and unapplied; unpaid stays P34k | unit `rules.test.ts`; e2e "COL-AT-01, 02, 04"; ui `receipts`, `receipt-detail` |
| COL-AT-05 failed payment | A FAILED attempt changes no receipt or applied amount | unit `rules.test.ts` "never counts a failed attempt…"; e2e "COL-AT-03 and COL-AT-05"; ui `invoice-detail` |
| COL-AT-06 duplicates | A duplicate allocation id is quarantined and totals stay | unit `src/read-model/fixtures/load.test.ts`; the deployed fixtures load with "Data issues (0)" (e2e) |
| COL-AT-07 filters | Under a broker or product filter, chart, cards and tables match | unit `rules.test.ts` (scoped summary, breakdown partitions); e2e "COL-AT-07"; ui `aging` |
| COL-AT-08 flag accuracy | INV-006 gets the >90 / over-30 alert and the lapse REVIEW flag; policy status unchanged | unit `rules.test.ts`; e2e "COL-AT-08, 09 and 12"; ui `invoice-detail` |
| COL-AT-09 owner actions | Create, assign and resolve an action for INV-006; the queue and audit trail survive a refresh | unit `src/mock-api/api.test.ts`; e2e "COL-AT-08, 09 and 12"; ui `actions`, `invoice-detail` |
| COL-AT-10 export | The filtered export equals the on-screen count and grand total | e2e "COL-AT-10"; ui `invoices`, `actions`, `receipts`, `aging` |
| COL-AT-11 data gaps | An unknown due date is a data-quality exception with no invented bucket | unit `load.test.ts`, `rules.test.ts`; ui `invoice-detail` |
| COL-AT-12 module link | Invoice → policy → linked claim where present; otherwise "No linked claims" | unit `api.test.ts`; e2e "COL-AT-08, 09 and 12" (CLM-106; DEMO DCLM-001 → ClaimsIQ; DINV-031) |

Every screen is also checked for WCAG 2.0/2.1 A and AA violations (axe) and horizontal scroll (e2e "every destination…").

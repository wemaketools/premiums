# Assumption log

How the specifications (Shared Foundation, Premium Collections Control Tower requirements, the synthetic data pack) were turned into build decisions. Where the specification is silent, the gap is named and the choice made is stated. Thresholds are illustrative POC assumptions, not insurer collection terms, legal cover rules or regulatory requirements.

## Scope and delivery

| # | Decision | Basis |
|---|---|---|
| A-01 | The deliverable is a static SPA with the API running in the browser (a mock API over the versioned CSV fixtures), deployed to Vercel. No database, no real authentication. | SF §3 (static versioned fixtures; REST endpoints are an implementation choice), SF §7 (persona switch is a demo convenience, not authentication). |
| A-02 | All P0 requirements COL-FR-01 to 14 are built, and the P1 items collections trend by month (COL-FR-15), finance summary / print sheet (COL-FR-16), account note history and suggested next action. Not built: the configurable notification mock (P1). | Spec §3; capacity. |
| A-03 | The stack, shell and design system are ClaimsIQ's, so the suite reads as one product family. npm workspaces replace Bun. | SF §12 "reuse conventions and stack where sensible". |
| A-04 | Out of scope, as the spec says: debit-order execution, bank integrations, GL postings, cancellation, predictive scoring, messaging. | Spec §3. |

## Data and calculations

| # | Decision | Basis |
|---|---|---|
| A-10 | Every invoice counts whatever its issue date (TEST INV-004 is issued 25 Oct, after the as-of date, and is in the documented P34,000 as "Current / not due"). | Spec §9 golden table. |
| A-11 | Receipts, allocations and payment attempts dated after the as-of date do not exist yet at that date. | SF §5 as-of snapshot. |
| A-12 | A valid allocation is posted on or before the as-of date and comes from a bank-confirmed receipt (status VALIDATED or POSTED) received on or before it. Receipts reach invoices only through allocations. | Spec §7; data README rule 4. |
| A-13 | Outstanding = max(0, issued − valid allocations); credit adjustments are not modelled (the fixture has none). Overpayment never makes a negative outstanding. | Spec §7. |
| A-14 | "Received this month" uses the as-of date's calendar month up to the as-of date. The period selector also offers last 30 days, last 90 days and year to date; it moves only the cash and attempt figures, never the balances. | Spec §7, COL-01 ("time filter applies to cash collected; as-of applies to balance snapshot"). |
| A-15 | Under a broker, product, channel, owner or client filter, cash received is the part of each receipt allocated to invoices in scope; unapplied cash belongs to no invoice and is shown as "not attributable" (it is never guessed). | COL-AT-07 (scopes must match), SF §5 (no fabricated KPI). |
| A-16 | The account owner is the owner of the policy's broker (or direct channel). The owner of an exception is the assignee of the subject's open recovery action, else the account owner. | SF §4 (broker.owner_user_id); spec COL-03 (exceptions have an owner). |
| A-17 | Exception due date: the due date of the subject's open recovery action, else the day the rule triggered plus 2 / 5 / 10 days for High / Medium / Low severity. The spec requires a due date but gives no response times. | Gap: POC default. |
| A-18 | Exception severity: overdue and lapse flags follow the invoice priority of §7 (High over 90 days or a repeat failure on an overdue invoice; Medium 31-90); a repeat failure is High when the invoice is overdue, else Medium; a failed attempt follows the invoice priority (Low when not overdue); unapplied cash is Medium; a missing due date is High because it blocks a KPI. | Spec §7 priority order; gap for the rest. |
| A-19 | A repeat failure counts the failed attempts on one invoice inside the window ending on the as-of date (30 days, the as-of date included); its threshold (2) and window come from `proposed_rule_config.json`. Duplicate attempt ids are quarantined, so a retry is never counted twice. | Spec §7. |
| A-20 | The monthly trend shows the last six months up to the as-of date. "Arrears recovered" are allocations posted in a month to invoices already overdue when the month opened; they are shown beside receipt cash and never added to it. | COL-FR-15; spec §7 accounting guardrail. |
| A-21 | A flag is advisory: it is never a collection instruction, a legal lapse or cancellation, or a cover decision, and the policy status (an imported fact) is never changed. Every flag shows its rule id and this caveat. | Spec §7, COL-AT-08, SF §5. |
| A-22 | Exceptions can be acknowledged (who, when, optional note); an acknowledgement changes no figure. Acknowledged exceptions are hidden by default with a count, and can be shown. | COL-03 "dismiss/acknowledge as configured". |
| A-23 | Recovery actions have statuses Open, In progress and Resolved; a Resolved action can only be reopened. Each has a reason (one of the rules, missing data, or other), an urgency the user sets (the "user may override" of §7), an owner, a due date and a note history. | COL-05, COL-FR-11. |
| A-24 | Linked claims are matched by policy id only, never by name. The hosted ClaimsIQ demo serves its DEMO data set, so only DEMO claims link out to it; TEST claims are shown in this module. | COL-AT-12, SF §4 "never invent a match". |
| A-25 | The DEMO claims files are ClaimsIQ's `fixtures/v2` (Jul–Oct dates spread for its period cards), so a claim link opens the same claim the hosted ClaimsIQ shows. The collections files are the specification's unchanged. | Cross-module consistency. |

## Personas

| Persona | Can do |
|---|---|
| CFO / MD | Everything below; lands on the Overview. |
| Finance / Credit Control | View, filter, create and update recovery actions, acknowledge exceptions, export; lands on the Action Queue. |
| Broker Relationship Manager | As Finance; lands on Aging & Exposure. |
| Executive Viewer | Reads every dashboard and drill-down; no edit controls (the API refuses its commands with 403); lands on the Finance Digest. |
| Demo Admin | Reset, data issues; as Finance otherwise. |

Reset and the data issues are demo controls in the top bar for every persona, so a scripted demo can end with Reset whoever runs it.

## Known limitations

- Synthetic demo only: not a production finance system. A paid pilot needs real authentication, tenant isolation, encryption, auditability and lawful data handling before any real data is loaded (SF §7).
- Changes (actions, acknowledgements) live in the browser's storage: they are per browser and are lost if site data is cleared.
- Not modelled, as in the fixture: credit notes, reversals, multi-currency, ledger close, installment schedules beyond the invoices given.
- The rule thresholds are read from `fixtures/v2/proposed_rule_config.json`; changing them is a file change, not a screen.

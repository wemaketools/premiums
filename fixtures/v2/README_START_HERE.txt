THE BRITTANY - Insurance Intelligence Suite | Synthetic POC starter data v1.0

PURPOSE
Two physically separate tenants/fixtures: 01_golden_test_fixture (TEST) with exact, auditable expected KPIs; 02_expanded_demo_fixture (DEMO) with fictional insurer records for filters and presentation. All entity names and financial amounts are synthetic. No actual customer information.

READ THIS FIRST
1. Ingest each CSV with its documented header; use tenant_id + primary ID as record key.
2. Use ISO dates (YYYY-MM-DD), as-of 2026-10-21 and timezone Africa/Gaborone for tests.
3. Join policies to brokers/products/clients; invoices and claims share policy_id.
4. Match receipts to invoices ONLY through payment_allocations.csv.
5. Failed payment attempts never count as received cash.
6. For claims, add POSTED claim_payments to current outstanding reserve to get gross incurred.
7. Use claim_events and reserve_events for traceability; latest stage/current reserve must reconcile to claim snapshot.
8. Run TEST independently of DEMO and compare to expected_metrics.json. Optional verification: python verify_fixture.py.
9. Configured thresholds in proposed_rule_config.json are illustrative POC assumptions, not insurer SLAs, legal cover rules, or regulatory requirements.
10. Use the three accompanying specifications for screen requirements, rules, workflow and acceptance tests.

EXPECTED GOLDEN TEST METRICS
Collections: 6 invoices; issued P48,000; allocated P14,000; unpaid P34,000; overdue P29,000; aging current P5k, 1-30 P8k, 31-60 P4k, 61-90 P10k, >90 P7k. Receipts in Oct P7,500, of which P1,500 unapplied.
Claims: 6 total; 5 open, 1 closed; P9,000 actual paid; P68,000 outstanding reserve; P77,000 incurred. Open stages: Assessment 2, Triage 1, Approved 1, New 1.

IMPORTANT LIMITATION
Simple, purpose-built fixture; it does not model credit notes, reversals, recoveries, reinsurance, multi-currency or ledger close. Demo rows are intended for functional prototype visual density, not actuarial benchmarking.

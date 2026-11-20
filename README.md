# Premium Collections Control Tower

The premium collections module of The Brittany insurance intelligence suite, alongside QuoteIQ, ClaimsIQ and TenderIQ. It is built for general (short-term) insurers and brokers, and answers these questions: what premium is due, how much is overdue, what cash has arrived but has not been allocated, which payment attempts failed, which accounts need review, and who will act.

## Specifications

`ai/specs/` holds the source material. It wins on any conflict:

- `00_Complete_Insurance_Intelligence_Build_Pack.pdf`: the complete build pack.
- `05_Editable_Word_Sources.zip`: `01_Shared_Foundation_and_Sprint_Contract`, `02_Premium_Collections_Control_Tower_Requirements` (screens COL-01 to 05, requirements COL-FR-xx, acceptance tests) and `03_ClaimsIQ_Requirements` (needed for the cross-module link to claims).
- `04_Synthetic_Test_and_Demo_Data.zip`: the golden TEST fixture, the expanded DEMO fixture, `expected_metrics.json` and `proposed_rule_config.json`.

## Status

The application has not been scaffolded yet. The Vercel project deploys `public/`, a holding page that will be replaced by the SPA build.

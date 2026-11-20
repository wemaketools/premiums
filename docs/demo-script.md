# CFO demo script (7 to 9 minutes)

The spec's journey (§10) on https://premiums.thebrittany.ai. Every name and amount is synthetic. Start signed out, or press Reset on the TEST data set first.

**Success standard:** a CFO identifies the outstanding and overdue amounts, opens one high-risk account, understands why it is flagged, assigns a recovery follow-up and sees it in the queue, in under 8 minutes.

1. **Open the collections overview.** Sign in as **CFO / MD**. The data set is TEST, as of 21 Oct 2026. Point to **Gross unpaid P34,000.00** and **Overdue P29,000.00**: gross unpaid is everything issued and not yet applied, future-due included; overdue is only what was due before today (an invoice due today is not overdue).
2. **Click Overdue.** The list shows the four overdue invoices INV-001, INV-002, INV-003 and INV-006, totalling P29,000.00. Back on the Overview, the aging chart shows P10,000.00 in 61–90 days and P7,000.00 over 90 days; click a bar to list its invoices.
3. **Filter broker / motor, then switch to DEMO.** Choose Broker *Kopano Brokers* or Product *Comprehensive Motor*: every card, the chart and the list narrow to the same invoices, and unapplied cash says it cannot be attributed. Switch the data set to **DEMO** in the top bar and open **Aging & Exposure**: exposure by broker, channel, product and client, each table adding up to gross unpaid.
4. **Inspect a failed debit order.** Back on TEST, the **Failed payment attempts** card (2) opens the Exceptions on INV-002: two failed debit orders (insufficient funds). Open INV-002: the attempts are listed, nothing was received and the outstanding is unchanged at P8,000.00.
5. **Inspect the cash mismatch.** The **Unapplied cash P1,500.00** card opens receipt **RCP-UNAPP**: received P1,500.00 − applied P0.00 = unapplied P1,500.00. The bank has the cash, but no invoice is reduced until the receipt is allocated to one.
6. **Open INV-006** (Naledi Engineering, policy SYN-BW-00006). 142 days overdue, over 90 days, High priority, no payment attempt on record; flags **COL-R01 Overdue more than 30 days** and **COL-R03 Lapse review**, each with its evidence and the advisory caveat: a review for potential cover implications, not a lapse; the policy status stays ACTIVE. Linked claim CLM-106.
7. **Act.** Create a recovery action on INV-006 for the finance owner (Tiro Demo), due in a week, urgency High; move it to **In progress**. Open the **Action Queue**: the action is there with its history (who did what, when). Switch the persona to **Finance / Credit Control** and tick "Assigned to me": it is still there.
8. **Close.** Open the overdue invoice list and **Export CSV**: the file has the same four rows and the same P29,000.00 total, with the as-of date and scope. Press **Reset** on TEST: the action is gone and the totals are the documented P34,000.00 and P29,000.00 again.

Persona notes: the **Executive Viewer** sees every figure and drill-down with no edit controls and lands on the Finance Digest (print it with the Print button). **Demo Admin** uses Data issues and Reset.

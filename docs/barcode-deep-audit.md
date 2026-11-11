# Deep audit: barcode sales and costing

Completed: 2026-10-28. Scope: the uncommitted barcode/cost implementation, its related product, purchase, POS, reward, invoice-edit and reporting paths, and the local schema. The review combined source inspection, failing regression reproductions, transaction-backed integration checks, and a frontend production build.

**Release status: four broader POS/access release blockers remain. Passing the focused tests is not production approval.**

## Confirmed defects repaired

| ID | Severity | Defect demonstrated or traced | Repair |
| --- | --- | --- | --- |
| A01 | P1 | Editing quantity restored and recosted the entire sale. In a regression, an original RM 100 cost became RM 10 after a cheaper lot was added and the quantity increased to two; the correct saved basis was RM 105. | Retain original allocations, restore only removed quantities, and allocate only additions. |
| A02 | P1 | Service quantity edits used the current secondary-unit ratio instead of the sale's original conversion. | Store `stock_requirements` with entered quantities and base quantities; reuse original conversion factors during edits. Upgrade older cost snapshots where the factor can be inferred. |
| A03 | P1 | An edited legacy sale could consume a newer known-cost lot and appear to have a verified historical cost. | Preserve an explicit unknown-cost legacy basis without adding physical inventory. |
| A04 | P1 | The client generated a new checkout key when a retry payload changed, permitting duplication after an uncertain response. The server did not compare payloads for reused keys. | Keep the attempt key until success; persist a canonical request hash and reject changed payloads against an already committed request. |
| A05 | P1 | Missing selling prices became zero through numeric defaults; malformed prices could return generic errors. | Validate required prices and consumed product inputs before stock mutation; return actionable validation errors. |
| A06 | P2 | A service with a material quantity of zero was rejected by the positive-quantity stock helper. | Allow zero material usage, retain it as an explicit requirement, and perform no deduction. |
| A07 | P1 | The alternate invoice editor confused product/service IDs, submitted product IDs as old bill-line IDs, rounded fractional quantities, and did not scale nested material totals. | Use type-qualified catalog keys, separate bill-line references, support decimal quantities, populate catalog materials and scale service/package usage with quantity changes. |
| A08 | P1 | Decreasing opening stock could consume a purchased lot after the original opening stock had already been sold or transferred. | Opening reductions can consume only remaining central opening lots; reject insufficient opening quantity. |
| A09 | P1 | Products could change base unit group after stock/cost history existed. A delete/count race could also orphan newly created history. | Reject changes to a tracked product's base unit group; archive under a product lock instead of hard-deleting. |
| A10 | P2 | Retrying the opening-lot migration could seed a second balance for a product created after the original migration. | Seed only product/location balances not represented by any lot; add a rollback-only SQL regression. |
| A11 | P1 | Loyalty discounts were included in profit deductions but were not subtracted from the saved invoice total. Capped discounts could exceed the value of whole points actually redeemed. | Reconcile checkout/edit totals with redeemed discounts; calculate whole points against eligible net sales, update the preview, lock the current customer row and retain redemption amounts. |
| A12 | P1 | Any authenticated caller could invoke reward-setting, tier and manual point-adjustment writes. | Restrict those writes with a strict administrator-role guard that ignores account-type and wildcard-token shortcuts. Reads needed by POS remain available. Broader authorization remains R04. |
| A13 | P2 | P&L date filters used UTC midnights, excluding or misclassifying sales around local midnight. Invalid/reversed dates were not validated. | Use explicit business-day boundaries and half-open ranges, including daylight-saving transitions; return the timezone with report data. Configure `BUSINESS_TIMEZONE`; default for this installation is `Asia/Kolkata`. |
| A14 | P2 | Text in the new profit CSV could be interpreted as a spreadsheet formula. Discount aliases/rounding and tax rounding could also produce inconsistent saved totals. | Escape formula-like text; normalize flat/fixed discounts and round financial fields before calculating saved totals. |

Focused regressions were first run against the original implementation: cost retention, zero consumption, missing price and saved service conversion checks all failed. They pass with the repairs.

## Outstanding release blockers

### R01 — P1: Promotion redemption is trusted at checkout

`backend/src/controllers/posController.js`, checkout's coupon/voucher block: the transaction accepts coupon/voucher IDs and discount amounts from the request. It increments coupon usage and decreases voucher balance without repeating the validity, eligibility, expiry, remaining-balance and amount checks performed by the separate preview endpoints. Voucher rows are read without a write lock. Two tills can attempt the same voucher, or a caller can skip the preview validation.

Required repair: centralize promotion validation, calculate discount amounts server-side, lock the coupon/voucher rows in the checkout transaction, enforce customer/outlet/date/use limits and prevent double redemption. Apply equivalent rules to invoice edits; changing a coupon reference must not silently rewrite redemption history.

This behavior predates the barcode feature, but it affects net revenue and therefore barcode profit. The audit did not exercise fraudulent redemption against live data.

### R02 — P1: Invoice edits do not reconcile customer balances

`backend/src/controllers/posController.js`, `updateBill`: replacing invoice totals/payments updates the bill and payment rows, but does not add compensating customer-ledger entries or update `Customer.credit_balance`. A higher unpaid total can therefore leave the customer owing the old amount. Editing after loyalty awards also needs an explicit policy for reversing or adjusting earned rewards.

Required repair: calculate the old-versus-new due/store-credit effects, lock the customer, append compensating ledger entries and reconcile the balance in the same transaction. Preserve an audit trail for payment changes and earned rewards. Do not delete accounting history as the long-term reconciliation strategy.

This is broader than stock allocation and existed in the invoice-edit flow before this feature.

### R03 — P1: An open register is enforced only by the frontend

`backend/src/controllers/posController.js`, checkout: terminal and shift IDs are copied into the bill, but there is no transaction-side check that they identify an active terminal and an OPEN shift belonging to the selected outlet. A direct API request can bypass the browser's billing block. `posShiftController.closeShift` computes metrics and closes without coordinating a row lock with checkout, so enforcing only an unlocked lookup would leave a closing race.

Required repair: validate and lock the outlet/terminal/shift context during checkout, and coordinate closing with the same shift lock so totals include every committed sale. A retry of an already completed checkout should still return its original invoice after its shift closes.

### R04 — P1: Login grants wildcard authority to admin-table accounts regardless of business role

`backend/src/controllers/authController.js`, normal login: every account found in the `admins` table receives `permissions: ['*']` and `userType: 'admin'`, even though its `role` is an arbitrary stored string. `userController` creates application users in that table. The general `requireAdmin` middleware also accepts `userType: 'admin'` as sufficient authority. Consequently a manager/cashier account stored there can bypass normal permission checks; outlet and cost permissions cannot be relied on as the sole security boundary. The 2FA token path emits different claims, adding inconsistency.

Required repair: derive permissions from the user's actual business role for every token issuance path, distinguish account storage type from authority, enforce role/outlet scope consistently, and invalidate or revalidate previously issued overprivileged tokens. Simply changing a frontend permission list is insufficient. The audit added a strict role guard to reward administration, but did not redesign the entire existing identity system.

## Data and operational limits

- Historical buying costs remain unknown unless a verified historical basis exists. The audit did not backfill profit or recalculate old sale allocations.
- Legacy invoices may lack original unit conversions. The application can infer conversions from existing allocation snapshots where available; fully reconstructing conversions from before cost tracking is not possible from the current schema alone.
- Existing purchase/outlet price and cash reports have broader historical assumptions outside the new P&L calculation. The audit is not a complete accounting or tax certification.
- The existing Git index conflict for `backend/src/app.js` remains and must be settled before release.
- Apply migration `20261027000005-harden-barcode-cost-edits.js` before this audited code on other installations. It adds conversion and checkout request snapshots. It was applied locally.

## Verification

- Backend: `cd backend && npm run test:inventory`.
- Frontend regressions: `node --test src/utils/__tests__/*.test.js` from the repository root.
- Database tests use rollback-only fixtures. The launcher clones schema definitions into a unique disposable database, copies no business rows, and drops only that database afterward. Tests run serially within it; there is a dedicated competing-lock check within the suite.
- Final verification records the build/test totals and the read-only stock reconciliation result in the audit completion response. Full endpoint-level payment, promotion redemption and shift-closing race coverage remains required for the release blockers above.

Final focused verification: 21 backend checks and 13 frontend checks passed; production build passed; live stock reconciliation found zero mismatches.

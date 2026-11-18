# 11 · POS sales and invoices

Read [the execution contract](README.md) first. Prerequisites: 04,05,06,07,08,09,10.

## Current implementation

Bill number and request key are unique globally. Checkout connects inventory, customer credit, loyalty, bank and terminal data. Edits can reverse earlier consumption.

[pos.js](../../backend/src/routes/pos.js) · [posController.js](../../backend/src/controllers/posController.js) · [checkoutRequest.js](../../backend/src/utils/checkoutRequest.js) · [Bill.js](../../backend/src/models/Bill.js) · [POSPage.jsx](../../src/pages/pos/POSPage.jsx)

## Additional entry points

[EditInvoiceModal.jsx](../../src/pages/pos/EditInvoiceModal.jsx) · [AddPaymentModal.jsx](../../src/components/pos/AddPaymentModal.jsx) · [TalentPicker.jsx](../../src/components/pos/TalentPicker.jsx)

## Implementation sequence

1. Scope catalog, historical bills and allocations.
2. Validate every line, package, talent, shift, coupon, bank and customer in the resolved organization/outlet.
3. Namespace idempotency and bill numbering; preserve legacy receipt numbers.
4. Propagate context and transaction to all writes and reversals.
5. Permit only committed sales to trigger outbound delivery.

## Acceptance scenario

Retry identical checkout in each salon, inject a mid-transaction failure, edit quantities and add split payment. Reconcile bill, lot, ledger, shift and loyalty deltas and verify historical invoices.

## Existing route inventory

`GET /api/pos/catalog` `POST /api/pos/checkout` `GET /api/pos/bills` `GET /api/pos/bills/:id` `PUT /api/pos/bills/:id` `POST /api/pos/bills/:id/payments` `POST /api/pos/print-receipt/:billId` `POST /api/pos/bills/:id/send-whatsapp`

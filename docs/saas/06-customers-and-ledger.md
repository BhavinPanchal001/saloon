# 06 · Customers and ledger

Read [the execution contract](README.md) first. Prerequisites: 03.

## Current implementation

Customer matching uses phone; settlement also reads bills and bank accounts. The same router mounts portal handlers.

[customers.js](../../backend/src/routes/customers.js) · [customerController.js](../../backend/src/controllers/customerController.js) · [CustomerLedger.js](../../backend/src/models/CustomerLedger.js)

## Additional entry points

[CustomerListPage.jsx](../../src/pages/customers/CustomerListPage.jsx)

## Implementation sequence

1. Own staff-side customer CRUD, normalized phone matching and ledger reads.
2. Preserve independent customer histories across salons.
3. Flag ambiguous legacy numbers during migration.
4. Scope settlements to authorized customer, bill and bank inside one transaction.
5. Coordinate posting and reminders with 09 and 13.

## Acceptance scenario

Use identical phone numbers in A and B; reconcile outstanding amounts and reject foreign bills and bank accounts with zero balance changes.

## Existing route inventory

`POST /api/customers/portal/auth/phone-login` `POST /api/customers/portal/auth/phone-register` `GET /api/customers/portal/me` `GET /api/customers/portal/appointments` `POST /api/customers/portal/appointments/:id/cancel` `GET /api/customers` `GET /api/customers/:id` `GET /api/customers/:id/ledger` `POST /api/customers/:id/settle` `POST /api/customers/:id/send-whatsapp-reminder` `POST /api/customers` `PUT /api/customers/:id` `DELETE /api/customers/:id`

Move Walk-in Guest creation out of server startup into per-organization provisioning. Preserve historical guest bills and ensure checkout selects the correct guest after a workspace switch.

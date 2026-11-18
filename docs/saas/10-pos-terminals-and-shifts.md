# 10 · POS terminals and shifts

Read [the execution contract](README.md) first. Prerequisites: 03.

## Current implementation

Shift operations cover terminal selection, cash movements, X reports, closing and WhatsApp Z reports.

[posShiftRoutes.js](../../backend/src/routes/posShiftRoutes.js) · [posShiftController.js](../../backend/src/controllers/posShiftController.js) · [posShiftApi.js](../../src/services/posShiftApi.js) · [PosShiftMovement.js](../../backend/src/models/PosShiftMovement.js)

## Additional entry points

[POSTerminalsPage.jsx](../../src/pages/pos_management/POSTerminalsPage.jsx) · [POSShiftHistoryPage.jsx](../../src/pages/pos_management/POSShiftHistoryPage.jsx) · [CloseShiftModal.jsx](../../src/pages/pos/components/CloseShiftModal.jsx)

## Implementation sequence

1. Bind terminals to organization/outlet and enforce permissions on shift open, edit, cash movement and close.
2. Enforce single active shift per terminal under concurrency.
3. Require matching bill ownership for X/Z totals; coordinate report delivery with 13.

## Acceptance scenario

Race two opens on one terminal, complete two independent shifts, verify counted cash, and deny foreign terminal, shift and report access.

## Existing route inventory

`GET /api/pos-shifts/terminals` `POST /api/pos-shifts/terminals` `PUT /api/pos-shifts/terminals/:id` `DELETE /api/pos-shifts/terminals/:id` `GET /api/pos-shifts/shifts/active` `POST /api/pos-shifts/shifts/open` `PUT /api/pos-shifts/shifts/:id` `POST /api/pos-shifts/shifts/:id/cash-movement` `GET /api/pos-shifts/shifts/:id/x-report` `POST /api/pos-shifts/shifts/:id/close` `POST /api/pos-shifts/shifts/:id/send-whatsapp` `GET /api/pos-shifts/shifts/history`

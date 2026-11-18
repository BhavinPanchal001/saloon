# 14 · Files and receipt printing

Read [the execution contract](README.md) first. Prerequisites: 02,03.

## Current implementation

Express exposes uploads statically. Server printing selects host-local hardware. Browser receipt printing and Bluetooth already exist.

[printer.js](../../backend/src/routes/printer.js) · [printController.js](../../backend/src/controllers/printController.js) · [printerSettingsController.js](../../backend/src/controllers/printerSettingsController.js) · [upload.js](../../backend/src/middleware/upload.js) · [thermalPrinter.js](../../backend/src/utils/thermalPrinter.js) · [app.js](../../backend/src/app.js) · [ThermalReceiptModal.jsx](../../src/components/pos/ThermalReceiptModal.jsx)

## Additional entry points

[bluetoothPrinter.js](../../src/utils/bluetoothPrinter.js) · [ThermalReceiptTemplate.jsx](../../src/components/pos/ThermalReceiptTemplate.jsx)

## Implementation sequence

1. Inventory all upload and download paths.
2. Migrate private attachments to tenant-keyed storage with authorized streaming or short-lived links; expose only intended public assets.
3. Reconcile existing file references and close legacy static access.
4. Default cloud POS to local browser printing; scope printer preferences by terminal.
5. Enable server-assisted printing only with authenticated outlet device routing.

## Acceptance scenario

Read a private PO attachment as an authorized user and reject access from B including old URLs. Print two differently branded receipts at their respective terminals; test offline printer failure.

## Existing route inventory

`GET /api/printer/status` `POST /api/printer/toggle` `POST /api/printer/connection-type` `PUT /api/printer/settings` `POST /api/printer/settings` `POST /api/printer/test-print`

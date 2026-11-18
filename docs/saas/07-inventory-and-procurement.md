# 07 · Inventory and procurement

Read [the execution contract](README.md) first. Prerequisites: 04.

## Current implementation

Inventory costing uses FIFO lots, unique source keys and location 0 for central stock. Receiving POs and issuing stock produce multiple records.

[outletInventory.js](../../backend/src/routes/outletInventory.js) · [purchaseOrders.js](../../backend/src/routes/purchaseOrders.js) · [purchaseOrderController.js](../../backend/src/controllers/purchaseOrderController.js) · [outletInventoryController.js](../../backend/src/controllers/outletInventoryController.js) · [inventoryCostService.js](../../backend/src/services/inventoryCostService.js) · [openingLotMigration.js](../../backend/src/services/openingLotMigration.js)

## Additional entry points

[PurchaseOrderPage.jsx](../../src/pages/inventory/PurchaseOrderPage.jsx) · [PurchaseOrderHistoryPage.jsx](../../src/pages/inventory/PurchaseOrderHistoryPage.jsx) · [OutletTransactionsPage.jsx](../../src/pages/outlets/OutletTransactionsPage.jsx) · [inventoryCost.test.js](../../backend/tests/inventoryCost.test.js)

## Implementation sequence

1. Make location 0 mean the current organization’s warehouse in every lot query.
2. Namespace lot source keys and PO numbers.
3. Scope PO lines, attachments, approval, receipt, cancellation, stock issue, prices and movement writes inside their existing transactions.
4. Provide scoped stock consume/reverse APIs to checkout.

## Acceptance scenario

Receive identical PO numbers in A/B. Retry receipt, transfer stock, edit a sale and reconcile lot quantities and costs against movement history; foreign outlet and attachment operations must leave both inventories intact.

## Existing route inventory

`GET /api/outlet-inventory` `POST /api/outlet-inventory/issue` `GET /api/outlet-inventory/issues` `GET /api/outlet-inventory/prices` `POST /api/outlet-inventory/prices` `DELETE /api/outlet-inventory/prices/:outletId/:productId`

`GET /api/purchase-orders` `GET /api/purchase-orders/:id` `GET /api/purchase-orders/:id/payments` `POST /api/purchase-orders` `PUT /api/purchase-orders/:id` `DELETE /api/purchase-orders/:id` `DELETE /api/purchase-orders/:id/attachment` `PATCH /api/purchase-orders/:id/approve` `PATCH /api/purchase-orders/:id/receive` `PATCH /api/purchase-orders/:id/cancel`

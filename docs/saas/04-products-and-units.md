# 04 · Products and units

Read [the execution contract](README.md) first. Prerequisites: 03.

## Current implementation

Product barcode has a global unique index. Product writes resolve unit IDs separately.

[products.js](../../backend/src/routes/products.js) · [unitMasters.js](../../backend/src/routes/unitMasters.js) · [productController.js](../../backend/src/controllers/productController.js) · [unitMasterController.js](../../backend/src/controllers/unitMasterController.js) · [Product.js](../../backend/src/models/Product.js)

## Additional entry points

[InventoryPage.jsx](../../src/pages/inventory/InventoryPage.jsx) · [UnitMasterPage.jsx](../../src/pages/inventory/UnitMasterPage.jsx) · [BarcodePrintModal.jsx](../../src/pages/inventory/components/BarcodePrintModal.jsx) · [productMaster.test.js](../../backend/tests/productMaster.test.js)

## Implementation sequence

1. Scope the product master, barcode lookup, unit CRUD, label printing and product audit writes.
2. Change barcode uniqueness with a migration that preserves existing codes.
3. Validate unit ownership on every write; preserve conversion ratios, precision and cost-edit checks.

## Acceptance scenario

Create the same barcode in A and B with different units and prices. Verify lookup and labels, reject a foreign unit, and rerun product master regressions.

## Existing route inventory

`GET /api/products` `GET /api/products/:id` `POST /api/products` `PUT /api/products/:id` `DELETE /api/products/:id`

`GET /api/unit-masters` `POST /api/unit-masters` `PUT /api/unit-masters/:id` `PATCH /api/unit-masters/:id/toggle-status` `DELETE /api/unit-masters/:id`

# Product barcodes, stock costs and profit

Implemented 2026-10-27. See barcode-deep-audit.md for subsequent repairs and outstanding release blockers.

## Using the feature

- Each product has one unique barcode. Missing codes on existing products were generated; new products receive a code automatically if the barcode is left blank. Enter the manufacturer's barcode instead when available. Leading zeros are preserved. Duplicate codes return a clear validation error.
- Inventory → Add/Edit Product includes barcode and opening cost per **primary/base inventory unit**. The selling price is per item/pack. Product measure defines the stock consumed by one scanned pack (for example, 500 ml is 0.5 L). Barcode label printing already present in the checkout was retained.
- Enter acquisition prices on purchase orders. These are separate from retail/outlet prices. Each received line creates a cost lot. Purchases still receive into central stock; issue stock to an outlet to make it available there. Transfers carry cost with the physical quantity.
- Focus POS catalog search (F2), scan/type a barcode, and press Enter. The resolved product appears with its saved code. Repeat scans increase its pack count. Name search and manual selection remain available. Unit changes convert quantity and price consistently.
- Checkout allocates the outlet's oldest available stock first. Product sales, service materials and package materials use the same stock engine. Competing checkouts serialize on product locks; unsuccessful checkouts roll back their stock and costs. A request key prevents retrying a successful checkout from creating another bill.
- Bill edits preserve unchanged cost allocations. Quantity changes restore the original allocations before consuming stock again. The original saved direct-sale conversion is used for quantity edits, even if the pack measure subsequently changes. Customer/talent-only edits do not recost a sale.
- Reports → Profit & Loss includes product net sales, purchase/material cost, gross profit and margin by barcode. Product sale history also shows saved sales cost and profit for users allowed to view reports. CSV and paginated PDF use the same report calculation.
- Receipts, invoice/PDF/WhatsApp and thermal/Bluetooth printer payloads retain the barcode. Internal purchase costs are kept out of customer receipt data.

## Existing stock and historical sales

Current central/outlet quantities were seeded as opening lots. Their costs are **unknown**, because historical remaining-stock allocations cannot be inferred from old purchase orders. Enter a verified opening cost for remaining uncosted opening inventory. Unknown transferred opening lots inherit that cost for future sales. Already saved sale cost snapshots stay unchanged.

Historical bills without cost data remain readable. Reports show **Unknown**, rather than treating buying cost as zero or showing inflated profit. Rows show a count of missing costs. New purchases retain their actual net buying price. Supplier tax is recorded separately on the PO and is not added to acquisition cost by this implementation; freight and other landed-cost allocation are not introduced.

P&L recognizes eligible invoice sales by invoice date, including unpaid and partially paid sales; it is not a cash collection report. Product and consumed-material costs are deducted before operating expenses. Bill, voucher and loyalty discounts are allocated once; output sales tax is excluded from net revenue. Full labour allocation and a new refund/returns workflow are outside this change. Existing payment status changes do not act as stock returns.

## Access and stock overrides

Cost/profit reports and report exports require `reports:view` (administrators and wildcard roles retain access). Outlet users are scoped to their outlet. The permission is available in role editing; it is not granted automatically to other roles.

Out-of-stock checkout requires the enabled request preference **and** an administrator, wildcard or `inventory:override_stock` permission. A cashier cannot bypass stock checks by changing the request flag alone. `ALLOW_NEGATIVE_STOCK=true` can alternatively enable the server-wide policy. Unavailable-stock allocations are explicitly uncosted; profit remains unknown, and later receipts do not rewrite the original sale cost.

## Migration / deployment

Migrations were applied to the local development database. Other installations must apply the named migrations in order before running the new code:

```sh
# Run from backend/. The talent migration is also needed on a fresh checkout of this work.
npx sequelize-cli db:migrate --name 20261027000000-add-multiple-bill-talents.js
npx sequelize-cli db:migrate --name 20261027000001-add-product-barcode.js
npx sequelize-cli db:migrate --name 20261027000002-add-inventory-costing.js
npx sequelize-cli db:migrate --name 20261027000003-finalize-product-identities.js
npx sequelize-cli db:migrate --name 20261027000004-preserve-fractional-unit-prices.js
npx sequelize-cli db:migrate --name 20261027000005-harden-barcode-cost-edits.js
```

Back up before deployment. Cost-history migrations intentionally reject a destructive down migration. The pre-existing unresolved Git index conflict in `backend/src/app.js` was left untouched; settle the repository's integration state before committing/releasing.

## Verification

- Production frontend build passed.
- Existing frontend barcode-label and multi-talent tests passed (10 checks).
- Backend `npm run test:inventory` covers FIFO across receipt costs, idempotent receipt, transfer value, bill edits, saved conversions, fractional quantities, aggregate stock shortage, duplicate/leading-zero barcodes, competing product locks, discount rounding, tax exclusion, unknown costs and paginated profit PDFs.
- Database integration tests wrap their writes in transactions and roll them back. No test sales or payments were committed.
- Browser verification: barcode entry selected the expected item/pack and displayed its barcode. Product editing exposed the barcode and opening-cost inputs. Historical P&L showed unknown cost/profit rather than fabricated margins.
- Live local stock reconciliation found zero differences between product/outlet balances and remaining lot balances.

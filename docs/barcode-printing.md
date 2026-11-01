# Barcode label printing

Inventory admins can assign a product barcode in **Add Product Master** or **Edit Product**. Scan/type an existing code or select **Generate**, then save. Codes are optional, unique product identifiers (not purchase-lot codes), stored as strings to preserve leading zeroes. Printable ASCII, up to 64 characters, is accepted. Longer codes may need wider labels.

From **Inventory → Print Barcodes**, search/select products and enter label quantities. The barcode icon on a product row opens printing for that product. Products without saved barcodes cannot be selected.

- Code 128 labels, rendered locally as SVG with no external image/CDN request.
- Thermal roll: one label per page; default 50 × 30 mm.
- A4 sheets: configurable label dimensions, columns, equal outer margins and row/column gap, with automatic pagination. Match these values to the sticker sheet. Printing on partially used sheets is not supported.
- Product name and product-master selling price are optional. Prices are in RM and do not use outlet overrides.
- Maximum 500 labels per product and 1,000 per job. Narrow labels with overly long codes are blocked to avoid excessive barcode density.
- Allow pop-ups. In the print dialog select the correct printer/media, **100% / Actual size**, no headers/footers, and matching paper size. The opened print page has a **Print labels** button for retries. Printer drivers must support the requested custom size for thermal output.

Physical printer alignment and scanner readability need a sample print on the target device. This feature uses the operating system's browser print workflow; it does not send raw ZPL/TSPL/ESC-POS commands. POS barcode lookup is separate work.

## Database rollout

Before running the updated backend against an existing database, apply this migration from `saloon/backend`:

```sh
npx sequelize-cli db:migrate --name 20261027000001-add-product-barcode.js
```

It adds a nullable `products.barcode` column and unique index; existing products are left unassigned. The migration is applied to this workspace's local development database. Deployments must apply it separately. Restart the backend after updating application code.

## Verification

```sh
node --test src/utils/__tests__/barcodeLabels.test.js
npm run build
```

Verified locally: thermal and multi-page A4 previews, quantity controls, barcode-less products disabled; database leading-zero round trip, uniqueness and multiple NULL values using temporary rows rolled back in a transaction. No physical labels were printed.

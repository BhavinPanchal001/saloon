# Barcode sales and profit: audit and implementation plan

Date: 2026-10-27
Status: implemented and locally verified. One unique barcode per product, with FIFO purchase cost allocation. See barcode-implementation.md for operation and verification details.
Scope: product management, purchasing, opening inventory, central/outlet stock, service consumption, POS, bill editing, receipts, reporting, permissions, migrations, and regression checks.

## 1. Decision that determines the design

A barcode can identify either:

1. **A product/variant or pack**: the manufacturer's barcode identifies the sellable item. Different purchases of that item usually share the barcode. Purchase lots retain their own costs; the costing engine allocates stock underneath the sale.
2. **A specific purchase lot**: a distinct internal barcode identifies a received batch. Scanning or selecting that code selects its available stock and acquisition cost.

Proposed default: product/variant barcode, separate purchase lots, FIFO allocation within the selected outlet. This is a proposed application behavior, not an existing capability. If batch barcodes are required, make the selected batch mandatory on relevant stock movements and sales. Never assume that two purchases with the same product barcode had the same cost.

One product record per sellable variant is sufficient initially; a full parent/child variant management system is separate scope. A barcode alias can identify a pack of the same product with an explicit base-unit quantity. A different size/colour that needs independent inventory must have its own product record.

## 2. Audit findings

The audit inspected application source and read the live local database's column definitions. No barcode/profit feature changes or business-data changes were made during this audit.

| Module | Current behavior / finding | Required change |
| --- | --- | --- |
| Product model and CRUD | `Product.js`, `productController.js`: no barcode, item code, or independent acquisition-cost field. `unit_price` is used as the default selling price by POS. | Add barcode/item-code identity and validation; explicitly separate buying costs from selling prices. Preserve existing selling prices. |
| Product UI and API adapter | `InventoryPage.jsx`, `api.js`: create/edit forms and mappings contain neither barcode nor cost. Product lookup searches names. | Add codes, scan/type input, duplicate messages, list/search columns, and explicit opening-stock cost. |
| Purchase orders | `PurchaseOrderItem.js` records purchase price, but does not preserve purchase unit, base quantity, barcode/lot, or cost allocation. New orders are immediately received into central stock. | Record received unit/quantity, normalized base quantity and cost, lot identity, and receipt movements. Keep the existing auto-receive workflow unless explicitly changed. |
| Purchase quantities | PO item `qty` is INTEGER. The controller rounds quantity and enforces at least one, even when the inventory UI submits a fraction after converting secondary units. | Use decimal quantities and validate units consistently. Example: 500 ml converted to 0.5 L must remain 0.5, not become 1. |
| PO outlet selection | PO can store `outlet_id`, but receiving increments central stock. | Make the destination explicit. Preserve central receipt plus stock issue by default; do not silently treat the PO's outlet tag as an outlet receipt. |
| Central stock / outlet issue | Products and outlet inventory store quantity only; `StockIssue` stores no lot/cost. Transfers do not preserve cost provenance. | Move quantity and acquisition cost together, retaining originating lot. Add movements/allocations and reconciliation. |
| Outlet selling price | `OutletProductPrice` stores per-outlet selling prices. | Preserve this pricing precedence. Acquisition cost must never overwrite it. |
| Units and product measure | Primary/secondary units and product measure already exist. POS currently adds one selected unit per click; measure is displayed as a label. | Define sellable pack quantity explicitly. Scanning one 500 ml pack must deduct 0.5 L where inventory is stored in litres. Snapshot the conversion used. |
| POS catalog and search | `getCatalog`, `POSPage.jsx`: no barcode lookup; search matches names/categories. Product cart lines merge by product ID only. | Exact barcode lookup scoped to outlet, scanner Enter handling, manual search, pack/lot-aware cart identity and stock display. |
| Checkout stock validation | Validation compares raw quantities against stock, while deduction converts quantities to base units. Requirements are checked per line, not aggregated across direct sales, services and packages. | One server-side aggregated base-unit requirement calculation for all consumption paths. |
| Concurrent stock mutation | Checkout/issue paths use read-then-update without explicit row locks on the inventory reads inspected. A transaction alone does not serialize competing stock reads. | Lock relevant stock/lot rows in stable order; validate and mutate atomically. Add retry/idempotency behavior for duplicate requests. |
| Out-of-stock override | Checkout consumes a request-provided `allowOutOfStockCheckout` flag. | Enforce settings/permission server-side. Never assign fabricated zero costs to stock without a cost basis; block or mark unresolved costing according to the chosen rule. |
| Bill line persistence | `BillLineItem.js`: no barcode, base-quantity conversion, acquisition cost or lot allocation snapshot. | Save immutable sale identity, quantity conversion, net revenue, cost, and allocation references. |
| Bill editing | `updateBill` restores all old stock, destroys/recreates lines, then deducts again using current product conversion. It does not use the same validation flow as checkout. | Reverse original allocations using saved quantities, preserve unchanged line cost/lot snapshots, and cost only changed quantities. Reuse checkout validation and stock services. |
| Discounts and totals | Checkout/edit accept client-supplied prices/totals. Manual/coupon, voucher and points discounts have separate fields. Reports subtract only `discount_amount` in the P&L paths inspected. | Server calculates/validates revenue and discount allocation; apply each discount once and reconcile to the bill. Authorized price overrides remain supported. |
| Product sale history | `ProductSaleHistoryPage.jsx` assembles bill history in the browser. It handles direct sale and service consumption, but does not process package consumptions in the inspected loop. | Add barcode/lot filters, package consumption and saved cost/profit; distinguish sales revenue from service consumption cost. Prefer a paginated backend history query. |
| Profit and loss | `reportController.js`: net profit currently equals subtotal minus bill discount minus expenses. No product COGS or service material costs are deducted. Similar calculations are duplicated in exports. | Add cost of goods sold/material cost and gross profit; centralize calculations for UI/CSV/PDF. |
| Stock summary | Cost and selling price are both taken from `Product.unit_price`; all-outlet quantity uses central stock only as a fallback when outlet stock is zero. | Value remaining costed stock and add central plus outlet balances correctly. Use actual stored item code/barcode, not generated `PROD-id`. |
| Top-selling / dashboard | Aggregates sales by item ID/name and gross line amount, without barcode or cost snapshots. | Keep existing revenue metrics clearly named; add barcode product margin data from the shared report calculation. |
| Receipts / PDF / WhatsApp / printers | Multiple invoice and thermal rendering paths consume bill line data. | Carry barcode/item-code snapshots across all adapters and optionally display item code on receipts. Keep internal purchase cost/profit out of customer receipts. |
| Audit trail | Existing inventory audit log records some issue/price operations; logging errors are swallowed. No dedicated authoritative cost-allocation ledger exists. | Use transactional stock/cost movements as the source of truth; keep descriptive audit logging in addition. |
| Returns / cancellation | No dedicated POS refund/void endpoint was found in `routes/pos.js`; payment status supports `refunded` elsewhere. | Do not treat payment status changes as inventory reversals. Define an explicit return/void integration boundary; full returns UI is an additional feature unless requested. |
| Permissions | Product writes are admin-only; POS uses permission checks; report routes inspected require authentication. | Restrict purchase costs/profit reports to authorized users, enforce outlet scope and audit price/cost corrections. |
| Startup / migration | Startup uses `sequelize.sync()` plus manual schema patches. Existing worktree includes an unresolved Git index conflict for `app.js`. | Use explicit migrations and schema checks; preserve current uncommitted work and resolve integration state separately before release. |

## 3. Proposed data model

Names below are provisional and will follow repository conventions.

- **Products**: retain `unit_price` as the existing default selling price. Add optional unique `item_code`. Archive products with transaction history instead of deleting their identity.
- **Product barcodes**: unique string `code`, `product_id`, label, base-unit pack quantity, active state. Strings preserve leading zeros. One code resolves to exactly one sellable identity. Optional barcode aliases support pack sizes; a primary barcode can be shown on product forms.
- **Stock lots**: product, supplier receipt reference, received date, base-unit acquisition cost, optional batch barcode. Lot cost records acquisition cost; a default/opening cost is a separate explicit input.
- **Location/lot balances**: central or outlet location, lot, available base quantity. Unique location/lot keys; indexed product/location queries.
- **Stock movements and allocations**: receipt, transfer, direct sale, service/package consumption, adjustment and reversal; signed base quantity and cost, original reference, actor and idempotency key.
- **Bill lines**: barcode/item-code/product-name snapshot, selected unit and pack factor, base quantity, line discount allocation, net sales, total acquisition/material cost, costing status. Existing `price`, `qty`, talent selections, consumption and package structures remain compatible.
- **Sale allocations**: bill line or nested service consumption mapped to stock lot, quantity and acquisition cost. A line may consume several lots. An explicit batch selection limits allocation to that batch.
- **PO lines**: decimal quantity, entered unit, conversion snapshot, normalized base quantity, net unit cost and receipt/lot references.

Use decimal arithmetic and explicit rounding for quantities and money. Preserve extra precision for base-unit acquisition cost, and round displayed totals to currency precision. Do not use floating-point accumulation for stored financial totals.

## 4. Sales and profit behavior

1. Cashier scans/types a barcode in a focused POS scan field and presses Enter. An exact match resolves the product/pack and, if applicable, batch in the selected outlet.
2. Show the resolved product, unit/pack, selling price and available stock. Unknown/inactive/unavailable codes give a clear message without creating a product. Ordinary name search remains available.
3. Add one sellable pack per scan. Repeated scans increase quantity only when product, pack, selected batch and price context agree. Scanning must not accidentally submit checkout or interfere with customer/payment inputs.
4. The server validates the identity, outlet, units, quantities, allowed selling price overrides and discounts; ignores any client-supplied acquisition cost or profit.
5. Aggregate all product requirements, including service/package usage; convert them to base units; lock and allocate eligible stock in one transaction.
6. Snapshot product identity, conversion, price, discount and allocated cost with the bill. Later buying-price/barcode/unit changes must not change old sales or profit.
7. Keep profit drill-down available to authorized staff by date, outlet, product and barcode; batch detail when applicable.

Proposed reporting formulas:

- Net product sales = product line amount minus its allocated sales discounts, excluding output sales tax.
- Product gross profit = net product sales minus the saved cost of allocated stock.
- Service/package gross contribution = net service/package sales minus saved consumed-material cost. This is not full service profitability unless labour and other direct costs are also included.
- Gross profit for the period = net sales minus the applicable saved product/material costs.
- Net profit = gross profit minus operating expenses covered by the report.
- Margin percentage = gross profit / net sales × 100; show a defined zero/empty state for zero revenue.

Allocate bill-level discounts across eligible lines proportionally, with deterministic currency-rounding reconciliation. Coupon, voucher and loyalty policies determine eligible lines and must be handled exactly once. Returns reverse original net revenue and original costs. Transfers and purchase payments do not themselves count as sales profit or cause the same purchase cost to be deducted twice.

Example: barcode A costs RM 60 and barcode B costs RM 75; each sells at RM 100. Before discounts/tax, saved gross profits are RM 40 and RM 25 respectively. A subsequent purchase at a different cost does not rewrite these saved results. If a single product barcode spans several receipt lots, use the chosen lot allocation rule instead of pretending the barcode alone determines cost.

## 5. Implementation sequence and completion gates

### Phase 1 — Identity, units and migration foundation

- Finalize barcode identity (product/pack versus batch) and costing behavior.
- Add schemas, constraints and indexes without removing current fields.
- Add product code/barcode editing, duplicate handling, exact lookup and adapter mappings.
- Add opening-cost entry and cost-coverage states. Existing products can remain without a barcode until assigned; name-based selling stays available.
- Gate: leading-zero codes round-trip; duplicate writes are rejected by the database; existing products/prices/stock remain intact.

### Phase 2 — Purchasing and stock cost provenance

- Fix decimal PO quantity/unit normalization across both PO entry screens.
- Implement receipt lots and movements, including auto-receive and explicit receive paths, without duplicate receipt on retry.
- Transfer lot quantities and cost from central stock to outlets. Add explicit costed stock adjustment behavior.
- Reconcile aggregate stock fields against lot balances in the same transaction.
- Gate: received quantities/value equal central plus transferred/remaining quantities/value; fractional units and repeat receipts work correctly.

### Phase 3 — POS selection and checkout

- Add focused barcode entry, exact resolution, manual fallback, correct pack quantity and cart identity.
- Consolidate all stock validation/deduction into one backend service used by sales and consumptions.
- Enforce server-side settings and price permissions, aggregate demand and lock balances.
- Save bill cost and identity snapshots and allocation records atomically.
- Gate: scanning selects/deducts the correct item; mixed product/service/package consumption cannot oversell; failed checkout rolls back bill, stock and costs together.

### Phase 4 — Editing, history and document paths

- Carry new fields through bill fetch/list/update, POS edit, invoice edit, product sale history and all print/share payloads.
- Preserve unchanged allocations during non-stock edits. For changed quantities, reverse original allocations then apply explicit delta/reallocation rules.
- Retain the original conversion for reversals even if the product unit master changes later.
- Gate: changing customer/talents does not recost the sale; editing quantities reconciles stock/value; receipts preserve the selected item code and contain no internal cost.

### Phase 5 — Profit reports and stock valuation

- Centralize reporting calculations and reuse them for on-screen reports, CSV and PDF.
- Add barcode/product sales, net revenue, COGS, gross profit, margin and cost-coverage indicators.
- Correct P&L material/product costs and discount treatment; correct central-plus-outlet stock valuation.
- Preserve cash/register reports as cash movement reports; do not relabel register cash as profit.
- Gate: all report formats reconcile, filter correctly by outlet/date, and distinguish unknown costs from zero costs.

### Phase 6 — Migration reconciliation and release verification

- Seed opening lots from current central/outlet stock using explicit, reviewed cost inputs. Do not automatically treat selling price as cost.
- Past POs cannot prove which receipts remain unsold at each outlet: historical cost allocations are unavailable. Do not invent historical exact profit or reconstruct batches silently.
- Existing bill lines remain readable with unknown historical cost; report cost coverage and a costing start date. Any historical backfill must have a documented basis and be visibly marked as estimated.
- Test backup/restore and migration order on a copy; deploy schema before code requiring it. Reconcile quantities before enabling costing.
- Gate: existing bills, talent assignments, stock and current business workflows still work; deployment and migration prerequisites are documented.

## 6. Verification matrix

- Codes: leading zeros, scanner Enter, long/invalid input, whitespace normalization, unknown/inactive code, concurrent duplicate creation, aliases, name-search fallback.
- Quantities: pieces, packs, litres/ml, fractional POs, conversion changes after sale, multiple cart lines consuming one product, shared service/package materials.
- Costing: same product bought at different costs; allocation spanning lots; explicit lot selection if enabled; opening cost missing; receipt/transfer preserves acquisition value.
- Sales: outlet selling price, permitted manual override, unauthorized override, coupons/vouchers/loyalty, tax exclusion, zero-price sale, discounts distributed with exact rounding.
- Integrity: two tills selling final stock, duplicate scan/checkout/receipt requests, transaction rollback, missing outlet stock, settings-based negative stock behavior.
- Edits: customer/talent-only edit retains original cost, increase/decrease/delete line, pack change, backdated receipt, edit after transfer, original-cost reversal.
- Reports: by barcode/item/outlet/date; UI/CSV/PDF agreement; stock valuation central plus outlets; unknown-cost coverage; no double counting of inventory purchases and operating expenses.
- Compatibility: existing barcode-less products and legacy bills, multi-talent service/package assignments, customer receipts/thermal/PDF/WhatsApp, roles and outlet scope.

## 7. Boundaries requiring explicit business rules

- Barcode identity: product/variant/pack or receipt batch (question sent during the audit).
- Cost allocation when the same product barcode spans receipts: proposed FIFO; weighted average would require different allocation behavior.
- Missing/negative stock cost: proposed no finalized margin until cost is known; never silently use zero.
- Acquisition-cost components such as supplier tax, freight and discounts need explicit treatment before they are included in inventory cost.
- Historical costing is unknown unless independently reconciled.
- Full refunds/returns UI, label printing, camera scanning and a new variant-management UI are not assumed part of the first release. Barcode identity and cost records must allow later integration.

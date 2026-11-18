# Salon SaaS execution plan

## Target and scope

One salon business owns an organization. An organization owns one or more outlets. Use one application and a shared relational database. Preserve globally unique internal primary keys and add organization ownership to business records. Reuse the current React admin, Express API and customer website. These are proposed contracts based on source review. Confirm deployed database, schema drift, storage and device topology during session 01.

Exclude employee management, contracts, payroll, attendance, commission masters, HR roles/masters, shifts used for employee scheduling and leave. POS cash shifts and application membership permissions are in scope. Do not expose deferred HR routes, attachments, exports, jobs or navigation on the shared deployment. Keep a separate existing single-business deployment for HR if needed; establish a single writer for each dataset at cutover. POS talent and bookings need a minimal scoped directory. Session 02 owns that interface and legacy mapping; no consumer reads the unrestricted staff directory.

## Execution order and ownership

Follow the [database execution runbook](database-execution.md) for branch setup, database selection, migration rehearsals and release. Start 01 on a dedicated development restore, then merge 02, then 03. Build 04, 06, 09, 10, 13 and 14 independently against the published interface. Start 05 after 04 when service consumption is enabled, 07 after 04, 08 after 06, and 12 after 05 and 06. Integrate settlement across 06/09 and purchasing across 07/09 before enabling either linked operation. Integrate 11 after its domain dependencies. Complete 15 against reconciled fixtures and 16 for pilot provisioning. External delivery, printing and uploads stay gated until 13/14 pass. Gate every unmigrated route by default on the SaaS deployment. Enable deferred features only after a separate conversion.

| ID | Session brief | Inputs |
|---|---|---|
| 01 | [Database and migration](01-database-and-migration.md) | — |
| 02 | [Identity, users and app shell](02-identity-users-and-app-shell.md) | 01 |
| 03 | [Outlets and business settings](03-outlets-and-business-settings.md) | 02 |
| 04 | [Products and units](04-products-and-units.md) | 03 |
| 05 | [Services, categories and packages](05-services-categories-and-packages.md) | 03,04 |
| 06 | [Customers and ledger](06-customers-and-ledger.md) | 03 |
| 07 | [Inventory and procurement](07-inventory-and-procurement.md) | 04 |
| 08 | [Coupons, rewards and vouchers](08-coupons-rewards-and-vouchers.md) | 06 |
| 09 | [Banks, payments, expenses and budgets](09-banks-payments-expenses-and-budgets.md) | 03 |
| 10 | [POS terminals and shifts](10-pos-terminals-and-shifts.md) | 03 |
| 11 | [POS sales and invoices](11-pos-sales-and-invoices.md) | 04,05,06,07,08,09,10 |
| 12 | [Appointments, portal and booking website](12-appointments-portal-and-booking-website.md) | 03,05,06 |
| 13 | [WhatsApp, sockets and email delivery](13-whatsapp-sockets-and-email-delivery.md) | 02,03 |
| 14 | [Files and receipt printing](14-files-and-receipt-printing.md) | 02,03 |
| 15 | [Dashboard, reports, audit, search and notifications](15-dashboard-reports-audit-search-and-notifications.md) | 04–11 |
| 16 | [Onboarding and SaaS subscriptions](16-onboarding-and-saas-subscriptions.md) | 02,03; pilot after 15 |

## Shared implementation contract

- Session 01 owns the schema manifest, migration ordering and rollback procedure. Each module owns its migration for its domain, Sequelize definitions, write/read paths and UI callers. Coordinate changes to shared files before parallel work. Session 02 owns middleware, router mounting, client transport and session state. Session 11 owns checkout orchestration; other modules expose transaction-aware functions. The portal owner edits only portal handlers in the customer router; printing owns print handlers in POS.
- Require a server-resolved organization ID, actor identity, permission set and authorized outlet scope. Never authorize a client-supplied organization or outlet by itself. All-outlets means only permitted outlets. Validate parent and child ownership on reads and writes, including transactions, joins, bulk actions, jobs and exports. Inaccessible record IDs return the same response as absent records. Define explicit public, portal, staff and platform route classes.
- Prefer direct ownership on independently queried records. For inherited children, document the required parent join. Prevent cross-organization links with compound keys where feasible; document transaction validation and negative tests for polymorphic, JSON or otherwise unenforceable links. Audit actual database indexes before replacing global uniqueness. Keep global login email and public workspace slug unique platform-wide.
- Use one migration writer and immutable ordered migrations. Confirm the production dialect first. Support every advertised dialect through its actual setup path or narrow the deployment target explicitly. Remove conflicting startup/controller schema mutations before constraint enforcement. Keep financial precision, IDs, sequences and audit history.
- Test with two organizations sharing business identifiers, two outlets in A, one in B, an A cashier limited to one outlet, a multi-workspace owner and a portal customer. For every module cover authorized reads/writes, foreign IDs, nested foreign references, empty filters, exports and retries where applicable. Check persisted state after denial. Run existing domain regressions and add targeted API/database tests against the deployment dialect.

## Session handoff

Copy into a new session: “Read docs/saas/README.md, docs/saas/database-execution.md and brief NN. Verify its prerequisites in the checkout. Implement the brief through its normal UI/API paths, including migration and acceptance checks. Leave HR management deferred. Report changed files, migration IDs, commands and results, cross-module dependencies and remaining release gates.” Use a separate branch/worktree per brief and merge prerequisites before downstream integration. Add actual completion evidence to the brief when done. Route inventories identify review surfaces; related routes may be owned by the adjacent brief.

## Cutover and rollback

1. Rehearse from a restricted production-like backup including uploads and settings. Record schema version, row counts, totals, linked bill/ledger/lot data, file checksums and unresolved ownership. Confirm legacy data belongs to Glowy before assigning it. Review tracked SQL exports and runtime artifacts for sensitive data before distributing the repository.
2. Deploy additive schema and compatible writes first. Backfill and reconcile; stop on ambiguous ownership. Close or quiesce writes for the final delta and verify restore on an isolated instance. Remove startup schema mutation, enforce constraints and activate only verified routes. Reject or reissue pre-workspace tokens.
3. Run the two-salon pilot with payment/messaging test accounts. Verify booking → checkout → stock → settlement → report and file/receipt delivery, tenant-specific monitoring, backups and restore. Require zero unexplained reconciliation differences and passing isolation tests before exposing a second business.
4. Before external writes, rollback can route traffic to the compatible single-salon release and verified snapshot. After new tenant writes, freeze writes, retain journals/backups and reconcile or forward-fix; restoring a pre-cutover snapshot alone would discard sales. Rehearse that decision with the operator before launch.

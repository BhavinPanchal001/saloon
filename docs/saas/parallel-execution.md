# Parallel execution across two PCs

Use `saas/foundation` as the shared integration branch. Take both work branches from the same published commit. Use the numbered module briefs for implementation and the [database execution runbook](database-execution.md) for isolated targets, migration rehearsal and deployment.

## Current baseline

- Session 01 passed its local MySQL clean install, snapshot upgrade and restart checks. The SaaS API starts through `npm run start:saas` in the backend directory.
- Session 02 has workspace sign-in, existing TOTP verification, switching, per-request membership verification and a small workspace UI. The API exposes only health, workspace identity and outlet reads.
- Session 03 has scoped outlet reads. Write operations, settings, branding and provisioning are still pending.
- The two computers use their own MySQL databases and credentials. Use the schema-only checkpoint and synthetic organizations, accounts, products, customers and sales on the second PC. Real salon data, uploads, local credentials and provider sessions stay on the existing machine.
- Keep HR routes and data management outside the SaaS workstream. The identity track owns the minimal talent projection needed by booking and checkout.

## First parallel pass

| Track | Branch | Work package | Deliverable |
|---|---|---|---|
| PC 1 · Identity and commerce | `saas/pc1-commerce` | Finish 02 and 03. Then implement 04, 06, 07, 08, 09 and 10 against the shared workspace contract. Coordinate catalog product references with PC 2. | Membership management, tenant-aware outlets and internal business data with verified migrations and reconciliation. |
| PC 2 · Booking and delivery | `saas/pc2-booking-delivery` | Start 13 and 14 with mocked provider/devices and dedicated storage on the published foundation. Prepare the public booking UI and fixtures. Implement 05 and 12 after the necessary outlet, catalog and customer changes land. | Isolated messaging and uploads, salon-specific booking and portal verification, plus receipt delivery. |
| Integration · either PC | `saas/integration-checkout` | Merge prerequisite branches, then 11 and 15. Pilot provisioning in 16 can start after 02 and 03, with live activation following integrated acceptance. | Two-salon checkout, banking, inventory and reports with cross-tenant tests. |

## PC 1 kickoff

Start with [identity and app shell](02-identity-users-and-app-shell.md) and [outlets and settings](03-outlets-and-business-settings.md). Finish permission and membership lifecycle, workspace cache behavior, talent lookup, and outlet/settings writes. Publish the scoped interfaces before expanding modules. Follow with [products/units](04-products-and-units.md), [customers/ledger](06-customers-and-ledger.md), [inventory/procurement](07-inventory-and-procurement.md), [rewards](08-coupons-rewards-and-vouchers.md), [finance](09-banks-payments-expenses-and-budgets.md), and [POS shifts](10-pos-terminals-and-shifts.md). Reconcile finance and inventory side effects before merging the checkout dependencies.

## PC 2 kickoff

Start with [messaging and sockets](13-whatsapp-sockets-and-email-delivery.md) and [files and printers](14-files-and-receipt-printing.md). Use fake provider sessions and synthetic receipt/attachment fixtures to verify boundaries while PC 1 finishes settings and access. Own the customer website and booking portal code. Build [services and packages](05-services-categories-and-packages.md) against the integrated catalog and outlet contracts, then [appointments and portal](12-appointments-portal-and-booking-website.md) against the customer changes. The PC 1 CRM track owns the back-office customer endpoints.

## Shared contract and merge ownership

- Protected requests carry `req.saas.adminId` and a server-resolved `req.saas.workspace` with `id`, `slug`, `role` and nullable `outlet_id`. Null outlet currently means owner-wide access within that workspace. Public routes resolve a workspace by published slug and verify portal identity separately.
- PC 1 owns the workspace middleware, database runner and module route mounting. PC 2 owns its own route modules and Website files. Add each migration under a distinct module-owned file and coordinate its ID with PC 1 before publication. The integration branch owns checkout orchestration and merges the route modules.
- Each branch uses a local database and commits its own code, migrations and test fixtures. Integrate at the end of each module rather than holding an entire track until all modules are done. Share migration IDs, API signatures, verification evidence and any blocked dependencies in the PR.
- Seed two organizations with overlapping business identifiers and a restricted outlet account. Include a successful action and a denied cross-organization action for each feature. Verify that rejected writes leave both organizations' data unchanged.
- After checkout and reporting merge, rehearse [onboarding and subscriptions](16-onboarding-and-saas-subscriptions.md), cutover and recovery on a representative staging restore. Keep payment and messaging in their test environments through the pilot.

## Starting on the second computer

Once the foundation branch is published to the approved remote, fetch it and branch from the same commit. For an existing repository checkout:

```sh
git fetch origin saas/foundation
git switch -c saas/pc2-booking-delivery FETCH_HEAD
```

Install frontend and backend dependencies. Configure a local MySQL development and test database. From the backend directory, check the expected database identity and use `npm run db:saas:setup -- <server:port> <database> install` for the clean schema. Start the SaaS API using `npm run start:saas`. From the frontend directory, use `VITE_SAAS_MODE=true VITE_API_URL=http://localhost:5111/api npm run dev` with a matching backend port and CORS origin. Give every synthetic account its own test password and explicit membership.

## Integration gates

1. Merge the remaining identity and outlet contracts. Verify workspace switching, membership disablement and outlet-aware writes.
2. Merge the catalog, customer, finance, inventory, rewards, shift, booking and delivery changes with their migration dependencies. Rehearse both setup paths after each schema batch.
3. Implement [checkout and invoices](11-pos-sales-and-invoices.md) and [reports, audit and search](15-dashboard-reports-audit-search-and-notifications.md) on the integrated schema. Reconcile end-to-end sale, settlement and stock movement across both salons.
4. Run provisioning, release and rollback rehearsals before external onboarding.

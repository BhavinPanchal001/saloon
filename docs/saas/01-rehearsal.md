# Foundation rehearsal · 19 November 2026

Local MySQL 9.6.0 ran the first rehearsal on the saas/foundation worktree at base commit 48645d0. The source was the existing development database glowy_saloon. A fresh single-transaction dump contained 57 InnoDB tables. The source had no scheduled events or triggers. The backup SHA-256 is d56b287ee7edd1f98c298048bfa78a98d7cd54649ba36539a2e027ce3e507f5c. The private snapshot and aggregate JSON evidence are in ~/.saloon-saas-baseline-1MKBKo on the rehearsal machine. Keep these outside Git.

## Results

| Check | Observed result |
|---|---|
| Connection identity | Mac.lan:3306, separate glowysaas01dev and glowysaas01test schemas. The local rehearsal account received grants on those two schemas. |
| Independent restores | Identical pre-migration baseline JSON for both copies, 57 tables and 278 rows in each. |
| Logical references sampled | Zero bills without outlets, bill lines without bills, or inventory lots without products. |
| Migration | 202611190001-organization-outlets created organizations, a SaaS migration ledger and a nullable outlet foreign key. The two legacy outlet IDs 1 and 2 were explicitly assigned to Glowy in both copies as a rehearsal assumption. Confirm ownership on the actual deployment before cutover. |
| Retry | On test, an incomplete input list failed after additive DDL. Retrying with the full list succeeded. Repeating the successful run on each copy reported already applied. |
| Reconciliation | Both copies contained two linked outlets, one organization and one ledger entry. All legacy table counts, existing migration names, bill totals by outlet/status, payments by linked outlet/status, signed customer credit balances, ledger sums and lot quantities by location/product matched the saved baseline. |

From the SaaS backend directory, run the following against the configured local copies. Baseline output contains internal IDs and financial aggregates.

```sh
node scripts/saas/baseline.js Mac.lan:3306 glowysaas01dev
NODE_ENV=test node scripts/saas/baseline.js Mac.lan:3306 glowysaas01test
NODE_ENV=test node scripts/saas/rehearse-outlet-ownership.js Mac.lan:3306 glowysaas01test 1,2
```

## Proposed ownership map for the restored schema

| Ownership | Tables | Implementation rule |
|---|---|---|
| Platform | SequelizeMeta, saas_migrations, organizations | Deployment state and workspace identity. |
| Identity | admins | Global identity with organization roles and outlet assignments on memberships introduced by session 02. |
| Organization | outlets, products, unit_masters, packages, services, service_categories, customers, loyalty_tiers, reward_settings, coupons, banks | Give each business its own catalog, CRM, accounts and settings. Review each global unique index. |
| Operational | appointments, bills, payments, expenses, purchase_orders, pos_terminals, pos_shifts, notifications, customer_vouchers, customer_ledgers, loyalty_ledgers, bank_transactions | Give independently queried records direct ownership and validate each optional reference within it. |
| Stock, pricing and budgets | inventory_audit_logs, inventory_lots, inventory_movements, outlet_inventories, stock_issues, outlet_product_prices, outlet_package_prices, outlet_service_prices, monthly_budgets, Budgets, BudgetHistories | Require consistent organization across outlet, product, package or service. Central stock uses location 0. Inspect both legacy budget representations before consolidation. |
| Inherited children | bill_line_items, payment_details, purchase_order_items, package_services, pos_shift_movements | Inherit via bill, payment, PO, package or shift. Validate cross-references and enforce parent joins for independent lookups. |
| Deferred HR | attendances, contract_groups, contract_salary_mappings, contract_type_templates, contract_types, contracts, holiday_occasions, holiday_templates, leave_types, processed_payroll_details, processed_payrolls, roles, salary_component_masters, shifts, staff_members, work_weeks | Preserve legacy records. Session 02 owns a scoped talent projection and membership authorization. |

## Remaining gates

- Fifteen migrations in the SaaS checkout have no row in the restored SequelizeMeta ledger. Some corresponding tables or columns already exist. Compare actual DDL and data outcomes with each migration before choosing a clean-install baseline. The original worktree also has a pending appointment-notifications migration outside the SaaS base.
- This rehearsal requires an existing outlet table and an offline single-business copy. Complete clean install, legacy schema convergence, startup-write removal and development server isolation before running the SaaS application. Existing bootstrap and controller paths can issue DDL.
- Introduce organization-aware writers and authenticated scope before enforcing non-null outlet ownership or allowing a second salon. Rehearse with the deployed engine, release and backup before production use. The deployed engine and deployed application version have yet to be verified.

## Ledger drift triage

A read-only check on the development restore compared the main effects of the 15 unrecorded migration files with current columns and indexes. The observations below guide repair. Table presence alone does not establish matching defaults, foreign keys, historical data updates or full schema equivalence.

| Migration ID | Observed effect or discrepancy |
|---|---|
| 20260716000000 | services.assigned_outlet_ids exists as JSON. |
| 20260717000000 | Attendance exists. The unique staff/date pair is absent. Defer HR repair. |
| 20260720000000 | admins.outlet_id exists as an indexed unsigned integer. |
| 20260720100000 | Both payroll tables exist. The unique month/outlet pair is absent. Defer HR repair. |
| 20260723000000 | Coupons and both coupon columns on bills exist. |
| 20260724000000 | The intermediate payment-method enum has been superseded by the later varchar definition. Replaying this migration would narrow the accepted values. |
| 20260726000000 | Customers exist. The phone index is absent. |
| 20260726000001 | Appointments exist. The composite outlet/date index is absent. |
| 20260728000000 | Both bill payment method and status use varchar(50). |
| 20261029000000 | Admin role is varchar(50), role permissions are JSON and staff user_id is indexed. Historical permission backfill requires separate verification. |
| 20261029000001 | Staff access_role exists. |
| 20261029000002 | Both contract configuration JSON columns and both period columns exist. |
| 20261029000003 | Previous contract, original end date and terms snapshot columns exist. |
| 20261029000004 | Contract document metadata exists as JSON. |
| 20261029000005 | Payroll present_days and absent_days are unsigned integers. The migration specifies decimal(5,1). Defer HR repair. |

The next foundation change should provide an explicit MySQL bootstrap and matching upgrade path, exercised on a third, initially empty database and a legacy restore. Include the customer phone and appointment outlet/date lookup indexes in the reviewed target schema, accounting for tenant scoping as those domains migrate. Compare columns, defaults, constraints and indexes for in-scope tables, and reconcile business totals after upgrade. Keep the HR differences recorded for a later HR session. Preserve the legacy ledger as observed.

## Clean install, upgrade and startup results

The local MySQL rehearsal now uses `npm run db:saas:setup` with explicit `install` and `upgrade` paths. Installation uses a schema-only checkpoint of the verified legacy DDL. Upgrade retains the legacy migration ledger, applies outlet ownership and adds the missing customer and appointment indexes. Both paths then add the membership table. The two paths produced matching definitions across 60 tables after normalizing auto-increment counters. The upgrade preserved the saved legacy row counts and business aggregates. Both setup paths were rerun.

The SaaS API uses `npm run start:saas` and expects an explicitly prepared schema. Two real startup and shutdown cycles preserved every table's definition and data checksum. The old startup refuses a MySQL database carrying the SaaS migration ledger. This rehearsal used MySQL 9.6. The target production engine and release still require verification.

Workspace HTTP tests used two synthetic organizations, an owner with both memberships, a single-outlet member and an authenticator challenge. They passed for incorrect token audience, foreign outlet lookup, workspace switching, membership revocation and closure of an unported business route. The SaaS frontend build passed. Interactive browser testing, membership management and write workflows remain outstanding.

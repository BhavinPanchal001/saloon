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

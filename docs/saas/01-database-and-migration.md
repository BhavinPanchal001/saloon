# 01 · Database and migration

Read [the execution contract](README.md) first. Prerequisites: —.

## Current implementation

SQL Server dispatches to additive setup, while other dialects run sequelize-cli. Startup performs schema repairs and data updates.

[server.js](../../backend/src/server.js) · [migrate.js](../../backend/scripts/migrate.js) · [sqlServerSchema.js](../../backend/src/services/sqlServerSchema.js) · [db.js](../../backend/src/models/db.js)

## Additional entry points

[setup-sqlserver.js](../../backend/scripts/setup-sqlserver.js) · [check-sqlserver.js](../../backend/scripts/check-sqlserver.js)

## Implementation sequence

1. Inventory the deployed dialect, schema, indexes, jobs and orphan rows against a restored copy.
2. Publish the table ownership map including direct owners, inherited children, global identity, and deferred HR.
3. Add organizations, reserve the Glowy ID, and introduce nullable ownership columns before dual writing.
4. Backfill in restartable batches with checkpoints.
5. After reconciliation add scoped indexes, non-null ownership and same-organization foreign keys where supported.
6. Give each later brief its own domain migration.

## Acceptance scenario

Run on empty and restored databases, interrupt and resume a batch, run twice and restore from backup. Publish per-table counts, orphan counts, bill totals, outstanding balances and lot quantities before and after.

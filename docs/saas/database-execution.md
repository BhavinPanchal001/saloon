# Database execution runbook for the SaaS conversion

Use this runbook with the [module dependency table](README.md). The deliverable for the first session is a verified development restore and a reproducible baseline. Production deployment is a later operation. Database names below are examples to replace with verified targets.

| Code checkout | Database | Who writes |
|---|---|---|
| Existing salon checkout on main | Its existing configured target | Existing application and operators |
| saas/foundation | glowy_salon_saas_dev, restored from an approved backup | Foundation session |
| Module branch from integrated prerequisites | Dedicated clone such as glowy_salon_saas_07, plus its own disposable test database | One module session |
| Integrated release candidate | Separate staging restore | One migration runner per release |
| Production release | Explicitly identified deployment database | Designated release runner during cutover |

## 1. Prepare the first development session

1. Open the saloon-saas worktree and verify the current branch with `git status --short --branch`. Record its commit and the version of the application that produced the backup. Compare that version and pending main-branch migrations with the baseline before assigning SaaS migration IDs.
2. Confirm the running salon’s database engine, version and schema from the operator or deployment configuration. Restore a backup under the dedicated development name on a compatible host. The SQL Server configuration defaults to Windows LocalDB and trusted authentication; use an environment with the configured driver and identity when testing that path. Confirm the development identity can access only its intended databases. Keep backup files and credentials outside Git.
3. Configure the worktree’s own backend/.env with explicit DB_DIALECT, DB_HOST, DB_NAME, DB_TEST_NAME, PORT and a development JWT_SECRET. Choose unused API and UI ports and point both admin and booking clients to this API. Isolate uploads, provider sessions and outbound delivery from the original installation. Use local test destinations.
4. Before invoking setup, migrations, tests or the API, verify the effective environment including shell overrides. Through the same driver, identity and connection configuration as the backend, run a read-only identity query. For SQL Server use `SELECT @@SERVERNAME AS server_name, DB_NAME() AS database_name`. For MySQL use `SELECT @@hostname AS server_name, @@port AS server_port, DATABASE() AS database_name`. Compare the result with the expected server and database; repeat for the test configuration. Stop on any mismatch. The existing check-sqlserver script performs transactional writes, and server startup also initializes schema.
5. Capture baseline schema, migration history, table counts, orphan relationships, stock quantities by location, bill and settlement totals by outlet, and open customer balances. Record backup identifier, restore duration and any legacy discrepancies. Confirm a second restore produces the same baseline.

**Exit evidence** includes the source and target versions, verified database identities, baseline comparison and restore result. If a backup or compatible host is unavailable, record that dependency and proceed only with schema inventory or synthetic-fixture work. Label real-data rehearsal pending.

## 2. Establish the migration mechanism and tenant foundation

The foundation owner inventories the actual SQL Server setup and Sequelize CLI paths and selects the implementation matching the verified deployment dialect. Add an explicit migration command with target verification, an applied-migration ledger and serialization against concurrent runs. Migrate required startup initialization into versioned steps before enabling the SaaS server. Test that normal startup against an up-to-date schema leaves business data and schema unchanged and fails clearly on an incompatible schema.

Implement the [foundation brief](01-database-and-migration.md) in stages. First create organizations and an idempotent Glowy organization record. Add nullable organization ownership to the first agreed tables, beginning with outlets. Deploy compatible writers before backfilling. Derive ownership through known relationships, checkpoint batches, and report ambiguous rows for resolution. Verify no missing or inconsistent ownership before enforcing required columns and scoped uniqueness. Later briefs repeat these stages for their tables. Preserve legacy identities, financial history and deferred HR data.

**Exit evidence** includes ordered migration IDs, table ownership manifest, before/after reconciliation, a clean install, an upgraded restore, an interrupted/resumed backfill and a second migration run with no additional changes.

## 3. Execute a module in a separate session

1. Select a ready brief from the dependency table. Branch from the integrated SaaS commit containing its prerequisites. For example, after session 04 merges, create the inventory worktree with `git worktree add -b saas/07-inventory ../saloon-saas-07 saas/foundation` from the SaaS checkout.
2. Clone the matching baseline to the module database and repeat target verification for both development and tests. Give parallel sessions distinct ports, assets and local provider state. Reserve migration IDs with the foundation owner and document dependencies on another module’s schema.
3. Implement schema, backfill, scoped writes/reads and the UI path described in the brief. Run its acceptance scenario with two organizations and an outlet-restricted user. Include a denied cross-organization operation and verify both datasets afterwards. Keep deferred HR endpoints closed.
4. Hand back the branch and commit, starting schema version, migration IDs, target aliases, commands, reconciliation evidence and outstanding dependencies. Merge completed prerequisites into saas/foundation in the published order. Resolve migration ordering there before integration testing. Keep applied migrations immutable.

## 4. Rehearse the merged release on staging

Restore a fresh staging copy from a representative backup. Apply all migrations once from the exact release commit with a single runner, measure duration and rerun to verify the ledger. Compare staging totals to that restore’s own baseline. Exercise booking, checkout, inventory, customer settlement, receipts and reports in two salons, including the same phone and barcode in both. Verify private files, socket events, scope of all-outlets reports and deferred HR boundaries. Drill backup restoration and record the acceptable write pause with the operator. A failed isolation check or an unexplained reconciliation difference blocks promotion.

## 5. Cut over and recover

Record the approved release commit, migration list, operator, verified production target, tested backup and recovery point. Pause affected writes and jobs for the final reconciliation and take the cutover backup. Apply the rehearsed sequence, check migration history, reconcile totals, deploy the matching API and clients, then run a controlled smoke test before reopening writes. Watch migration errors, denied requests, booking failures, POS retries and financial discrepancies during the pilot.

If verification fails while writes are paused, keep them paused and revert to the rehearsed compatible release and recovery point. If new sales or bookings have been accepted, preserve the database and transaction history, identify those writes, then forward-fix or reconcile and replay them under operator control. SQL Server’s current setup has no automatic undo. Record actual recovery and reconciliation evidence before resuming traffic.

## First-session prompt

> Open the saloon-saas worktree on saas/foundation. Execute step 1 of docs/saas/database-execution.md against a dedicated development restore. Verify both targets read-only, capture the baseline and record any missing inputs. Use the verified evidence to begin brief 01. Leave production and HR management out of this session.

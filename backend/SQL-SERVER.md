This backend uses Microsoft SQL Server LocalDB with Windows authentication.

The configured instance is `(localdb)\MSSQLLocalDB`, database `glowy_salon2`,
using Microsoft ODBC Driver 17 for SQL Server and `msnodesqlv8`'s Sequelize 6 adapter.
Run Node under the same Windows account that owns the LocalDB instance in SSMS.
LocalDB does not require the separate MSSQLSERVER service or XAMPP.

From the backend directory in PowerShell:

```powershell
npm.cmd install
npm.cmd run db:setup:sqlserver
npm.cmd run dev
```

On a new empty database, choose an initial administrator and optionally seed unit masters:

```powershell
npm.cmd run db:admin
npm.cmd run db:setup:sqlserver -- --seed-units
```

The admin command asks for your name/email and generates a strong password.
It refuses to create another administrator if an account already exists.
Existing unit masters are preserved when seeding units.

Check database operations and API connectivity with `node scripts/check-sqlserver.js`.
Test records are rolled back.

Database settings are in `backend/.env`; SQL username/password and TCP port are unused
for this LocalDB Windows authentication connection. Refresh Tables in SSMS after setup.

`db:migrate` uses the current model definitions for SQL Server. Historical migrations
and the root `.sql` dumps target MySQL and must not be imported into SQL Server.
Setup creates missing tables, columns, indexes, and foreign keys; it does not drop
tables or rewrite existing column types. The setup command itself does not copy XAMPP data.
Foreign keys use NO ACTION to avoid SQL Server's multiple cascade path restriction;
delete dependent records before their parent records.

JSON fields are stored as NVARCHAR(MAX) and serialized/deserialized by the models.
For MySQL rollback, restore your original DB settings and set `DB_DIALECT=mysql`.

The XAMPP application databases were copied on 31 October 2026:

| Database | Tables | Rows |
| --- | ---: | ---: |
| glowy_salon2 | 58 | 269 |
| glowy_saloon | 56 | 104 |
| cafe_db | 2 | 6 |

All source column values were compared against the copied rows before each database
transaction committed. IDs, password hashes, migration history, extra tables, source
indexes and relationships were retained. SQL Server uses compatible column types;
foreign key cascades use NO ACTION. The backend still connects to `glowy_salon2`.
Use your existing application login; do not create another initial administrator.

Source snapshots, destination SQL Server backups, and the per-table verification
report are saved under `.local-db-recovery/sqlserver-transfer-2026-10-31T07-39-07-468Z/`.
XAMPP databases were read without modification. MySQL internal/system databases
and phpMyAdmin configuration were excluded.

For another transfer, `node scripts/copy-xampp-to-sqlserver.js` only exports snapshots.
Adding `--apply` backs up the destination databases and **replaces their rows** with
the source data. Do not reimport after making new SQL Server changes unless you
intend to replace those changes. Source connection overrides are `MYSQL_SOURCE_HOST`,
`MYSQL_SOURCE_PORT`, `MYSQL_SOURCE_USER` and `MYSQL_SOURCE_PASSWORD`.

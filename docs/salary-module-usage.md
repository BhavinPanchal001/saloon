# Salary and payroll

Administrators first open **Settings → Salary Settings** (`/settings?tab=salary`), answer the calculation-rule questions and save the shared policy. The policy applies to all employees and outlets. Then open **HR → Salary & Payroll** (`/payroll`), select a month, optionally filter by outlet or employee, select employees and run a calculation. The backend loads the shared policy automatically; per-employee requests cannot override it. Individual earnings, rates, schedules and leave entitlements continue to come from each employee's contract.

## Calculation details

The page shows effective contract segments, attendance/day counts, hours, individual earning and deduction formulas, net salary, a daily calendar and an expandable daily calculation table. Currency follows the existing application's RM display. Source terms are read from the historical contract snapshot. Missing terms are displayed as issues instead of being substituted from current master data.

- Calendar divisor distributes each monthly component over calendar days covered by its contract; weekly offs and holidays have paid factor 1.
- Working-day divisor distributes monthly components over that contract schedule's working days in the month; weekly offs and holidays are excluded from the divisor and do not earn a second daily amount.
- Attendance-status method uses present = 1 and half day = 0.5. Worked-hours method uses verified worked minutes after recorded breaks divided by scheduled minutes after the contract break allowance, capped at 1. Missing or invalid punches require review.
- Percentage earnings use fixed BASIC salary. Percentage deductions use attendance-adjusted basic or gross contract earnings according to the administrator's selection. Contract percentage deductions do not apply to manual earning adjustments. Fixed deductions use the salary divisor or calendar proration as selected. Values are accumulated with decimal arithmetic, then each displayed component is rounded to two decimals using half-up rounding; the final totals sum those rounded components. Daily rounded amounts are explanatory and can differ from the aggregated component by rounding cents.
- Pending, rejected and cancelled requests do not become approved paid leave. Approved leave must agree with contract allocation and attendance. Legacy unlinked paid-leave attendance, unresolved pending leave and half-day leave needing reconciliation are finalization blockers.
- Verified extra earnings/deductions can be entered as adjustments with a reason. No statutory rates, commission, loan balance or overtime hours are invented. Contracts enabling overtime require reconciliation of approved inputs before finalization; an automatic overtime engine is not included in this release.

## Drafts and finalization

Save draft persists the calculation even if it has review issues. Drafts reopened later must be refreshed before saving again. Source changes, shared policy changes and simultaneous draft edits are detected. A settings change invalidates earlier previews and requires recalculation with the latest shared rules. Finalization requires a completed month and no calculation issues. Finalized results retain their historical policy and amounts; an automatic reversal/payment workflow is not included. Attendance edits and leave approval for a finalized employee/month are rejected. Finalization does not transfer money or create a paid status.

The new `salary_calculations` table stores one employee/month result, its revision, rule selections, calculations, original source snapshots, source hash, actor and timestamps. Old payroll migrations describe a different summary schema that is not used by the current application; this release keeps those tables untouched. Migration `20261119000000-create-salary-calculations.js` is additive and runs at startup; `node scripts/prepare-salary-schema.cjs` can prepare only this table independently.

`salary_settings` stores the shared policy in singleton row ID 1, with revision, last updating administrator and timestamps. Migration `20261119000001-create-salary-settings.js` creates the table; it is also included in the startup and schema preparation helper. No default choices or existing per-employee policies are silently promoted to the shared policy. Admins must save the initial settings explicitly.

## Verification

- `node --test tests/salary-calculation.test.cjs tests/leaveValidation.test.js tests/leaveCancellation.test.js` from `backend` runs calculation and leave unit tests.
- `node tests/salary-api.integration.cjs` from `backend` runs real SQL Server API checks using temporary employee/contract/attendance and isolated settings fixtures and cleans up its records. It checks authentication, roles, settings persistence and validation, shared policy enforcement, settings changes, draft persistence, simultaneous saves, stale revisions, changed source data, finalization, historical policy preservation, final attendance locks and read-only October sample preview. It does not alter the shared row ID 1. Run only against a development database with the schema prepared.
- Frontend production build was checked using a temporary output directory. An automated browser visual check was unavailable in this environment.

Demo saddd's October 2026 records are labelled sample data. They may be previewed or saved as a draft, but the module blocks finalization of these records. The preview's selected rules are illustrative; no real salary or payment for this employee was finalized during implementation.

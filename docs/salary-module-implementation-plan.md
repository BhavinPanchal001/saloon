# Salary Module Implementation Plan

**Status:** Core overview, calculation details, explicit calculation settings, drafts, finalization checks and source snapshots are implemented. See [usage and calculation rules](salary-module-usage.md) for the delivered scope and verification. Automated statutory tax, overtime, commission and payment processing remain outside the delivered calculation engine; these require verified inputs and agreed policies.

## Objective

Create an administrator salary calculation page that explains each employee's earnings, deductions and net payable for a selected month using that employee's effective contract, attendance, approved leave and applicable holidays. Calculations must be repeatable, reviewable and based on explicit business rules. Persist an auditable payroll history without changing existing attendance, contracts, leave or payment data.

## Findings in the existing project

- `contracts` stores effective dates, shift, work week, leave and holiday configuration, overtime settings and `terms_snapshot`. `contractTimeline.contractForDate` resolves an active contract by date and detects overlaps. Employee contracts can change during a month.
- Some existing contract snapshots include salary components, while `snapshotTerms` and the startup freeze service shown in the current code capture only shift and work week. Salary terms and percentage bases cannot be assumed to exist in every historical snapshot; investigate the source and quality of each employee's stored terms before calculating. Never silently reconstruct historical salary using today's master values.
- Migrations describe `salary_component_masters`, `contract_salary_mappings`, `processed_payrolls` and `processed_payroll_details`, but their presence and current schema must be checked on the configured database. The recent local database inspection did not find payroll tables. There is no complete payroll calculation route or salary page in the current application.
- `attendances` stores one status per employee/date, punches and breaks. Approved leave may produce `paid_leave`, `absent` or `half_day`; attendance alone does not reliably identify the leave type. Pending, rejected and cancelled leave must never be counted as approved. Existing historical paid-leave attendance without a linked request needs explicit reconciliation rather than an assumed type.
- Contract leave can require a supporting document, and paid half-day leave is currently blocked because attendance/payroll representation is incomplete. These limitations must be resolved before claiming full coverage.
- The commission master page exists, but its calculation inputs and persistence need verification before including commission in payroll. Overtime has contract settings, but payroll eligibility, approved hours and calculation rules are not yet established.
- Employee Demo saddd has explicitly generated **sample** attendance for October 2026. This is test data, not actual payroll evidence. October spans two contracts; the earlier contract has no saved leave/holiday configuration, and the revised contract starts on 30 October. The sample leave request is pending. Re-read current data during implementation; do not assume the request's status remains unchanged.
- The application supports SQL Server and MySQL. The configured SQL Server connection previously failed inside the sandbox but connected for read operations outside it; validate database behavior in the actual target environment. Existing SQL Server initialization and migrations need special care, especially numeric precision and existing data.

## Decisions required before finalizing calculations

Obtain the business owner's approved policy, in writing or through configured fields. Do not invent rates, tax law, percentage bases or statutory deductions.

1. **Pay period and currency:** monthly period, applicable timezone/currency, join/exit dates and pay-cycle boundaries.
2. **Proration and rounding:** calendar-day versus scheduled-working-day versus another divisor; contract revisions during a month; rounding mode and precision; treatment of partial months and partial days.
3. **Salary components:** which fixed and percentage earnings/deductions apply, their percentage bases and order, proration, effective dates, and how to handle missing or conflicting terms. Distinguish employee deductions from employer contributions.
4. **Attendance:** treatment of absence, unmarked past days, weekly offs, holidays, late arrivals, early departures, unpaid breaks, half-days and incomplete or overlapping punches. Decide whether short hours trigger a deduction, half-day status, approval or no automatic deduction.
5. **Leave:** paid/unpaid leave, half-day treatment, approved leave with existing attendance, pending requests, balances, and reconciliation of historical attendance with no request or leave type.
6. **Overtime and commission:** eligibility, approved source records, rates, caps, treatment of reversals/refunds and whether each is included in percentage-based components. Keep these disabled or flagged as unresolved until inputs and rules are approved.
7. **Tax and statutory deductions:** jurisdiction, exemptions, effective dates, employee-specific inputs and the authoritative source for rates. Do not treat a generic percentage component as legally correct tax.
8. **Workflow and corrections:** who may view, adjust, approve, finalize, reopen or reverse payroll; whether finalization and payment are in scope; how already-paid periods and late changes are corrected.

Until these decisions are resolved, an administrator can review inputs and a calculation preview, but a period containing unresolved rules or inputs must not be presented as a finalized or payable salary.

## Proposed calculation design

1. Select employee, outlet and month. Resolve the contract in effect for every date; split the month into effective contract segments. Flag gaps, overlapping contracts and missing salary snapshots for review instead of guessing. Preserve the exact snapshot, source identifiers and rule version used in the calculation.
2. Build a daily ledger from the effective work week, contract holidays, attendance records, punches and approved leave. Identify present, half-day, absent, unmarked, weekly off, holiday, paid leave and unpaid leave separately. Keep hours and day fractions explicit; avoid counting the same date twice. Display unresolved conflicts, pending leave and legacy untyped attendance.
3. Compute eligible scheduled time and payable units according to the approved policy. Split any monthly component across contract segments using the agreed divisor; define how weekly offs and holidays are paid before choosing a formula. A pending leave request must not be counted as approved leave.
4. Calculate contract earnings, approved overtime, verified commission and authorized adjustments. Calculate deductions in the approved order and on their configured bases, including approved absence/unpaid-leave deductions and separately configured statutory deductions. Prevent double deductions for the same absence and prohibit unsupported or circular percentage dependencies.
5. Use decimal arithmetic (`decimal.js` is already available), explicit rounding rules and stored precision. Display each component's basis, units, rate, amount, source and explanation. Gross earnings minus employee deductions gives net payable; show employer contributions separately if supported. Validate every amount and reject invalid or ambiguous input.
6. Treat calculation as a preview until reviewed. On finalization, transactionally save an immutable copy of the inputs, dates, source versions, formulas, line items and totals. Detect changes since preview and require recalculation. Ensure repeated submissions cannot create duplicate finalized payroll for the same employee and period.
7. If finalized records need correction, use an audited adjustment or reversal workflow; do not silently recalculate history after a contract, attendance, leave or master-data edit. Do not mark salary as paid or create financial transactions without a separately authorized payment workflow.

## Data and API work

- Inspect existing migrations, actual SQL Server/MySQL schema and any data before choosing migrations. Reuse existing payroll tables only where their keys, precision, lifecycle and history model support the requirements; add migrations and models for missing payroll runs, employee results, calculation lines and immutable snapshots where needed.
- Capture contract ID/version and effective period, attendance and leave references, policy/version, decimal amounts, actor and timestamps. Add indexes and uniqueness constraints for the selected payroll scope. Define explicit behavior for nullable outlets and fractional days; verify on both supported dialects.
- Provide authenticated endpoints for preview, listing runs, viewing employee breakdowns, saving drafts, finalizing and audited correction. Enforce administrator/payroll permissions on the server; personal payslip access, if added, must be restricted to the linked employee. Avoid relying on the existing broad `requireAdmin` account-type check for business authority.
- Calculate on the backend; frontend totals are display-only. Validate employee IDs, month, contract coverage, line items, authorization and state transitions. Use transactions and concurrency protection for finalization. Never expose bank details or salary information to unrelated staff.
- Add migration/backfill and rollback plans. Never fabricate historical contracts or map old attendance to a leave type automatically. Record unresolved historical items for administrator review.

## Salary calculation page

- Admin navigation entry and a monthly overview with month/outlet selection, employee search, contract status, payroll status and totals; restrict access to authorized users.
- Employee breakdown showing effective contract segments, shift/work week, attendance and leave summary, holidays, payable units, unresolved items, earnings, deductions, any approved adjustments, gross and net. Each line should explain its source and formula.
- Show missing or conflicting contract terms, pending leave, incomplete punches, historical untyped leave and unsupported components clearly. Do not label a preview as final or paid.
- Provide explicit preview/recalculate and authorized review/finalize actions, with confirmation that shows the period and amount. Include export or payslip only after visibility and privacy requirements are agreed. Retain the existing attendance and contract screens.

## Implementation phases

1. **Confirm rules and inventory:** approve the decisions above, inspect actual database schema and salary snapshot completeness, and document the chosen formulas with worked examples.
2. **Repair required source data:** preserve effective salary terms, address paid half-day leave and supporting documents where needed, add explicit historical reconciliation, and define approved overtime/commission sources. Do not backfill by guesswork.
3. **Calculation engine:** implement a pure, versioned backend calculation service, daily ledger and validation. Add migrations and appropriate models for snapshots and payroll results.
4. **Workflow and UI:** implement authorized preview, review, finalization and correction endpoints, then build the monthly summary and employee breakdown pages using existing UI patterns.
5. **Verification and rollout:** test with isolated fixtures and the October sample as test data only; validate formulas with the business owner, perform a dry run, compare results with a manually checked example, and deploy migrations with a backup and recovery plan.

## Testing and acceptance

- Unit tests for each agreed earning/deduction formula, decimal rounding, percentage base, half-day, unpaid/paid leave, holiday, weekly off, missing punch, early departure, overtime and proration rule.
- Contract timeline tests for mid-month revisions, start/end dates, gaps, overlaps and immutable historical snapshots. Include Demo saddd's October 2026 contract change as a fixture; do not treat the seeded sample as actual wages.
- Integration tests on an isolated database for preview versus finalization, role restrictions, pending/rejected/cancelled leave, cancellation after finalization, concurrent finalization, duplicate prevention, transaction rollback and auditable corrections. Verify SQL Server and MySQL schema behavior where supported.
- UI tests for filtering, line-item explanations, unresolved input warnings, permission errors and finalization state. Run the frontend build and relevant backend tests.
- Acceptance requires a manually verified, policy-approved example, correct totals and source traceability, unchanged existing production records, and explicit sign-off before payroll is finalized or payments are made.

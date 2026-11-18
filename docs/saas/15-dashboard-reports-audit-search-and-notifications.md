# 15 · Dashboard, reports, audit, search and notifications

Read [the execution contract](README.md) first. Prerequisites: 04–11.

## Current implementation

All-outlet reports aggregate many tables; search includes staff and dashboard counts staff. Notification bulk operations and audit entity lookups need independent scopes.

[dashboard.js](../../backend/src/routes/dashboard.js) · [reports.js](../../backend/src/routes/reports.js) · [auditLogRoutes.js](../../backend/src/routes/auditLogRoutes.js) · [search.js](../../backend/src/routes/search.js) · [notifications.js](../../backend/src/routes/notifications.js) · [reportController.js](../../backend/src/controllers/reportController.js) · [searchController.js](../../backend/src/controllers/searchController.js) · [notificationController.js](../../backend/src/controllers/notificationController.js) · [profitReportService.js](../../backend/src/services/profitReportService.js) · [auditService.js](../../backend/src/services/auditService.js)

## Additional entry points

[GlobalDashboardPage.jsx](../../src/pages/dashboard/GlobalDashboardPage.jsx) · [ReportsPage.jsx](../../src/pages/reports/ReportsPage.jsx) · [NotificationsPage.jsx](../../src/pages/notifications/NotificationsPage.jsx) · [searchStore.js](../../src/stores/searchStore.js) · [auditRegression.test.js](../../backend/tests/auditRegression.test.js)

## Implementation sequence

1. Make all-outlet mean authorized outlets of the current business.
2. Pass context to every aggregate, raw query, CSV and PDF.
3. Apply permissions before search and counts.
4. Suppress deferred HR categories and attendance exports.
5. Include tenant and actor on audit events and scope bulk notification actions by audience.
6. Update shared search cache.

## Acceptance scenario

Seed distinguishable sales, costs and messages. Compare dashboard, CSV, PDF and drilldowns to each tenant’s ledger; test empty filters, restricted outlets, entity history and clear-all.

## Existing route inventory

`GET /api/dashboard/summary`

`GET /api/reports/shift-end` `GET /api/reports/profit-loss` `GET /api/reports/customer-credit` `GET /api/reports/gst` `GET /api/reports/top-selling` `GET /api/reports/stock-summary` `GET /api/reports/low-stock` `GET /api/reports/purchase-orders` `GET /api/reports/employee-attendance` `GET /api/reports/gstr2` `GET /api/reports/export-csv` `GET /api/reports/export-pdf`

`GET /api/audit-logs` `GET /api/audit-logs/entity/:entityType/:entityId` `GET /api/audit-logs/summary` `GET /api/audit-logs/stock-movements`

`GET /api/search`

`GET /api/notifications` `PATCH /api/notifications/read-all` `PATCH /api/notifications/:id/read` `DELETE /api/notifications/clear-all` `DELETE /api/notifications/:id`

Notification access currently returns an empty filter for some admin roles. Apply the organization predicate even to read-all, clear-all and unread counts. Test a tenant admin with no assigned outlet.

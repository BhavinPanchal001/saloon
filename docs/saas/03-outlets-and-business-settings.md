# 03 · Outlets and business settings

Read [the execution contract](README.md) first. Prerequisites: 02.

## Current implementation

Outlet code is unique globally and business settings read a single JSON file. Outlet detail also computes financial summaries.

[outlets.js](../../backend/src/routes/outlets.js) · [businessSettingsRoutes.js](../../backend/src/routes/businessSettingsRoutes.js) · [outletController.js](../../backend/src/controllers/outletController.js) · [businessSettingsController.js](../../backend/src/controllers/businessSettingsController.js) · [companyInfo.js](../../src/utils/companyInfo.js)

## Additional entry points

[OutletsPage.jsx](../../src/pages/outlets/OutletsPage.jsx) · [BusinessInfoTab.jsx](../../src/pages/settings/BusinessInfoTab.jsx)

## Implementation sequence

1. Assign outlets to organizations and scope code uniqueness.
2. Import existing branding, currency and contact settings for Glowy only.
3. Expose public branding separately from admin settings.
4. Scope logo writes and all receipt/PDF settings consumers.
5. Coordinate the outlet financial-summary query with finance and reporting owners before enabling it.

## Acceptance scenario

Give both businesses outlet MAIN and different logos. Rename one and verify the other’s outlet, booking page and receipt.

## Existing route inventory

`GET /api/outlets` `GET /api/outlets/:id/financial-summary` `GET /api/outlets/:id` `POST /api/outlets` `PUT /api/outlets/:id` `PATCH /api/outlets/:id/toggle-status` `DELETE /api/outlets/:id`

`GET /api/business-settings` `PUT /api/business-settings` `GET /api/business-settings/appointments` `PUT /api/business-settings/appointments` `POST /api/business-settings/logo`

The shared API client caches business info and settings in unqualified localStorage keys. Namespace or invalidate both on account change, including offline fallback. Verify a signed-out device never shows the prior salon’s logo.

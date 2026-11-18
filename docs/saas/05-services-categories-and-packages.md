# 05 · Services, categories and packages

Read [the execution contract](README.md) first. Prerequisites: 03, 04.

## Current implementation

Packages expand service items and outlet-specific pricing. Assigned outlet IDs also occur in service data.

[services.js](../../backend/src/routes/services.js) · [serviceCategories.js](../../backend/src/routes/serviceCategories.js) · [packages.js](../../backend/src/routes/packages.js) · [serviceController.js](../../backend/src/controllers/serviceController.js) · [packageController.js](../../backend/src/controllers/packageController.js) · [PackageService.js](../../backend/src/models/PackageService.js)

## Additional entry points

[ServiceFormPage.tsx](../../src/modules/services/pages/ServiceFormPage.tsx) · [ServiceCategoryMasterPage.tsx](../../src/modules/services/pages/ServiceCategoryMasterPage.tsx) · [PackageFormPage.jsx](../../src/modules/packages/pages/PackageFormPage.jsx)

## Implementation sequence

1. Scope categories, services, packages, joins, media and outlet prices.
2. Validate every item and assigned outlet on bulk replacement; inventory product references used for service consumption depend on 04.
3. Move unique category and package identifiers to organization scope.

## Acceptance scenario

Use duplicate package codes and category names across workspaces. Try a mixed-workspace package save and verify no partial item or price changes.

## Existing route inventory

`GET /api/services` `GET /api/services/:id` `POST /api/services` `PUT /api/services/:id` `DELETE /api/services/:id`

`GET /api/service-categories` `POST /api/service-categories` `PUT /api/service-categories/:id` `DELETE /api/service-categories/:id`

`GET /api/packages` `GET /api/packages/:id` `POST /api/packages` `PUT /api/packages/:id` `PATCH /api/packages/:id/toggle-status` `DELETE /api/packages/:id`

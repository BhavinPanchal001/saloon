# 02 · Identity, users and app shell

Read [the execution contract](README.md) first. Prerequisites: 01.

## Current implementation

Login, OTP and current-user paths carry account and outlet context. Account access also consults Staff and Role. Admin email is globally unique.

[auth.js](../../backend/src/routes/auth.js) · [users.js](../../backend/src/routes/users.js) · [auth.js](../../backend/src/middleware/auth.js) · [authController.js](../../backend/src/controllers/authController.js) · [userController.js](../../backend/src/controllers/userController.js) · [authStore.js](../../src/stores/authStore.js) · [api.js](../../src/services/api.js) · [AppRouter.jsx](../../src/router/AppRouter.jsx)

## Additional entry points

[UserManagementPage.jsx](../../src/pages/users/UserManagementPage.jsx) · [AppLayout.jsx](../../src/layouts/AppLayout.jsx) · [OTPVerificationPage.jsx](../../src/pages/auth/OTPVerificationPage.jsx)

## Implementation sequence

1. Keep global login identity and add organization memberships, scoped permissions and permitted outlets.
2. Resolve membership server-side on login, OTP completion, workspace switch and protected requests.
3. Distinguish staff, customer and platform token audiences.
4. Invite, disable and remove memberships independently.
5. Reset cached data and in-flight responses on switch.
6. Own the API route allowlist and common request context.
7. Define a minimal organization-owned bookable talent projection or mapping for legacy staff IDs with display name and allowed outlets.

## Acceptance scenario

Use one owner with two memberships, an outlet-limited cashier, a revoked member and a portal user. Verify correct workspace selection, outlet enforcement, denial after revocation, and cache clearing.

## Existing route inventory

`POST /api/auth/login` `POST /api/auth/verify-otp` `POST /api/auth/resend-otp` `GET /api/auth/me` `POST /api/auth/totp/setup` `POST /api/auth/totp/confirm` `POST /api/auth/totp/disable`

`GET /api/users` `GET /api/users/:id` `POST /api/users` `PUT /api/users/:id` `PATCH /api/users/:id/toggle-status` `DELETE /api/users/:id`

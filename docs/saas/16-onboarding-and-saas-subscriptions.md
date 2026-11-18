# 16 · Onboarding and SaaS subscriptions

Read [the execution contract](README.md) first. Prerequisites: 02,03; pilot after 15.

## Current implementation

The mounted auth router covers login and OTP. Merchant payments already represent salon business transactions.

[RegisterPage.jsx](../../src/pages/auth/RegisterPage.jsx) · [authController.js](../../backend/src/controllers/authController.js) · [index.js](../../backend/src/routes/index.js)

## Additional entry points

[RegisterPage.jsx](../../src/pages/auth/RegisterPage.jsx) · [auth.js](../../backend/src/routes/auth.js)

## Implementation sequence

1. Build idempotent provisioning for organization, owner membership, first outlet, settings and trial.
2. Start with manual activation in pilot.
3. Define pricing unit, grace period and cancellation policy with product owner before implementing billing.
4. Add separate platform plan/subscription records, verified idempotent webhook processing and server-side entitlement limits.
5. Restrict platform operations to an audited platform role.

## Acceptance scenario

Retry signup and webhook delivery, replay out-of-order events, retry a failed renewal, cancel/reactivate, and verify existing salon payments and historical data reconcile.

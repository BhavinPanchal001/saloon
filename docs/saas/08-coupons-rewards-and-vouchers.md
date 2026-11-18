# 08 · Coupons, rewards and vouchers

Read [the execution contract](README.md) first. Prerequisites: 06.

## Current implementation

Voucher award helpers and reward rule lookups are called outside the settings screens. Reward keys, tier names and codes have global uniqueness.

[couponRoutes.js](../../backend/src/routes/couponRoutes.js) · [rewardRoutes.js](../../backend/src/routes/rewardRoutes.js) · [voucherRoutes.js](../../backend/src/routes/voucherRoutes.js) · [couponController.js](../../backend/src/controllers/couponController.js) · [voucherController.js](../../backend/src/controllers/voucherController.js) · [rewardService.js](../../backend/src/services/rewardService.js)

## Additional entry points

[VoucherManagementPage.jsx](../../src/pages/vouchers/VoucherManagementPage.jsx) · [RewardSettingsTab.jsx](../../src/pages/settings/RewardSettingsTab.jsx) · [CouponManagementPage.jsx](../../src/pages/coupons/CouponManagementPage.jsx)

## Implementation sequence

1. Scope settings, tier defaults, coupon validation, voucher issuance, redemption, reversal and points history.
2. Pass organization and transaction into checkout helpers.
3. Validate customer, bill and outlet ownership on each award.
4. Seed defaults once per organization.

## Acceptance scenario

Reuse a coupon code across tenants with different values. Exercise concurrent redemption and sale retries; assert a single award/debit and tenant-correct history.

## Existing route inventory

`GET /api/coupons` `POST /api/coupons` `PUT /api/coupons/:id` `DELETE /api/coupons/:id` `POST /api/coupons/validate`

`GET /api/rewards/settings` `PUT /api/rewards/settings` `GET /api/rewards/tiers` `POST /api/rewards/tiers` `PUT /api/rewards/tiers/:id` `DELETE /api/rewards/tiers/:id` `GET /api/rewards/customers/:customerId/history` `POST /api/rewards/customers/:customerId/adjust`

`POST /api/vouchers/validate` `GET /api/vouchers` `GET /api/vouchers/redemptions` `GET /api/vouchers/customer/:customerId` `GET /api/vouchers/reward-rules` `PUT /api/vouchers/reward-rules` `POST /api/vouchers` `PUT /api/vouchers/:id` `DELETE /api/vouchers/:id` `POST /api/vouchers/:id/cancel` `POST /api/vouchers/:id/send-whatsapp`

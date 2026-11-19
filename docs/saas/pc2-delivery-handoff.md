# PC 2 delivery and booking handoff

Branch `saas/pc2-booking-delivery` builds on the published `saas/foundation` commit `596ca30`. The current slice uses the existing workspace and outlet schema. It adds no migration IDs.

## Delivery interfaces

- Mount `createAttachmentRouter(delivery)` under `/api/delivery`. `POST /outlets/:outletId/attachments` accepts up to 5 MiB of `application/octet-stream` and returns an attachment ID. `GET /outlets/:outletId/attachments/:id` returns a private download. Use an absolute storage root outside the public asset tree. Purchase order wiring still needs procurement's tenant-scoped order access and file reference contract.
- Mount `createMessagingRouter(sessions)` under `/api/messaging`. The workspace owner can call `POST /connect`, `POST /disconnect` and `POST /reset`. Use `createMessagingSessions` with a dedicated private root, 32-byte encryption key and provider factory. The factory receives the organization ID and restored session bytes. Its adapter supplies `connect`, `disconnect` and `send`. The current queue serializes operations per organization in one API process.
- Register `createMessagingEvents(io)` on the SaaS Socket.IO server. Clients connect to `/saas-messaging` using their workspace token in `handshake.auth.token`. The returned `publish` function sends QR and status events only to current owners of the specified organization.
- Pass `terminal` with `organizationId`, `outletId`, `id` and `branding` to `ThermalReceiptModal` from SaaS checkout. That path uses browser printing and stores the paper width by terminal. Bind these values to the authenticated checkout response before exposing the modal.

Legacy purchase order attachments use `backend/src/middleware/upload.js` and the static `/uploads` mount. Legacy business logos and HR contract documents use separate upload handlers. Keep the HR handlers outside this track. Reconcile existing PO file references before closing their legacy URLs.

## Local verification

Use dedicated MySQL schemas `glowy_pc2_dev` and `glowy_pc2_test`. With the appropriate local environment loaded, run these commands in `backend` after applying the foundation schema. Set `NODE_ENV=test` and `PC2_EXPECTED_SERVER` to the verified hostname and port for the test run. The seed script requires distinct fixture passwords in `PC2_ASTER_OWNER`, `PC2_ASTER_OUTLET`, and `PC2_BIRCH_OWNER`.

```sh
node scripts/saas/seed-pc2.js <server:port> glowy_pc2_test
node --test --test-timeout=25000 scripts/saas/pc2-delivery.test.js
```

The tests use two salons, a restricted outlet account, temporary private storage, encrypted fake provider sessions and mock printers. Start the Website development server to see the booking form fixtures at `/booking/pc2-aster` and `/booking/pc2-birch`. Unknown fixture slugs return the route's not-found response.

## Integration dependencies

PC 1 owns the shared route mount and workspace contracts. Service and package writes depend on the outlet and catalog contracts. Verified customer login and appointment history depend on the CRM and service contracts. Production WhatsApp and email delivery, PO file migration, terminal checkout integration, and end-to-end booking acceptance are pending those integrations. No customer data or live provider sessions were used for this slice.

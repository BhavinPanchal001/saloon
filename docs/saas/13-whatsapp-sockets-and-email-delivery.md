# 13 · WhatsApp, sockets and email delivery

Read [the execution contract](README.md) first. Prerequisites: 02,03.

## Current implementation

WhatsApp uses local config, logs and a Baileys session directory. Socket events can broadcast to all clients.

[whatsappRoutes.js](../../backend/src/routes/whatsappRoutes.js) · [whatsappSettingsController.js](../../backend/src/controllers/whatsappSettingsController.js) · [socketService.js](../../backend/src/services/socketService.js) · [whatsappService.js](../../backend/src/services/whatsappService.js) · [config.js](../../backend/src/services/whatsapp/config.js) · [emailService.js](../../backend/src/services/emailService.js)

## Additional entry points

[socket.js](../../src/services/socket.js) · [WhatsAppSettingsTab.jsx](../../src/pages/settings/WhatsAppSettingsTab.jsx)

## Implementation sequence

1. Key credentials, provider instances, pairing state, logs and retry jobs by organization.
2. Isolate encrypted sessions across restarts.
3. Authorize socket subscriptions and route QR/status to approved admins only.
4. Pass organization and verified recipient through voucher, reminder, invoice and shift send paths.
5. Keep identity emails bound to the initiating identity or invite.

## Acceptance scenario

Use two fake providers; reconnect/reset A while B sends a bill. Observe only intended recipients, rooms, logs and sender identities, including after restart.

## Existing route inventory

`GET /api/whatsapp/settings` `PUT /api/whatsapp/settings` `GET /api/whatsapp/status` `POST /api/whatsapp/baileys/connect` `POST /api/whatsapp/baileys/disconnect` `POST /api/whatsapp/baileys/pairing-code` `POST /api/whatsapp/baileys/reset` `POST /api/whatsapp/test-message` `GET /api/whatsapp/logs`

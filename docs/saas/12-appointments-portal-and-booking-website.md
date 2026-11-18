# 12 · Appointments, portal and booking website

Read [the execution contract](README.md) first. Prerequisites: 03,05,06.

## Current implementation

Public booking can select the first active outlet. Portal login looks up phone variants and issues a JWT. Browser phone verification alone cannot establish identity at the API.

[appointmentRoutes.js](../../backend/src/routes/appointmentRoutes.js) · [appointmentController.js](../../backend/src/controllers/appointmentController.js) · [customerPortalController.js](../../backend/src/controllers/customerPortalController.js) · [useCustomerAuth.ts](../../Website/src/hooks/useCustomerAuth.ts) · [Booking.tsx](../../Website/src/components/Booking.tsx) · [my-appointments.tsx](../../Website/src/routes/my-appointments.tsx)

## Additional entry points

[AppointmentCalendarPage.jsx](../../src/pages/appointments/AppointmentCalendarPage.jsx) · [firebase.ts](../../Website/src/lib/firebase.ts)

## Implementation sequence

1. Resolve a public salon slug before listing, creating or logging in.
2. Verify the identity provider token server-side and match its verified phone to that salon.
3. Bind portal sessions to customer and organization.
4. Validate service, package, outlet and talent, and restrict cancellation to the owner.
5. Update all website callers, hardcoded branding, session storage and deep links together.

## Acceptance scenario

Book under two slugs with the same phone. Check independent appointment histories, reject missing verification and foreign cancellations, and ensure unknown slugs never fall back to Glowy.

## Existing route inventory

`POST /api/appointments/public` `GET /api/appointments/public/services` `GET /api/appointments` `GET /api/appointments/:id` `POST /api/appointments` `PATCH /api/appointments/:id/status` `PUT /api/appointments/:id` `DELETE /api/appointments/:id`

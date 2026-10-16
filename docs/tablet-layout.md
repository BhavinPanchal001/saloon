# Tablet layouts

The supplied device dimensions (285.4 × 185.4 mm and 253.8 × 165.3 mm) describe
the chassis, not the browser viewport. Layouts respond to available CSS pixels
and touch capability, with no device model or user-agent checks.

- Below 1440px, navigation opens as a drawer and leaves the full page width available.
- POS stacks catalog and checkout below 1024px, with a checkout shortcut and a
  scrollable catalog. At 1024px and above the panels sit side by side. Rotation
  preserves the current cart.
- Page headers and actions wrap; large tables scroll within their own panels.
- Settings tabs scroll horizontally below 1280px. Dense summary and report grids
  use fewer columns on tablets.
- Touch controls have a 44px minimum target. Centered dialogs are bounded by the
  dynamic viewport height and can scroll. Print layout overrides remain separate.

## Verification

Run `npm run build` and `npm run test:tablet`. On a fresh machine, first run
`npx playwright install chromium` after installing dependencies.

The browser suite covers 50 listing, creation, editing and detail routes plus
four authentication pages at
800×1280, 1280×800, 900×1440, 1440×900, and a 1920×1080 desktop baseline. It also
checks drawer dismissal and focus, cart preservation through rotation, settings
navigation, and dialog actions at a 600px viewport height.

API responses are mocked with sample records and empty lists; this is layout
and interaction coverage, not verification of backend billing or accounting.
Actual tablet model names/browser viewport sizes are still needed for exact
device verification. Check the production app on both tablets with the on-screen
keyboard open, long records, and browser zoom before deployment.

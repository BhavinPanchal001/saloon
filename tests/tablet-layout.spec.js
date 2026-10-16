import { test, expect } from '@playwright/test';
import { mockTabletSession } from './tablet-fixtures';

const routes = [
  '/dashboard', '/outlets', '/outlets/transactions', '/users', '/roles',
  '/budgets', '/expenses', '/expenses/add', '/inventory',
  '/inventory/products/1/sales', '/inventory/purchase-orders',
  '/inventory/purchase-orders/new', '/inventory/units', '/services',
  '/services/add', '/services/edit/1', '/services/categories', '/services/1',
  '/packages', '/packages/new', '/packages/1', '/packages/1/edit',
  '/staff', '/staff/add', '/staff/edit/1', '/staff/1', '/attendance',
  '/attendance/summary', '/contracts', '/contracts/new', '/contracts/masters',
  '/payroll', '/salary/add', '/salary/pay', '/payroll/calculate',
  '/payroll/commission-masters', '/bank', '/bank/new', '/settings', '/customers',
  '/appointments', '/reports', '/pos', '/pos/bills', '/pos/bills/1', '/coupons',
  '/vouchers', '/pos-management/terminals', '/pos-management/shift-history', '/notifications',
];

async function expectViewportFit(page) {
  const viewport = page.viewportSize();
  // Mobile browsers can expand innerWidth to fit overflow. Compare against the
  // requested viewport, not innerWidth, to catch that silent page scaling.
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth, `Document overflows ${viewport.width}px viewport`).toBeLessThanOrEqual(viewport.width + 1);
}

test.beforeEach(async ({ context }, testInfo) =>
  mockTabletSession(context, !testInfo.title.startsWith('authentication')));

test('authentication pages fit both orientations', async ({ page }) => {
  for (const route of ['/login', '/register', '/forgot-password', '/verify-otp']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('form')).toBeVisible();
    await expectViewportFit(page);
  }
});

test('all page layouts fit the viewport', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const route of routes) {
    await test.step(route, async () => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.app-content')).toBeVisible();
      // Allow mocked requests and page-specific state updates to settle.
      await page.waitForTimeout(350);
      await expectViewportFit(page);
      expect(errors).toEqual([]);
    });
  }
});

test('navigation, checkout and settings work with touch and rotation', async ({ page }) => {
  await page.goto('/pos', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.pos-catalog-grid > button')).toHaveCount(24);
  const menu = page.getByRole('button', { name: 'Open navigation' });
  if (page.viewportSize().width < 1440) {
    await menu.click();
    await expect(page.getByRole('dialog', { name: 'Main navigation' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeFocused();
    await expect(page.locator('#app-navigation')).toHaveAttribute('inert', '');
  }

  await page.locator('.pos-catalog-grid > button').first().click();
  await expect(page.locator('#pos-checkout')).toContainText('Signature Treatment 1');
  if (page.viewportSize().width < 1024) {
    await page.getByRole('link', { name: 'View checkout (1)' }).click();
    await expect(page.locator('#pos-checkout')).toBeInViewport();
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  const catalog = await page.locator('.pos-catalog').boundingBox();
  const checkout = await page.locator('#pos-checkout').boundingBox();
  expect(checkout.x).toBeGreaterThan(catalog.x + catalog.width);
  await expect(page.locator('#pos-checkout')).toContainText('Signature Treatment 1');
  await expectViewportFit(page);

  await page.goto('/settings', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Security', exact: true }).click();
  await expectViewportFit(page);
  await expect(page.locator('.app-content')).toContainText('Password');
});

test('dialogs remain inside a short landscape viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  for (const [route, action] of [['/customers', 'Add Customer'], ['/outlets', 'Add Outlet'], ['/coupons', 'Create Coupon']]) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: action, exact: true }).click();
    const panel = page.locator('.fixed.inset-0.items-center > .w-full').last();
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(600);
    await expectViewportFit(page);
    const lastButton = panel.getByRole('button').last();
    await lastButton.scrollIntoViewIfNeeded();
    await expect(lastButton).toBeInViewport();
  }
});

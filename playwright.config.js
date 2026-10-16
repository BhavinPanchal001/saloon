import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 180_000,
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:5173', screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    ...[[800, 1280], [1280, 800], [900, 1440], [1440, 900]].map(([width, height]) => ({
      name: `tablet-${width}x${height}`,
      use: { viewport: { width, height }, hasTouch: true, isMobile: true },
    })),
    { name: 'desktop', use: { viewport: { width: 1920, height: 1080 } } },
  ],
});

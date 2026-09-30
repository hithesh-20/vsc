import { defineConfig } from '@playwright/test';

/**
 * VendorSaathi E2E — automates the 7-step manual checklist
 * (dashboard, Ask Saathi, Accept Order, POS sale, offline sync,
 * reload persistence, PWA install assets).
 *
 * The suite drives the REAL running app: globalSetup verifies both servers
 * answer and, when they don't, boots them once via `python scripts/start.py`
 * (the project's own launcher). An already-running dev server is reused —
 * this never fights the dev servers the user (or Freebuff preview) has up.
 *
 * Run:  npx playwright test          (from frontend/)
 * Headed: npx playwright test --headed
 */

const APP_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1, // serial: the tests share one live database
  retries: 0,
  reporter: [['list']],
  globalSetup: './playwright.global-setup.ts',
  use: {
    baseURL: APP_URL,
    viewport: { width: 420, height: 800 }, // phone-ish, matches the vendor UI
    locale: 'en-IN',
  },
});

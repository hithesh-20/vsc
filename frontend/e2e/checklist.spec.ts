import { test, expect, Page } from '@playwright/test';

/**
 * VendorSaathi E2E — the 7-step manual checklist, automated.
 *
 * Drives the real app against the real backend + live demo DB. Serial
 * execution (workers: 1) keeps the shared-DB mutations predictable.
 * NOTE: Playwright gives every test a fresh context (own localStorage),
 * so the offline→sync flow is ONE test (steps 5+6) — the queued outbox
 * must live inside the same browser context.
 *
 *   1. Dashboard loads with live data
 *   2. Ask Saathi answers from real data (no fake "offline" claim)
 *   3. Accept Order flips a PENDING order to ACCEPTED
 *   4. POS sale records and increases TODAY SALES (server-side proof)
 *   5+6. Offline: banner flips + sale queues; back online the outbox
 *        drains and the sync audit shows the confirmed receipt
 *   7. PWA installability proxies (phone URL, manifest, service worker
 *      with the /health cache bypass)
 */

const APP_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const API_URL = 'http://localhost:8000';

async function gotoDashboard(page: Page) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Ramesh Fresh Vegetables' }).first())
    .toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('TODAY SALES')).toBeVisible();
}

/** TODAY SALES rupee amount, read straight from the rendered DOM. */
async function todaySales(page: Page): Promise<number> {
  const text = await page.evaluate(() => document.body.innerText);
  const m = text.match(/TODAY SALES\n₹([\d,]+)/);
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : -1;
}

/** Close the Ask Saathi bottom-sheet if it is open (it is a toggle on the AI FAB). */
async function closeSaathiPanel(page: Page) {
  const panel = page.getByText('Say “Saathi” hands-free, or speak / type anything');
  if (await panel.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Open VendorSaathi AI voice assistant' }).click();
    await expect(panel).toBeHidden({ timeout: 5_000 });
  }
}

/** Pending SALE entries in the durable offline outbox (localStorage). */
async function queuedSales(page: Page): Promise<number> {
  return page.evaluate(() => {
    const q = JSON.parse(localStorage.getItem('vs_offline_queue_v2') || '[]');
    return Array.isArray(q) ? q.filter((x: any) => x.type === 'SALE').length : 0;
  });
}

async function bottomNav(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).click();
}

test.describe('VendorSaathi — 7-step checklist', () => {
  test('step 1 — dashboard loads with live data', async ({ page }) => {
    await gotoDashboard(page);

    const sales = await todaySales(page);
    expect(sales).toBeGreaterThanOrEqual(0);
    await expect(page.getByText('TOTAL ORDERS')).toBeVisible();
    await expect(page.getByText('UDHAAR DUE')).toBeVisible();
    await expect(page.getByText('Live Online Sync • Cloud Connected')).toBeVisible();

    // Auth: dashboard data flows through the fixed getValidToken() path —
    // the stored token must be a real, working JWT (not 'demo_token').
    const token = await page.evaluate(() => localStorage.getItem('vs_vendor_token') || '');
    expect(token.split('.').length).toBe(3);
    const me = await page.evaluate(async (tok) => {
      const r = await fetch(`${'http://localhost:8000'}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      return r.status;
    }, token);
    expect(me).toBe(200);
  });

  test('step 2 — Ask Saathi answers from real data', async ({ page }) => {
    await gotoDashboard(page);
    await page.getByRole('button', { name: '🎙️ Ask Saathi AI' }).click();

    const input = page.getByRole('textbox', { name: /Type or speak/ });
    await expect(input).toBeVisible();
    await input.fill('Who owes me money?');
    await page.getByRole('button', { name: 'Send' }).click();

    // Real named debtors from the live DB — and crucially NOT the fake
    // offline excuse the expired-token bug used to produce.
    await expect(page.getByText(/customers owe you ₹[\d,]+/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Govindraj/)).toBeVisible();
    await expect(page.getByText("You're offline and I have no saved answer")).toHaveCount(0);
    await expect(page.getByText('live data').first()).toBeVisible();
  });

  test('step 3 — Accept Order flips PENDING to ACCEPTED', async ({ page }) => {
    await gotoDashboard(page);
    await page.getByRole('button', { name: 'Customer Orders' }).click();

    // Grab the first pending order number, then accept THAT one.
    const firstPending = page.getByRole('button', { name: 'Accept Order' }).first();
    await expect(firstPending).toBeVisible();
    const cardText = await firstPending.evaluate(
      (btn) => btn.closest('div')?.parentElement?.textContent || ''
    );
    const orderNo = cardText.match(/ORD-[A-Z0-9-]+/)?.[0];
    expect(orderNo).toBeTruthy();

    await firstPending.click();
    // The order card now shows ACCEPTED with a "Preparing" (next step) button
    await expect(
      page.locator(`text=${orderNo}`).first().locator('xpath=ancestor::div[contains(@class,"rounded")]')
        .getByText('ACCEPTED')
    ).toBeVisible({ timeout: 20_000 });
  });

  test('step 4 — POS sale records and TODAY SALES increases', async ({ page }) => {
    await gotoDashboard(page);
    const before = await todaySales(page);
    expect(before).toBeGreaterThanOrEqual(0);

    await bottomNav(page, 'POS Sale');
    await page.getByTitle('Add to bill').first().click();
    // Stepper appeared → item is in the bill
    await expect(page.getByTitle('Add to bill')).toHaveCount(0, { timeout: 5_000 });

    await page.getByRole('button', { name: /Record Payment/i }).click();
    await expect(page.getByText(/Bill Recorded/i).first()).toBeVisible({ timeout: 20_000 });

    // TODAY SALES strictly higher → the sale really reached the live DB
    await gotoDashboard(page);
    await expect.poll(async () => todaySales(page), { timeout: 20_000 })
      .toBeGreaterThan(before);
  });

  test('steps 5+6 — offline queue then online sync drain (one context)', async ({ page }) => {
    await gotoDashboard(page);
    await closeSaathiPanel(page);
    expect(await queuedSales(page)).toBe(0); // clean outbox to start

    // ---- STEP 5: device goes offline ----
    await page.context().setOffline(true);
    await expect(page.getByText(/Offline Safe Mode/i).first())
      .toBeVisible({ timeout: 25_000 });

    await bottomNav(page, 'POS Sale');
    await page.getByTitle('Add to bill').first().click();
    await page.getByRole('button', { name: /Record Payment/i }).click();
    // Optimistic offline receipt — money action saved on-device
    await expect(page.getByText(/Bill Recorded/i).first()).toBeVisible({ timeout: 20_000 });
    expect(await queuedSales(page)).toBe(1);

    // ---- STEP 6: network returns, outbox drains ----
    await page.context().setOffline(false);
    await expect
      .poll(() => queuedSales(page), { timeout: 45_000 })
      .toBe(0);

    // The sync audit screen shows today's confirmed POS Sale receipt
    await bottomNav(page, 'More');
    await page.getByText('📒 Cloud Sync').click();
    await expect(page.getByText(/Synced timeline/i)).toBeVisible();
    const today = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    await expect(page.getByText(new RegExp(`Synced ${ today.replace(' ', '\\s+') }`)).first())
      .toBeVisible({ timeout: 15_000 });
  });

  test('step 7 — PWA installability proxies (phone-readiness)', async ({ page }) => {
    // (a) The backend advertises the HTTPS phone URL (QR/lan-info contract)
    const lan = await page.evaluate(async (api) => {
      const r = await fetch(`${api}/system/lan-info`);
      return (await r.json()).data;
    }, API_URL);
    expect(lan.app_url).toMatch(/^https:\/\/192\.168\./);
    expect(lan.https).toBe(true);
    expect(lan.needs_ca_trust).toBe(true);

    // (b) Manifest served and installable-looking
    const manifest = await page.evaluate(async () => {
      const r = await fetch('/manifest.webmanifest');
      return { status: r.status, body: await r.json() };
    });
    expect(manifest.status).toBe(200);
    expect(manifest.body.name || manifest.body.short_name).toBeTruthy();
    expect((manifest.body.icons || []).length).toBeGreaterThan(0);

    // (c) Service worker registers, controls the page, and carries the
    // /health cache bypass (the honest-banner fix)
    await gotoDashboard(page);
    const sw = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      const url = (reg.active || reg.installing || reg.waiting)?.scriptURL || '';
      const txt = await (await fetch(url)).text();
      return {
        controlled: !!navigator.serviceWorker.controller,
        swUrl: url,
        healthBypass: txt.includes('/system/health'),
        secureContext: window.isSecureContext,
      };
    });
    expect(sw.controlled).toBe(true);
    expect(sw.swUrl).toContain('sw.js');
    expect(sw.healthBypass).toBe(true);
    expect(sw.secureContext).toBe(true); // localhost counts as secure
  });
});

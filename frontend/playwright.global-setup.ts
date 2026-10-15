import { spawn, execSync } from 'child_process';
import http from 'http';

/**
 * Verifies both servers answer before the suite runs; when they don't,
 * boots them once via `python scripts/start.py` (the project's own
 * launcher). An already-running dev server is reused — this never fights
 * the dev servers the user (or Freebuff preview) has up.
 */
const APP_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const API_URL = 'http://localhost:8002';

function httpOk(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 3000 }, (res) => {
      res.resume();
      resolve(!!res.statusCode && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function waitFor(url: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await httpOk(url)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

export default async function globalSetup() {
  const appUp = await httpOk(APP_URL);
  const apiUp = await httpOk(`${API_URL}/api/v1/system/health`);

  if (appUp && apiUp) return; // reuse the running servers as-is

  const root = execSync('git rev-parse --show-toplevel').toString().trim();
  const child = spawn('python', ['scripts/start.py'], {
    cwd: root,
    stdio: 'ignore',
    detached: true,
    shell: process.platform === 'win32',
  });
  child.unref();

  const okApp = await waitFor(APP_URL, 60_000);
  const okApi = await waitFor(`${API_URL}/api/v1/system/health`, 60_000);
  if (!okApp || !okApi) {
    throw new Error(
      `Servers did not come up (app=${okApp} api=${okApi}). Start them with: python scripts/start.py`
    );
  }
}

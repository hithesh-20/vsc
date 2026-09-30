/*
 * VendorSaathi offline outbox.
 *
 * Every POS sale / order status change made without network is recorded here
 * and flushed automatically when connectivity returns (plus a periodic retry).
 * The backend deduplicates via client_mutation_id, so retries are always safe.
 */
import { API_BASE } from './api';

const OUTBOX_KEY = 'vs_offline_queue_v2';
const MAX_OUTBOX = 500;

export type MutationType = 'SALE' | 'ORDER_STATUS' | 'ORDER_CREATE' | 'INVENTORY' | 'UDHAAR';

export interface OutboxMutation {
  client_mutation_id?: string;
  entity_type: MutationType;
  payload: any;
  client_timestamp: string;
  queued_at?: string;
  attempts?: number;
  last_error?: string | null;
}

type Listener = (state: SyncStatus) => void;

/** One confirmed offline action, with the server's final outcome for it. */
export interface SyncedAction {
  client_mutation_id: string;
  type: MutationType;
  label: string;                     // human summary, e.g. "2 kg tomato ×2 kg · voice"
  kind: string;                      // ENTITY_LABEL, e.g. "Voice Order"
  orderNumber?: string | null;       // ORDER_CREATE only
  total?: number | null;             // ORDER_CREATE only
}

type SyncCompleteListener = (actions: SyncedAction[]) => void;

// -------------------------------------------------------- device sync log ----
// A durable "what synced and when" record for the Sync Audit screen. Entries
// are captured at confirmation time from BOTH flush paths (in-app fetch and
// the service worker's background drain), so the timeline stays truthful even
// when the SW flushed while the app was closed.
const SYNC_LOG_KEY = 'vs_sync_log_v1';
const SYNC_LOG_MAX = 100;

export interface SyncLogEntry {
  at: string;            // ISO time the server confirmed the action
  via: 'app' | 'sw' | 'server'; // who did the flush — 'server' = reconstructed
                                // from /sync/history (device log was wiped)
  actions: SyncedAction[];
}

function readSyncLog(): SyncLogEntry[] {
  try { return JSON.parse(localStorage.getItem(SYNC_LOG_KEY) || '[]'); } catch { return []; }
}

function appendSyncLog(entry: SyncLogEntry): void {
  try {
    const log = [entry, ...readSyncLog()].slice(0, SYNC_LOG_MAX);
    localStorage.setItem(SYNC_LOG_KEY, JSON.stringify(log));
  } catch { /* storage full — the timeline just stops growing */ }
}

/** Last sync completions, newest first — for the audit screen's timeline. */
export function syncLog(): SyncLogEntry[] {
  return readSyncLog();
}

/** Wipe the device-side sync record (the timeline card). The server's own
 *  history is untouched — it remains the permanent audit trail. */
export function clearSyncLog(): void {
  try { localStorage.removeItem(SYNC_LOG_KEY); } catch { /* ignore */ }
}

export interface SyncStatus {
  pending: number;
  syncing: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
}

let listeners: Listener[] = [];
let syncCompleteListeners: SyncCompleteListener[] = [];
let syncing = false;
let lastSyncedAt: string | null = null;
let lastError: string | null = null;
let flushTimer: number | null = null;
let started = false;

function read(): OutboxMutation[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (raw) return JSON.parse(raw);
    // Migrate the legacy outbox (VS prior builds) so nothing is lost
    const legacy = JSON.parse(localStorage.getItem('vs_offline_queue') || '[]');
    const migrated: OutboxMutation[] = (Array.isArray(legacy) ? legacy : []).map((m: any) => ({
      entity_type: m.entity_type || 'SALE',
      payload: m.payload || m,
      client_timestamp: m.created_at || new Date().toISOString(),
      queued_at: m.created_at,
      attempts: 0,
    }));
    if (migrated.length) {
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(migrated));
      localStorage.removeItem('vs_offline_queue');
    }
    return migrated;
  } catch {
    return [];
  }
}

function write(items: OutboxMutation[]): void {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(items.slice(0, MAX_OUTBOX))); } catch { /* full */ }
}

function notify(): void {
  const s = status();
  listeners.forEach((l) => l(s));
}

export function status(): SyncStatus {
  return { pending: read().length, syncing, lastSyncedAt, lastError };
}

export function onSyncStateChange(cb: Listener): () => void {
  listeners.push(cb);
  return () => { listeners = listeners.filter((l) => l !== cb); };
}

/** Subscribe once to get every batch of actions the server confirms. */
export function onSyncComplete(cb: SyncCompleteListener): () => void {
  syncCompleteListeners.push(cb);
  return () => { syncCompleteListeners = syncCompleteListeners.filter((l) => l !== cb); };
}

function emitSyncComplete(actions: SyncedAction[]): void {
  if (!actions.length) return;
  appendSyncLog({ at: new Date().toISOString(), via: 'app', actions });
  syncCompleteListeners.forEach((l) => {
    try { l(actions); } catch { /* a listener must not break syncing */ }
  });
}

/** Record a completion that the service worker reported (via: 'sw'). */
function emitSyncCompleteFromSw(actions: SyncedAction[]): void {
  if (!actions.length) return;
  appendSyncLog({ at: new Date().toISOString(), via: 'sw', actions });
  syncCompleteListeners.forEach((l) => {
    try { l(actions); } catch { /* a listener must not break syncing */ }
  });
}

export function pendingCount(): number {
  return read().length;
}

function getAuthToken(): string {
  try {
    const app = localStorage.getItem('vs_app_session');
    if (app) {
      const s = JSON.parse(app);
      if (s?.access_token) return s.access_token;
    }
  } catch { /* ignore */ }
  return localStorage.getItem('vs_vendor_token') || '';
}

let authRefresh: (() => Promise<string | null>) | null = null;

/** The app registers its re-login helper so a stale token can't block syncing. */
export function setAuthTokenRefresher(fn: () => Promise<string | null>): void {
  authRefresh = fn;
}

async function freshAuthHeaders(): Promise<Record<string, string>> {
  const build = (token: string | null): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });
  let token = getAuthToken();
  // Probe: a bad token means the whole batch 403s — re-login once and retry
  if (token && authRefresh) {
    try {
      const probe = await fetch(`${API_BASE}/orders/vendor`, { headers: { Authorization: `Bearer ${token}` } });
      if (probe.status === 403) token = (await authRefresh()) || token;
    } catch { /* offline; flush() caller handles */ }
  }
  if (!token && authRefresh) token = (await authRefresh()) || '';
  return build(token);
}

/** Record an offline action. enrich payload with stable fields BEFORE calling.
 *  Returns the idempotency key used, so callers can link UI (e.g. a pending
 *  receipt card) to the sync confirmation later. */
export function enqueue(entityType: MutationType, payload: any): string {
  const clientMutationId = payload?.client_mutation_id || `${entityType.toLowerCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const items = read();
  items.push({
    client_mutation_id: clientMutationId,
    entity_type: entityType,
    payload,
    client_timestamp: new Date().toISOString(),
    queued_at: new Date().toISOString(),
    attempts: 0,
  });
  write(items);
  mirrorToIdb();
  requestBackgroundSync(); // SW will drain even if the app closes
  notify();
  return clientMutationId;
}

// ------------------------------------------------------- audit / repair ----

export interface OutboxEntry extends OutboxMutation {
  summary: string;      // human-readable description of the action
  risk: 'low' | 'medium' | 'high';
}

const ENTITY_LABEL: Record<MutationType, string> = {
  SALE: 'POS Sale',
  ORDER_STATUS: 'Order Status',
  ORDER_CREATE: 'Voice Order',
  INVENTORY: 'Stock Update',
  UDHAAR: 'Udhaar Entry',
};

/** Human description of one mutation, from its type + payload alone —
 *  shared by the local outbox summary and the server-history timeline. */
export function describeMutation(entityType: MutationType, payload: any): string {
  const p = payload || {};
  switch (entityType) {
    case 'SALE':
      return `${p.customer_name || 'Walk-in'} · ₹${p.total_amount ?? '?'} · ${(p.items || []).length} item(s)`;
    case 'ORDER_CREATE':
      return `${(p.items || []).map((i: any) => `${i.product_name} ×${i.quantity}${i.unit ? ' ' + i.unit : ''}`).join(', ') || 'order'} · voice`;
    case 'ORDER_STATUS':
      return `${p.order_number || String(p.order_id || '').slice(0, 8)} → ${p.status}`;
    case 'INVENTORY':
      return `${p.product_id ? String(p.product_id).slice(0, 8) : 'product'} ${p.change_qty >= 0 ? '+' : ''}${p.change_qty}`;
    case 'UDHAAR':
      return `${p.customer_name || 'Customer'} · ₹${p.amount_due ?? '?'}`;
    default:
      return JSON.stringify(p).slice(0, 60);
  }
}

function summarize(m: OutboxMutation): string {
  return describeMutation(m.entity_type, m.payload);
}

/** Local outbox for the audit screen (oldest first). */
export function inspect(): OutboxEntry[] {
  return read().slice().reverse().map((m) => {
    const attempts = m.attempts || 0;
    return {
      ...m,
      summary: summarize(m),
      risk: attempts >= 5 ? 'high' : attempts >= 2 ? 'medium' : 'low',
    };
  });
}

/** Drop one queued mutation (vendor decided it's wrong). */
export function remove(clientMutationId: string): void {
  write(read().filter((m) => m.client_mutation_id !== clientMutationId));
  notify();
}

/** Server-side audit trail for the sync screen (handles stale tokens). */
export async function fetchHistory(limit = 25): Promise<{ items: any[]; failed_count: number } | null> {
  try {
    const res = await fetch(`${API_BASE}/sync/history?limit=${limit}`, {
      headers: await freshAuthHeaders(),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ? { items: json.data.items || [], failed_count: json.data.failed_count || 0 } : null;
  } catch {
    return null;
  }
}

/** Retry a single mutation immediately; returns the server's verdict. */
export async function retryOne(clientMutationId: string): Promise<{ ok: boolean; error?: string }> {
  const item = read().find((m) => m.client_mutation_id === clientMutationId);
  if (!item) return { ok: false, error: 'No longer queued' };
  if (!navigator.onLine) return { ok: false, error: 'Still offline' };
  try {
    const { attempts, queued_at, last_error, ...mut } = item;
    const res = await fetch(`${API_BASE}/sync/batch-upload`, {
      method: 'POST',
      headers: await freshAuthHeaders(),
      body: JSON.stringify({ mutations: [mut] }),
    });
    if (!res.ok) throw new Error(`server ${res.status}`);
    const json = await res.json();
    const r = json?.data?.results?.[0];
    if (r && (r.status === 'PROCESSED')) {
      remove(clientMutationId);
      return { ok: true };
    }
    const err = r?.error_message || 'Rejected by server';
    // Record the failure on the entry so the audit screen shows it
    const items = read().map((m) =>
      m.client_mutation_id === clientMutationId
        ? { ...m, attempts: (m.attempts || 0) + 1, last_error: err }
        : m
    );
    write(items);
    notify();
    return { ok: false, error: err };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Push the whole outbox to /sync/batch-upload; drop only what the server confirmed. */
export async function flush(): Promise<{ sent: number; remaining: number }> {
  if (syncing) return { sent: 0, remaining: pendingCount() };
  const items = read();
  if (!items.length || !navigator.onLine) return { sent: 0, remaining: items.length };

  syncing = true;
  lastError = null;
  notify();
  try {
    const res = await fetch(`${API_BASE}/sync/batch-upload`, {
      method: 'POST',
      headers: await freshAuthHeaders(),
      body: JSON.stringify({
        mutations: items.map(({ attempts, queued_at, last_error, ...mut }) => mut),
      }),
    });
    if (!res.ok) throw new Error(`sync failed (${res.status})`);
    const json = await res.json();
    const results: Array<{ client_mutation_id: string; status: string; server_order_number?: string; server_total_amount?: number }> = json?.data?.results || [];
    const byId = new Map(results.map((r) => [r.client_mutation_id, r]));
    const okIds = new Set(
      results.filter(r => r.status === 'PROCESSED').map(r => r.client_mutation_id)
    );
    // Human-readable outcome for every confirmed action (chat + toast)
    const completed: SyncedAction[] = [];
    for (const i of items) {
      const r = byId.get(i.client_mutation_id!);
      if (!r || r.status !== 'PROCESSED') continue;
      completed.push({
        client_mutation_id: i.client_mutation_id!,
        type: i.entity_type,
        kind: ENTITY_LABEL[i.entity_type],
        label: summarize(i),
        orderNumber: (r as any).server_order_number || null,
        total: (r as any).server_total_amount ?? null,
      });
    }
    // Remove everything the server accepted; keep failures for the next retry
    const remaining = items.filter(i => !okIds.has(i.client_mutation_id!))
      .map(i => ({ ...i, attempts: (i.attempts || 0) + 1 }));
    write(remaining);
    mirrorToIdb();
    lastSyncedAt = new Date().toISOString();
    emitSyncComplete(completed);
    return { sent: okIds.size, remaining: remaining.length };
  } catch (e: any) {
    lastError = e?.message || 'sync error';
    return { sent: 0, remaining: items.length };
  } finally {
    syncing = false;
    notify();
  }
}

/** Called by a SW 'sync' event on the next page load (already pruned there). */
export function adoptServerPrune(confirmedIds: string[]): void {
  if (!confirmedIds.length) return;
  const set = new Set(confirmedIds);
  write(read().filter((m) => !set.has(m.client_mutation_id!)));
  notify();
}

// ------------------------------------------------------- background sync ----
// Service workers cannot read localStorage, so every outbox change is mirrored
// into IndexedDB together with enough auth info for the SW to flush alone —
// including re-login credentials — after the app has been closed.
let loginCredentials: { phone: string; pin: string } | null = null;

export function setLoginCredentials(phone: string, pin: string): void {
  loginCredentials = { phone, pin };
  mirrorToIdb(); // keep SW copy of credentials fresh
}

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('vs-outbox-db', 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('kv')) {
        req.result.createObjectStore('kv', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, value: any): Promise<void> {
  try {
    const db = await idbOpen();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put({ key, value });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* IDB unavailable — background sync just won't see updates */ }
}

async function mirrorToIdb(): Promise<void> {
  const { getApiBase } = await import('./api');
  await idbPut('mirror', {
    items: read(),
    token: getAuthToken(),
    login: loginCredentials,
    api_base: getApiBase(),
    updated_at: new Date().toISOString(),
  });
}

/** Ask the browser to wake our SW later, even if the app is closed by then. */
export async function requestBackgroundSync(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return false;
    const reg = await navigator.serviceWorker.ready;
    await (reg as any).sync.register('vs-outbox-sync');
    return true;
    // Chrome: fires when network allows, even with the app closed.
    // Firefox/Safari: unsupported → in-app 30s auto-sync remains the fallback.
  } catch {
    return false;
  }
}

function scheduleRetry(): void {
  if (flushTimer) window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(async () => {
    if (pendingCount() > 0 && navigator.onLine) await flush();
  }, 15_000);
}

/** Wire network listeners. Call once at app start (after login gate mounts). */
export function startAutoSync(): void {
  if (started) return;
  started = true;
  mirrorToIdb(); // publish current outbox + auth for the service worker
  window.addEventListener('online', async () => {
    const { sent } = await flush();
    if (sent > 0) scheduleRetry(); // catch stragglers
  });
  // SW flushed while we were away/closed → prune the local outbox to match.
  // We read each entry's summary BEFORE pruning — after adoptServerPrune they
  // are gone, and the vendor still deserves to hear what was accepted.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (e: MessageEvent) => {
      if ((e.data as any)?.type === 'OUTBOX_SYNCED') {
        const confirmed = ((e.data as any).confirmed || []) as string[];
        // v1.4.1+ SWs also send per-mutation outcome details (real order
        // number + server-priced total for voice orders) captured at flush
        // time — often while the app was closed.
        const details = ((e.data as any).details || {}) as Record<string, { order_number?: string; total?: number | null }>;
        const outboxById = new Map(read().map((m) => [m.client_mutation_id!, m]));
        adoptServerPrune(confirmed);
        lastSyncedAt = new Date().toISOString();
        const completed: SyncedAction[] = confirmed.map((id) => {
          const m = outboxById.get(id);
          const type: MutationType = m?.entity_type || 'SALE';
          return {
            client_mutation_id: id,
            type,
            kind: ENTITY_LABEL[type],
            label: m ? summarize(m) : 'Offline action',
            orderNumber: details[id]?.order_number || null,
            total: details[id]?.total ?? null,
          };
        });
        emitSyncCompleteFromSw(completed);
      }
    });
  }
  // Periodic safety net for flaky village networks
  setInterval(async () => {
    if (pendingCount() > 0 && navigator.onLine && !syncing) {
      const { remaining } = await flush();
      if (remaining > 0) scheduleRetry();
    }
  }, 30_000);
  // Immediate attempt on load (page might load already-online with a backlog)
  if (pendingCount() > 0 && navigator.onLine) flush();
}

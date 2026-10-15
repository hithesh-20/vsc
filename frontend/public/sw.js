/*
 * VendorSaathi Vendor App — Service Worker
 *
 * Caching strategy:
 *  - App shell + icons: precached at install; SPA navigations served
 *    network-first with cached shell fallback (app opens offline).
 *  - Same-origin assets: stale-while-revalidate.
 *  - /api/* calls: network-first, cached copy served when offline so vendors
 *    still see orders/stock; responses are never shared across users.
 *  - Cross-origin (fonts, Leaflet CDN, map tiles): cache-first files we can.
 */
const VERSION = 'v1.5.1';
const SHELL_CACHE = `vs-shell-${VERSION}`;
const ASSET_CACHE = `vs-assets-${VERSION}`;
const API_CACHE = `vs-api-${VERSION}`;
const IMAGE_CACHE = `vs-img-${VERSION}`;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/pwa-192.png',
  '/icons/pwa-512.png',
  '/icons/pwa-maskable-192.png',
  '/icons/pwa-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const keep = new Set([SHELL_CACHE, ASSET_CACHE, API_CACHE, IMAGE_CACHE]);
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => (keep.has(k) ? null : caches.delete(k)))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  // Debug/manual trigger of the same code path the Background Sync event uses
  if (event.data && event.data.type === 'FLUSH_OUTBOX_NOW') {
    flushOutboxFromIdb()
      .then((r) => event.source && event.source.postMessage({ type: 'OUTBOX_FLUSH_RESULT', ...r }))
      .catch((e) => event.source && event.source.postMessage({ type: 'OUTBOX_FLUSH_RESULT', sent: 0, error: String(e) }));
  }
});

// ----------------------- background sync: offline outbox -----------------------
// The window app mirrors its outbox (items + auth) into IndexedDB — service
// workers cannot read localStorage. When the vendor closes the app, the
// browser later fires the 'sync' event and the SW drains the outbox itself.
const OUTBOX_TAG = 'vs-outbox-sync';

function idbOpen() {
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

async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const rq = db.transaction('kv', 'readonly').objectStore('kv').get(key);
    rq.onsuccess = () => resolve(rq.result && rq.result.value);
    rq.onerror = () => reject(rq.error);
  });
}

async function idbPut(key, value) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function syncBatchFetch(mirror, body) {
  return fetch(`${mirror.api_base}/sync/batch-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(mirror.token ? { Authorization: `Bearer ${mirror.token}` } : {}),
    },
    body,
  });
}

async function flushOutboxFromIdb() {
  const mirror = (await idbGet('mirror')) || { items: [], token: '', api_base: '' };
  const items = mirror.items || [];
  if (!items.length) return { sent: 0, remaining: 0 };
  if (!navigator.onLine) return { sent: 0, remaining: items.length };

  // If a visible app window exists it will show the in-chat/toast confirmation
  // itself; only a truly closed (or fully hidden) app gets the lock-screen
  // push from the server (source: 'sw').
  const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const appVisible = windowClients.some((c) => c.visibilityState === 'visible');
  const mutations = items.map(({ attempts, queued_at, last_error, ...mut }) => mut);
  const batchBody = JSON.stringify(appVisible ? { mutations } : { mutations, source: 'sw' });
  let res = await syncBatchFetch(mirror, batchBody);

  // Stale token → re-login with the vendor's stored credentials, retry once
  if (res.status === 403 && mirror.login && mirror.login.phone) {
    try {
      const lr = await fetch(`${mirror.api_base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: mirror.login.phone, password: mirror.login.pin }),
      });
      if (lr.ok) {
        const lj = await lr.json();
        mirror.token = lj.data.access_token;
        await idbPut('mirror', mirror);
        res = await syncBatchFetch(mirror, batchBody);
      }
    } catch (e) { /* fall through with the 403 */ }
  }

  if (!res.ok) throw new Error(`outbox sync failed (${res.status})`); // browser retries later
  const json = await res.json();
  const results = (json && json.data && json.data.results) || [];
  const okIds = new Set(results.filter((r) => r.status === 'PROCESSED').map((r) => r.client_mutation_id));

  // Re-read the mirror (a client may have enqueued more items mid-flush),
  // prune only what the server confirmed, then tell live clients.
  const fresh = (await idbGet('mirror')) || mirror;
  const remaining = (fresh.items || []).filter((i) => !okIds.has(i.client_mutation_id));
  await idbPut('mirror', { ...fresh, token: mirror.token, items: remaining });

  const confirmed = [...okIds];
  if (confirmed.length) {
    // Per-mutation outcome details (real order number + total for voice
    // orders) so the page can show the vendor exactly what was accepted —
    // even when this flush happened while the app was closed.
    const details = {};
    for (const r of results) {
      if (r.status === 'PROCESSED' && r.server_order_number) {
        details[r.client_mutation_id] = {
          order_number: r.server_order_number,
          total: r.server_total_amount ?? null,
        };
      }
    }
    const clientList = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    clientList.forEach((c) => c.postMessage({ type: 'OUTBOX_SYNCED', confirmed, remaining: remaining.length, details }));
  }
  return { sent: okIds.size, remaining: remaining.length };
}

// Fired by the browser when connectivity allows — even with the app closed.
// Rejecting the promise makes the browser retry with backoff.
self.addEventListener('sync', (event) => {
  if (event.tag === OUTBOX_TAG) {
    event.waitUntil(flushOutboxFromIdb());
  }
});

// ----------------------------- push notifications -----------------------------
// Server-sent Web Push (VAPID). Shows a system notification even when the
// VendorSaathi window is closed.
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = { title: 'VendorSaathi', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || '🔔 VendorSaathi';
  const options = {
    body: payload.body || '',
    tag: payload.tag || 'vendorsathi',          // same tag replaces (no spam)
    renotify: true,                              // replaced notifications re-alert
    requireInteraction: !!payload.requireInteraction,
    badge: '/icons/pwa-192.png',
    icon: '/icons/pwa-512.png',
    vibrate: [200, 100, 200, 100, 400],          // unmistakable while riding
    data: payload.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Tap on the notification → focus the app (or open it) on the relevant screen:
// sync-completion pushes deep-link to the synced timeline WITH the confirmed
// mutation ids highlighted, everything else to Orders.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const isSyncPush = data.type === 'SYNC_COMPLETE';
  let origin = data.origin || '/?screen=orders';
  if (isSyncPush && Array.isArray(data.confirmed) && data.confirmed.length) {
    origin += (origin.includes('?') ? '&' : '?')
      + 'confirmed=' + encodeURIComponent(data.confirmed.join(','));
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: isSyncPush ? 'OPEN_SYNC' : 'OPEN_ORDERS',
            confirmed: isSyncPush ? (data.confirmed || []) : [],
          });
          return;
        }
      }
      return self.clients.openWindow(origin);
    })
  );
});

// Push service expired our subscription — re-subscribe with stored VAPID key
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.getSubscription().then((sub) => {
      if (!sub) return;
      return fetch('/api/v1/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys_p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('p256dh')))),
          keys_auth: btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('auth')))),
        }),
      }).catch(() => {});
    })
  );
});

// ----------------------------- fetch strategies -----------------------------
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // SPA navigations — network first, cached shell when offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Liveness probes must NEVER be answered from cache: the dashboard's
  // sync banner polls /system/health to learn whether the backend process
  // is alive. networkFirstApi would happily return a CACHED "ok" after the
  // server dies, masking the outage forever. Fall through = real network
  // request, real failure when the server is down.
  if (url.pathname.endsWith('/system/health')) return;

  // Backend API — the app calls http://<host>:8002/api/v1 (cross-origin in
  // dev, same-origin in some deploys). Network first, cache fallback so the
  // app still shows orders/stock offline. Responses are stored with
  // Vary: Authorization so one vendor can never see another vendor's data.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstApi(req));
    return;
  }

  // Same-origin static assets — stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req, ASSET_CACHE));
    return;
  }

  // Fonts, Leaflet, Google fonts CDN
  if (/fonts\.(googleapis|gstatic)\.com|unpkg\.com/.test(url.hostname)) {
    event.respondWith(staleWhileRevalidate(req, ASSET_CACHE));
    return;
  }

  // Map tiles (OSM / Photon etc.) — cache-first, mutable bucket
  if (url.pathname.includes('/tile/') || /\.png$|\.jpg$/.test(url.pathname)) {
    event.respondWith(cacheFirst(req, IMAGE_CACHE));
  }
});

// ------------------------------- strategies ---------------------------------
async function networkFirstApi(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const res = await fetch(request);
    if (res && res.ok && res.type !== 'opaque') {
      // Tag the stored copy with Vary: Authorization — Cache API will then
      // only serve it back to requests carrying the SAME auth token.
      const headers = new Headers(res.headers);
      headers.set('Vary', 'Authorization');
      const body = await res.clone().arrayBuffer();
      await cache.put(request, new Response(body, { status: res.status, headers }));
    }
    return res;
  } catch (err) {
    const cached = await cache.match(request); // respects Vary: Authorization
    if (cached) return cached;
    return new Response(
      JSON.stringify({ detail: 'offline — this request has no cached copy' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || network;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    return new Response('', { status: 504 });
  }
}

/*
 * Browser Web Push client.
 * Flow: Permission.request() → PushManager.subscribe(VAPID public key from the
 * backend) → POST /push/subscribe. After that the backend can wake this device
 * with `webpush` whenever a customer places an order.
 */
import { API_BASE } from './api';

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

function urlB64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export interface PushState {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
}

export async function getPushState(): Promise<PushState> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { supported: false, permission: 'unsupported', subscribed: false };
  }
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return { supported: true, permission: Notification.permission, subscribed: false };
  const sub = await reg.pushManager.getSubscription();
  return {
    supported: true,
    permission: Notification.permission,
    subscribed: !!sub,
  };
}

export async function enableOrderPush(): Promise<'granted' | 'denied' | 'unsupported' | 'error'> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    // 1. Ask the user
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    // 2. Get our server's public VAPID key
    const keyRes = await fetch(`${API_BASE}/push/vapid-public-key`);
    if (!keyRes.ok) return 'error';
    const { data } = await keyRes.json();
    const applicationServerKey = urlB64ToUint8Array(data.public_key);

    // 3. Subscribe this browser via the service worker registration
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    // 4. Hand the subscription to the backend
    const raw = sub.toJSON() as any;
    const res = await fetch(`${API_BASE}/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({
        endpoint: raw.endpoint,
        keys_p256dh: raw.keys.p256dh,
        keys_auth: raw.keys.auth,
        user_agent: navigator.userAgent.slice(0, 255),
      }),
    });
    if (!res.ok) return 'error';
    return 'granted';
  } catch (err) {
    console.warn('[push] enable failed:', err);
    return 'error';
  }
}

export async function disableOrderPush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch(`${API_BASE}/push/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ endpoint: sub.endpoint, keys_p256dh: '', keys_auth: '' }),
      });
      await sub.unsubscribe();
    }
  } catch { /* best effort */ }
}

export async function sendTestPush(): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/push/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
    });
    const json = await res.json().catch(() => null);
    return { ok: res.ok && json?.data?.ok !== false, message: json?.data?.message };
  } catch {
    return { ok: false };
  }
}

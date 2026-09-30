/*
 * VendorSaathi PWA runtime.
 * - Registers the service worker (offline caching, app shell).
 * - Keeps <html data-online> in sync so CSS can badge offline state.
 * - Exposes the beforeinstallprompt flow so the app can show its own
 *   "Install VendorSaathi" banner (Add to Home Screen on Android).
 */

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[PWA] service worker registration failed:', err);
    });
  });
}

export function watchOnlineStatus(): void {
  const sync = () => {
    document.documentElement.setAttribute('data-online', String(navigator.onLine));
  };
  sync();
  window.addEventListener('online', sync);
  window.addEventListener('offline', sync);
}

/** Minimal install-prompt controller (Add to Home Screen). */
export interface InstallController {
  canInstall: () => boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  onAvailable: (cb: () => void) => void;
}

let deferredPrompt: any = null;
const listeners = new Set<() => void>();

export function initInstallPrompt(): InstallController {
  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault();          // keep Chrome's default mini-infobar away
    deferredPrompt = e;
    listeners.forEach((cb) => cb());
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((cb) => cb());
  });
  return {
    canInstall: () => !!deferredPrompt,
    promptInstall: async () => {
      if (!deferredPrompt) return 'unavailable';
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      listeners.forEach((cb) => cb());
      return outcome === 'accepted' ? 'accepted' : 'dismissed';
    },
    onAvailable: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}

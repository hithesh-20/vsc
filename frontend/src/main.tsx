import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { registerServiceWorker, watchOnlineStatus, initInstallPrompt } from './pwa'

// Same-origin API under the HTTPS phone mode: when the app itself is served
// over TLS, point API_BASE at this origin's proxied /api/v1 (vite proxies to
// the FastAPI backend on :8000). Keeps every request same-origin + secure —
// mixed-content rules would otherwise block plain http://192.168.148.126:8000.
const isHttpsOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:'
if (isHttpsOrigin && !((import.meta as any).env?.VITE_API_BASE_URL)) {
  (import.meta as any).env.VITE_API_BASE_URL = `${window.location.origin}/api/v1`
}

registerServiceWorker()
watchOnlineStatus()
initInstallPrompt()

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

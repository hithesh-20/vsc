import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// https://vitejs.dev/config/
//
// Plain HTTP by default (`npm run dev`).
//
// `npm run dev:phone` starts the dev server over TLS using the
// mini-CA + leaf certificate generated once by scripts/make-dev-certs.sh.
// Phones need this: service workers / PWA install / push / background sync
// only exist in secure contexts, and an http://<lan-ip> origin is insecure
// while https://<lan-ip> with a trusted CA counts as secure.
// (npm_lifecycle_event makes the trigger cross-platform — no `ENV=1` needed
// on Windows cmd; VITE_HTTPS=1 works as a manual override.)
const httpsEnabled =
  process.env.npm_lifecycle_event === 'dev:phone' || process.env.VITE_HTTPS === '1'

function devHttps() {
  if (!httpsEnabled) return undefined
  try {
    return {
      key: fs.readFileSync('../backend/certs/dev.key'),
      cert: fs.readFileSync('../backend/certs/dev.crt'),
    }
  } catch {
    console.warn('[vite] VITE_HTTPS=1 but backend/certs/dev.{key,crt} missing — run scripts/make-dev-certs.sh first. Falling back to HTTP.')
    return undefined
  }
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    https: devHttps(),
    // Same-origin API under HTTPS: the phone talks only to :3000, and vite
    // proxies /api/* to the FastAPI backend on :8002. (On plain HTTP the app
    // keeps calling :8002 directly — see getApiBase() in services/api.ts.)
    proxy: {
      '/api': {
        target: 'http://localhost:8002',
        changeOrigin: true,
      },
    },
  },
})

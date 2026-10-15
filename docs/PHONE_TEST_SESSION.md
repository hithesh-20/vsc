# Real-Phone Test Session — TEST 6, 7, 8 (PWA over LAN HTTPS)

Everything server-side is already prepared and verified. This runbook is for
the part that physically needs a phone: installing the PWA, granting
notifications, using a real microphone, and closing the app.

**PC state right now** (all verified live):
- App served over TLS: `https://192.168.148.126:3000` (vite `npm run dev:phone`)
- API: same-origin proxy `https://192.168.148.126:3000/api/v1` → FastAPI :8002
- Dev mini-CA: created (`backend/certs/`), downloadable at
  `http://192.168.148.126:8002/api/v1/system/ca` (plain HTTP, always reachable)
- Login QR now advertises the **https** URL (`lan-info.https: true`)
- Push: VAPID keys loaded, `push_subscriptions` table cleaned (0 devices)
- Static IP `192.168.148.126` + firewall rules (3000/8002) confirmed alive
- Fresh vendor token minted for PC-side checks (demo vendor 9876543210 / 1234)

> Why HTTPS matters: service workers, PWA install, Web Push and background
> sync only exist in **secure contexts**. `http://<lan-ip>` is insecure, so
> on plain HTTP all of TEST 6/8 was structurally impossible on a phone.

---

## Phase 0 — Phone bootstrap (one time, ~3 minutes)

Android (Chrome):
1. Phone on the same WiFi as the PC (campus "Alvas WiFi 5G (T)").
2. Open `http://192.168.148.126:8002/api/v1/system/ca` in Chrome
   → downloads `vendorsathi-dev-ca.crt`.
3. Install it: **Settings → Security → More security settings → Encryption &
   credentials → Install a certificate → CA certificate** (path names vary a
   little per OEM; search "install certificate" in Settings). Confirm the
   warning (this is YOUR PC's dev CA, not a public one).
4. Now open **`https://192.168.148.126:3000`** — padlock, no warning. If
   Chrome still warns: fully close Chrome and reopen (cert service refresh).
5. **Install the PWA**: ⋮ menu → **Add to Home screen / Install app**.
   Launch VendorSaathi from the home-screen icon from now on (installed
   PWAs get the most reliable SW + push behavior).
6. Log in: language → English → Continue → `9876543210` → Send OTP →
   Auto-fill (demo) → vendor dashboard.

iPhone (Safari) — plan B, not primary:
- iOS has no user-installable CA profiles via bare file download; use
  Settings → General → VPN & Device Management only after AirDropping the
  `ca.crt` from the PC, then trust it in *Certificate Trust Settings*.
- If that's too fiddly, run TEST 6/7 on Android and TEST 8 can be validated
  on desktop Chrome (same secure-context guarantees over localhost HTTPS).

---

## TEST 6 — Order notifications (real subscription + real delivery)

On the phone:
1. More → ⚙️ Settings → **New Order Alerts** → tap **Enable Alerts**.
2. Accept the browser permission prompt (**Allow**).
3. Card should flip to **Enabled / subscribed** state.
4. (Optional) Put the phone screen-off / app backgrounded now.

On the PC (verification hooks):
```bash
TOK=$(curl -s -X POST http://192.168.148.126:8002/api/v1/auth/login -H "Content-Type: application/json" -d '{"phone":"9876543210","password":"1234"}' | python -c "import json,sys;print(json.load(sys.stdin)['data']['access_token'])")
curl -s -X POST http://192.168.148.126:8002/api/v1/push/test -H "Authorization: Bearer $TOK"
```
- Expect `{"ok": true, "sent": 1, ...}` and a **real notification** on the
  phone (screen-off gets a lock-screen alert; vibration pattern fires).
- Then TEST 8's SW flush with `source:'sw'` should also push a sync summary.

**If delivery fails**: the honest failure appears as
`"1 device(s) registered but delivery failed — re-enable alerts on this
device"` (pywebpush reached FCM and was rejected — usually a stale
subscription after reinstall; Disable → Enable again on the phone).

## TEST 7 — "Saathi" wake word (real mic)

On the phone:
1. Open Ask Saathi (Voice tab mic or the AI bubble — same panel).
2. Tap the 🦻 ear icon → Chrome asks for **microphone permission → Allow**.
3. Status strip shows "Hands-free listening — say "Saathi" then your question".
4. Say **"Saathi"** then, in the same breath, e.g. **"how much did I sell today?"**
5. Expect: transcript captured → streamed reply → spoken TTS answer; the
   wake strip shows "re-arming…" then resumes listening.
6. Also test a plain tap-mic question ("How much tomato stock do I have?")
   and one Kannada phrase ("ಇಂದು ಎಷ್ಟು ಮಾರಾಟವಾಗಿದೆ?").
7. Hands-free survives: lock/unlock the phone once and check the ear stays
   armed when the app is back on screen (it intentionally stops listening
   while backgrounded; wake listening is an on-screen feature).

PC-side: nothing to verify remotely — observe the phone. Console on the
phone (chrome://inspect → inspect the PWA) if anything misbehaves.

## TEST 8 — Background sync with the app CLOSED (the real thing)

On the phone:
1. Confirm online (🟢 Cloud Connected).
2. Turn phone WiFi OFF (or airplane mode) → the Offline banner appears.
3. Record **2 offline actions**:
   - POS Sale: e.g. Tomato ×1 → CASH (bill shows immediately).
   - Voice order: "Saathi … I need 1 kg carrot" → confirm Yes → QUEUED
     receipt (order_number: QUEUED).
4. Keep the app in foreground ~5s (outbox mirrors to IndexedDB + registers
   Background Sync), then **swipe the app away** (Recent apps → swipe) —
   app CLOSED.
5. Turn WiFi back ON. Wait 1–3 minutes (Chrome schedules the `sync` event).
6. Watch the lock screen: a **Web Push summary** should arrive
   ("✓ 2 offline actions synced — ORD-OFF-XXXX · ₹50 …") because the SW
   flushed with `source:'sw'` while no window was visible.

On the PC (truth check after step 6):
```bash
TOK=$(cat /dev/null; curl -s -X POST http://192.168.148.126:8002/api/v1/auth/login -H "Content-Type: application/json" -d '{"phone":"9876543210","password":"1234"}' | python -c "import json,sys;print(json.load(sys.stdin)['data']['access_token'])")
curl -s "http://192.168.148.126:8002/api/v1/sync/history?limit=4" -H "Authorization: Bearer $TOK"
curl -s "http://192.168.148.126:8002/api/v1/orders/vendor?limit=3" -H "Authorization: Bearer $TOK"
```
- `sync/history`: the SALE + ORDER_CREATE rows PROCESSED.
- `orders/vendor`: a NEW `ORD-OFF-…` (the voice carrot order, server-priced).
7. Reopen the app: outbox empty, Cloud Sync audit shows the sync with the
   `via:'sw'` badge, chat greets with the sync confirmation/digest.

**If the push doesn't arrive but history shows PROCESSED**: the sync itself
worked; Chrome can delay the `sync` event. Force it once by opening the app
for 2s (its `online` listener drains the outbox via 'app' path) — the
lock-screen push only fires for the truly-closed flush; retry a second
closed-app round if you want the notification demonstrated.

---

## Plan B — if the phone refuses to trust the CA / install the PWA

- Desktop Chrome + `https://localhost:3000` (secure context, no CA step
  needed if you import the CA into the OS trust store once, or accept the
  warning once) gives: real mic (TEST 7), real SW + push (TEST 6 with the
  desktop notification), and TEST 8's SW drain via the app-close simulation
  (close all app windows → DevTools Application → Service Workers →
  "Sync on next pageview" or `FLUSH_OUTBOX_NOW` from the SW console).
- Android Chrome also accepts `chrome://flags#unsafely-treat-insecure-origin-as-secure`
  with `http://192.168.148.126:3000` (last resort; not recommended — PWA
  install still refuses insecure origins).

## Rollback / day-to-day

- Plain-HTTP dev mode unchanged: `npm run dev` (no certs, no proxy needed,
  API on :8002 directly, QR shows http:// again automatically).
- Regenerate certs after a LAN IP change: `bash scripts/make-dev-certs.sh`
  (leaf SAN must match the IP), then restart `npm run dev:phone`.
- `backend/certs/` is gitignored; keep it that way (private CA key).

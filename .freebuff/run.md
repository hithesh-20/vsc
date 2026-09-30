# VendorSaathi — Preview Run Doc

Two servers: FastAPI backend (port 8000) + Vite React frontend (port 3000).
The frontend calls `http://localhost:8000/api/v1` directly (see `frontend/src/services/api.ts`), so the backend must be running for live data; the frontend falls back to demo data if it is down.

## 1. Reproduce the artifacts (fresh checkout)

1. **Frontend deps** — run in `frontend/`:
   ```bash
   npm install
   ```
2. **Backend deps** — no venv is committed. Either use global Python (needs `fastapi uvicorn sqlalchemy bcrypt python-jose pydantic-settings httpx`) or create one:
   ```bash
   cd backend
   python -m venv .venv
   .venv/Scripts/pip install -r requirements.txt
   ```
   If using the venv, start uvicorn through `.venv/Scripts/python.exe` instead of `python.exe`.
3. **Database** — nothing to copy. `backend/vendorsathi.db` is committed, and the app auto-creates tables + seeds demo data on startup (`app/utils/seed_data.py`). Demo logins: `9876543210`/`1234` (vendor), `9876543220`/`1234` (customer).
4. **Env files** — none required. `backend/.env` is optional (sensible defaults in `app/core/config.py`); no frontend `.env` needed.

## 2. Run the servers (Windows, detached)

**Backend (port 8000):**
```powershell
powershell -NoProfile -Command "(Start-Process -FilePath 'python.exe' -ArgumentList '-m','uvicorn','app.main:app','--port','8000' -WorkingDirectory '<repo>\backend' -RedirectStandardOutput '<repo>\.freebuff\preview-backend.log' -RedirectStandardError '<repo>\.freebuff\preview-backend.log.err' -WindowStyle Hidden -PassThru).Id"
```

**Frontend (port 3000):**
```powershell
powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -WorkingDirectory '<repo>\frontend' -RedirectStandardOutput '<log>' -RedirectStandardError '<log>.err' -WindowStyle Hidden -PassThru).Id"
```
- Use `npm.cmd` (not `npm`) — Start-Process does not resolve shell shims.
- stdout and stderr must go to different files.
- Confirm with `Get-Process -Id <pid>` and wait for `http://localhost:3000` to answer before registering the preview.

**Health checks:** `GET http://localhost:8000/` → JSON `{"status":"online",...}`; `GET http://localhost:3000/` → 200.

## 3. Verify after changes

```bash
cd backend && python -m pytest tests/ -q          # 55 tests (assistant, auth, APIs)
cd frontend && npx tsc --noEmit                    # frontend typecheck
```

Restart the backend after any `app/` change — uvicorn runs without `--reload`.
Live API reference: `docs/API.md` (generated from `/openapi.json`).

## 4. Quick voice-assistant sanity check (live server)

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login -H "Content-Type: application/json" -d '{"phone":"9876543210","password":"1234"}' | python -c "import sys,json;print(json.load(sys.stdin)['data']['access_token'])")
curl -s -X POST http://localhost:8000/api/v1/voice/chat -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"text":"How much did I sell today?","session_id":"smoke"}'
```

## Known quirks (pre-existing, non-fatal)
- Switching roles fires unmounting fetches → console warnings; UI keeps working.
- Map tile/fetch burst can log `ERR_INSUFFICIENT_RESOURCES` in Chrome; tiles still render.
- If port 3000/8000 is busy (other threads may run servers), pick a free port: pass `--port` to uvicorn and `-- --port <n>` to vite (`npm run dev -- --port 5173`).

## Voice Streaming, Wake Word & Receipt Cards (2026-09-24)
- **POST /api/v1/voice/chat/stream** — SSE variant of /voice/chat. Events (each `data: {json}\n\n`):
  `meta` {language} → `delta` {text} (one per word) → `audio_chunk` {seq, audio_base64} (one per sentence, gTTS) → `final` {response, tool_used, data, requires_confirmation, ...}.
  Frontend renders each delta immediately and starts playing sentence-0 audio before later sentences finish synthesizing.
- **Wake word**: 🦻 button in assistant input bar toggles continuous hands-free listening for "Saathi" (saathi/sathi/ಸಾಥಿ/साथी/...). After each command it re-arms automatically. Browser limitation: mic pauses when tab hidden — works while app is foregrounded, not screen-off.
- **Receipt card**: after a confirmed voice order (tool_used=create_order with data.ok), chat shows an ORDER RECEIPT card (order number, item × qty, total) with TRACK ORDER → closes assistant, opens Orders tab (VendorMobileApp voiceTrackSignal).
- Smoke test: `curl -N -X POST localhost:8000/api/v1/voice/chat/stream -H "Authorization: Bearer $TOKEN" -d '{"text":"How much did I sell today?","session_id":"s1"}'` → meta/delta/audio_chunk/final lines.

## Web Push: New Order Notifications (2026-09-24)
- **Endpoints**: GET /api/v1/push/vapid-public-key · POST /push/subscribe (upsert per endpoint) · POST /push/unsubscribe · POST /push/test.
- **VAPID keys**: auto-generated once → `backend/.vapid_keys.json` (or VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY env). Deleting the file regenerates and invalidates old subscriptions.
- **Trigger**: every POST /orders (customer order) → WebSocket NEW_ORDER + Web Push to all active devices of the vendor user (payload type NEW_ORDER, deep link `/?screen=orders`). Dead endpoints (404/410) auto-deactivated; 5 consecutive failures deactivate too.
- **Frontend**: More → Settings → "New Order Alerts" card (OrderAlertsCard.tsx) → Enable Alerts asks permission, subscribes via VAPID key, sends a test push. sw.js handles `push` (shows notification with vibration pattern) and `notificationclick` (focus/open app on Orders).
- **Tests**: backend/tests/test_push.py (4 tests, pywebpush transport mocked).

## Offline Action Queue + Auto-Sync (2026-09-24)
- **Backend**: POST /api/v1/sync/batch-upload now accepts lenient outbox items (client_mutation_id/client_timestamp optional — server derives stable idempotency keys, md5-hashed if >36 chars). New entity type ORDER_STATUS: applies offline accept/pack/deliver; stale replays can NEVER regress a newer server-side status (rank check).
- **Frontend** (`services/offlineSync.ts`): durable localStorage outbox (`vs_offline_queue_v2`, migrates legacy `vs_offline_queue`). enqueue() for offline SALE / ORDER_STATUS / INVENTORY actions (POS sale, Accept Order, stock correction in VendorMobileApp). flush() pushes the batch, drops only server-confirmed items, retries failures. Auto-flush on `online` event + every 30s while backlog exists + Sync Now button. Stale-token resilience via setAuthTokenRefresher (re-login probe on 403).
- **UI**: "⚡ N Queued" badge is now live-driven by sync state; header offline banner unchanged.
- **Verify**: `python -m pytest backend/tests/test_sync.py -q` (3 tests: lenient schema + idempotent replay, ORDER_STATUS sync + stale-no-regress, unknown order/status failures). Live: enqueue 2 offline actions → Sync Now → sync_queue rows PROCESSED, sale row is_synced=1, outbox empty.

## Offline-Sync Audit Screen (2026-09-24)
- **GET /api/v1/sync/history?limit=N** — audit trail of recent mutations with status (PROCESSED/FAILED/CONFLICT), error_message, timestamps, payload. Test: backend/tests/test_sync.py::test_sync_history_returns_items_and_failures (66 tests total).
- **SyncAuditScreen.tsx** — More → Cloud Sync. "Queued on this device" cards show summary + attempts risk badge + per-item Retry (via retryOne → immediate server verdict) and Discard buttons; "Server sync history" lists processed/failed with clear reasons and a failed-count chip. offlineSync gained inspect()/retryOne()/remove()/fetchHistory().
- Header "⚡ N Queued" badge now click-through to this screen.

## Offline Money Actions: Udhaar + Voice Orders (2026-09-24)
- **Backend**: new ORDER_CREATE sync entity — offline voice orders become real PENDING orders on flush (items matched by name via assistant's find_product, priced at CURRENT server prices, unique ORD-OFF-XXXXXXX numbers, walk-in customer fallback). SALE handler now also creates the UdhaarLedger entry for UDHAAR-mode sales (parity with online endpoint; was silently missing before). ORDER_CREATE idempotency keys include item composition. Tests: test_offline_udhaar_sale_creates_ledger, test_offline_voice_order_becomes_real_order (68 total).
- **Frontend**: offlineAssistant.detectOfflineAction() parses voice orders ("I need 2 kg tomato", "ನನಗೆ 3 ಕೆಜಿ ಟೊಮೇಟೊ ಬೇಕು") and udhaar ("add 200 rupees udhaar for Mahesh") in en/kn/hi — runs BEFORE the read-only cache logic; tryOfflineAnswer returns {queued} and FloatingVoiceAssistant enqueues it + shows an amber "⏳ QUEUED — OFFLINE" receipt card (price "₹—" until synced, no TRACK button yet). POS UDHAAR sales, standalone voice udhaar, and voice orders all flow through offlineSync outbox → auto-sync → /sync/batch-upload.

## Background Sync (2026-09-24)
- SW v1.4.0: 'sync' listener (tag `vs-outbox-sync`) flushes the outbox from **IndexedDB** (`vs-outbox-db/kv/mirror`: items + token + login credentials + api_base — SWs can't read localStorage). Handles 403 by re-login + retry once; re-reads the mirror before pruning (safe for mid-flush enqueues); broadcasts OUTBOX_SYNCED to live clients.
- offlineSync: enqueue()/flush() now mirror to IDB + `requestBackgroundSync()` (SyncManager; Firefox/Safari fall back to the in-app 30s loop). `setLoginCredentials()` publishes SW re-login creds. adoptServerPrune() applies SW-side pruning to localStorage on next load.
- VendorMobileApp passes loginPhone/loginPin to setLoginCredentials at startup.
- Manual SW-path trigger for testing: postMessage({type:'FLUSH_OUTBOX_NOW'}) to reg.active.
- **Verified live**: order queued offline with total ₹0 → SW alone flushed it → server priced from catalog (3kg onion → ₹120) → ORD-OFF-… PENDING, mirror+localStorage empty. Also fixed server-side pricing for zero-total offline orders (test_offline_voice_order_priced_by_server; 69 tests total).

## Full QA Pass + Phone Testing Script (2026-09-25)
- QA results (all live): login OTP flow PASS · voice order streaming+receipt+track PASS · maps PASS after fixing the 10,282 km bug (placeholder "collect at cart" addresses no longer geocoded; show "🛒 Pickup at cart" instead; Photon biased to vendor + 250km sanity cap; tsc clean) · sync audit PASS · push endpoints PASS (preview browser denies permission — env limit) · offline POS sale + voice order PASS (queued → auto-synced: sale ₹50 is_synced=1, ORD-OFF-544D96 priced ₹35 by server). Note: tomato demo stock depleted to 0 by testing (orders refuse honestly) — restock via products API if needed.
- **docs/PHONE_TESTING_SCRIPT.md** — non-technical Android + airplane-mode test script (8 tests, pass criteria, PC IP 192.168.148.126:3000).

## Sync Completion Notifications: Chat + "✓ Synced" Toast (2026-09-25)
- **Backend**: SyncProcessedItem now carries `server_order_number` + `server_total_amount` for ORDER_CREATE results — the device learns the REAL order number and server-priced total at flush time, no extra fetch. Tests extended (test_offline_voice_order_becomes_real_order, test_offline_voice_order_priced_by_server; 69 pass).
- **offlineSync.ts**: `enqueue()` returns the mutation id. New `SyncedAction {type, kind, label, orderNumber?, total?}` + `onSyncComplete(cb)` — fired from two paths: (a) in-app `flush()` maps batch results to outbox entries; (b) SW `OUTBOX_SYNCED` handler reads v1.4.1 `details` map (per-id order_number/total captured by the SW at flush time, even while the app was closed) and summarizes from the outbox BEFORE adoptServerPrune prunes it.
- **FloatingVoiceAssistant**: subscribes to onSyncComplete → appends "✓ Your offline order synced — ORD-OFF-XXXXXX · ₹N. You can track it now!" (9 languages via SYNCED_TEXT) + speaks it; ALSO flips the amber ⏳ QUEUED receipt card in place to a green CONFIRMED one (real order no/total, TRACK ORDER enabled) by matching receipt.mutationId (enqueue now returns the id).
- **VendorMobileApp**: green "✓ SYNCED TO SERVER" toast top-center, one per confirmed batch (up to 4 lines + "+N more"), order number + ₹total for voice orders, auto-dismiss 5s.
- **sw.js v1.4.1**: OUTBOX_SYNCED message now includes `details: {mutation_id: {order_number, total}}` extracted from batch results.
- **Verified live**: backend killed → "I need 3 kg onion" queued (₹0 unknown) → backend restarted → toast `SYNCED TO SERVER · ORD-OFF-592989 · ₹120 · voice order` captured, chat message + receipt upgraded to CONFIRMED with ₹120 (server-priced), TRACK ORDER live, outbox drained. tsc clean.

## QA Bug Fixes: Language-Gate Copy + ₹NaN Sales Surge (2026-09-25)
- **Language gate subtitle** (i18n.ts): was customer copy "Shop from street vendors…" on the vendor-only build. Now vendor onboarding copy in en/kn/hi ("Run your entire business in your language — sales, udhaar, routes"); other languages fall back to English.
- **₹NaN in Est. Sales Surge** (Smart Route card): root cause was the backend response model `LocationRecommendation` filtering out `estimated_turnover_inr`/`high_demand_products`/`saturated_products` from the live API response (demo data had them, live data didn't → formatLocalizedCurrency(undefined) → ₹NaN). Added the three fields to the schema (backend/app/schemas/mobility.py) + a Number.isFinite guard in VendorMobileApp. Verified live: card now shows ₹2,340 (₹೨,೩೪೦ in kn digits) and the real high-demand product from the API. 69 tests pass, tsc clean.

## Synced Timeline on the Audit Screen (2026-09-25)
- **offlineSync.ts**: every sync completion is now persisted to a device-side log (`vs_sync_log_v1`, newest-first, cap 100) as `SyncLogEntry {at, via: 'app'|'sw', actions: SyncedAction[]}` — captured in emitSyncComplete (in-app flush) and a new emitSyncCompleteFromSw (SW-reported OUTBOX_SYNCED), so the timeline records background drains that happened while the app was closed. Exposed via `syncLog()`.
- **SyncAuditScreen.tsx**: new "✓ Synced timeline" card between the outbox and server history — vertical timeline spine with green node dots, one event per confirmed batch: "✓ Synced 10:28 PM" (+ "⚡ app was closed" blue badge when via='sw'), bullet lines "Voice Order — ORD-OFF-XXXXXX · ₹N" (real order number + server-priced total) or "Kind — summary" for sales/stock/udhaar. Live-updates via the existing onSyncStateChange listener; total confirmed count in the header. Other languages/dates fall back gracefully (non-today dates show "25 Sep, 10:28 PM").
- **Verified live**: killed backend → queued "1 kg carrot" (₹0) → backend restarted → auto-flush → timeline entry appeared (via 'app', ORD-OFF-6ED085 · ₹50); SW-path badge verified with an entry for the earlier background flush (ORD-OFF-592989 · ₹120). tsc clean.

## Lock-Screen Push on Background SW Sync (2026-09-25)
- **Flow**: when the SW flushes the outbox while the app is CLOSED, the server now sends the vendor a Web Push (VAPID) summary — "✓ Offline work synced — Order ORD-OFF-XXXXXX ₹N · … (+k more)" — so offline work is confirmed even with no screen on. When a visible app window exists, the SW sends source='app' (default) and the open app shows the toast/chat itself; no push.
- **Backend**: SyncBatchRequest.source ('app'|'sw'). SyncService.process_offline_batch(source=…) → after processing, source='sw' & success_count>0 → _send_sync_push: notify_user(vendor.user_id, {type: SYNC_COMPLETE, title "✓ Offline work synced", body = up to 3 outcome lines (order numbers + totals from server_order_number/server_total_amount; "POS sale"; entity labels) + "+N more", tag vs-outbox-sync, deep link /?screen=more}). Best-effort, logged, never fails the sync.
- **SW v1.5.0**: flushOutboxFromIdb checks clients.matchAll visibility — any visible window → source 'app' (no push); none visible (app closed/hidden) → source 'sw' in the batch body.
- **Tests**: test_push_sent_on_background_sw_sync (SYNC_COMPLETE pushed, body carries ORD-OFF-… and ₹), test_no_push_for_in_app_sync. 71 backend tests pass; tsc clean. Live-verified: source='sw' batch → push dispatch executed (dev DB holds a stale pytest subscription so pywebpush errored on the fake key — the real-subscription path is covered by the mocked test).
- Note: sw 'push' handler already renders any payload (title/body/tag/data.origin) — no SW change needed for display; notificationclick deep-links to More.

## Phone Script: Synced-Toast/Chat Verification (2026-09-25)
- docs/PHONE_TESTING_SCRIPT.md TEST 5 extended: after airplane mode goes off it now verifies (1) the green "✓ SYNCED TO SERVER" toast with ORD-OFF-… + real price (~5s auto-dismiss), (2) the chat "✓ Your offline order synced — ORD-OFF-… · ₹N" message + amber→green CONFIRMED receipt upgrade with TRACK ORDER, (3) the Cloud Sync "Synced timeline" entry — plus scorecard row renamed. Note added: missing the 5s toast is still a pass; chat + timeline prove the same sync.

## Schema-Stripping Audit (₹NaN root-cause sweep) (2026-09-25)
- Method: enumerated every frontend fetch (VendorMobileApp loadAllData's 10 endpoints, VendorTerminal, VillageCartMap, voice chat, offlineSync, pushService, auth service) → matched each to its backend response_model → diffed fields the UI reads against fields the model declares.
- **Found + fixed** (backend/app/schemas/mobility.py, LocationRecommendation): `google_maps_url` (the Route AI tab's Maps button was silently losing the server-computed driving URL and falling back to a hand-built link), `cannibalization_risk_percent`, `route_strategy` — same silent-strip class as the ₹NaN bug. Verified live: response now carries all three; Route AI tab renders 6 Google Maps buttons, no NaN/undefined.
- **Verified clean** (fields survive response models): /vendors/dashboard-summary (DashboardSummary covers all 8 fields the dashboard + voice summaries read), /orders/vendor (OrderResponse incl. items + customer_name/phone), /products (ProductResponse incl. category_name via model_validator), /udhaar (UdhaarSummary.records), /mandi/rates + /credit-scorecard, /weather/* and /mobility/fleet-dispatch + /predict-location (Dict[str,Any] — unfiltered), /voice/chat (VoiceChatResponse covers response/language/tool_used/data/requires_confirmation/audio via SSE), /mobility/route-optimize, WebSocket ORDER_STATUS_UPDATE frames. Note: incomingOrderAlert.order.distance_km is demo-only (triggerSimulateIncomingOrder mock) — no live producer strips it. VendorTerminal is legacy/superseded by VendorMobileApp.

## Synced Timeline: Server-History Merge (2026-09-25)
- The device-only timeline (vs_sync_log_v1) is now merged with completions reconstructed from GET /sync/history, so past syncs are reviewable even after reinstall/new phone. serverTimeline() groups server PROCESSED rows into per-minute buckets (one flush ≈ one event) via shared describeMutation() labels (exported from offlineSync — the old private summarize() now delegates to it). mergeTimelines() dedupes by client_mutation_id (device log wins → keeps its 'via' badge) and sorts the whole timeline newest-first. fetchHistory raised 25→50 for deeper past.
- New 'via' value 'server' renders a grey "from server history" badge (blue "⚡ app was closed" and no badge = live app flush unchanged). Voice-order lines from server history carry order_number/total from the payload.
- Verified live: timeline shows 41 confirmed — device events (ORD-OFF-592989 app-was-closed, ORD-OFF-6ED085) + server-history events from earlier QA runs (05:19 PM bucket: 2 voice orders + SALE), strictly newest-first, no duplicates. tsc clean.

## Sync Push: Timeline Deep Link + Phone Test (2026-09-25)
- Tapping the "✓ Offline work synced" lock-screen push now lands on the synced timeline, not the dashboard: backend payload origin /?screen=more → /?screen=sync; sw.js notificationclick sends OPEN_SYNC (vs OPEN_ORDERS) for SYNC_COMPLETE data.type; VendorMobileApp handles OPEN_SYNC + ?screen=sync cold start → More → Cloud Sync (?screen=orders path unchanged). SW serves the same script (no bump needed).
- docs/PHONE_TESTING_SCRIPT.md Test 8 step 4 added: with alerts enabled, a closed app + airplane-mode-off should produce the "✓ Offline work synced" notification mentioning what synced; tapping it opens More → Cloud Sync timeline (timing caveat noted — Chrome may sync only on next open; still a PASS).
- Verified live: ?screen=sync cold start lands directly on the Cloud Sync audit screen with the 41-action timeline; SW serving OPEN_SYNC path; tsc clean; 13 push+sync tests pass.

## Phone Script: Sales Surge + Toast/Chat Steps (2026-09-25)
- docs/PHONE_TESTING_SCRIPT.md: TEST 1 renamed "Login + healthy dashboard" — adds the language-gate vendor-copy check and the 🚀 AI Smart Route "Est. Sales Surge" check (normal ₹ amount, never ₹NaN; Carry High Demand shows a real product). TEST 5 adds a post-sync re-glance at the same card (no ₹NaN after live refresh) between the toast and chat steps; items renumbered (10 Orders tab, 11 Udhaar ledger). Scorecard rows 1 and 5 updated to carry the new checks.
- (TEST 5 already verified the ✓ synced toast + chat confirmation + receipt upgrade from the earlier turn — this request completes it with the Sales Surge card, which had no phone coverage.)

## Synced Timeline: Share/Export + Clear (2026-09-25)
- SyncAuditScreen timeline header gains two actions (visible when the timeline has entries):
  **Share** (Share2 icon) → builds a plain-text record ("VendorSaathi — Sync record / Exported … / N action(s) confirmed" + per-event "✓ Synced <date time> (synced while app was closed)" + bullets "Voice Order [ORD-OFF-…] ₹N — label") and uses navigator.share when available (phone: WhatsApp/SMS sheet), falling back to clipboard copy with a note. Verified: exported text contained all 41 actions incl. ORD-OFF numbers, totals, SW annotation.
  **Clear** (Eraser icon) → window.confirm guard → clearSyncLog() wipes only vs_sync_log_v1; timeline re-merges instantly and the 40 server-history events survive (badge flips to "from server history"); note explains the server record is unchanged. offlineSync gained clearSyncLog(); state renamed mergedLog for clarity. tsc clean.

## Chat: Daily "✓ N actions synced" Digest (2026-09-25)
- Opening the assistant now shows ONE recap message of everything the server confirmed today, straight from the device sync log (offlineSync.syncLog()): Kannada/localized header via new DIGEST_TEXT (9 languages, "✓ 25 September — ಸರ್ವರ್ 2 ಕ್ರಿಯೆಗಳನ್ನು ಸ್ವೀಕರಿಸಿದೆ. ಎಲ್ಲವೂ ಸುರಕ್ಷಿತ!") + a green "✓ SYNC RECORD — TODAY" checklist card (up to 5 items: "Voice Order — ORD-OFF-… · ₹N" / "POS Sale — …", "+N more" beyond).
- Once-per-day guard: vs_digest_done_v1 stores today's date string when shown; same-day re-opens never add another digest (verified: close+reopen → count stays 1), while the existing message stays in scrollback like a chat receipt. New day → new digest. Silent when nothing synced today; never speaks aloud (visual only). FloatingVoiceAssistant: ChatMsg.digestLines + buildDigest() + isOpen effect; rendered above the confirm buttons.
- Note: digest reads the DEVICE log (vs_sync_log_v1) — server-history-only events (post-reinstall) are intentionally not recapped in chat; they live in the audit timeline. tsc clean; live-verified header/items/once-per-day.

## Cloud Sync At-a-Glance Badge (2026-09-25)
- The "📒 Cloud Sync" sub-tab in the More menu now carries a small floating badge with sync health:
  - **Pending backlog** → amber pulsing "⚡N" (N = queued actions) — go look, something is waiting.
  - **All clear** → green "✓ HH:MM" (lastSyncedAt time) — the server confirmed everything as of this time.
  - Hidden entirely when nothing has ever synced this session and the outbox is empty (fresh install, nothing to say).
- Implementation: VendorMobileApp tracks lastSyncedAt (new state) alongside the existing offlineQueue count via the same onSyncStateChange listener + initial offlineSync.status() read; badge is absolutely positioned on the sub-tab button. Verified live both states: amber ⚡1 while a test INVENTORY action was queued, green ✓ 11:43 PM after the auto-flush drained it. tsc clean.
- Note: lastSyncedAt resets to null on page reload until the next flush completes (module state, not persisted) — the badge then hides until something syncs; acceptable since the timeline card in Cloud Sync holds the durable record.

## Phone Script: Timeline-Update Step (2026-09-25)
- docs/PHONE_TESTING_SCRIPT.md TEST 5 now verifies the synced timeline updates BY ITSELF after airplane mode goes off: new top entry with green node + "✓ Synced <time>" listing the just-synced actions, header count goes up, no manual refresh. Added a Share/export cross-check step (copied text matches the timeline = shareable proof), renumbered the Orders/Udhaar steps (12–14), refreshed the miss-the-toast tip to mention the Cloud Sync tab's ✓ time badge, and updated scorecard row 5.

## Phone Script: Lock-Screen Sync Push Step (2026-09-25)
- docs/PHONE_TESTING_SCRIPT.md TEST 8 extended: now queues BOTH a POS sale AND an offline voice order ("I need 1 kg carrot") before closing the app, and the lock-screen push pass criteria explicitly expect the order named as "Order ORD-OFF-… ₹N" (server-priced total) alongside "POS sale". Both actions must land in the Synced timeline with real numbers (scorecard row 8 renamed accordingly). The airplane-mode → queue → close → reconnect flow itself was already present; this makes the order+push coverage explicit per the request.

## SYNC_COMPLETE Deep-Link Highlight — Verified End-to-End (2026-09-26)
- Final live verification of the push → `/?screen=sync&confirmed=<ids>` → SyncAuditScreen highlight chain, after Freebuff restart: backend (8000) + frontend (3000) relaunched.
- Method: seeded a fresh offline ORDER_CREATE via the outbox (`hl-muim3jj4`), let the app flush it (client sync log got the entry), then cold-loaded `/?screen=sync&confirmed=hl-muim3jj4`.
- Debug instrumentation (console logs in the deep-link effect, the audit screen's retry effect, and onHighlightDone) proved the full cycle on a clean load: `cold-start parse → openScreen → state = (more, sync, [ids]) → highlight effect on → retry loop finds the row → scrollIntoView + flashOn → 6s window → onHighlightDone → ids cleared`. Probes captured the flash window twice: `data-highlighted=true` rows = 1, `animate-pulse-once` class present, "from your notification" chip visible.
- Screenshots confirm the cold start lands on the Offline Sync Audit screen with the just-synced order at the top of the Synced timeline ("Voice Order — ORD-OFF-A22447 · ₹50"). The emerald ring is transient (6 s) and the screenshot round-trip usually lands just after it; the DOM probes are the authoritative evidence.
- Instrumentation removed afterwards (grep clean), `tsc --noEmit` clean.
- **Root cause found and fixed along the way:** a temporary debug useEffect placed above the `syncHighlightIds` useState caused a TDZ ReferenceError ("Cannot access 'syncHighlightIds' before initialization") that crashed the vendor app under HMR — the earlier "app resets to Home" symptom was this crash + Fast-Refresh remounts racing the probes, not a logic bug. The retry-until-found effect from last turn works as designed.
- `frontend/public/sw.js` VERSION bumped v1.5.0 → **v1.5.1** (notificationclick changed last turn; forces phones to pick up the new SW).
- Backend tests: **71 passed** (full suite); backend now started with `--host 0.0.0.0` (see below).

## Phone-on-WiFi: Shared API_BASE Everywhere + LAN-Bound Backend (2026-09-26)
- Replaced every hardcoded `http://localhost:8000/api/v1/...` fetch with the shared `API_BASE` from `frontend/src/services/api.ts` — **41 call sites across 3 components**: VendorMobileApp.tsx (23), VendorTerminal.tsx (17), VillageCartMap.tsx (1). Single-quoted URLs converted to `` `${API_BASE}/...` `` template literals; import auto-inserted (all three already had one).
- `getApiBase()` already did the right thing: `VITE_API_BASE_URL` env override → on a non-localhost hostname uses `window.location.hostname:8000` (so a phone browsing `http://192.168.148.126:3000` automatically targets `http://192.168.148.126:8000`) → localhost fallback for PC dev. Only the intentional default inside `getApiBase()` still mentions localhost (grep-verified).
- Backend now listens on **0.0.0.0:8000** (was 127.0.0.1) — `curl http://192.168.148.126:8000/` returns 200, so phones on the same WiFi can reach the API. Frontend dev server already runs with `--host`.
- `tsc --noEmit` clean; live reload verified (vendor dashboard renders, SW serving v1.5.1).

## MySQL Workbench Migration — Backend MySQL-Ready + Importable Dump (2026-09-26)
- **Engine layer** (`backend/app/core/database.py`): dialect-aware config — SQLite keeps `check_same_thread=False`; MySQL URLs (`mysql+pymysql://…`) get `pool_pre_ping`, `pool_recycle=3600`, `pool_size=5`, `max_overflow=10` so overnight idle timeouts can't kill the app. `config.py` DATABASE_URL comment now documents the `.env` MySQL one-liner. **No .env = SQLite exactly as before** (tests hermetic, demo mode unchanged).
- **Dump generator** (`backend/scripts/generate_mysql_dump.py`): compiles CREATE TABLE DDL from the SQLAlchemy models via the MySQL dialect (so schema always matches the code), copies every row out of the live SQLite demo DB with MySQL-safe escaping (backslash, quotes, newlines, NULs; datetimes as `YYYY-MM-DD HH:MM:SS.mmm`, JSON as string literals, bools as 0/1), wraps in `CREATE DATABASE IF NOT EXISTS vendorsathi` + `USE`, utf8mb4/utf8mb4_unicode_ci + InnoDB on every table, `FOREIGN_KEY_CHECKS=0` guard + FK-ordered inserts → re-runnable import.
- **Generated dump**: `backend/scripts/vendorsathi_mysql_dump.sql` — 248 KB, 17 tables, 968 rows (3 vendors, 42 products incl. Kannada names, 68 sales + items, 158 orders + items, udhaar, sync audit trail, demo logins commented at the bottom). Validated: 115 statements, 0 unbalanced parens, every INSERT target has DDL, quotes balanced; spot-checked DDL (sized VARCHAR, ENUM, DATETIME, indexes). Import via Workbench: Server → Data Import → Self-Contained File → Start Import (creates the schema itself).
- **Driver**: `pymysql>=1.1.0` added to requirements.txt (only needed when DATABASE_URL targets MySQL; not installed locally yet — no MySQL server is running on this machine, so live-against-MySQL was not possible here).
- **Guide**: `docs/MYSQL_WORKBENCH_SETUP.md` — import steps, `.env` line (`DATABASE_URL=mysql+pymysql://root:PASSWORD@localhost:3306/vendorsathi?charset=utf8mb4`), verification queries, demo logins table, dump re-generation command. charset=utf8mb4 note for Kannada text round-trip.
- User plan: they will import the dump into MySQL Workbench themselves ("after all done I'll upload the workbench one"); when they do, dropping the `.env` line + `pip install pymysql` is all that remains.
- Verified after DB-layer changes: backend restarted on 0.0.0.0:8000 → 200, full test suite 71 passed (SQLite path), app live in preview against the restarted backend.

## Phone Script: WiFi URL Explained + IP-Recovery Steps (2026-09-26)
- docs/PHONE_TESTING_SCRIPT.md STEP 0 rewritten for the WiFi/API_BASE work: now shows the full `http://192.168.148.126:3000` URL, explains in plain language that it's the computer's address on the WiFi ("phone number" analogy) and that the phone only ever types ONE address (the app auto-targets the same PC on port 8000 after login — matches getApiBase()'s hostname behavior).
- New subsection "If the page doesn't load: the computer's address may have changed": step-by-step `ipconfig` → IPv4 Address walkthrough for non-technical testers (Windows key → cmd → ipconfig → Wireless LAN adapter Wi-Fi → IPv4), how to re-type the URL with the new number, plus an ordered checklist (same WiFi name, servers running via localhost:3000 check, Windows Firewall allow 3000+8000) and a DHCP-reservation tip to pin the IP forever.
- "You need" list gained the URL line pointing at STEP 0. Verified `ipconfig` still reports 192.168.148.126 — documented URL is current. Doc-only change; no code touched.

## Login-Screen QR: Phones Join by Scanning, Zero Typing (2026-09-26)
- **Backend — new unauthenticated `backend/app/api/v1/endpoints/system.py`** (router registered as `/system` in api_router.py):
  - `GET /api/v1/system/lan-info` → `{success, data:{lan_ip, frontend_port, app_url, is_lan}}`. `get_lan_ip()` uses the UDP-connect trick (connect() to 10.255.255.255 — no packets sent) to ask the OS which adapter routes to the LAN, filtering 127.*/169.254.* with hostname fallback; `app_url = http://<lan-ip>:<FRONTEND_PORT>` (new setting `FRONTEND_PORT: int = 3000` in config.py). `is_lan` is False on loopback so the frontend can hide a useless QR.
  - `GET /api/v1/system/lan-qr` → the QR as `image/svg+xml` (qrcode lib, SvgPathImage factory, box_size 10, border 2), encoding the same `app_url`; 503 with a helpful error if `qrcode` isn't installed. `qrcode>=7.4` added to requirements.txt (installed locally).
  - Live: `/system/lan-info` returns `{lan_ip: 192.168.148.126, app_url: http://192.168.148.126:3000, is_lan: true}` on both localhost and the LAN IP; QR SVG verified byte-level.
- **Tests**: new `backend/tests/test_system.py` (shape of lan-info incl. IPv4 regex + no link-local + is_lan consistency; QR is real SVG with a >500-char module path). Full suite now **73 passed**.
- **Frontend — `OnboardingScreens.tsx` language step**: after the language grid, a collapsible card (QrCode icon) "Open on your phone — scan, no typing" + the live URL, an `<img src={API_BASE}/system/lan-qr>` QR (loads only when `is_lan`), and English + Kannada camera instructions. Fetched once via `GET ${API_BASE}/system/lan-info`, hidden entirely when backend is down or on loopback; HIDE/SHOW toggle defaults open.
- Live-verified in preview: card renders on the language screen with `http://192.168.148.126:3000` and the QR image loads (`naturalWidth > 0`); screenshot captured the card under the language grid. QR payload correctness is by construction — lan-qr encodes the exact `app_url` that lan-info returns (curl-checked).
- Note: to see the login screen again in the preview I cleared `vs_app_session`/`vs_vendor_token`/`vs_vendor_user`, then restored the vendor demo session via the OTP API (request → verify with demo_code → rebuild vs_app_session + vs_vendor_user from /vendors/profile) — dashboard confirmed back to normal afterwards.
- docs/PHONE_TESTING_SCRIPT.md STEP 0 now leads with the QR as the easiest path ("open the app on the computer and scan"), with manual typing kept as fallback; steps renumbered 1–5; wording fixed to "address at the top of this section". tsc clean throughout.

## Static IP Pinned via netsh + Diagnosis (2026-09-26)
- **Diagnosis** (measured): campus WiFi "Alvas WiFi 5G (T)", DHCP pool 192.168.128.0/19 (~8.2k addresses, gateway 192.168.150.1), `PrefixOrigin: Dhcp`, lease ~22–24h → the address is re-drawn from the pool on every lease expiry/reconnect; nothing pins it between "router restarts". Router-side reservation impossible (no admin over campus DHCP) → pinned on the PC.
- **Exact commands applied (admin, via scripts/pin_wifi_ip.bat)**:
  - `netsh interface ipv4 set address name="Wi-Fi" static 192.168.148.126 255.255.224.0 192.168.150.1`
  - `netsh interface ipv4 set dnsservers name="Wi-Fi" static 8.8.8.8 primary validate=no`
  - `netsh interface ipv4 add dnsservers name="Wi-Fi" 8.8.4.4 index=2 validate=no`
  - Values mirror the previous DHCP lease exactly. Verified after: `DHCP enabled: No`, `PrefixOrigin: Manual`, gateway/DNS intact, internet (DNS 8.8.8.8) working, backend + frontend reachable on 192.168.148.126 (both 200).
- **Elevation debugging journey** (for future turns): two elevated runs of the .bat silently did nothing (exit 0, no effect, no output captured) — the elevation helper mangles commands with quoted/spacey paths. Working pattern: stage the script at a **spaceless path** (C:\Users\Public\…), elevate `powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Public\<script>.ps1` (no quoting needed), log via Start-Transcript. Also: a PS 5.1 parse error on `?.` (null-conditional, PS7-only) failed the first .ps1 — write 5.1-compatible script. Staged scripts cleaned up after; kept in repo as scripts/pin_wifi_ip.bat (self-logging) + scripts/allow_phone_firewall.ps1.

## Phone Onboarding Fixed: Firewall Was Eating the OTP (2026-09-26)
- **Root cause of "language → number → nothing happens" on phones**: React flow itself is strictly sequential (splash→language→phone→otp→signup→dashboard; code re-verified). Real blocker: WiFi profiles as **Public** with **zero inbound rules for 3000/8000** — the phone loaded the UI from :3000 but every OTP POST to :8000 was silently dropped by Windows Firewall (fetch TypeError, previously swallowed as a vague "Failed to send OTP").
- **Fix 1 — firewall**: two scoped inbound allow rules added (admin, idempotent, verified): `VendorSaathi Frontend (3000)` + `VendorSaathi Backend (8000)`, TCP, profiles Domain+Private+Public, `remoteip=192.168.128.0/19` (campus subnet only). Saved to repo as scripts/allow_phone_firewall.ps1.
- **Fix 2 — UX**: OnboardingScreens now hides the QR card entirely when the app itself is viewed from a non-localhost host (phones see a clean language picker first; scanning your own screen is pointless); OTP send failures that are network TypeErrors now show a plain bilingual message ("Cannot reach the server — check the computer is on and both devices are on the same WiFi" / Kannada) instead of a generic error.
- **Live proof over the LAN URL (what a phone sees)**: http://192.168.148.126:3000 with cleared session → language screen (QR hidden) → English → Continue → phone step → typed 9876543210 → Send OTP **succeeded across the port-8000 boundary** → OTP step with 6 boxes + demo code → Auto-fill → vendor dashboard (role VENDOR). tsc clean.
- New doc docs/STATIC_IP_SETUP.md records the full diagnosis, exact netsh + firewall commands, verification steps, rollback, and caveats (campus re-numbering; different WiFi → back to DHCP).

## Phone Test Run: 8-Test Scorecard over LAN URL (2026-09-27, partially cut off)
Ran the full phone script against http://192.168.148.126:3000 (390×844 phone viewport). Results:
- **TEST 1 PASS** — OTP login over LAN (firewall fix holds); language-gate vendor copy; Smart Route card: Surge ₹2,340 (no ₹NaN), Carry = Onion.
- **TEST 2 PASS** — Floating assistant: "I need 2 kg carrot" → confirm card → Yes → ORD-VOICE-9D2E created (Carrot ×2, ₹100, server-priced); order at top of Orders tab.
- **TEST 3 PASS** — Maps modal: voice order shows "🛒 Pickup at cart · 0.0 km"; real-address order (ORD-0822-A101, "#42 3rd Cross") shows Leaflet map, 0.4 km, blue **Navigate** button.
- **TEST 4/5 PASS (core)** — Offline banner appears with simulated offline; outbox seeded with SALE ₹65 + voice order; Sync Now drains it (remaining 0), timeline top entry = "SALE/Walk-in Test4 · ₹65 + ORDER_CREATE/potato ×1 kg · voice", chat showed "✓ Offline POS Sale synced" + daily digest "✓ 27 September — server confirmed 2 actions… SYNC RECORD — TODAY" card with both items; ORD-OFF-BBCF39 ₹35 visible in Orders; digest once-per-day marker verified (delete → digest reappears).
- **TEST 6/7 (env-limited, deferred)** — notification permission is denied in this preview env and mic/wake word needs a real device: not runnable here, needs phone.
- **TEST 8 (partially verified)** — SW drain path unchanged since v1.5.1 verification; needs the app-closed scenario on a real phone.
- Findings fixed/confirmed during the run: Send OTP previously died silently (firewall, fixed); the Voice bottom tab's bespoke Send button never fired (dead UI — superseded by the integration below); flush() correctly refuses while navigator.onLine is false (simulated offline needed outbox seeding + Sync Now after restoring online — app behavior is correct).

## ONE Assistant: Voice Tab & "Ask Saathi AI" Unified (2026-09-27)
- **Problem**: two parallel voice UIs — the strong FloatingVoiceAssistant ("Ask Saathi AI": streaming /chat/stream, ORDER RECEIPT cards with offline-queue→CONFIRMED upgrade, daily sync digest, "Saathi" wake word, offline answer cache) and an older bespoke modal wired to the bottom-bar Voice mic (own /voice/query call, own message state, equalizer banner, language chips) whose Send button didn't even fire (found during the phone test run). Functionality and history were duplicated and diverging.
- **Fix — one component, two doors**:
  - FloatingVoiceAssistantProps gained `open?: boolean` + `onOpenChange?: (open) => void`. The component is controlled when `open` is provided, self-managed otherwise: `isOpen = open !== undefined ? open : isOpenState`; `setIsOpen` wrapper routes internal setState only in uncontrolled mode and always calls onOpenChange. All internal logic (open/close effects, wake word teardown, stopSpeaking on close) keeps working unchanged because everything reads `isOpen`.
  - VendorMobileApp: the bottom-bar Voice mic now calls `setIsVoiceOpen(true)` and the single `<FloatingVoiceAssistant>` instance at the root receives `open={isVoiceOpen || undefined}` + `onOpenChange` — so the Voice mic and the FAB open the SAME panel with the SAME chat history; closing from either the X or backdrop-syncs both entries (FAB reappears). The mic button dims (ring + opacity) while the panel is open.
  - Deleted the bespoke modal (~300 lines): the entire `{isVoiceOpen && (...)}` JSX block, `executeVoiceQuery`, `startListening`, `detectScriptLanguage`, `getMultilingualFallback`, `playNativeVoiceAudio`, `speakUtterance`, and 9 state atoms (isListening, isSpeaking, voiceQuery, customTextInput, voiceResponseNative/En, voiceAudioBase64, voiceStatus, voiceMessages + init message); dropped the now-unused MicOff import. VendorMobileApp 3707 → 3086 lines.
- **Verified live**: bottom Voice mic → Ask Saathi panel opens (screenshot captured: header "Ask Saathi AI · 10 languages", Kannada reply flow) — typed "How much did I sell today?" → "Your sales today: 2 sales, ₹130 total, ₹92 profit" with ✓ live-data badge and Play button (the previously-dead path now works); X closes it; FAB reopens the SAME panel with the SAME history (sharedHistoryPreserved: true). tsc clean; backend 73 passed.

## TESTs 6–8 Finished: Push, Wake Word, Background Sync (2026-09-28)
Phone test run is now COMPLETE — all 8 tests executed and recorded. Servers restarted twice mid-run (Freebuff restarts); static IP 192.168.148.126 + firewall rules held every time.

### TEST 6 — Order notifications (PASS server+UX; delivery needs real phone)
- **Server chain verified end-to-end**: `GET /push/vapid-public-key` → 200 with real persistent key (`-hOLam8dGJ2uC0Iw…`, from backend/.vapid_keys.json). `POST /push/test` first returned **"1 device(s) registered but delivery failed — re-enable alerts on this device"** — stale fake rows from earlier sessions (fcm/send/test-endpoint-1, UA pytest/curl, failure_count 1). That accidentally proved the per-device pywebpush attempt + graceful failure reporting works. Deleted both fake rows (`push_subscriptions` now clean) → retest returns the exact no-devices message: **"No registered devices — tap Enable Alerts first"**.
- **UI verified**: Settings → "New Order Alerts" card shows **"Not supported on this browser"** on the LAN-IP origin — correct per-spec (PushManager/ServiceWorker don't exist on insecure origins); Enable click no-ops silently, console clean. Preview Chromium also ships `Notification.permission='denied'` (known env limit).
- **Key discovery (affects real phones!)**: on `http://192.168.148.126:3000` (LAN IP, insecure context) `navigator.serviceWorker` is **undefined entirely** — no SW, no push, no background sync. On `http://localhost:3000` (secure context) everything exists. **→ For the real phone, VendorSaathi must be used via PWA install (or HTTPS) for SW-backed features to work at all.**

### TEST 7 — "Saathi" wake word (PASS; real listening needs phone mic)
- Web Speech API present in preview (`SpeechRecognition` available). Ear button toggle verified live: Enable → aria-label flips to "Disable hands-free wake word", strip shows **"Hands-free listening — say “Saathi” then your question""; toggle off → label + strip revert. Panel stays healthy throughout (no crash, console clean).
- Wake regex verified against all 8 WAKE_WORDS variants: "hey saathi…", "sathi stock kitna hai", "ಸಾಥಿ ಇಂದು ಎಷ್ಟು ಮಾರಾಟ", "SAATHI TELL ME SALES" all match; "no wake word here" correctly rejected; case-insensitive + global-flag lastIndex reset semantics confirmed (consecutive matches work — component uses a global regex).
- No-mic env limit: raw `SR.start()` in this headless preview hangs silently (no error event ever fires), so the hard-error path ("Could not hear you — tap the mic and try again.") couldn't be triggered live — code-verified instead. Mic click no-ops gracefully. Real STT + hands-free listening → phone.

### TEST 8 — Background sync with the app closed (PASS — full SW drain verified)
The accepted simulation: SW's `FLUSH_OUTBOX_NOW` message runs the exact same `flushOutboxFromIdb()` as the browser's `sync` event.
- **Setup**: fresh vendor token via `/auth/login` (old 24h token had expired); seeded 2 FRESH mutations (SALE ₹100 = 2kg carrot @ ₹50 real product id `331dc094…`; ORDER_CREATE 1kg carrot voice shape, `total_amount: 0` → server prices at current rate) into `vs_offline_queue_v2` + the IDB mirror (`vs-outbox-db`/kv/'mirror': items + token + login{9876543210,1234} + api_base LAN:8000).
- **SW drained it all**: `postMessage({type:'FLUSH_OUTBOX_NOW'})` → received BOTH `OUTBOX_SYNCED {confirmed:[both ids], remaining:0, details:{order:{order_number:'ORD-OFF-CD7380', total:50}}}` and `OUTBOX_FLUSH_RESULT {sent:2, remaining:0}`.
- **Server truth**: `/sync/history` → both PROCESSED; `/orders/vendor` → **ORD-OFF-CD7380 · ₹50 · PENDING** (voice-order server-side pricing contract works).
- **Page reactions (app open)**: outbox pruned to 0; sync-log top entry `via:'sw'` with real order number + total; Ask Saathi chat showed **"✓ Offline POS Sale synced — Walk-in Cash Customer · ₹100 · 1 item(s)"** and **"✓ Your offline order synced — ORD-OFF-CD7380 · ₹50. You can track it now!"** (Play TTS buttons click clean); Cloud Sync audit screen shows **"Synced 09:59 PM · app was closed"** with both actions listed.
- App-visible ⇒ batch sent WITHOUT `source:'sw'` ⇒ server's lock-screen-push branch correctly skipped (sync_service.py:399 — that push is only for genuinely-closed apps; branch existence verified in code).
- **Durability proof for free**: Freebuff restarted mid-run (app "closed"); after restart the session, SW controller, empty outbox, and the `via:'sw'` timeline entry were all intact — exactly the persistence property TEST 8 is about.

### Final 8-test scorecard (2026-09-28)
| # | Test | Result |
|---|------|--------|
| 1 | OTP login over LAN + dashboard sanity | PASS |
| 2 | Voice order → receipt → Orders tab | PASS |
| 3 | Delivery nav: cart pickup + real address map | PASS |
| 4/5 | Offline banner, outbox seed, Sync Now drain, digest | PASS |
| 6 | Order push notifications | PASS (server chain + denied/unsupported UX; real delivery needs phone w/ PWA or HTTPS) |
| 7 | "Saathi" wake word | PASS (support probe, ear toggle, wake strip, 8-language regex; real mic → phone) |
| 8 | Background sync, app closed | PASS (SW drained seeded outbox via FLUSH_OUTBOX_NOW = same code path as sync event; ORD-OFF-CD7380 created; via:'sw' everywhere; true lock-screen push → real phone) |

### Left for the real-device session
PWA-install (or HTTPS) the phone origin → TEST 6 live subscription + delivery, TEST 8 genuine closed-app `sync` event + lock-screen push, TEST 7 real STT. Housekeeping done: push_subscriptions table cleaned of fake rows so the first real Enable Alerts will be the only device registered.

## ONE Voice Brain: Legacy /voice/query Merged into the Universal Assistant (2026-09-28)
After last session unified the two voice UIs (Voice tab + FAB → one Ask Saathi panel), TWO BACKEND brains still existed: the legacy `KannadaVoiceService` intent engine (own keyword router + 10-language hardcoded RESPONSES_DB + fake data fallbacks like `or 900.0` / hardcoded nearby-carts distances) behind POST /voice/query, and the universal assistant engine (`app.assistant.engine.handle_message`: shared router, 17 real-data tools, confirmation flow, session memory) behind /voice/chat + /voice/chat/stream. Plus `VendorTerminal.tsx` (894 lines, mounted NOWHERE) carrying a third bespoke voice UI that was the only remaining /voice/query caller.
- **Merged**: `/voice/query` is now a thin legacy-compatible ADAPTER over the universal brain — same `handle_message()` call as the other two doors, stateless per-request session (`vq-{user_id}-{text}` — the endpoint never promised conversation memory and old clients don't resend confirmations), `vendor.user` passed as the auth user. Legacy response contract preserved exactly (recognized_text/detected_intent/language/speech_response_text/speech_response_kn/action_performed/audio_base64_response), with a tool→intent name map (get_sales→get_today_sales, get_orders→get_pending_orders, get_customer_credit→get_udhaar, update_inventory→add_inventory) so old clients/tests keep their vocabulary. `action_performed` is now honest: true only when a tool actually ran (not for pending unconfirmed actions).
- **Deleted**: the dead intent engine (~380 lines: `_detect_intent_and_slots`, RESPONSES_DB ×10 languages, detect_language, process_voice_query). `voice_service.py` is now just the shared plumbing both worlds use: gTTS `synthesize_speech_base64` + Indic numerals `localize_numbers_in_text`. Detection stays in the universal `app.assistant.languages.detect_language`; the universal engine already localizes numerals in replies. Fake-data fallbacks (invented profit/carts) are gone — the brain never invents.
- **Deleted**: `frontend/src/components/VendorTerminal.tsx` (894 lines, referenced by nothing — verified app-wide before removal). No frontend code calls /voice/query anymore; the panel, the two tests, and any old external clients still can.
- **Verified**: full backend suite **73 passed** (incl. both legacy voice tests — kn sales assert `detected_intent==get_today_sales` + "ಮಾರಾಟ" in reply, and the hi/ta/en multilingual trio — all now through the universal brain). `tsc --noEmit` clean. Backend restarted and live-smoked: ASCII "What is today sales?" → get_today_sales · "5 sales, ₹500 total, ₹200 profit" (REAL data from the live DB); UTF-8 Kannada ಇಂದು ಎಷ್ಟು ಮಾರಾಟವಾಗಿದೆ? → get_today_sales · kn · "ಇಂದಿನ ಮಾರಾಟ: ೫ ಮಾರಾಟ, ಒಟ್ಟು ₹೫೦೦, ಲಾಭ ₹೨೦೦." with gTTS audio present; "how much udhaar does Ravi have" → get_udhaar with REAL named-debtor data ("8 customers owe you ₹2480 — Govindraj (Tailor) ₹380…"), which the legacy brain faked. /voice/chat/stream unchanged and verified (meta→delta→audio_chunk→final SSE). App boots clean with VendorTerminal gone (all dashboard API calls 200).
- Net: ONE voice brain (universal assistant engine) + ONE TTS pipeline behind three doors (legacy /voice/query adapter, /voice/chat, /voice/chat/stream); ~1,270 lines of duplicated/dead voice code removed; every voice answer now comes from real vendor data with confirmation-gated money actions.

## Real-Phone Session Prepared: LAN HTTPS + PWA Bootstrap (2026-09-28)
Everything server-side for TEST 6/7/8 on a real phone is now in place; the runbook is docs/PHONE_TEST_SESSION.md. Root problem solved: SW/PWA/push/background-sync need a SECURE context, and http://<lan-ip> is insecure — so the phone gets TLS with a trusted self-hosted dev CA.
- **Dev PKI**: mini-CA + leaf cert via openssl (`scripts/make-dev-certs.sh`, reusable) → `backend/certs/{ca,dev}.{crt,key}`, leaf SAN = 192.168.148.126 + localhost + 127.0.0.1, 825-day leaf (iOS-friendly), gitignored.
- **Frontend**: `npm run dev:phone` (new package.json script; trigger via npm_lifecycle_event so it's cross-platform, VITE_HTTPS=1 as manual override) starts vite with the TLS cert + a same-origin `/api` → localhost:8000 proxy; `main.tsx` points API_BASE at `origin/api/v1` whenever served over HTTPS → phone is fully same-origin (no mixed content). Plain `npm run dev` unchanged.
- **Backend**: `/system/lan-info` is scheme-aware (new `https` + `needs_ca_trust` fields — reports https:// when certs exist), `/system/lan-qr` therefore encodes the https URL, and new public `GET /system/ca` serves the mini-CA PEM for the phone trust step. Fixed an off-by-one in the certs-path resolution (used `Path(__file__).resolve().parents[4]` after two wrong attempts — and proved to myself it wasn't stale bytecode by asking Python which file it was executing).
- **Verified live**: vite serves `https://192.168.148.126:3000` (plain http on 3000 gone); full CHAIN verification passes (openssl-style python ssl context with ca.crt loaded → verify OK; Windows-curl needed `--ssl-no-revoke` — schannel quirk, not a cert problem); proxied API 200; OTP login THROUGH the :3000 proxy returns VENDOR token; `lan-info` now `{app_url: https://…, https: true, needs_ca_trust: true}`; `/system/ca` 200 PEM 1184B. Test-suite push rows re-cleaned from the live DB (pytest writes into vendorsathi.db); push/test again reports the no-devices message; fresh vendor token minted. 41 system+assistant tests pass; tsc clean.
- Preview note: the Freebuff preview Chromium does NOT trust the dev CA (expected) — it stays on plain-HTTP doors (e.g. FastAPI /docs); the PHONE is the real verification device now. PC-side phone-equivalence for TLS was done via full-chain curl + python ssl.
- Next physical step (needs hands): docs/PHONE_TEST_SESSION.md Phase 0 (trust CA → open https URL → Install PWA → login), then TEST 6 Enable Alerts + push/test from PC, TEST 7 wake word with real mic, TEST 8 airplane-mode outbox + swipe-away + WiFi back + lock-screen push.

## FINAL PRODUCT-READINESS CHECK (2026-09-30)
Whole-product pass after the Freebuff restart: servers restarted (backend :8000, frontend :3000 plain-HTTP dev mode for preview; HTTPS phone mode unchanged and ready via `npm run dev:phone`), full analysis sweep, two real product defects found and fixed at the root, everything re-verified end-to-end.

### Defect 1 (critical, fixed): silent demo re-login masked dead sessions everywhere
**Symptom that exposed it:** Ask Saathi panel answered "You're offline and I have no saved answer" on a working network — `POST /voice/chat/stream → 401` fell into the panel's offline-fallback branch (which catches ALL stream errors, not just network ones). Dashboard meanwhile showed "live" data.
**Root cause:** `VendorMobileApp.tsx` re-logged-in with hardcoded demo credentials (`9876543210/1234`) in FIVE places (loadAllData, POS sale, product create, stock update, order status), preferring the demo token over the stored one. localStorage held the SAME expired JWT in both `vs_vendor_token` and `vs_app_session` (exp 2026-09-29T16:19Z — minted 09-28, 24h TTL). So: dashboard silently self-re-authenticated as the demo vendor; every component WITHOUT its own re-login hack (voice assistant, push, offlineSync, any real vendor) kept the dead token → 401 → fake "offline" answers; a real (non-demo) vendor logging in would have had Ramesh's data loaded for all reads/writes; and login *network* failure fabricated `setAuthToken('demo_token')` + success chime — a guaranteed 401 machine.
**Fix (root, one auth path):** new `getValidToken()` in VendorMobileApp — probe `GET /auth/me` with the stored token; on 401/absent, mint a fresh token via the documented demo login ONLY when the device is the demo vendor (`vs_vendor_user.phone === '9876543210'`), persist + `setAuthToken` it so all children re-render with a valid token; real vendors with expired tokens get no silent mint (must re-login — no cross-vendor data inheritance); never fabricate a token string. All five call sites now use it. Login catch no longer fakes success — shows a network-error message instead. `<FloatingVoiceAssistant sessionToken={authToken}>` wires the panel to the parent's (now valid) token.
**Verified live:** reload minted a fresh token (exp 2026-10-01T13:01Z); `auth/me 200`; ALL dashboard APIs 200 (products, orders, udhaar, mobility ×2, mandi ×2, weather ×2, credit-scorecard, dashboard-summary); Ask Saathi via the real UI answers "8 customers owe you ₹2480… Govindraj (Tailor) ₹380…" tagged **live data** (no offline claim); `voice/chat/stream 200`; stock PUT 200 with the fresh token; cold-boot edge case (token deleted → reload) self-mints and boots fully live. Console clean except the benign geolocation-provider 403.

### Defect 2 (hygiene, fixed): pytest polluted the live demo DB — now isolated forever
Every bare `pytest` run wrote throwaway rows into `backend/vendorsathi.db` (fake push_subscriptions leaked repeatedly; had to hand-clean twice). New `backend/tests/conftest.py` points `DATABASE_URL` at a throwaway `%TEMP%/vendorsathi_test.db` BEFORE app.core.database imports (deleting any stale file each run; the full demo seed is re-created there since `seed_database()` is idempotent). Verified: full suite twice → `md5sum vendorsathi.db` identical before/after (`LIVE_DB_UNTOUCHED`). Opt-out for debugging: `VENDORSATHI_TEST_AGAINST_LIVE=1`.

### New: one-command start — `python scripts/start.py`
Detached, log-redirected launcher for both servers; reuses already-running ones; waits for real HTTP health; prints the exact phone URL from `/system/lan-info`; `--phone` flag starts the HTTPS dev:phone mode. (Fixed during smoke: cp1252 console glyphs → ASCII, a stale arg, lan-info URL fetch.)

### Final test output (2026-09-30)
- Backend: `python -m pytest tests/ -q` → **74 passed**, 1 benign warning, **live DB byte-identical after the run**
- Frontend: `npx tsc --noEmit` → **clean (exit 0)**
- Live servers: frontend `http://localhost:3000` 200 · backend `:8000` 200; lan-info `https://192.168.148.126:3000` (https:true, needs_ca_trust:true — phone runbook docs/PHONE_TEST_SESSION.md)
- UI E2E: boot → dashboard all cards live (₹200 today / ₹80 profit / 225 orders / ₹14,600 udhaar) → Ask Saathi real-data answer → stock mutation 200 → cold-boot self-mint
- API smoke: auth/login, orders/vendor, sales/history, sales/analytics/profit, products, inventory/history, push/vapid-public-key all 200; voice brain real-data replies verified (en + kn via prior session)

### Known limits (honest list)
- Green "Live Online Sync" banner is `navigator.onLine`-driven: with the auth fix it's now truthful for network drops (data actually flows when it's green), but a *backend-down* state would still show green while requests fail — candidate for a tiny /health ping next session.
- Ask Saathi offline-fallback still treats any stream error as offline; harmless now that 401s can't happen with a valid token, but error-type discrimination (401 → re-auth, network → cache) would be cleaner.
- Real-phone TEST 6/7/8 delivery half still needs the user's hands (runbook ready): CA trust → PWA install → push delivery, wake word with real mic, true closed-app sync.

## DOUBLE-CHECK PASS (2026-09-30, same day)
User asked to double-check that everything is a WORKING app. Independent re-run of everything + deeper UI walk than the first pass:
- Servers re-checked from zero (both LISTENING; lan-info still reports https phone URL).
- pytest re-run from scratch: **74 passed**; live DB md5 identical before/after (`LIVE_DB_UNTOUCHED`). tsc re-run: **clean**.
- Cold reload: dashboard boots live (TODAY SALES ₹200 · NET PROFIT ₹80 · TOTAL ORDERS 225 · UDHAAR ₹14,600), token still valid (exp 2026-10-01T13:06).
- **Orders screen: REAL MUTATION through the UI** — clicked Accept Order on ORD-OFF-8EE2B6 → card flipped PENDING → ACCEPTED, button became "Preparing" (200 PUT; live DB write via the fixed auth path).
- Sync audit screen (More → 📒 Cloud Sync): queue empty, synced timeline intact incl. Sep 28 "app was closed" SW flush.
- POS screen: full live catalog renders (Carrot ₹50/kg, Coriander, Cucumber, Mandi margins on cards).
- Voice brain re-smoked at API level: EN sales → real data + audio; **KN ಇಂದು ಎಷ್ಟು ಮಾರಾಟವಾಗಿದೆ? → ಇಂದಿನ ಮಾರಾಟ: ೨ ಮಾರಾಟ, ಒಟ್ಟು ₹೨೦೦, ಲಾಭ ₹೮೦. + audio**; udhaar → real named debtors. All tool_used + audio_base64 present.
Conclusion: app is functioning end-to-end; nothing regressed. Remaining known limits unchanged (backend-down banner, phone-delivery tests need hands).

## /HEALTH PING — HONEST SYNC BANNER (2026-09-30)
Closed the "backend-down shows green banner" limit from the readiness check. The banner now knows THREE states instead of trusting navigator.onLine (which only knows about the WiFi adapter, not whether the VendorSaathi server process is alive).

- **Backend**: new public `GET /api/v1/system/health` in system.py — tiny liveness probe (no auth, no data), runs `SELECT 1` through the SQLAlchemy engine and returns `{success, data:{status:'ok'|'db-down', db:bool}}`. New test `test_health_endpoint` (asserts 200 + ok + db true) → suite now **75 passed**, live DB untouched.
- **Frontend**: `backendUp` state + /health ping loop in VendorMobileApp (10s interval while the tab is visible, plus immediate pings on online/offline/visibilitychange). `netState` derivation: ok / server-down / device-offline. Banner shows a new orange state when the device is online but the server is dead: "Wi-Fi is fine but the VendorSaathi server is down — your work is saved on this device and will sync when it returns." (serverDownBanner key added to the complete en dictionary; other languages fall back to en.) Red device-offline and green healthy states unchanged.
- **Hidden bug found and fixed on the way**: the service worker's `networkFirstApi` cached EVERY successful `/api/` GET — including /health. When the backend was killed, the ping "succeeded" FROM THE SW CACHE (cached `{success:true}`) and the banner stayed green forever. Liveness probes must never be served from cache: sw.js fetch handler now lets `/system/health` fall through untouched (`url.pathname.endsWith('/system/health') → return`). Old SW was force-swapped (unregister + reload) during the live test.
- **Live-verified full cycle** (preview Chromium): green banner with healthy backend → `taskkill` the uvicorn PID → backend verifiably LISTENING-gone → banner flipped to the orange server-down state while the device stayed online (health pings failing) → `scripts/start.py` restart → banner returned to green, health 200, fixed SW re-registered.
- Server restart note: scripts/start.py launched the backend detached on a new PID — reused the running frontend. Kill-verify used netstat→taskkill.

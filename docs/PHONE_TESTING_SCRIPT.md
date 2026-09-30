# VendorSaathi — Phone Testing Script (No Computer Knowledge Needed)

**What you'll test:** Can a street vendor use this app on a real phone, even when the internet cuts out?

**You need:**
- An Android phone (with Chrome installed — the colorful round icon)
- This computer turned on
- Both phone and computer connected to the **same WiFi** (same house router)
- The computer's WiFi address for the app: **http://192.168.148.126:3000** — STEP 0 below shows what this is and how to re-find it if it ever stops working

**Time needed:** about 15 minutes.

---

## STEP 0 — Open the app on the phone (one-time setup)

The app lives **on this computer**, not on the internet. The phone reaches it over your WiFi using the computer's address:

```
http://192.168.148.126:3000
```

1. On the computer: make sure both servers are running (ask the developer, or see `.freebuff/run.md`).
2. **Easiest way — no typing at all:** open the app on the computer (`http://localhost:3000`); the language screen shows a **"Open on your phone — scan, no typing"** card with a QR code and the current address. Point the phone's camera at it, tap the link it offers, done. (If you'd rather type it, use the address at the top of this section — and if it doesn't load, the next subsection shows how to re-find the current one.)
3. On the phone, connect to the **same WiFi** as the computer, then open **Chrome**.
4. In the address bar at the top, type exactly the address above and press **Go**. You should see the VendorSaathi language screen.
   - That's the **only** address you ever type. After login, the app automatically talks to the same computer on port 8000 — no second setup needed.
5. *(Optional, recommended)* Tap the **⋮** menu (three dots, top-right) → **Add to Home screen** → **Install**. Now the app has its own icon like a real app and opens fullscreen.

### If the page doesn't load: the computer's address may have changed

`192.168.148.126` is this computer's "phone number" on your WiFi. Routers can hand out a **new number** after a restart or if the computer re-connects — the URL then stops working and must be re-typed with the new number.

To find the computer's current address (2 minutes, no computer knowledge needed):

1. On the computer, press the **Windows key**, type **cmd**, press **Enter** — a black window opens.
2. Type **ipconfig** and press **Enter**.
3. Look for the section **Wireless LAN adapter Wi-Fi** and, inside it, the line **IPv4 Address** — for example:
   ```
   IPv4 Address. . . . . . . . . . . : 192.168.1.7
   ```
   That number is the address. (If you use a network cable, look under **Ethernet adapter** instead.)
4. On the phone, use that number instead of the old one: type `http://192.168.1.7:3000` — whatever your number is — keep the `:3000` at the end.

Still not loading? Check these in order:

- **Same WiFi:** phone and computer must be on the same router (same WiFi name — not one on guest WiFi and one on main).
- **Servers running:** on the computer, `http://localhost:3000` in Chrome must open the app. If it doesn't, the servers aren't running yet — nothing will work from the phone until they do.
- **Windows Firewall:** the first time the servers start, Windows may ask "Allow access?" — tick **Private networks** and click **Allow**. If no popup ever came, ask the developer to allow **ports 3000 and 8000** through the firewall.
- **Tip to stop the address changing:** in the router's admin page (usually `192.168.0.1` or `192.168.1.1` in the browser), give this computer a **fixed / reserved IP** (search the web for "DHCP reservation <your router name>"). Then the phone URL works forever.

---

## TEST 1 — Login + healthy dashboard

1. On the language screen, check the line under **Choose Your Language**: it should say you can **run your business in your language** (sales, udhaar, routes) — vendor wording, not shopping wording.
2. Tap **English** → **Continue**.
3. Enter mobile number: **9876543210** → **Send OTP**.
4. The screen shows a "Demo OTP" code. Tap **Auto-fill**, then **Verify & Continue**.
5. ✅ **PASS if:** you land on the shop dashboard ("Ramesh Fresh Vegetables" with TODAY SALES).
6. Scroll to the **🚀 AI Smart Route** card.
7. ✅ **PASS if:** **Est. Sales Surge** shows a normal rupee amount (e.g. **₹2,340**) — **never "₹NaN"** — and **Carry High Demand** names a real product (e.g. Onion).

---

## TEST 2 — Place a voice order (online)

1. Tap the big orange **microphone button** (bottom-right), or the **AI** bubble.
2. Tap the typing box and type: **I need 2 kg carrot**
   (or tap the mic and *speak* it — the app listens in your chosen language).
3. The assistant asks to confirm. Tap **Yes / ಹೌದು**.
4. ✅ **PASS if:**
   - Words appear one by one (streaming), and
   - A green **ORDER RECEIPT** card appears with an order number and price, and
   - The answer is **spoken out loud**.
5. Tap **TRACK ORDER** on the receipt.
6. ✅ **PASS if:** the app jumps to the Orders screen and your new order is at the top.

> ⚠️ If it says "Not enough stock", pick a product that has stock left (ask the dashboard Stock tab), e.g. "I need 2 kg potato".

---

## TEST 3 — Delivery navigation (Google Maps)

1. On the Orders screen, find your order and tap its **Maps** button.
2. ✅ **PASS if:** a small map opens showing a route and distance/time.
   - For **voice orders** it should say **🛒 Pickup at cart** (the customer walks up — nothing to navigate).
3. Open an order with a real address (e.g. "Flat 302, Green Glen Layout…") and tap **Maps**.
4. ✅ **PASS if:** it shows a sensible distance (a few km, NOT thousands of km) and a blue **Navigate** button that opens Google Maps for two-wheeler directions.

---

## TEST 4 — Turn OFF the internet and keep working ✈️

1. Swipe down from the top of the phone and turn on **Airplane mode**.
2. Go back to the app. The top banner should turn red: **"Offline Safe Mode"**.
3. Tap **POS Sale** (bottom bar) → tap a product (e.g. **Carrot**) → use **+** to add 2 → tap **Record Payment**.
4. ✅ **PASS if:** the sale completes with the cash-register feel, and a yellow **⚡ 1 Queued** badge appears at the top.
5. Still in airplane mode, open the **AI assistant** and type: **I need 1 kg potato**
6. ✅ **PASS if:** the assistant replies it **queued** the order (amber "QUEUED — OFFLINE" card) instead of showing an error.
7. Still offline, tap **More** (bottom-right) → **Cloud Sync**.
8. ✅ **PASS if:** "Queued on this device" lists both actions (the sale and the voice order).

---

## TEST 5 — Internet comes back → everything syncs by itself

1. Turn **Airplane mode OFF** and wait for WiFi to reconnect.
2. Keep the app on the dashboard and wait up to 30 seconds (or tap **Sync Now** at the top).
3. ✅ **PASS if:** a green **"✓ SYNCED TO SERVER"** card pops up at the top of the screen, showing your order number (starts with **ORD-OFF-**) and the real price. It stays about 5 seconds, then fades away by itself.
4. While still on the dashboard, glance at **🚀 AI Smart Route → Est. Sales Surge** again: it should show a normal rupee amount (**no ₹NaN**) now that live data has refreshed.
5. Open the **AI assistant** (the same chat where the amber "QUEUED — OFFLINE" card appeared in Test 4).
6. ✅ **PASS if:**
   - There is a new message: **"✓ Your offline order synced — ORD-OFF-XXXXXX · ₹N"**, and
   - The amber **QUEUED** receipt card has turned into a green **CONFIRMED** card with the real order number, the real price, and a **TRACK ORDER** button.
7. Go to **More → Cloud Sync** and find the **"Synced timeline"** card.
8. ✅ **PASS if:** a **new entry appears at the top of the timeline, by itself** — a green node with "✓ Synced" and today's time, listing what just synced ("Voice Order — ORD-OFF-… · ₹…" and "POS Sale — …"). The count in the header, e.g. **(3 confirmed)**, should have gone up. No refresh needed — it updates on its own when the sync lands.
9. Note the count (e.g. **3 confirmed**). Now tap the **Share** button on the timeline card and paste somewhere (or send to yourself) — the text should list the same actions with order numbers and prices.
10. ✅ **PASS if:** the shared/copied text matches what the timeline shows — this is the vendor's shareable proof of what reached the server.
11. ✅ **Also PASS if:** "Queued on this device" says **✓ Nothing waiting**, and "Server sync history" below shows your SALE and ORDER as **Synced** (green).
12. Open the **Orders** tab.
13. ✅ **PASS if:** the offline voice order appears with a real order number (starts with **ORD-OFF-**) and a real price — the server priced it, even though the phone didn't know the price offline.
14. Check the udhaar money was recorded: **More → Profile/Udhaar Ledger** shows the customer's due if you recorded a UDHAAR sale.

> 💡 Missed the green toast (it disappears after ~5 seconds)? That's fine — the chat message, the Synced timeline, and the green ✓ time badge on the Cloud Sync tab all prove the same thing. Together = the vendor can trust the system.

---

## TEST 6 — Order alerts (notifications)

1. Go to **More → ⚙️ Settings**.
2. Tap **Enable Alerts** on "New Order Alerts" → **Allow** when Chrome asks.
3. ✅ **PASS if:** a test notification appears and the card shows **ON**.
4. Now place an order *as a customer* (ask the developer or use the customer demo account **9876543220 / 1234** on another device/browser).
5. ✅ **PASS if:** your phone buzzes with **"🔔 New Order!"** — even if you closed the app first. Tapping it opens the Orders screen.

---

## TEST 7 — "Saathi" hands-free wake word

1. Open the AI assistant, tap the **ear icon 🦻** (next to the mic in the typing bar).
2. Say clearly: **"Saathi"** — then in the same breath: **"…how much did I sell today?"**
3. ✅ **PASS if:** it answers out loud with today's sales. The strip below should say "Hands-free listening".
4. Say just **"Saathi!"** alone.
5. ✅ **PASS if:** it speaks your daily summary.
6. ⚠️ **Note:** hands-free works while the app is on screen (mounted on the cart). It does **not** listen with the screen fully off — that's a phone/browser limit, not a bug.

---

## TEST 8 — Close the app, actions still sync (background sync)

1. Turn **Airplane mode ON**. Record one more **POS sale**, then open the AI assistant and type: **I need 1 kg carrot** (an offline **order**, like Test 4 — it gets an amber QUEUED card).
2. **Swipe the app away** (close it completely). Turn Airplane mode **OFF**.
3. Wait 1–2 minutes without opening the app (Chrome may deliver it in the background).
4. ✅ **PASS if:** a lock-screen notification **"✓ Offline work synced"** appears, mentioning what synced — for the order it names it like **"Order ORD-OFF-… ₹N"** (e.g. "Order ORD-OFF-8D1D9F ₹35 · POS sale"). Tapping it opens the app on **More → Cloud Sync** with the **Synced timeline**. *(Needs "New Order Alerts" enabled from Test 6. If Chrome syncs only after you open the app, this notification may not appear — that's a phone/browser timing limit, not a bug; the rest of this test still applies.)*
5. Open the app → **More → Cloud Sync**.
6. ✅ **PASS if:** both queued actions are gone (synced in the background) or sync immediately on open, and the **Synced timeline** shows the order with its real number and server-priced total. *(On some phones Chrome does this only when it feels like it — if the sale syncs right after you open the app, that's still a PASS.)*

---

## Final scorecard

| # | Test | Pass? |
|---|------|-------|
| 1 | Login + dashboard rupees correct (no ₹NaN) | ☐ |
| 2 | Voice order + receipt + track | ☐ |
| 3 | Delivery maps + Navigate | ☐ |
| 4 | Offline sale + offline voice order queued | ☐ |
| 5 | Auto-sync + toast + chat + timeline updates itself | ☐ |
| 6 | New-order notification | ☐ |
| 7 | "Saathi" wake word | ☐ |
| 8 | Background sync + lock-screen "✓ Offline work synced" push | ☐ |

**Anything that fails:** note the test number, what you tapped, and what you saw. Give it to the developer.

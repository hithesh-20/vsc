# VendorSaathi — Why the PC's IP Changed, and How It Was Pinned

The phone QR (login screen) and `docs/PHONE_TESTING_SCRIPT.md` both target
`http://192.168.148.126:3000`. This document explains why that address used to
break and records the **exact commands** used to make it permanent.

---

## Diagnosis (measured on this PC, 2026-09-26)

| Observation | Value | Meaning |
|---|---|---|
| SSID | `Alvas WiFi 5G (T)` | Institutional/campus WiFi, not a home router you control |
| Address pool | `192.168.128.0/19` (gateway `192.168.150.1`) | ~8,190 addresses shared by many devices |
| `PrefixOrigin` | `Dhcp` | Address handed out by the network's DHCP server |
| Lease (`ValidLifetime`) | ~22–24 h | The address is **re-drawn roughly daily** |

**Why the IP changed across "router restarts":** on a big shared pool the DHCP
server does not reserve your address between visits. Whenever the lease
expired, the PC reconnected, or the network's DHCP service restarted, Windows
simply asked for *an* address and got whichever one was free — sometimes
`.126`, sometimes not. Nothing was wrong with the PC; there was just nothing
pinning it.

The classroom/DHCP fix is a **reservation on the router**, but on campus WiFi
you don't control the router — so the pin is done **on the PC itself** by
setting the same values as a static (manual) configuration.

## Exact commands used (as Administrator)

Applied via the helper script `scripts/pin_wifi_ip.bat` (netsh requires admin;
right-click → *Run as administrator*):

```bat
netsh interface ipv4 set address name="Wi-Fi" static 192.168.148.126 255.255.224.0 192.168.150.1
netsh interface ipv4 set dnsservers name="Wi-Fi" static 8.8.8.8 primary validate=no
netsh interface ipv4 add dnsservers name="Wi-Fi" 8.8.4.4 index=2 validate=no
```

These mirror **exactly** what DHCP had assigned (address, /19 mask, gateway,
DNS), so nothing about the network changes except ownership of `.126`.

Result (verified after applying):

```
Configuration for interface "Wi-Fi"
    DHCP enabled:   No          ← was Yes
PrefixOrigin:       Manual      ← was Dhcp
```

## Firewall — the other reason phones got stuck

The WiFi profiles as **Public**, and Windows Firewall had **no inbound rules**
for the app's ports. Phones could load the UI from port 3000, but the OTP
request to port **8000** was silently dropped — the login flow appeared to
"freeze" after entering the mobile number.

Fixed with two scoped rules (saved as `scripts/allow_phone_firewall.ps1`,
admin required):

```bat
netsh advfirewall firewall add rule name="VendorSaathi Frontend (3000)" dir=in action=allow protocol=TCP localport=3000 remoteip=192.168.128.0/19
netsh advfirewall firewall add rule name="VendorSaathi Backend (8000)" dir=in action=allow protocol=TCP localport=8000 remoteip=192.168.128.0/19
```

Scoped to the campus subnet only — the PC is not exposed to the internet.

## Verify it's still working

```powershell
netsh interface ipv4 show addresses "Wi-Fi"        # DHCP enabled: No
Get-NetIPAddress -InterfaceAlias 'Wi-Fi' -AddressFamily IPv4
curl http://192.168.148.126:8000/                  # 200 from the PC itself
# and from a phone: http://192.168.148.126:3000 → login flow completes
```

## Rollback (if ever needed)

```bat
netsh interface ipv4 set address name="Wi-Fi" source=dhcp
netsh interface ipv4 set dnsservers name="Wi-Fi" source=dhcp
netsh advfirewall firewall delete rule name="VendorSaathi Frontend (3000)"
netsh advfirewall firewall delete rule name="VendorSaathi Backend (8000)"
```

**Caveats:** if the campus network ever re-numbers itself (different subnet/
gateway), the static values must be updated to match. When this PC joins a
*different* WiFi (home, hotspot), switch it back to DHCP there with the
rollback commands, or Windows won't get a working address.

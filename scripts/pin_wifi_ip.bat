@echo off
REM ============================================================================
REM VendorSaathi - pin the PC's WiFi IP so the phone QR URL never changes.
REM
REM WHY: This PC is on an institutional/campus WiFi ("Alvas WiFi 5G (T)", a
REM /19 DHCP pool). The DHCP lease lasts ~24h, so the IPv4 address is re-drawn
REM from the pool on every lease expiry/reconnect - the QR on the login screen
REM and docs/PHONE_TESTING_SCRIPT.md URLs break.
REM
REM FIX: set the Wi-Fi adapter's IPv4 config to STATIC, mirroring the exact
REM values DHCP had assigned (so nothing else about the network changes).
REM
REM Run: right-click this file > "Run as administrator"  (netsh needs admin)
REM A full log is written to .freebuff\pin_wifi_ip.log next to this folder.
REM
REM ROLLBACK (back to normal DHCP):
REM   netsh interface ipv4 set address name="Wi-Fi" source=dhcp
REM   netsh interface ipv4 set dnsservers name="Wi-Fi" source=dhcp
REM
REM Full story: docs/STATIC_IP_SETUP.md
REM ============================================================================

setlocal
set IFACE=Wi-Fi
set IP=192.168.148.126
set MASK=255.255.224.0
set GW=192.168.150.1
set DNS1=8.8.8.8
set DNS2=8.8.4.4
set "LOG=%~dp0..\.freebuff\pin_wifi_ip.log"

echo === VendorSaathi IP pin %DATE% %TIME% === > "%LOG%"

echo === VendorSaathi: pinning %IFACE% to %IP% ===

netsh interface ipv4 set address name="%IFACE%" static %IP% %MASK% %GW% >> "%LOG%" 2>&1
echo [set address] exit=%errorlevel% >> "%LOG%"
netsh interface ipv4 set dnsservers name="%IFACE%" static %DNS1% primary validate=no >> "%LOG%" 2>&1
echo [set dns1] exit=%errorlevel% >> "%LOG%"
netsh interface ipv4 add dnsservers name="%IFACE%" %DNS2% index=2 validate=no >> "%LOG%" 2>&1
echo [add dns2] exit=%errorlevel% >> "%LOG%"

echo --- show addresses --- >> "%LOG%"
netsh interface ipv4 show addresses name="%IFACE%" >> "%LOG%" 2>&1
echo --- show dns --- >> "%LOG%"
netsh interface ipv4 show dnsservers name="%IFACE%" >> "%LOG%" 2>&1

type "%LOG%"

echo.
echo DONE (log: %LOG%). Phone URL http://%IP%:3000 should now be permanent.
echo If any line above shows exit=1, run as administrator.
exit /b 0

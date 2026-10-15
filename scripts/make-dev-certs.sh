#!/usr/bin/env bash
# VendorSaathi dev TLS — one-time mini-CA + leaf certificate generator.
#
#   bash scripts/make-dev-certs.sh
#
# Creates backend/certs/{ca.crt,ca.key,dev.crt,dev.key} where the leaf SANs
# cover this PC's LAN IP + localhost. `npm run dev:phone` (frontend) serves
# the app over TLS with it, and GET /api/v1/system/ca lets phones download
# the CA to trust. Re-run after your LAN IP changes (leaf SAN must match).
# Private keys stay on this PC — backend/certs/ is gitignored.
set -euo pipefail

cd "$(dirname "$0")/../backend/certs"

LAN_IP=$(python -c "import socket;s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);s.connect(('10.255.255.255',1));print(s.getsockname()[0])")
echo "LAN IP: $LAN_IP"

openssl req -x509 -newkey rsa:2048 -keyout ca.key -out ca.crt -days 3650 -nodes \
  -subj "//CN=VendorSaathi Dev CA" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign"

openssl req -newkey rsa:2048 -keyout dev.key -out dev.csr -nodes \
  -subj "//CN=$LAN_IP"

cat > san.cnf <<EOF
subjectAltName = DNS:localhost, IP:$LAN_IP, IP:127.0.0.1
extendedKeyUsage = serverAuth
EOF

openssl x509 -req -in dev.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out dev.crt -days 825 -extfile san.cnf

rm -f dev.csr san.cnf ca.srl
echo "OK — backend/certs/{ca.crt,ca.key,dev.crt,dev.key} ready (leaf valid 825 days, iOS-friendly)."
echo "Next: npm run dev:phone, then on the phone open http://<this-ip>:8002/api/v1/system/ca and trust the CA."

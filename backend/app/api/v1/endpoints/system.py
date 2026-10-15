"""
System info endpoints for device onboarding.

The login screen shows a QR code that encodes this PC's WiFi address
(e.g. https://192.168.148.126:3000) so a vendor's phone can open the app
without typing anything. The browser cannot know the machine's LAN IP by
itself, so the frontend asks the backend here.

Unauthenticated by design — it leaks only a LAN address and is needed
before any user is logged in.
"""
import os
import socket
from pathlib import Path

from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy import text

from app.core.config import settings
from app.core.database import SessionLocal

router = APIRouter()

# Dev TLS: when the mini-CA + leaf certificate exist (scripts/make-dev-certs.sh),
# the phone URL is served over HTTPS by `npm run dev:phone`. Service workers,
# PWA install, Web Push and background sync only work in secure contexts, so
# the QR must advertise the scheme the phone will actually use.
# backend/app/api/v1/endpoints/system.py → parents[4] = backend/ → backend/certs
_CERTS_DIR = str(Path(__file__).resolve().parents[4] / "certs")
_TLS_READY = os.path.exists(os.path.join(_CERTS_DIR, "dev.crt")) and os.path.exists(
    os.path.join(_CERTS_DIR, "dev.key"))


def _phone_scheme() -> str:
    return "https" if _TLS_READY else "http"


def get_lan_ip() -> str:
    """Best-effort primary LAN IPv4 address (no packets are actually sent).

    The UDP-socket trick asks the OS which interface it would use to reach
    the internet — that is the adapter the phone needs to target. Falls back
    to hostname resolution, then loopback.
    """
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))  # unroutable — nothing is transmitted
        ip = s.getsockname()[0]
        if ip and not ip.startswith("127.") and not ip.startswith("169.254."):
            return ip
    except OSError:
        pass
    finally:
        s.close()
    try:
        ip = socket.gethostbyname(socket.gethostname())
        if not ip.startswith("127.") and not ip.startswith("169.254."):
            return ip
    except OSError:
        pass
    return "127.0.0.1"


def build_app_url(ip: str) -> str:
    return f"{_phone_scheme()}://{ip}:{settings.FRONTEND_PORT}"


@router.get("/health")
def health():
    """Liveness probe for the dashboard's sync banner.

    navigator.onLine only knows about the WiFi adapter — the router can be
    up while this backend process is down, and the banner would still claim
    "Live Online Sync". The frontend polls this tiny endpoint (no auth,
    no data beyond SELECT 1) so the banner can distinguish all three states:
    healthy / server-down / device-offline.
    """
    try:
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
        finally:
            db.close()
        db_ok = True
    except Exception:
        db_ok = False
    return {
        "success": db_ok,
        "data": {"status": "ok" if db_ok else "db-down", "db": db_ok},
    }


@router.get("/lan-info")
def lan_info():
    """LAN IP + the phone URL for the QR card on the login screen."""
    ip = get_lan_ip()
    app_url = build_app_url(ip)
    insecure_loopback = app_url.startswith("http://127.")
    return {
        "success": True,
        "data": {
            "lan_ip": ip,
            "frontend_port": settings.FRONTEND_PORT,
            "app_url": app_url,
            # The QR is only useful when the PC is reachable from another
            # device — a loopback address means "hide the QR card".
            "is_lan": not insecure_loopback,
            # True when the phone URL is https:// (TLS certs installed):
            # the phone gets a secure context — PWA install, push, sync.
            "https": app_url.startswith("https://"),
            # When True, the phone must trust the dev CA once (see /system/ca):
            # open the CA URL, install the certificate, then open the app QR.
            "needs_ca_trust": app_url.startswith("https://"),
        },
    }


@router.get("/lan-qr")
def lan_qr():
    """The QR itself as an SVG image (frontend drops it into an <img>)."""
    try:
        import qrcode
        import qrcode.image.svg
    except ImportError:
        return JSONResponse(
            status_code=503,
            content={"success": False, "error": "qrcode package not installed (pip install qrcode)"},
        )
    img = qrcode.make(
        build_app_url(get_lan_ip()),
        image_factory=qrcode.image.svg.SvgPathImage,
        box_size=10,
        border=2,
    )
    svg = img.to_string().decode("utf-8")
    return Response(content=svg, media_type="image/svg+xml")


@router.get("/ca")
def dev_ca():
    """Serve the dev mini-CA certificate so phones can trust the LAN TLS.

    The phone flow is: open http://<lan-ip>:8002/api/v1/system/ca (plain HTTP,
    always available) → Android "install a certificate" → VPN & apps /
    install unknown certificates → pick the downloaded file → name it, install.
    After that https://<lan-ip>:3000 is a trusted secure context. Development
    use only — the CA's private key never leaves this PC.
    """
    ca_path = os.path.join(_CERTS_DIR, "ca.crt")
    if not os.path.exists(ca_path):
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": "No dev CA installed (scripts/make-dev-certs.sh)"},
        )
    return FileResponse(
        ca_path,
        media_type="application/x-x509-ca-cert",
        filename="vendorsathi-dev-ca.crt",
        headers={"Cache-Control": "no-store"},
    )

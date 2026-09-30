"""
System onboarding endpoints: LAN IP discovery + login-screen QR + dev CA.
"""
import re

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api.v1.endpoints.system import _TLS_READY

client = TestClient(app)


def test_lan_info_shape():
    r = client.get("/api/v1/system/lan-info")
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    data = body["data"]
    expected_scheme = "https" if _TLS_READY else "http"
    assert set(data) == {"lan_ip", "frontend_port", "app_url", "is_lan", "https", "needs_ca_trust"}
    # IPv4 address, never a link-local autoconfig address
    assert re.fullmatch(r"\d+\.\d+\.\d+\.\d+", data["lan_ip"])
    assert not data["lan_ip"].startswith("169.254.")
    assert data["app_url"] == f"{expected_scheme}://{data['lan_ip']}:{data['frontend_port']}"
    # is_lan must match loopback-ness of the URL (either scheme)
    assert data["is_lan"] == (not data["app_url"].startswith("http://127."))
    # https flag must mirror the advertised scheme; the phone needs the CA
    # trust step exactly when the URL is https (self-hosted dev CA).
    assert data["https"] == (expected_scheme == "https")
    assert data["needs_ca_trust"] == data["https"]


def test_lan_qr_is_svg():
    r = client.get("/api/v1/system/lan-qr")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("image/svg+xml")
    svg = r.text
    assert svg.lstrip().startswith("<svg")
    # A real QR payload: a path with plenty of modules drawn
    path_len = len(re.search(r'<path d="([^"]+)"', svg).group(1))
    assert path_len > 500


def test_dev_ca_endpoint():
    """The CA the phone must trust is downloadable (only when TLS is set up)."""
    r = client.get("/api/v1/system/ca")
    if not _TLS_READY:
        assert r.status_code == 404
        return
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/x-x509-ca-cert")
    # A PEM CA: readable header + base64 body
    body = r.text
    assert body.startswith("-----BEGIN CERTIFICATE-----")
    assert "-----END CERTIFICATE-----" in body


def test_health_endpoint():
    """Liveness probe the banner polls: reachable, well-formed, DB really up."""
    r = client.get("/api/v1/system/health")
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["data"]["status"] == "ok"
    assert data["data"]["db"] is True

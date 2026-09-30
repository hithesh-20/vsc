#!/usr/bin/env python3
"""VendorSaathi one-command launcher (Windows-friendly).

Starts the FastAPI backend (uvicorn on :8000) and the Vite frontend
(:3000) as background processes, waits until both answer HTTP, and prints
the URLs a vendor (or the demo phone on the same WiFi) should use.

Usage:
    python scripts/start.py            # plain HTTP dev mode (default)
    python scripts/start.py --phone    # HTTPS mode for the real phone (PWA/push)

Existing servers are reused: if :8000/:3000 already answer, they are left
alone so re-running this never spawns duplicate servers.
"""

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(ROOT, "backend")
FRONTEND_DIR = os.path.join(ROOT, "frontend")
LOG_DIR = os.path.join(ROOT, ".freebuff")


def _http_ok(url: str, timeout: float = 2.0) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return 200 <= resp.status < 500
    except urllib.error.HTTPError:
        return True  # server up, route-specific error is fine
    except Exception:
        return False


def _spawn(args, cwd, log_name):
    """Start a detached background process with output redirected to a log."""
    if os.name == "nt":
        # DETACHED_PROCESS keeps children alive after this script exits.
        flags = getattr(subprocess, "DETACHED_PROCESS", 0)
        creationflags = flags | getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
        log_path = os.path.join(LOG_DIR, log_name)
        log = open(log_path, "ab")
        return subprocess.Popen(
            args, cwd=cwd, stdout=log, stderr=log,
            creationflags=creationflags, close_fds=True,
        )
    # POSIX: nohup-style detach
    log_path = os.path.join(LOG_DIR, log_name)
    log = open(log_path, "ab")
    return subprocess.Popen(args, cwd=cwd, stdout=log, stderr=log, start_new_session=True)


def wait_up(urls, timeout_s=45):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        if all(_http_ok(u) for u in urls):
            return True
        time.sleep(1.0)
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Start VendorSaathi (backend + frontend)")
    parser.add_argument("--phone", action="store_true",
                        help="HTTPS mode for the real phone (PWA / push / wake word)")
    args = parser.parse_args()

    os.makedirs(LOG_DIR, exist_ok=True)

    backend_url = "http://127.0.0.1:8000/"
    frontend_url = "http://127.0.0.1:3000/"

    started = []

    if not _http_ok(backend_url):
        print("[start] backend starting on :8000 ...")
        _spawn([sys.executable, "-m", "uvicorn", "app.main:app",
                "--host", "0.0.0.0", "--port", "8000"],
               cwd=BACKEND_DIR, log_name="start-backend.log")
        started.append("backend")
    else:
        print("[start] backend already running on :8000 - reusing it")

    if not _http_ok(frontend_url):
        print("[start] frontend starting on :3000 ...")
        npm_cmd = "dev:phone" if args.phone else "dev"
        npm = "npm.cmd" if os.name == "nt" else "npm"
        vite_args = [npm, "run", npm_cmd, "--", "--port", "3000", "--host"]
        _spawn(vite_args, cwd=FRONTEND_DIR, log_name="start-frontend.log")
        started.append("frontend")
    else:
        print("[start] frontend already running on :3000 - reusing it")

    ok_b = wait_up([backend_url])
    ok_f = wait_up([frontend_url])

    print()
    if ok_b and ok_f:
        print("[start] [OK] VendorSaathi is up")
        print("  Dashboard (this PC):  http://localhost:3000")
        try:
            with urllib.request.urlopen(
                    "http://127.0.0.1:8000/api/v1/system/lan-info", timeout=3) as r:
                info = json.loads(r.read().decode())['data']
            print(f"  Phone (same WiFi):    {info['app_url']}")
            if info.get("needs_ca_trust"):
                print("  (first phone use: trust the dev CA - docs/PHONE_TEST_SESSION.md)")
        except Exception:
            print("  Phone (same WiFi):    http://<your-lan-ip>:3000")
        if args.phone:
            print("  Phone setup:          docs/PHONE_TEST_SESSION.md (trust CA -> install PWA)")
        return 0

    print("[start] [FAIL] something did not come up "
          f"(backend={'ok' if ok_b else 'DOWN'} frontend={'ok' if ok_f else 'DOWN'})")
    print("        logs: .freebuff/start-backend.log / .freebuff/start-frontend.log")
    return 1


if __name__ == "__main__":
    sys.exit(main())

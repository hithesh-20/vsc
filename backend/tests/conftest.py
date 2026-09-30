"""Pytest isolation for the live demo database.

Every test module drives the FastAPI app through TestClient, and the app's
SQLAlchemy engine is built from settings.DATABASE_URL at import time. By
default that points at the LIVE demo database (backend/vendorsathi.db), so a
bare `pytest` run used to write throwaway rows (push subscriptions with
pytest endpoints, orders, ledger entries, ...) straight into the demo data —
which then leaked into real phone-push tests and the UI.

Import-time fix: point DATABASE_URL at a throwaway file BEFORE app.main /
app.core.database get imported. seed_database() is idempotent (it skips when
a User already exists), so the empty test file receives the full demo seed,
and nothing a test does can touch the live file.

Opt-out (debug a test against the real demo data):
    VENDORSATHI_TEST_AGAINST_LIVE=1 python -m pytest tests/ -q
"""

import os
import tempfile
from pathlib import Path

if not os.environ.get("VENDORSATHI_TEST_AGAINST_LIVE"):
    _test_db = Path(tempfile.gettempdir()) / "vendorsathi_test.db"
    try:
        if _test_db.exists():
            _test_db.unlink()  # fresh, deterministic DB for every full run
    except OSError:
        pass  # stale file locked by a zombie run — SQLAlchemy will still reuse it
    os.environ["DATABASE_URL"] = f"sqlite:///{_test_db.as_posix()}"

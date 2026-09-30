"""
Generate a MySQL Workbench-importable .sql dump of VendorSaathi.

Reads the LIVE SQLite demo database (backend/vendorsathi.db) and emits:
  1. CREATE DATABASE + all tables via SQLAlchemy's MySQL dialect
     (the same definitions the app itself would create on MySQL), then
  2. every row of demo data as escaped INSERTs,
  3. the demo logins at the bottom as a comment.

Usage (from backend/):
    python scripts/generate_mysql_dump.py

Output:
    vendorsathi_mysql_dump.sql   (next to this script)

Import in MySQL Workbench:
    Server > Data Import > Import from Self-Contained File >
    select vendorsathi_mysql_dump.sql > Start Import.
    (Default target connection: root@localhost:3306 — the dump creates the
    `vendorsathi` schema itself, no manual CREATE DATABASE needed.)
"""

import sqlite3
import sys
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy.dialects import mysql  # noqa: E402
from sqlalchemy.schema import CreateTable, CreateIndex  # noqa: E402

from app.core.config import DEFAULT_DB_PATH  # noqa: E402
from app.core.database import Base  # noqa: E402
import app.models  # noqa: F401,E402  (registers every model on Base)

SQLITE_PATH = Path(DEFAULT_DB_PATH)
OUT_PATH = Path(__file__).resolve().parent / "vendorsathi_mysql_dump.sql"

SCHEMA_NAME = "vendorsathi"
CHARSET = "utf8mb4"
COLLATION = "utf8mb4_unicode_ci"


def sql_literal(value) -> str:
    """Render one Python/SQLite value as a MySQL SQL literal."""
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, Decimal)):
        return str(value)
    if isinstance(value, float):
        return repr(value)
    if isinstance(value, datetime):
        return "'" + value.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3] + "'"
    if isinstance(value, date):
        return "'" + value.isoformat() + "'"
    if isinstance(value, (bytes, bytearray, memoryview)):
        return "X'" + bytes(value).hex() + "'"
    text = str(value)
    # Backslash escapes are ON in MySQL by default; escape both classes.
    text = text.replace("\\", "\\\\").replace("'", "\\'")
    text = text.replace("\r", "\\r").replace("\n", "\\n")
    text = text.replace("\x00", "\\0").replace("\x1a", "\\Z")
    return "'" + text + "'"


def quote_ident(name: str) -> str:
    return "`" + name.replace("`", "``") + "`"


def main() -> int:
    if not SQLITE_PATH.exists():
        print(f"ERROR: SQLite database not found at {SQLITE_PATH}")
        print("Start the backend once (uvicorn app.main:app) so it creates + seeds the DB, then re-run.")
        return 1

    con = sqlite3.connect(str(SQLITE_PATH))
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    tables = [
        r[0]
        for r in cur.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
    ]
    if not tables:
        print("ERROR: SQLite database has no tables — nothing to dump.")
        return 1

    # Ordered so foreign-key parents are created/inserted before children.
    sorted_tables = Base.metadata.sorted_tables
    table_order = [t.name for t in sorted_tables if t.name in set(tables)]
    for t in tables:
        if t not in table_order:  # safety: table exists in SQLite but not in models
            table_order.append(t)

    lines: list[str] = []
    add = lines.append
    add("-- ============================================================")
    add("-- VendorSaathi — MySQL Workbench import file")
    add(f"-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    add(f"-- Source: {SQLITE_PATH.name} (demo database, {sum(cur.execute(f'SELECT COUNT(*) FROM [{t}]').fetchone()[0] for t in tables)} rows)")
    add("-- Import: Server > Data Import > Import from Self-Contained File")
    add("-- Requires MySQL 5.7+ / 8.x (JSON type, utf8mb4).")
    add("-- ============================================================")
    add("")
    add("SET NAMES utf8mb4;")
    add("SET FOREIGN_KEY_CHECKS = 0;")
    add(f"SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';")
    add("")
    add(f"CREATE DATABASE IF NOT EXISTS {quote_ident(SCHEMA_NAME)}")
    add(f"  DEFAULT CHARACTER SET {CHARSET} DEFAULT COLLATE {COLLATION};")
    add(f"USE {quote_ident(SCHEMA_NAME)};")
    add("")

    # ---- Schema DDL straight from the SQLAlchemy models (MySQL dialect) ----
    ddl_dialect = mysql.dialect()
    for table in Base.metadata.sorted_tables:
        if table.name not in set(tables):
            continue
        add(f"-- ----------------------------")
        add(f"-- Table structure for {table.name}")
        add(f"-- ----------------------------")
        add(f"DROP TABLE IF EXISTS {quote_ident(table.name)};")
        ddl = str(CreateTable(table).compile(dialect=ddl_dialect)).strip() + ";"
        # Force utf8mb4 on every table so Kannada text never hits charset errors.
        ddl = ddl.rstrip(";") + f" ENGINE=InnoDB DEFAULT CHARSET={CHARSET} COLLATE={COLLATION};"
        add(ddl)
        for index in table.indexes:
            add(str(CreateIndex(index).compile(dialect=ddl_dialect)).strip() + ";")
        add("")

    # ---- Data ----
    for tname in table_order:
        rows = cur.execute(f"SELECT * FROM [{tname}]").fetchall()
        if not rows:
            continue
        cols = rows[0].keys()
        col_sql = ", ".join(quote_ident(c) for c in cols)
        add(f"-- ----------------------------")
        add(f"-- Records of {tname} ({len(rows)} rows)")
        add(f"-- ----------------------------")
        for i in range(0, len(rows), 50):
            chunk = rows[i : i + 50]
            values = []
            for row in chunk:
                vals = ", ".join(sql_literal(row[c]) for c in cols)
                values.append("(" + vals + ")")
            add(f"INSERT INTO {quote_ident(tname)} ({col_sql}) VALUES")
            add(",\n".join(values) + ";")
        add("")

    add("SET FOREIGN_KEY_CHECKS = 1;")
    add("")
    add("-- ============================================================")
    add("-- Demo logins (password 1234 for all)")
    add("--   Vendor   : 9876543210   (Ramesh Fresh Vegetables)")
    add("--   Vendor   : 9876543211   (Manjunath Seasonal Fruits)")
    add("--   Vendor   : 9876543212   (Lakshmi Spice & Staples)")
    add("--   Customer : 9876543220   (Priya Sharma)")
    add("--")
    add("-- Point the backend at this MySQL server via backend/.env:")
    add('--   DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/vendorsathi?charset=utf8mb4')
    add("-- ============================================================")
    add("")

    OUT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT_PATH} ({OUT_PATH.stat().st_size / 1024:.1f} KB, {len(table_order)} tables)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

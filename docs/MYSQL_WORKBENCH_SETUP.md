# VendorSaathi — MySQL Workbench Setup

The backend ships in **zero-setup SQLite demo mode** (file: `backend/vendorsathi.db`).
It is now also fully **MySQL-ready**: flip one setting and it runs on a MySQL
server managed by MySQL Workbench, with no other code changes.

---

## 1. Import the database into MySQL Workbench

A ready-made dump with the full schema **and all demo data** (3 vendors,
42 products, sales, orders, udhaar, sync audit trail — 968 rows) is at:

```
backend/scripts/vendorsathi_mysql_dump.sql
```

In MySQL Workbench:

1. Open **Server → Data Import**.
2. Choose **Import from Self-Contained File** and select the `.sql` file above.
3. Default Target DB: leave as-is — the dump **creates the `vendorsathi`
   schema itself** (CREATE DATABASE IF NOT EXISTS + USE).
4. Click **Start Import**.

The dump requires MySQL 5.7+ or 8.x (uses the JSON type and utf8mb4, so the
Kannada vendor/product names import correctly). It is re-runnable: every table
is guarded by `DROP TABLE IF EXISTS`.

Verify after import:

```sql
USE vendorsathi;
SHOW TABLES;              -- 17 tables
SELECT COUNT(*) FROM products;   -- 42
SELECT phone, role FROM users;   -- demo logins
```

## 2. Point the backend at MySQL

Install the driver once:

```bash
cd backend
pip install pymysql
```

Create **`backend/.env`** (same folder as `requirements.txt`) with one line —
use your MySQL root password:

```env
DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/vendorsathi?charset=utf8mb4
```

Then start the backend normally (`python -m uvicorn app.main:app --port 8002`).
If the app boots, you are on MySQL — check in Workbench with
`SELECT COUNT(*) FROM sales;` while using the app, or look at the sidenav
tables filling up.

**No `.env` file = SQLite**, exactly as before, so the demo mode keeps working
unchanged and tests stay hermetic.

## 3. Demo logins (seeded in the dump)

| Role     | Phone      | Password |
|----------|------------|----------|
| Vendor   | 9876543210 | 1234     |
| Vendor   | 9876543211 | 1234     |
| Vendor   | 9876543212 | 1234     |
| Customer | 9876543220 | 1234     |

## 4. Re-generating the dump after new demo activity

The dump is a snapshot. Refresh it any time (from `backend/`):

```bash
python scripts/generate_mysql_dump.py
```

It compiles the schema from the SQLAlchemy models (always in sync with the
code) and copies the current rows out of the SQLite demo DB.

## Notes

- `charset=utf8mb4` in the URL is important — it is what keeps Kannada text
  (ರಮೇಶ್ ತಾಜಾ ತರಕಾರಿಗಳು) intact end to end.
- The engine enables `pool_pre_ping` + a 1-hour pool recycle, so MySQL's
  idle-connection timeout won't kill the app overnight.
- If you ever want a fresh, empty-but-seeded MySQL DB instead of importing
  the snapshot: point the backend at an empty `vendorsathi` schema and start
  it once — the app runs `Base.metadata.create_all()` + the same seeder on
  MySQL automatically.

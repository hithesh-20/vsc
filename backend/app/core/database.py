import uuid
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

# Engine configuration per backend dialect.
#
# SQLite (default demo mode): needs check_same_thread=False because FastAPI
# serves requests from a thread pool while the engine is created at import.
#
# MySQL / MariaDB (mysql+pymysql://...): the pure-Python PyMySQL driver talks
# to a MySQL Workbench-managed server. The URL carries ?charset=utf8mb4 so
# Kannada product/vendor names round-trip correctly; pool_pre_ping +
# pool_recycle survive MySQL's wait_timeout dropping idle connections overnight.
IS_MYSQL = settings.DATABASE_URL.startswith("mysql")

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine_kwargs = {
    "echo": False,
    "future": True,
    "pool_pre_ping": True,  # harmless for SQLite, revives stale MySQL conns
}
if IS_MYSQL:
    engine_kwargs["pool_recycle"] = 3600
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10
if connect_args:
    engine_kwargs["connect_args"] = connect_args

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI Dependency providing transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generate_uuid() -> str:
    """Generate RFC 4122 compliant UUID4 string."""
    return str(uuid.uuid4())

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import get_settings

settings = get_settings()
if settings.is_production and settings.database_url.startswith("sqlite"):
    raise RuntimeError("Production environment requires a non-SQLite DATABASE_URL.")

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
)
# expire_on_commit=False is deliberate, not a performance tweak: every
# router does add() -> commit() -> refresh()/attribute-read on the same
# object, and every mutable table is RLS-protected with app.tenant_id set
# via SET LOCAL (transaction-scoped, app/tenant.py). SQLAlchemy's default
# (expire_on_commit=True) marks all attributes "expired" after commit, so
# the very next attribute read -- an explicit db.refresh() or just Pydantic
# serializing the response -- issues a fresh SELECT with app.tenant_id
# already gone, which FORCE ROW LEVEL SECURITY then rejects outright.
# Confirmed this is not hypothetical: POST /api/accounts (pre-existing,
# unrelated to any change in this commit) 500s against real Postgres with
# exactly this stack trace. No model in this codebase has a server-side
# default, trigger, or sequence a post-commit refresh could ever need --
# every column (id, created_at, updated_at) is a Python-evaluated default
# already resolved before commit, so disabling expiry loses nothing.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

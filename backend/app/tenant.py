from sqlalchemy import text

from app.database import engine


def apply_tenant_context(db, tenant_id: str | None) -> None:
    if tenant_id is None:
        return

    if engine.dialect.name == "postgresql":
        db.execute(text("SET LOCAL app.tenant_id = :tenant_id"), {"tenant_id": str(tenant_id)})

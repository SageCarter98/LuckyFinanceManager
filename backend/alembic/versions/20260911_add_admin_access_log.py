"""add admin_access_logs table

Revision ID: 20260911_add_admin_access_log
Revises: 20260911_admin_rls_bypass
Create Date: 2026-09-11 13:00:00.000000

Workstream G acceptance criterion: "every access request is audited".
Deliberately not RLS-protected -- it has no tenant_id of its own (one
admin_user_id's rows span many target_tenant_ids by design), so it's
excluded from 20260907_postgres_rls's TABLES list on purpose, not by
oversight.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20260911_add_admin_access_log"
down_revision = "20260911_admin_rls_bypass"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "admin_access_logs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("admin_user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("reason", sa.String(length=500), nullable=False),
        sa.Column("target_email", sa.String(length=255), nullable=True),
        sa.Column("target_user_id", sa.String(length=36), nullable=True),
        sa.Column("target_tenant_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("admin_access_logs")

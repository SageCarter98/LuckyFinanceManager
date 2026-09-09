"""add tenant deleted_at (soft-delete)

Revision ID: 20260909_add_tenant_deleted_at
Revises: 20260909_add_user_profile_fields
Create Date: 2026-09-09 00:10:00.000000
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20260909_add_tenant_deleted_at"
down_revision = "20260909_add_user_profile_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("deleted_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("tenants", "deleted_at")

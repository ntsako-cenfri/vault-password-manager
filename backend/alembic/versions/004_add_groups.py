"""add groups table

Revision ID: 004
Revises: 003
Create Date: 2026-08-22 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "groups",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("owner_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_groups_owner_id", "groups", ["owner_id"])
    op.create_unique_constraint("uq_groups_owner_name", "groups", ["owner_id", "name"])


def downgrade() -> None:
    op.drop_constraint("uq_groups_owner_name", "groups", type_="unique")
    op.drop_index("ix_groups_owner_id", table_name="groups")
    op.drop_table("groups")

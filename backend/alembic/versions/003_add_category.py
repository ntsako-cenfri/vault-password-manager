"""add category column to vault_items

Revision ID: 003
Revises: 002
Create Date: 2026-08-22 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("vault_items", sa.Column("category", sa.String(), nullable=True))
    op.create_index("ix_vault_items_category", "vault_items", ["category"])


def downgrade() -> None:
    op.drop_index("ix_vault_items_category", table_name="vault_items")
    op.drop_column("vault_items", "category")

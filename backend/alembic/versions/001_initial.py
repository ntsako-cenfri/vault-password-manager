"""initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # users
    # ------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="external"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ------------------------------------------------------------------
    # vault_items
    # ------------------------------------------------------------------
    op.create_table(
        "vault_items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("owner_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("item_key", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index("ix_vault_items_owner_id", "vault_items", ["owner_id"])

    # ------------------------------------------------------------------
    # credential_fields
    # ------------------------------------------------------------------
    op.create_table(
        "credential_fields",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("vault_item_id", sa.String(36), sa.ForeignKey("vault_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("field_type", sa.String(30), nullable=False),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("encrypted_value", sa.Text(), nullable=True),
        sa.Column("file_path", sa.String(512), nullable=True),
        sa.Column("original_filename", sa.String(255), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_credential_fields_vault_item_id", "credential_fields", ["vault_item_id"])

    # ------------------------------------------------------------------
    # share_links
    # ------------------------------------------------------------------
    op.create_table(
        "share_links",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("token", sa.String(36), nullable=False, unique=True),
        sa.Column("vault_item_id", sa.String(36), sa.ForeignKey("vault_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recipient_email", sa.String(255), nullable=True),
        sa.Column("is_strict", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accessed_by", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("accessed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_revoked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_share_links_token", "share_links", ["token"], unique=True)
    op.create_index("ix_share_links_vault_item_id", "share_links", ["vault_item_id"])


def downgrade() -> None:
    op.drop_table("share_links")
    op.drop_table("credential_fields")
    op.drop_table("vault_items")
    op.drop_table("users")

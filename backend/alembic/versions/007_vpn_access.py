"""add VPN (wg-easy) access fields to users

Revision ID: 007
Revises: 006
Create Date: 2026-11-18 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("vpn_enabled", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("vpn_client_id", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("vpn_config_key", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("vpn_config_enc", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("vpn_qr_enc", sa.Text(), nullable=True))
    op.create_index("ix_users_vpn_client_id", "users", ["vpn_client_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_vpn_client_id", table_name="users")
    for c in ("vpn_qr_enc", "vpn_config_enc", "vpn_config_key", "vpn_client_id", "vpn_enabled"):
        op.drop_column("users", c)

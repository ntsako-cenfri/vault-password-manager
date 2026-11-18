"""add SFTP access flag + username to users

Revision ID: 006
Revises: 005
Create Date: 2026-11-18 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("sftp_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("users", sa.Column("sftp_username", sa.String(), nullable=True))
    op.create_index("ix_users_sftp_username", "users", ["sftp_username"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_sftp_username", table_name="users")
    op.drop_column("users", "sftp_username")
    op.drop_column("users", "sftp_enabled")

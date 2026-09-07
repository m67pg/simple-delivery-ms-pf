"""create initial tables (users, deliveries, bills, jwt_denylists)

Revision ID: 0001_initial
Revises:
Create Date: 2026-09-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("encrypted_password", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False, server_default="user"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "deliveries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tracking_number", sa.String(), nullable=False),
        sa.Column("sender_name", sa.String(), nullable=True),
        sa.Column("sender_address", sa.String(), nullable=True),
        sa.Column("sender_phone", sa.String(), nullable=True),
        sa.Column("recipient_name", sa.String(), nullable=False),
        sa.Column("recipient_address", sa.String(), nullable=False),
        sa.Column("recipient_phone", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("weight", sa.Numeric(10, 2), nullable=True),
        sa.Column("delivery_fee", sa.Numeric(10, 2), nullable=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_deliveries_tracking_number", "deliveries", ["tracking_number"], unique=True)

    op.create_table(
        "bills",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("issued_date", sa.Date(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("delivery_id", sa.Integer(), sa.ForeignKey("deliveries.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "jwt_denylists",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("jti", sa.String(), nullable=False),
        sa.Column("exp", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_jwt_denylists_jti", "jwt_denylists", ["jti"], unique=True)


def downgrade() -> None:
    op.drop_table("jwt_denylists")
    op.drop_table("bills")
    op.drop_index("ix_deliveries_tracking_number", table_name="deliveries")
    op.drop_table("deliveries")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

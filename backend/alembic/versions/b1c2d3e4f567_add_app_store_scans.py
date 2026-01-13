"""add app_store_scans table

Revision ID: b1c2d3e4f567
Revises: eea34f371b58
Create Date: 2026-01-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f567'
down_revision: Union[str, None] = 'eea34f371b58'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create app_store_scans table for persistent scan history
    op.create_table(
        'app_store_scans',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('feed_type', sa.String(20), nullable=False),
        sa.Column('country', sa.String(10), nullable=False),
        sa.Column('total_apps', sa.Integer(), nullable=False),
        sa.Column('unique_languages', sa.Integer(), nullable=False),
        sa.Column('result', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    # Index for faster user-based queries
    op.create_index('ix_app_store_scans_user_id', 'app_store_scans', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_app_store_scans_user_id', table_name='app_store_scans')
    op.drop_table('app_store_scans')

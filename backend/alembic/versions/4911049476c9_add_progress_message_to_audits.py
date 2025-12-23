"""add_progress_message_to_audits

Revision ID: 4911049476c9
Revises: ec5f5dff7bfb
Create Date: 2025-12-22 17:22:36.401423

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4911049476c9'
down_revision: Union[str, None] = 'ec5f5dff7bfb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add progress_message column for detailed progress tracking
    op.add_column('audits', sa.Column('progress_message', sa.String(length=500), nullable=True))
    # Add progress_step column for tracking current step number
    op.add_column('audits', sa.Column('progress_step', sa.Integer(), nullable=True))
    # Add progress_total column for total steps
    op.add_column('audits', sa.Column('progress_total', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('audits', 'progress_total')
    op.drop_column('audits', 'progress_step')
    op.drop_column('audits', 'progress_message')

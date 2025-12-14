"""Add good_examples and content_pairs columns

Revision ID: 002
Revises: 001
Create Date: 2024-12-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add good_examples column to audit_results
    op.add_column('audit_results', sa.Column('good_examples', sa.JSON(), nullable=True))

    # Add content_pairs column to audits
    op.add_column('audits', sa.Column('content_pairs', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('audits', 'content_pairs')
    op.drop_column('audit_results', 'good_examples')

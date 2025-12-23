"""add_audit_type_for_standalone_mode

Revision ID: ec5f5dff7bfb
Revises: e673464d4596
Create Date: 2025-12-22 16:34:47.215414

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ec5f5dff7bfb'
down_revision: Union[str, None] = 'e673464d4596'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add audit_type column with default 'comparison' for existing records
    op.add_column('audits', sa.Column('audit_type', sa.String(length=20), nullable=False, server_default='comparison'))

    # Make original_url nullable for standalone audits
    op.alter_column('audits', 'original_url',
                    existing_type=sa.String(length=2048),
                    nullable=True)


def downgrade() -> None:
    # Revert original_url to non-nullable
    op.alter_column('audits', 'original_url',
                    existing_type=sa.String(length=2048),
                    nullable=False)

    # Remove audit_type column
    op.drop_column('audits', 'audit_type')

"""make audit_url nullable for image_upload mode

Revision ID: eea34f371b58
Revises: 0a1f96e59c41
Create Date: 2025-01-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'eea34f371b58'
down_revision: Union[str, None] = '0a1f96e59c41'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make audit_url nullable for image_upload mode
    op.alter_column('audits', 'audit_url',
                    existing_type=sa.String(2048),
                    nullable=True)


def downgrade() -> None:
    # Revert to NOT NULL (will fail if any NULL values exist)
    op.alter_column('audits', 'audit_url',
                    existing_type=sa.String(2048),
                    nullable=False)

"""add_uploaded_images

Revision ID: 0a1f96e59c41
Revises: f2615f6b3a6f
Create Date: 2025-12-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0a1f96e59c41'
down_revision: Union[str, None] = 'f2615f6b3a6f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add uploaded_images column for storing user-uploaded screenshots
    # JSON array of {label: "original"|"localized", data: base64, filename: str}
    op.add_column('audits', sa.Column('uploaded_images', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('audits', 'uploaded_images')

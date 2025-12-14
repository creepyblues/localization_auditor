"""Initial migration

Revision ID: 001
Revises:
Create Date: 2024-01-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_id', 'users', ['id'], unique=False)

    # Glossaries table
    op.create_table(
        'glossaries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('industry', sa.String(100), nullable=False),
        sa.Column('source_language', sa.String(10), nullable=False),
        sa.Column('target_language', sa.String(10), nullable=False),
        sa.Column('is_system', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_glossaries_id', 'glossaries', ['id'], unique=False)

    # Glossary terms table
    op.create_table(
        'glossary_terms',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('glossary_id', sa.Integer(), nullable=False),
        sa.Column('source_term', sa.String(500), nullable=False),
        sa.Column('target_term', sa.String(500), nullable=False),
        sa.Column('context', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['glossary_id'], ['glossaries.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_glossary_terms_id', 'glossary_terms', ['id'], unique=False)

    # Audits table
    op.create_table(
        'audits',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('original_url', sa.String(2048), nullable=False),
        sa.Column('audit_url', sa.String(2048), nullable=False),
        sa.Column('source_language', sa.String(10), nullable=True),
        sa.Column('target_language', sa.String(10), nullable=True),
        sa.Column('industry', sa.String(100), nullable=True),
        sa.Column('status', sa.String(50), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('overall_score', sa.Integer(), nullable=True),
        sa.Column('original_content', sa.JSON(), nullable=True),
        sa.Column('audit_content', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_audits_id', 'audits', ['id'], unique=False)

    # Audit results table
    op.create_table(
        'audit_results',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('audit_id', sa.Integer(), nullable=False),
        sa.Column('dimension', sa.String(50), nullable=False),
        sa.Column('score', sa.Integer(), nullable=False),
        sa.Column('findings', sa.JSON(), nullable=True),
        sa.Column('recommendations', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['audit_id'], ['audits.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_audit_results_id', 'audit_results', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_audit_results_id', table_name='audit_results')
    op.drop_table('audit_results')
    op.drop_index('ix_audits_id', table_name='audits')
    op.drop_table('audits')
    op.drop_index('ix_glossary_terms_id', table_name='glossary_terms')
    op.drop_table('glossary_terms')
    op.drop_index('ix_glossaries_id', table_name='glossaries')
    op.drop_table('glossaries')
    op.drop_index('ix_users_id', table_name='users')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')

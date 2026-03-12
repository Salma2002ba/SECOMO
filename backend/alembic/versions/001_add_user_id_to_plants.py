"""add user_id to plants

Revision ID: 001_add_user_id_to_plants
Revises:
Create Date: 2026-03-11

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001_add_user_id_to_plants'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'plants',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_index('ix_plants_user_id', 'plants', ['user_id'])
    op.create_foreign_key(
        'fk_plants_user_id',
        'plants', 'users',
        ['user_id'], ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    op.drop_constraint('fk_plants_user_id', 'plants', type_='foreignkey')
    op.drop_index('ix_plants_user_id', table_name='plants')
    op.drop_column('plants', 'user_id')

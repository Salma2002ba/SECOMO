"""add mac_address to devices

Revision ID: 003_add_mac_address_to_devices
Revises: b2c3d4e5f6a1
Create Date: 2026-03-14

"""
from alembic import op
import sqlalchemy as sa

revision = 'c3d4e5f6a7b2'
down_revision = 'b2c3d4e5f6a1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('devices', sa.Column('mac_address', sa.String(17), nullable=True))
    op.create_unique_constraint('uq_devices_mac_address', 'devices', ['mac_address'])
    op.create_index('ix_devices_mac_address', 'devices', ['mac_address'])


def downgrade() -> None:
    op.drop_index('ix_devices_mac_address', 'devices')
    op.drop_constraint('uq_devices_mac_address', 'devices', type_='unique')
    op.drop_column('devices', 'mac_address')

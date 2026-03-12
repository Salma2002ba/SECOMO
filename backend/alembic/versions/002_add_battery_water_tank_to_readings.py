"""add battery_level and water_tank_level to sensor_readings

Revision ID: 002_add_battery_water_tank_to_readings
Revises: 001_add_user_id_to_plants
Create Date: 2026-03-11

"""
from alembic import op
import sqlalchemy as sa

revision = 'b2c3d4e5f6a1'
down_revision = '001_add_user_id_to_plants'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('sensor_readings', sa.Column('battery_level', sa.Float(), nullable=True))
    op.add_column('sensor_readings', sa.Column('water_tank_level', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('sensor_readings', 'water_tank_level')
    op.drop_column('sensor_readings', 'battery_level')

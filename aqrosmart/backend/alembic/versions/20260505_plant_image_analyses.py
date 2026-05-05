"""create plant_image_analyses table

Revision ID: 20260505_plant_image_analyses
Revises:
Create Date: 2026-05-05
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260505_plant_image_analyses"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "plant_image_analyses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("field_id", sa.Integer(), sa.ForeignKey("fields.id"), nullable=True),
        sa.Column("image_path", sa.String(), nullable=False),
        sa.Column("disease_detected", sa.String(), nullable=False),
        sa.Column("confidence_pct", sa.Float(), nullable=False),
        sa.Column("health_score", sa.Float(), nullable=False),
        sa.Column("recommendations", sa.JSON(), nullable=False),
        sa.Column("analyzed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_plant_image_analyses_id", "plant_image_analyses", ["id"])
    op.create_index("ix_plant_image_analyses_field_id", "plant_image_analyses", ["field_id"])


def downgrade() -> None:
    op.drop_index("ix_plant_image_analyses_field_id", table_name="plant_image_analyses")
    op.drop_index("ix_plant_image_analyses_id", table_name="plant_image_analyses")
    op.drop_table("plant_image_analyses")

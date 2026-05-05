from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class PlantImageAnalysis(Base):
    __tablename__ = "plant_image_analyses"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=True, index=True)
    image_path = Column(String, nullable=False)
    disease_detected = Column(String, nullable=False)
    confidence_pct = Column(Float, nullable=False)
    health_score = Column(Float, nullable=False)
    recommendations = Column(JSON, nullable=False, default=list)
    analyzed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    field = relationship("Field", back_populates="plant_image_analyses", lazy="selectin")

from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

class UrgencyLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class IrrigationRecommendation(Base):
    __tablename__ = "irrigation_recommendations"
    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"), index=True)
    timestamp = Column(DateTime(timezone=True))
    current_soil_moisture = Column(Float)
    target_soil_moisture = Column(Float)
    water_needed_mm = Column(Float)
    recommended_water_mm = Column(Float)
    estimated_savings_pct = Column(Float)
    recommendation_text = Column(String)
    urgency_level = Column(SQLEnum(UrgencyLevel))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    field = relationship("Field", back_populates="irrigation_recommendations", lazy="selectin")

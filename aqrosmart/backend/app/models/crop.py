from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Crop(Base):
    __tablename__ = "crops"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    typical_yield_per_ha = Column(Float)
    water_requirement_mm = Column(Float)
    growth_days = Column(Integer)
    season = Column(String)
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    field = relationship("Field", back_populates="crops", lazy="selectin")

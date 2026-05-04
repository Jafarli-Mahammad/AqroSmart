from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Scenario(Base):
    __tablename__ = "scenarios"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    slug = Column(String, unique=True, index=True)
    description = Column(String)
    weather_modifier = Column(Float)
    soil_moisture_modifier = Column(Float)
    ndvi_modifier = Column(Float)
    yield_modifier = Column(Float)
    is_active = Column(Boolean)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    analysis_runs = relationship("AnalysisRun", back_populates="scenario", lazy="selectin")

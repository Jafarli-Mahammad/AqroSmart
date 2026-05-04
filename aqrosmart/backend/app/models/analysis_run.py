from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class AnalysisRun(Base):
    __tablename__ = "analysis_runs"
    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"), index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=True, index=True)
    timestamp = Column(DateTime(timezone=True))
    potential_yield_t = Column(Float)
    actual_yield_t = Column(Float)
    productivity_score = Column(Float)
    crop_health_score = Column(Float)
    moisture_stress_score = Column(Float)
    disease_risk_score = Column(Float)
    confidence_pct = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    field = relationship("Field", back_populates="analysis_runs", lazy="selectin")
    scenario = relationship("Scenario", back_populates="analysis_runs", lazy="selectin")
    subsidy_recommendations = relationship("SubsidyRecommendation", back_populates="analysis_run", lazy="selectin")

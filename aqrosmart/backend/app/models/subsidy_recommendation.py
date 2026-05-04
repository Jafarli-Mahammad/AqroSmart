from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class SubsidyRecommendation(Base):
    __tablename__ = "subsidy_recommendations"
    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"), index=True)
    analysis_run_id = Column(Integer, ForeignKey("analysis_runs.id"), nullable=True, index=True)
    base_subsidy_azn = Column(Float)
    performance_factor = Column(Float)
    efficiency_factor = Column(Float)
    water_use_factor = Column(Float)
    yield_alignment_factor = Column(Float)
    final_subsidy_azn = Column(Float)
    calculation_note = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    field = relationship("Field", back_populates="subsidy_recommendations", lazy="selectin")
    analysis_run = relationship("AnalysisRun", back_populates="subsidy_recommendations", lazy="selectin")

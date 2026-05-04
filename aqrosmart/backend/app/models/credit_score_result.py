from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

class RiskTier(str, enum.Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"

class CreditScoreResult(Base):
    __tablename__ = "credit_score_results"
    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"))
    timestamp = Column(DateTime(timezone=True))
    productivity_score = Column(Float)
    subsidy_performance = Column(Float)
    consistency_score = Column(Float)
    climate_risk_score = Column(Float)
    irrigation_efficiency_score = Column(Float)
    final_score = Column(Float)
    risk_tier = Column(SQLEnum(RiskTier))
    explanation_text = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    farmer = relationship("Farmer", back_populates="credit_scores", lazy="selectin")

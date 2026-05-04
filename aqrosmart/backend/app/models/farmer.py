from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Farmer(Base):
    __tablename__ = "farmers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    fin_code = Column(String, unique=True, index=True)
    region = Column(String)
    farm_count = Column(Integer)
    years_active = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    farms = relationship("Farm", back_populates="farmer", lazy="selectin")
    credit_scores = relationship("CreditScoreResult", back_populates="farmer", lazy="selectin")

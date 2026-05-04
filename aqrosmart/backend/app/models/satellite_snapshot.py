from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class SatelliteSnapshot(Base):
    __tablename__ = "satellite_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"), index=True)
    date = Column(Date)
    ndvi = Column(Float)
    ndwi = Column(Float)
    cloud_cover_pct = Column(Float)
    vegetation_health_score = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    field = relationship("Field", back_populates="satellite_snapshots", lazy="selectin")

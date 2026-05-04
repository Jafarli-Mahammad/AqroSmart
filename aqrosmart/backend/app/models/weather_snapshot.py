from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class WeatherSnapshot(Base):
    __tablename__ = "weather_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"), index=True)
    date = Column(Date)
    max_temp_c = Column(Float)
    min_temp_c = Column(Float)
    rain_mm = Column(Float)
    wind_kmh = Column(Float)
    drought_index = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    field = relationship("Field", back_populates="weather_snapshots", lazy="selectin")

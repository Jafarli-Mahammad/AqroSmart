from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class SensorReading(Base):
    __tablename__ = "sensor_readings"
    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"), index=True)
    timestamp = Column(DateTime(timezone=True))
    soil_moisture_pct = Column(Float)
    water_flow_lph = Column(Float)
    air_temperature_c = Column(Float)
    humidity_pct = Column(Float)
    rain_mm = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    field = relationship("Field", back_populates="sensor_readings", lazy="selectin")

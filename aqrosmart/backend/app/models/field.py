from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Field(Base):
    __tablename__ = "fields"
    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), index=True)
    crop_type = Column(String)
    area_ha = Column(Float)
    soil_type = Column(String)
    irrigation_type = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    ndvi_score = Column(Float)
    ndwi_score = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    farm = relationship("Farm", back_populates="fields", lazy="selectin")
    crops = relationship("Crop", back_populates="field", lazy="selectin")
    sensor_readings = relationship("SensorReading", back_populates="field", lazy="selectin")
    satellite_snapshots = relationship("SatelliteSnapshot", back_populates="field", lazy="selectin")
    weather_snapshots = relationship("WeatherSnapshot", back_populates="field", lazy="selectin")
    analysis_runs = relationship("AnalysisRun", back_populates="field", lazy="selectin")
    subsidy_recommendations = relationship("SubsidyRecommendation", back_populates="field", lazy="selectin")
    irrigation_recommendations = relationship("IrrigationRecommendation", back_populates="field", lazy="selectin")

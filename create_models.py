import os

models_data = {
    "aqrosmart/backend/app/models/__init__.py": """from app.models.farmer import Farmer
from app.models.farm import Farm
from app.models.field import Field
from app.models.crop import Crop
from app.models.sensor_reading import SensorReading
from app.models.satellite_snapshot import SatelliteSnapshot
from app.models.weather_snapshot import WeatherSnapshot
from app.models.analysis_run import AnalysisRun
from app.models.subsidy_recommendation import SubsidyRecommendation
from app.models.irrigation_recommendation import IrrigationRecommendation
from app.models.credit_score_result import CreditScoreResult
from app.models.scenario import Scenario
""",
    "aqrosmart/backend/app/models/farmer.py": """from sqlalchemy import Column, Integer, String, DateTime
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
""",
    "aqrosmart/backend/app/models/farm.py": """from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Farm(Base):
    __tablename__ = "farms"
    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"))
    name = Column(String)
    total_area_ha = Column(Float)
    region = Column(String)
    district = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    farmer = relationship("Farmer", back_populates="farms", lazy="selectin")
    fields = relationship("Field", back_populates="farm", lazy="selectin")
""",
    "aqrosmart/backend/app/models/field.py": """from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Field(Base):
    __tablename__ = "fields"
    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"))
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
""",
    "aqrosmart/backend/app/models/crop.py": """from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
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
""",
    "aqrosmart/backend/app/models/sensor_reading.py": """from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class SensorReading(Base):
    __tablename__ = "sensor_readings"
    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"))
    timestamp = Column(DateTime(timezone=True))
    soil_moisture_pct = Column(Float)
    water_flow_lph = Column(Float)
    air_temperature_c = Column(Float)
    humidity_pct = Column(Float)
    rain_mm = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    field = relationship("Field", back_populates="sensor_readings", lazy="selectin")
""",
    "aqrosmart/backend/app/models/satellite_snapshot.py": """from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class SatelliteSnapshot(Base):
    __tablename__ = "satellite_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"))
    date = Column(Date)
    ndvi = Column(Float)
    ndwi = Column(Float)
    cloud_cover_pct = Column(Float)
    vegetation_health_score = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    field = relationship("Field", back_populates="satellite_snapshots", lazy="selectin")
""",
    "aqrosmart/backend/app/models/weather_snapshot.py": """from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class WeatherSnapshot(Base):
    __tablename__ = "weather_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"))
    date = Column(Date)
    max_temp_c = Column(Float)
    min_temp_c = Column(Float)
    rain_mm = Column(Float)
    wind_kmh = Column(Float)
    drought_index = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    field = relationship("Field", back_populates="weather_snapshots", lazy="selectin")
""",
    "aqrosmart/backend/app/models/analysis_run.py": """from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class AnalysisRun(Base):
    __tablename__ = "analysis_runs"
    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"))
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=True)
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
""",
    "aqrosmart/backend/app/models/subsidy_recommendation.py": """from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class SubsidyRecommendation(Base):
    __tablename__ = "subsidy_recommendations"
    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"))
    analysis_run_id = Column(Integer, ForeignKey("analysis_runs.id"), nullable=True)
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
""",
    "aqrosmart/backend/app/models/irrigation_recommendation.py": """from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

class UrgencyLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class IrrigationRecommendation(Base):
    __tablename__ = "irrigation_recommendations"
    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"))
    timestamp = Column(DateTime(timezone=True))
    current_soil_moisture = Column(Float)
    target_soil_moisture = Column(Float)
    recommended_water_mm = Column(Float)
    estimated_savings_pct = Column(Float)
    recommendation_text = Column(String)
    urgency_level = Column(SQLEnum(UrgencyLevel))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    field = relationship("Field", back_populates="irrigation_recommendations", lazy="selectin")
""",
    "aqrosmart/backend/app/models/credit_score_result.py": """from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime, Enum as SQLEnum
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
""",
    "aqrosmart/backend/app/models/scenario.py": """from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime
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
"""
}

for path, content in models_data.items():
    full_path = os.path.join(os.getcwd(), path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)
print("Updated models!")

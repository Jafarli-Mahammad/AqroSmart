from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.analysis_run import AnalysisRun
from app.models.field import Field
from app.models.irrigation_recommendation import IrrigationRecommendation
from app.models.satellite_snapshot import SatelliteSnapshot
from app.models.sensor_reading import SensorReading
from app.models.subsidy_recommendation import SubsidyRecommendation
from app.models.weather_snapshot import WeatherSnapshot

router = APIRouter(prefix="/fields", tags=["fields"])


class SensorReadingResponse(BaseModel):
    id: int
    timestamp: datetime | None
    soil_moisture_pct: float | None
    water_flow_lph: float | None
    air_temperature_c: float | None
    humidity_pct: float | None
    rain_mm: float | None

    model_config = ConfigDict(from_attributes=True)


class SatelliteSnapshotResponse(BaseModel):
    id: int
    date: date | None
    ndvi: float | None
    ndwi: float | None
    cloud_cover_pct: float | None
    vegetation_health_score: float | None

    model_config = ConfigDict(from_attributes=True)


class WeatherSnapshotResponse(BaseModel):
    id: int
    date: date | None
    max_temp_c: float | None
    min_temp_c: float | None
    rain_mm: float | None
    wind_kmh: float | None
    drought_index: float | None

    model_config = ConfigDict(from_attributes=True)


class AnalysisRunResponse(BaseModel):
    id: int
    timestamp: datetime | None
    potential_yield_t: float | None
    actual_yield_t: float | None
    productivity_score: float | None
    crop_health_score: float | None
    moisture_stress_score: float | None
    disease_risk_score: float | None
    confidence_pct: float | None

    model_config = ConfigDict(from_attributes=True)


class SubsidyRecommendationResponse(BaseModel):
    id: int
    base_subsidy_azn: float | None
    performance_factor: float | None
    efficiency_factor: float | None
    water_use_factor: float | None
    yield_alignment_factor: float | None
    final_subsidy_azn: float | None
    calculation_note: str | None

    model_config = ConfigDict(from_attributes=True)


class IrrigationRecommendationResponse(BaseModel):
    id: int
    timestamp: datetime | None
    current_soil_moisture: float | None
    target_soil_moisture: float | None
    recommended_water_mm: float | None
    estimated_savings_pct: float | None
    recommendation_text: str | None
    urgency_level: str | None

    model_config = ConfigDict(from_attributes=True)


class FieldDetailResponse(BaseModel):
    id: int
    farm_id: int | None
    crop_type: str | None
    area_ha: float | None
    soil_type: str | None
    irrigation_type: str | None
    latitude: float | None
    longitude: float | None
    ndvi_score: float | None
    ndwi_score: float | None
    latest_sensor_reading: SensorReadingResponse | None
    latest_satellite_snapshot: SatelliteSnapshotResponse | None
    latest_weather_snapshot: WeatherSnapshotResponse | None
    latest_analysis_run: AnalysisRunResponse | None
    latest_subsidy_recommendation: SubsidyRecommendationResponse | None
    latest_irrigation_recommendation: IrrigationRecommendationResponse | None

    model_config = ConfigDict(from_attributes=True)


@router.get("/{field_id}", response_model=FieldDetailResponse)
async def get_field(field_id: int, session: AsyncSession = Depends(get_db)) -> FieldDetailResponse:
    field = (await session.execute(select(Field).where(Field.id == field_id))).scalar_one_or_none()
    if field is None:
        raise HTTPException(status_code=404, detail="Field not found")

    latest_sensor = (
        await session.execute(select(SensorReading).where(SensorReading.field_id == field_id).order_by(SensorReading.timestamp.desc().nullslast(), SensorReading.id.desc()).limit(1))
    ).scalar_one_or_none()
    latest_satellite = (
        await session.execute(select(SatelliteSnapshot).where(SatelliteSnapshot.field_id == field_id).order_by(SatelliteSnapshot.date.desc().nullslast(), SatelliteSnapshot.id.desc()).limit(1))
    ).scalar_one_or_none()
    latest_weather = (
        await session.execute(select(WeatherSnapshot).where(WeatherSnapshot.field_id == field_id).order_by(WeatherSnapshot.date.desc().nullslast(), WeatherSnapshot.id.desc()).limit(1))
    ).scalar_one_or_none()
    latest_analysis = (
        await session.execute(select(AnalysisRun).where(AnalysisRun.field_id == field_id).order_by(AnalysisRun.timestamp.desc().nullslast(), AnalysisRun.id.desc()).limit(1))
    ).scalar_one_or_none()
    latest_subsidy = (
        await session.execute(select(SubsidyRecommendation).where(SubsidyRecommendation.field_id == field_id).order_by(SubsidyRecommendation.id.desc()).limit(1))
    ).scalar_one_or_none()
    latest_irrigation = (
        await session.execute(select(IrrigationRecommendation).where(IrrigationRecommendation.field_id == field_id).order_by(IrrigationRecommendation.timestamp.desc().nullslast(), IrrigationRecommendation.id.desc()).limit(1))
    ).scalar_one_or_none()

    return FieldDetailResponse(
        id=field.id,
        farm_id=field.farm_id,
        crop_type=field.crop_type,
        area_ha=field.area_ha,
        soil_type=field.soil_type,
        irrigation_type=field.irrigation_type,
        latitude=field.latitude,
        longitude=field.longitude,
        ndvi_score=field.ndvi_score,
        ndwi_score=field.ndwi_score,
        latest_sensor_reading=SensorReadingResponse.model_validate(latest_sensor) if latest_sensor else None,
        latest_satellite_snapshot=SatelliteSnapshotResponse.model_validate(latest_satellite) if latest_satellite else None,
        latest_weather_snapshot=WeatherSnapshotResponse.model_validate(latest_weather) if latest_weather else None,
        latest_analysis_run=AnalysisRunResponse.model_validate(latest_analysis) if latest_analysis else None,
        latest_subsidy_recommendation=SubsidyRecommendationResponse.model_validate(latest_subsidy) if latest_subsidy else None,
        latest_irrigation_recommendation=IrrigationRecommendationResponse.model_validate(latest_irrigation) if latest_irrigation else None,
    )

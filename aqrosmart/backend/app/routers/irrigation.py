from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.field import Field
from app.models.irrigation_recommendation import IrrigationRecommendation
from app.models.sensor_reading import SensorReading

router = APIRouter(prefix="/irrigation", tags=["irrigation"])


class SensorReadingShort(BaseModel):
    id: int
    timestamp: datetime | None
    soil_moisture_pct: float | None
    water_flow_lph: float | None
    air_temperature_c: float | None
    humidity_pct: float | None
    rain_mm: float | None

    model_config = ConfigDict(from_attributes=True)


class IrrigationRecommendationDetail(BaseModel):
    id: int
    timestamp: datetime | None
    current_soil_moisture: float | None
    target_soil_moisture: float | None
    recommended_water_mm: float | None
    estimated_savings_pct: float | None
    recommendation_text: str | None
    urgency_level: str | None
    sensor_reading: SensorReadingShort | None
    estimated_water_usage_before_l: float
    estimated_water_usage_after_l: float

    model_config = ConfigDict(from_attributes=True)


@router.get("/recommendation/{field_id}", response_model=IrrigationRecommendationDetail)
async def get_irrigation_recommendation(field_id: int, session: AsyncSession = Depends(get_db)) -> IrrigationRecommendationDetail:
    field = (await session.execute(select(Field).where(Field.id == field_id))).scalar_one_or_none()
    if field is None:
        raise HTTPException(status_code=404, detail="Field not found")

    recommendation = (
        await session.execute(select(IrrigationRecommendation).where(IrrigationRecommendation.field_id == field_id).order_by(IrrigationRecommendation.timestamp.desc().nullslast(), IrrigationRecommendation.id.desc()).limit(1))
    ).scalar_one_or_none()
    if recommendation is None:
        raise HTTPException(status_code=404, detail="Irrigation recommendation not found")

    sensor_reading = (
        await session.execute(select(SensorReading).where(SensorReading.field_id == field_id).order_by(SensorReading.timestamp.desc().nullslast(), SensorReading.id.desc()).limit(1))
    ).scalar_one_or_none()

    before = float(sensor_reading.water_flow_lph if sensor_reading and sensor_reading.water_flow_lph is not None else (recommendation.recommended_water_mm or 0.0) * 10.0)
    after = max(0.0, before - float(recommendation.recommended_water_mm or 0.0) * 10.0)

    return IrrigationRecommendationDetail(
        id=recommendation.id,
        timestamp=recommendation.timestamp,
        current_soil_moisture=recommendation.current_soil_moisture,
        target_soil_moisture=recommendation.target_soil_moisture,
        recommended_water_mm=recommendation.recommended_water_mm if recommendation.recommended_water_mm is not None else recommendation.water_needed_mm,
        estimated_savings_pct=recommendation.estimated_savings_pct,
        recommendation_text=recommendation.recommendation_text,
        urgency_level=recommendation.urgency_level.value if recommendation.urgency_level else None,
        sensor_reading=SensorReadingShort.model_validate(sensor_reading) if sensor_reading else None,
        estimated_water_usage_before_l=round(before, 2),
        estimated_water_usage_after_l=round(after, 2),
    )

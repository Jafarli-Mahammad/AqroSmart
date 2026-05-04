from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.analysis_run import AnalysisRun
from app.models.field import Field
from app.models.irrigation_recommendation import IrrigationRecommendation
from app.models.scenario import Scenario
from app.models.sensor_reading import SensorReading
from app.models.satellite_snapshot import SatelliteSnapshot
from app.models.subsidy_recommendation import SubsidyRecommendation
from app.models.weather_snapshot import WeatherSnapshot
from app.models.crop import Crop
from app.services.simulation_engine import AnalysisResult as SimulationAnalysisResult
from app.services.simulation_engine import get_scenario_by_slug, run_full_analysis
from app.services.subsidy_engine import SubsidyBreakdown, calculate_subsidy
from app.services.irrigation_engine import calculate_irrigation

router = APIRouter(prefix="/analysis", tags=["analysis"])


class AnalysisRunRequest(BaseModel):
    field_id: int
    scenario_slug: str


class IrrigationResult(BaseModel):
    recommended_water_mm: float
    estimated_water_before_l: float
    estimated_water_after_l: float
    urgency_level: str
    recommendation_text: str

    model_config = ConfigDict(from_attributes=True)


class AnalysisExecutionResponse(BaseModel):
    analysis_result: SimulationAnalysisResult
    subsidy_breakdown: SubsidyBreakdown
    irrigation_result: IrrigationResult
    analysis_run_id: int
    subsidy_recommendation_id: int
    irrigation_recommendation_id: int

    model_config = ConfigDict(from_attributes=True)


@router.post("/run", response_model=AnalysisExecutionResponse)
async def run_analysis(payload: AnalysisRunRequest, session: AsyncSession = Depends(get_db)) -> AnalysisExecutionResponse:
    field = (await session.execute(select(Field).where(Field.id == payload.field_id))).scalar_one_or_none()
    if field is None:
        raise HTTPException(status_code=404, detail="Field not found")

    scenario = (await session.execute(select(Scenario).where(Scenario.slug == payload.scenario_slug))).scalar_one_or_none()
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found")

    crop = (
        await session.execute(select(Crop).where(Crop.field_id == field.id).order_by(Crop.id.desc()).limit(1))
    ).scalar_one_or_none()
    if crop is None:
        crop = SimpleNamespace(name=field.crop_type or "Unknown", typical_yield_per_ha=5.0, water_requirement_mm=350.0, growth_days=120, season="unknown")

    analysis_result = run_full_analysis(field, crop, get_scenario_by_slug(scenario.slug))
    subsidy_breakdown = calculate_subsidy(analysis_result, field, SimpleNamespace(id=0, name="farmer"))

    irrigation_mm = await calculate_irrigation(field.id)
    estimated_before = float(getattr(analysis_result.sensor_data, "water_flow_lph", 0.0) or 0.0)
    estimated_after = max(0.0, estimated_before - (irrigation_mm * 10.0))
    irrigation_result = IrrigationResult(
        recommended_water_mm=float(irrigation_mm),
        estimated_water_before_l=round(estimated_before, 2),
        estimated_water_after_l=round(estimated_after, 2),
        urgency_level="medium" if analysis_result.moisture_stress_score < 30 else "high",
        recommendation_text="Apply irrigation to bring soil moisture back toward the target range.",
    )

    analysis_row = AnalysisRun(
        field_id=field.id,
        scenario_id=scenario.id,
        timestamp=analysis_result.timestamp,
        potential_yield_t=analysis_result.potential_yield_t,
        actual_yield_t=analysis_result.actual_yield_t,
        productivity_score=analysis_result.productivity_score,
        crop_health_score=analysis_result.crop_health_score,
        moisture_stress_score=analysis_result.moisture_stress_score,
        disease_risk_score=analysis_result.disease_risk_score,
        confidence_pct=analysis_result.confidence_pct,
    )
    session.add(analysis_row)
    await session.flush()

    subsidy_row = SubsidyRecommendation(
        field_id=field.id,
        analysis_run_id=analysis_row.id,
        base_subsidy_azn=subsidy_breakdown.base_subsidy_azn,
        performance_factor=subsidy_breakdown.performance_factor,
        efficiency_factor=subsidy_breakdown.efficiency_factor,
        water_use_factor=subsidy_breakdown.water_use_factor,
        yield_alignment_factor=subsidy_breakdown.yield_alignment_factor,
        final_subsidy_azn=subsidy_breakdown.final_subsidy_azn,
        calculation_note=subsidy_breakdown.calculation_note,
    )
    irrigation_row = IrrigationRecommendation(
        field_id=field.id,
        timestamp=analysis_result.timestamp,
        current_soil_moisture=analysis_result.sensor_data.soil_moisture_pct,
        target_soil_moisture=70.0,
        recommended_water_mm=irrigation_result.recommended_water_mm,
        estimated_savings_pct=max(0.0, 100.0 - irrigation_result.estimated_water_after_l),
        recommendation_text=irrigation_result.recommendation_text,
        urgency_level=irrigation_result.urgency_level,
    )
    session.add_all([subsidy_row, irrigation_row])
    await session.commit()

    return AnalysisExecutionResponse(
        analysis_result=analysis_result,
        subsidy_breakdown=subsidy_breakdown,
        irrigation_result=irrigation_result,
        analysis_run_id=analysis_row.id,
        subsidy_recommendation_id=subsidy_row.id,
        irrigation_recommendation_id=irrigation_row.id,
    )

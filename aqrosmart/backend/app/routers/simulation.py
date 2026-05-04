from __future__ import annotations

from datetime import date, datetime
from types import SimpleNamespace

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import delete, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.analysis_run import AnalysisRun
from app.models.farm import Farm
from app.models.field import Field
from app.models.irrigation_recommendation import IrrigationRecommendation, UrgencyLevel
from app.models.satellite_snapshot import SatelliteSnapshot
from app.models.scenario import Scenario
from app.models.sensor_reading import SensorReading
from app.models.subsidy_recommendation import SubsidyRecommendation
from app.models.weather_snapshot import WeatherSnapshot
from app.services.simulation_engine import get_scenario_by_slug, run_full_analysis
from app.models.crop import Crop

router = APIRouter(prefix="/simulation", tags=["simulation"])


class ScenarioOption(BaseModel):
    slug: str
    name: str
    description: str | None
    weather_modifier: float | None
    soil_moisture_modifier: float | None
    ndvi_modifier: float | None
    yield_modifier: float | None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class SimulationStateResponse(BaseModel):
    active_scenario: str
    scenarios: list[ScenarioOption]

    model_config = ConfigDict(from_attributes=True)


class SimulationResetResponse(BaseModel):
    deleted_analysis_runs: int
    deleted_subsidy_recommendations: int
    deleted_irrigation_recommendations: int
    reseeded_sensor_readings: int
    reseeded_satellite_snapshots: int
    reseeded_weather_snapshots: int
    active_scenario: str

    model_config = ConfigDict(from_attributes=True)


async def _seed_field_data(session: AsyncSession) -> tuple[int, int, int]:
    fields = (await session.execute(select(Field).order_by(Field.id.asc()))).scalars().all()
    if not fields:
        return 0, 0, 0

    sensor_rows: list[SensorReading] = []
    satellite_rows: list[SatelliteSnapshot] = []
    weather_rows: list[WeatherSnapshot] = []
    for field in fields:
        scenario = get_scenario_by_slug("healthy_field")
        crop = (
            await session.execute(select(Crop).where(Crop.field_id == field.id).order_by(Crop.id.desc()).limit(1))
        ).scalar_one_or_none() or SimpleNamespace(typical_yield_per_ha=5.0)
        analysis_result = run_full_analysis(field, crop, scenario)

        sensor_rows.append(
            SensorReading(
                field_id=field.id,
                timestamp=analysis_result.timestamp,
                soil_moisture_pct=analysis_result.sensor_data.soil_moisture_pct,
                water_flow_lph=analysis_result.sensor_data.water_flow_lph,
                air_temperature_c=analysis_result.sensor_data.air_temperature_c,
                humidity_pct=analysis_result.sensor_data.humidity_pct,
                rain_mm=0.0,
            )
        )
        satellite_rows.append(
            SatelliteSnapshot(
                field_id=field.id,
                date=date.today(),
                ndvi=analysis_result.satellite_data.ndvi,
                ndwi=analysis_result.satellite_data.ndwi,
                cloud_cover_pct=15.0,
                vegetation_health_score=analysis_result.satellite_data.vegetation_health_score,
            )
        )
        weather_rows.append(
            WeatherSnapshot(
                field_id=field.id,
                date=date.today(),
                max_temp_c=analysis_result.sensor_data.air_temperature_c + 4.0,
                min_temp_c=analysis_result.sensor_data.air_temperature_c - 5.0,
                rain_mm=0.0,
                wind_kmh=12.0,
                drought_index=20.0,
            )
        )

    session.add_all(sensor_rows + satellite_rows + weather_rows)
    await session.flush()
    return len(sensor_rows), len(satellite_rows), len(weather_rows)


@router.get("/state", response_model=SimulationStateResponse)
async def get_simulation_state(session: AsyncSession = Depends(get_db)) -> SimulationStateResponse:
    scenarios = (await session.execute(select(Scenario).order_by(Scenario.id.asc()))).scalars().all()
    if not scenarios:
        raise HTTPException(status_code=404, detail="No scenarios found")

    active = next((scenario.slug for scenario in scenarios if scenario.is_active), scenarios[0].slug)
    return SimulationStateResponse(
        active_scenario=active,
        scenarios=[ScenarioOption.model_validate(scenario) for scenario in scenarios],
    )


@router.post("/scenario/{scenario_slug}", response_model=SimulationStateResponse)
async def set_active_scenario(scenario_slug: str, session: AsyncSession = Depends(get_db)) -> SimulationStateResponse:
    scenario = (await session.execute(select(Scenario).where(Scenario.slug == scenario_slug))).scalar_one_or_none()
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found")

    await session.execute(update(Scenario).values(is_active=False))
    scenario.is_active = True
    await session.commit()
    return await get_simulation_state(session)


@router.post("/reset", response_model=SimulationResetResponse)
async def reset_simulation(session: AsyncSession = Depends(get_db)) -> SimulationResetResponse:
    deleted_analysis_runs = (await session.execute(delete(AnalysisRun))).rowcount or 0
    deleted_subsidy_recommendations = (await session.execute(delete(SubsidyRecommendation))).rowcount or 0
    deleted_irrigation_recommendations = (await session.execute(delete(IrrigationRecommendation))).rowcount or 0

    await session.execute(delete(SensorReading))
    await session.execute(delete(SatelliteSnapshot))
    await session.execute(delete(WeatherSnapshot))

    scenario_result = await session.execute(select(Scenario).where(Scenario.slug == "healthy_field"))
    scenario = scenario_result.scalar_one_or_none()
    if scenario is None:
        existing = (await session.execute(select(Scenario))).scalars().all()
        if existing:
            for row in existing:
                row.is_active = row.slug == existing[0].slug
        else:
            seed = get_scenario_by_slug("healthy_field")
            scenario = Scenario(
                name=seed.name,
                slug=seed.slug,
                description="Deterministic healthy baseline scenario",
                weather_modifier=seed.weather_modifier,
                soil_moisture_modifier=seed.soil_moisture_modifier,
                ndvi_modifier=seed.ndvi_modifier,
                yield_modifier=seed.yield_modifier,
                is_active=True,
            )
            session.add(scenario)
    else:
        await session.execute(update(Scenario).values(is_active=False))
        scenario.is_active = True

    reseeded_sensor_readings, reseeded_satellite_snapshots, reseeded_weather_snapshots = await _seed_field_data(session)
    await session.commit()

    active_result = await session.execute(select(Scenario.slug).where(Scenario.is_active.is_(True)).limit(1))
    active = active_result.scalar_one_or_none() or "healthy_field"
    return SimulationResetResponse(
        deleted_analysis_runs=int(deleted_analysis_runs),
        deleted_subsidy_recommendations=int(deleted_subsidy_recommendations),
        deleted_irrigation_recommendations=int(deleted_irrigation_recommendations),
        reseeded_sensor_readings=reseeded_sensor_readings,
        reseeded_satellite_snapshots=reseeded_satellite_snapshots,
        reseeded_weather_snapshots=reseeded_weather_snapshots,
        active_scenario=active,
    )

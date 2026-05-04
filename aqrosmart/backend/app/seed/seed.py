from __future__ import annotations

import asyncio
import hashlib
import random
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from typing import Any, Iterable

from sqlalchemy import delete, select

from app.database import AsyncSessionLocal
from app.models import (  # noqa: F401 - imported to register ORM mappings
    AnalysisRun,
    Crop,
    Farmer,
    Farm,
    Field,
    IrrigationRecommendation,
    SatelliteSnapshot,
    Scenario,
    SensorReading,
    SubsidyRecommendation,
    WeatherSnapshot,
)
from app.services.simulation_engine import generate_satellite_snapshot, generate_sensor_reading, get_scenario_by_slug


FARMERS = [
    {"name": "Murad Həsənov", "fin_code": "5XK2JH1", "region": "Zəngilan", "years_active": 12},
    {"name": "Aytən Quliyeva", "fin_code": "7MP4RT3", "region": "Füzuli", "years_active": 6},
    {"name": "Rauf Babayev", "fin_code": "2LN8YQ9", "region": "Ağdam", "years_active": 18},
]

FARMS = [
    {"name": "Mincivan Highland Farm", "farmer_fin_code": "5XK2JH1", "region": "Zəngilan", "district": "Mincivan", "total_area_ha": 42.0},
    {"name": "Ağalı Araz Farm", "farmer_fin_code": "5XK2JH1", "region": "Zəngilan", "district": "Ağalı", "total_area_ha": 18.5},
    {"name": "Horadiz Green Belt Farm", "farmer_fin_code": "7MP4RT3", "region": "Füzuli", "district": "Horadiz", "total_area_ha": 26.0},
    {"name": "Alxanlı Terrace Farm", "farmer_fin_code": "7MP4RT3", "region": "Füzuli", "district": "Alxanlı", "total_area_ha": 14.0},
    {"name": "Xındırıstan Prosperity Farm", "farmer_fin_code": "2LN8YQ9", "region": "Ağdam", "district": "Xındırıstan", "total_area_ha": 33.5},
]

FIELDS = [
    {"name": "Mincivan North Wheat", "farm_name": "Mincivan Highland Farm", "crop_type": "wheat", "area_ha": 6.5, "soil_type": "loam", "irrigation_type": "drip", "latitude": 39.148, "longitude": 46.630, "ndvi_score": 0.82, "ndwi_score": 0.54},
    {"name": "Mincivan South Cotton", "farm_name": "Mincivan Highland Farm", "crop_type": "cotton", "area_ha": 5.8, "soil_type": "clay loam", "irrigation_type": "sprinkler", "latitude": 39.155, "longitude": 46.645, "ndvi_score": 0.67, "ndwi_score": 0.48},
    {"name": "Ağalı Corn Block", "farm_name": "Ağalı Araz Farm", "crop_type": "corn", "area_ha": 7.2, "soil_type": "sandy loam", "irrigation_type": "drip", "latitude": 39.180, "longitude": 46.700, "ndvi_score": 0.74, "ndwi_score": 0.59},
    {"name": "Horadiz Sunflower Plain", "farm_name": "Horadiz Green Belt Farm", "crop_type": "sunflower", "area_ha": 8.1, "soil_type": "loam", "irrigation_type": "flood", "latitude": 39.465, "longitude": 47.010, "ndvi_score": 0.58, "ndwi_score": 0.44},
    {"name": "Horadiz Grape Terrace", "farm_name": "Horadiz Green Belt Farm", "crop_type": "grape", "area_ha": 4.3, "soil_type": "clay loam", "irrigation_type": "sprinkler", "latitude": 39.472, "longitude": 47.025, "ndvi_score": 0.71, "ndwi_score": 0.62},
    {"name": "Alxanlı Wheat Plot", "farm_name": "Alxanlı Terrace Farm", "crop_type": "wheat", "area_ha": 5.1, "soil_type": "loam", "irrigation_type": "sprinkler", "latitude": 39.410, "longitude": 46.910, "ndvi_score": 0.61, "ndwi_score": 0.51},
    {"name": "Xındırıstan Cotton Block", "farm_name": "Xındırıstan Prosperity Farm", "crop_type": "cotton", "area_ha": 6.9, "soil_type": "sandy loam", "irrigation_type": "flood", "latitude": 39.920, "longitude": 46.930, "ndvi_score": 0.45, "ndwi_score": 0.39},
    {"name": "Xındırıstan Sunflower Edge", "farm_name": "Xındırıstan Prosperity Farm", "crop_type": "sunflower", "area_ha": 5.7, "soil_type": "loam", "irrigation_type": "drip", "latitude": 39.935, "longitude": 46.955, "ndvi_score": 0.79, "ndwi_score": 0.67},
]

CROPS = [
    {"name": "wheat", "typical_yield_per_ha": 3.8, "water_requirement_mm": 420.0, "growth_days": 125, "season": "autumn"},
    {"name": "cotton", "typical_yield_per_ha": 2.2, "water_requirement_mm": 650.0, "growth_days": 180, "season": "warm"},
    {"name": "sunflower", "typical_yield_per_ha": 2.6, "water_requirement_mm": 500.0, "growth_days": 115, "season": "spring"},
    {"name": "corn", "typical_yield_per_ha": 6.5, "water_requirement_mm": 600.0, "growth_days": 110, "season": "summer"},
    {"name": "grape", "typical_yield_per_ha": 8.0, "water_requirement_mm": 350.0, "growth_days": 220, "season": "perennial"},
]

SCENARIOS = [
    {"slug": "healthy_field", "name": "Healthy Field", "description": "Baseline healthy crop conditions.", "weather_modifier": 1.0, "soil_moisture_modifier": 1.1, "ndvi_modifier": 1.05, "yield_modifier": 0.93, "is_active": True},
    {"slug": "drought_stress", "name": "Drought Stress", "description": "Water stress and low moisture conditions.", "weather_modifier": 0.7, "soil_moisture_modifier": 0.5, "ndvi_modifier": 0.6, "yield_modifier": 0.55, "is_active": False},
    {"slug": "disease_outbreak", "name": "Disease Outbreak", "description": "Lower vegetation health due to disease pressure.", "weather_modifier": 0.9, "soil_moisture_modifier": 1.0, "ndvi_modifier": 0.5, "yield_modifier": 0.65, "is_active": False},
    {"slug": "irrigation_recovery", "name": "Irrigation Recovery", "description": "Field recovering after irrigation intervention.", "weather_modifier": 1.0, "soil_moisture_modifier": 1.2, "ndvi_modifier": 0.8, "yield_modifier": 0.80, "is_active": False},
    {"slug": "high_efficiency", "name": "High Efficiency", "description": "Optimized irrigation and weather performance.", "weather_modifier": 1.1, "soil_moisture_modifier": 1.15, "ndvi_modifier": 1.1, "yield_modifier": 0.95, "is_active": False},
    {"slug": "low_efficiency", "name": "Low Efficiency", "description": "Reduced field efficiency and output.", "weather_modifier": 0.9, "soil_moisture_modifier": 0.8, "ndvi_modifier": 0.85, "yield_modifier": 0.70, "is_active": False},
    {"slug": "subsidy_improvement", "name": "Subsidy Improvement", "description": "Improved subsidy eligibility scenario.", "weather_modifier": 1.05, "soil_moisture_modifier": 1.05, "ndvi_modifier": 1.05, "yield_modifier": 0.90, "is_active": False},
]


@contextmanager
def deterministic_random(seed_text: str):
    state = random.getstate()
    seed_value = int(hashlib.sha256(seed_text.encode("utf-8")).hexdigest(), 16) % (2**32)
    random.seed(seed_value)
    try:
        yield
    finally:
        random.setstate(state)


def _as_key_map(items: Iterable[Any], attribute: str) -> dict[Any, Any]:
    return {getattr(item, attribute): item for item in items}


async def _upsert_one(session, model, lookup: dict[str, Any], values: dict[str, Any]):
    result = await session.execute(select(model).filter_by(**lookup))
    instance = result.scalar_one_or_none()
    if instance is None:
        instance = model(**lookup, **values)
        session.add(instance)
    else:
        for key, value in values.items():
            setattr(instance, key, value)
    return instance


async def _replace_field_series(session, field_id: int) -> None:
    await session.execute(delete(SensorReading).where(SensorReading.field_id == field_id))
    await session.execute(delete(SatelliteSnapshot).where(SatelliteSnapshot.field_id == field_id))
    await session.execute(delete(WeatherSnapshot).where(WeatherSnapshot.field_id == field_id))


async def seed_data() -> None:
    async with AsyncSessionLocal() as session:
        async with session.begin():
            farmer_rows = []
            for farmer_data in FARMERS:
                farmer_rows.append(
                    await _upsert_one(
                        session,
                        Farmer,
                        {"fin_code": farmer_data["fin_code"]},
                        {"name": farmer_data["name"], "region": farmer_data["region"], "years_active": farmer_data["years_active"]},
                    )
                )

            await session.flush()
            farmer_by_fin = _as_key_map(farmer_rows, "fin_code")

            farm_rows = []
            for farm_data in FARMS:
                farm_rows.append(
                    await _upsert_one(
                        session,
                        Farm,
                        {"name": farm_data["name"]},
                        {
                            "farmer_id": farmer_by_fin[farm_data["farmer_fin_code"]].id,
                            "total_area_ha": farm_data["total_area_ha"],
                            "region": farm_data["region"],
                            "district": farm_data["district"],
                        },
                    )
                )

            await session.flush()
            farm_by_name = _as_key_map(farm_rows, "name")

            for farmer in farmer_rows:
                farmer.farm_count = sum(1 for farm in farm_rows if farm.farmer_id == farmer.id)

            crop_rows = []
            for crop_data in CROPS:
                crop_rows.append(
                    await _upsert_one(
                        session,
                        Crop,
                        {"name": crop_data["name"]},
                        {
                            "typical_yield_per_ha": crop_data["typical_yield_per_ha"],
                            "water_requirement_mm": crop_data["water_requirement_mm"],
                            "growth_days": crop_data["growth_days"],
                            "season": crop_data["season"],
                            "field_id": None,
                        },
                    )
                )

            for scenario_data in SCENARIOS:
                await _upsert_one(
                    session,
                    Scenario,
                    {"slug": scenario_data["slug"]},
                    {
                        "name": scenario_data["name"],
                        "description": scenario_data["description"],
                        "weather_modifier": scenario_data["weather_modifier"],
                        "soil_moisture_modifier": scenario_data["soil_moisture_modifier"],
                        "ndvi_modifier": scenario_data["ndvi_modifier"],
                        "yield_modifier": scenario_data["yield_modifier"],
                        "is_active": scenario_data["is_active"],
                    },
                )

            await session.execute(select(Scenario))
            await session.flush()

            field_rows = []
            for field_data in FIELDS:
                field_rows.append(
                    await _upsert_one(
                        session,
                        Field,
                        # {"farm_id": farm_by_name[field_data["farm_name"]].id, "name": field_data["name"]},
                        {"farm_id": farm_by_name[field_data["farm_name"]].id},
                        {
                            "crop_type": field_data["crop_type"],
                            "area_ha": field_data["area_ha"],
                            "soil_type": field_data["soil_type"],
                            "irrigation_type": field_data["irrigation_type"],
                            "latitude": field_data["latitude"],
                            "longitude": field_data["longitude"],
                            "ndvi_score": field_data["ndvi_score"],
                            "ndwi_score": field_data["ndwi_score"],
                        },
                    )
                )

            await session.flush()

            healthy_scenario = get_scenario_by_slug("healthy_field")
            sensor_total = 0
            for field in field_rows:
                await _replace_field_series(session, field.id)

                for day_index in range(10):
                    moment = datetime.now(timezone.utc) - timedelta(days=day_index)
                    with deterministic_random(f"sensor:{field.id}:{day_index}"):
                        sensor_payload = generate_sensor_reading(field, healthy_scenario)
                    session.add(
                        SensorReading(
                            field_id=field.id,
                            timestamp=moment,
                            soil_moisture_pct=sensor_payload["soil_moisture_pct"],
                            water_flow_lph=sensor_payload["water_flow_lph"],
                            air_temperature_c=sensor_payload["air_temperature_c"],
                            humidity_pct=sensor_payload["humidity_pct"],
                            rain_mm=round(max(0.0, 18.0 - day_index * 1.5), 2),
                        )
                    )
                    sensor_total += 1

                for week_index in range(5):
                    week_date = date.today() - timedelta(weeks=week_index)
                    with deterministic_random(f"satellite:{field.id}:{week_index}"):
                        satellite_payload = generate_satellite_snapshot(
                            field,
                            healthy_scenario,
                            disease_risk=0.12 + (week_index * 0.03),
                            moisture=42.0 + (field.ndwi_score or 0.5) * 25.0,
                        )
                    session.add(
                        SatelliteSnapshot(
                            field_id=field.id,
                            date=week_date,
                            ndvi=satellite_payload["ndvi"],
                            ndwi=satellite_payload["ndwi"],
                            cloud_cover_pct=round(12.0 + week_index * 2.5, 2),
                            vegetation_health_score=satellite_payload["vegetation_health_score"],
                        )
                    )

                for day_index in range(7):
                    weather_date = date.today() - timedelta(days=day_index)
                    base_temp = 31.0 + (field.latitude - 39.0) * 2.0
                    session.add(
                        WeatherSnapshot(
                            field_id=field.id,
                            date=weather_date,
                            max_temp_c=round(base_temp + 4.0 - day_index * 0.3, 2),
                            min_temp_c=round(base_temp - 6.5 - day_index * 0.2, 2),
                            rain_mm=round(max(0.0, 6.0 - day_index * 0.8), 2),
                            wind_kmh=round(10.0 + (day_index % 3) * 1.8, 2),
                            drought_index=round(min(100.0, 18.0 + day_index * 2.2), 2),
                        )
                    )

            await session.flush()

    print(f"Seeded: {len(farmer_rows)} farmers, {len(farm_rows)} farms, {len(field_rows)} fields, {sensor_total} sensor readings")


def main() -> None:
    asyncio.run(seed_data())


if __name__ == "__main__":
    main()

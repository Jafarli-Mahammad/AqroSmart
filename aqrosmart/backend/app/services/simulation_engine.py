import hashlib
import random
import datetime
from pydantic import BaseModel
from time import monotonic

class ScenarioConfig(BaseModel):
    slug: str
    name: str
    weather_modifier: float
    soil_moisture_modifier: float
    ndvi_modifier: float
    yield_modifier: float
    drought_index: float
    is_extreme: bool

class SensorData(BaseModel):
    soil_moisture_pct: float
    water_flow_lph: float
    air_temperature_c: float
    humidity_pct: float

class SatelliteData(BaseModel):
    ndvi: float
    ndwi: float
    vegetation_health_score: float

class AnalysisResult(BaseModel):
    potential_yield_t: float
    actual_yield_t: float
    productivity_score: float
    crop_health_score: float
    moisture_stress_score: float
    disease_risk_score: float
    confidence_pct: float
    sensor_data: SensorData
    satellite_data: SatelliteData
    timestamp: datetime.datetime


_ANALYSIS_CACHE: dict[str, tuple[float, AnalysisResult]] = {}
_ANALYSIS_CACHE_TTL_SECONDS = 30
_ANALYSIS_CACHE_MAXSIZE = 512


def _seed_from_parts(*parts: object) -> int:
    seed_input = ":".join(str(part) for part in parts)
    digest = hashlib.sha256(seed_input.encode("utf-8")).hexdigest()
    return int(digest[:16], 16)

def get_scenario_by_slug(slug: str) -> ScenarioConfig:
    scenarios = {
        "healthy_field": ScenarioConfig(
            slug="healthy_field", name="Healthy Field", weather_modifier=1.0, 
            soil_moisture_modifier=1.1, ndvi_modifier=1.05, yield_modifier=0.93, drought_index=0.2, is_extreme=False
        ),
        "drought_stress": ScenarioConfig(
            slug="drought_stress", name="Drought Stress", weather_modifier=0.7, 
            soil_moisture_modifier=0.5, ndvi_modifier=0.6, yield_modifier=0.55, drought_index=0.9, is_extreme=True
        ),
        "disease_outbreak": ScenarioConfig(
            slug="disease_outbreak", name="Disease Outbreak", weather_modifier=0.9, 
            soil_moisture_modifier=1.0, ndvi_modifier=0.5, yield_modifier=0.65, drought_index=0.3, is_extreme=True
        ),
        "irrigation_recovery": ScenarioConfig(
            slug="irrigation_recovery", name="Irrigation Recovery", weather_modifier=1.0, 
            soil_moisture_modifier=1.2, ndvi_modifier=0.8, yield_modifier=0.80, drought_index=0.4, is_extreme=False
        ),
        "high_efficiency": ScenarioConfig(
            slug="high_efficiency", name="High Efficiency", weather_modifier=1.1, 
            soil_moisture_modifier=1.15, ndvi_modifier=1.1, yield_modifier=0.95, drought_index=0.1, is_extreme=False
        ),
        "low_efficiency": ScenarioConfig(
            slug="low_efficiency", name="Low Efficiency", weather_modifier=0.9, 
            soil_moisture_modifier=0.8, ndvi_modifier=0.85, yield_modifier=0.70, drought_index=0.6, is_extreme=False
        ),
        "subsidy_improvement": ScenarioConfig(
            slug="subsidy_improvement", name="Subsidy Improvement", weather_modifier=1.05, 
            soil_moisture_modifier=1.05, ndvi_modifier=1.05, yield_modifier=0.90, drought_index=0.2, is_extreme=False
        )
    }
    return scenarios.get(slug, scenarios["healthy_field"])

def generate_sensor_reading(field, scenario: ScenarioConfig, rng: random.Random | None = None) -> dict:
    rng = rng or random.Random()
    base_moisture = 45.0
    moisture = base_moisture * scenario.soil_moisture_modifier
    
    crop_factor = getattr(field, "crop_type", "")
    if crop_factor.lower() in ["rice", "corn"]:
        moisture *= 1.1
    elif crop_factor.lower() in ["wheat", "barley"]:
        moisture *= 0.9

    moisture = max(0.0, min(100.0, moisture))
    
    if moisture > 70.0:
        water_flow = 0.0
    else:
        deficit = 70.0 - moisture
        water_flow = max(0.0, deficit * 2.5)
        
    temp_c = 29.0 + rng.uniform(-5.0, 5.0)
    
    humidity = max(10.0, min(100.0, 100.0 - (scenario.drought_index * 80) + rng.uniform(-5.0, 5.0)))
    
    return {
        "soil_moisture_pct": round(moisture, 2),
        "water_flow_lph": round(water_flow, 2),
        "air_temperature_c": round(temp_c, 2),
        "humidity_pct": round(humidity, 2)
    }

def generate_satellite_snapshot(field, scenario: ScenarioConfig, disease_risk: float = 0.1, moisture: float = 50.0, rng: random.Random | None = None) -> dict:
    rng = rng or random.Random()
    base_ndvi = getattr(field, "ndvi_score", 0.7)
    ndvi = base_ndvi * scenario.ndvi_modifier
    ndvi = max(0.0, min(1.0, ndvi))
    
    ndwi = (moisture / 100.0) * 0.8 + rng.uniform(-0.1, 0.1)
    ndwi = max(-1.0, min(1.0, ndwi))
    
    health_score = (ndvi * 0.4) + (max(0, ndwi) * 0.3) + ((1.0 - disease_risk) * 0.3)
    health_score = max(0.0, min(1.0, health_score))
    
    return {
        "ndvi": round(ndvi, 3),
        "ndwi": round(ndwi, 3),
        "vegetation_health_score": round(health_score, 3)
    }

def estimate_potential_yield(field, crop, scenario: ScenarioConfig) -> float:
    area = getattr(field, "area_ha", 1.0)
    typ_yield = getattr(crop, "typical_yield_per_ha", 5.0)
    
    base_yield = typ_yield * area
    weather_mod = scenario.weather_modifier
    
    irrig_type = getattr(field, "irrigation_type", "none").lower()
    irrig_mod = 1.15 if "drip" in irrig_type else 1.0
    
    return round(base_yield * weather_mod * irrig_mod, 2)

def estimate_actual_yield(potential_yield: float, scenario: ScenarioConfig, rng: random.Random | None = None) -> float:
    rng = rng or random.Random()
    if scenario.slug == "drought_stress":
        actual = potential_yield * 0.55
    elif scenario.slug == "disease_outbreak":
        actual = potential_yield * 0.65
    elif scenario.slug == "irrigation_recovery":
        actual = potential_yield * 0.80
    elif scenario.slug == "healthy_field":
        actual = potential_yield * 0.93
    else:
        actual = potential_yield * (scenario.yield_modifier + rng.uniform(-0.05, 0.05))
        
    return round(actual, 2)

def calculate_productivity_score(actual: float, potential: float) -> float:
    if potential <= 0:
        return 0.0
    ratio = max(0.0, min(1.0, actual / potential))
    return round(ratio * 100.0, 1)

def run_full_analysis(field, crop, scenario: ScenarioConfig) -> AnalysisResult:
    field_id = getattr(field, "id", "unknown")
    crop_name = getattr(crop, "name", "unknown")
    cache_key = f"{field_id}:{scenario.slug}:{crop_name}"
    now = monotonic()
    cached = _ANALYSIS_CACHE.get(cache_key)
    if cached and cached[0] > now:
        return cached[1]

    rng = random.Random(_seed_from_parts(field_id, scenario.slug, crop_name))
    sensor_dict = generate_sensor_reading(field, scenario, rng=rng)

    disease_risk = 0.8 if scenario.slug == "disease_outbreak" else 0.1 + rng.uniform(0.0, 0.2)
    disease_risk = min(1.0, disease_risk)
    
    sat_dict = generate_satellite_snapshot(field, scenario, disease_risk=disease_risk, moisture=sensor_dict["soil_moisture_pct"], rng=rng)
    
    pot_yield = estimate_potential_yield(field, crop, scenario)
    act_yield = estimate_actual_yield(pot_yield, scenario, rng=rng)
    
    prod_score = calculate_productivity_score(act_yield, pot_yield)
    
    crop_health = sat_dict["vegetation_health_score"] * 100.0
    moisture_stress = 100.0 - min(100.0, sensor_dict["soil_moisture_pct"] * 1.5)
    
    if scenario.slug == "healthy_field" or scenario.yield_modifier >= 0.9:
        conf = 92.0 + rng.uniform(-2, 2)
    elif scenario.slug == "drought_stress":
        conf = 78.0 + rng.uniform(-2, 2)
    elif scenario.slug == "disease_outbreak":
        conf = 74.0 + rng.uniform(-2, 2)
    else:
        conf = 85.0 + rng.uniform(-5, 5)

    result = AnalysisResult(
        potential_yield_t=pot_yield,
        actual_yield_t=act_yield,
        productivity_score=prod_score,
        crop_health_score=round(crop_health, 1),
        moisture_stress_score=round(moisture_stress, 1),
        disease_risk_score=round(disease_risk * 100.0, 1),
        confidence_pct=round(conf, 1),
        sensor_data=SensorData(**sensor_dict),
        satellite_data=SatelliteData(**sat_dict),
        timestamp=datetime.datetime.now()
    )
    if len(_ANALYSIS_CACHE) >= _ANALYSIS_CACHE_MAXSIZE:
        oldest_key = min(_ANALYSIS_CACHE.items(), key=lambda item: item[1][0])[0]
        _ANALYSIS_CACHE.pop(oldest_key, None)
    _ANALYSIS_CACHE[cache_key] = (now + _ANALYSIS_CACHE_TTL_SECONDS, result)
    return result

async def run_simulation(scenario_id: int) -> str:
    return "Simulation engine configured."

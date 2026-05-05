-- AqroSmart schema alignment migration
-- Safe to run on the live Render PostgreSQL database
-- Adds the columns expected by the current ORM models and backfills demo data

BEGIN;

ALTER TABLE crops ADD COLUMN IF NOT EXISTS growth_days INTEGER;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS season VARCHAR;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS field_id INTEGER;

ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS slug VARCHAR;
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS soil_moisture_modifier FLOAT;
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS is_active BOOLEAN;
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE fields ADD COLUMN IF NOT EXISTS crop_type VARCHAR;
ALTER TABLE fields ADD COLUMN IF NOT EXISTS irrigation_type VARCHAR;
ALTER TABLE fields ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE fields ADD COLUMN IF NOT EXISTS longitude FLOAT;
ALTER TABLE fields ADD COLUMN IF NOT EXISTS ndvi_score FLOAT;
ALTER TABLE fields ADD COLUMN IF NOT EXISTS ndwi_score FLOAT;

ALTER TABLE analysis_runs ADD COLUMN IF NOT EXISTS scenario_id INTEGER;
ALTER TABLE analysis_runs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE;
ALTER TABLE analysis_runs ADD COLUMN IF NOT EXISTS potential_yield_t FLOAT;
ALTER TABLE analysis_runs ADD COLUMN IF NOT EXISTS actual_yield_t FLOAT;
ALTER TABLE analysis_runs ADD COLUMN IF NOT EXISTS confidence_pct FLOAT;

ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE;
ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS water_flow_lph FLOAT;
ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS air_temperature_c FLOAT;
ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS rain_mm FLOAT;

ALTER TABLE weather_snapshots ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE weather_snapshots ADD COLUMN IF NOT EXISTS max_temp_c FLOAT;
ALTER TABLE weather_snapshots ADD COLUMN IF NOT EXISTS min_temp_c FLOAT;
ALTER TABLE weather_snapshots ADD COLUMN IF NOT EXISTS wind_kmh FLOAT;

ALTER TABLE irrigation_recommendations ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE;
ALTER TABLE irrigation_recommendations ADD COLUMN IF NOT EXISTS current_soil_moisture FLOAT;
ALTER TABLE irrigation_recommendations ADD COLUMN IF NOT EXISTS target_soil_moisture FLOAT;
ALTER TABLE irrigation_recommendations ADD COLUMN IF NOT EXISTS recommended_water_mm FLOAT;
ALTER TABLE irrigation_recommendations ADD COLUMN IF NOT EXISTS estimated_savings_pct FLOAT;
ALTER TABLE irrigation_recommendations ADD COLUMN IF NOT EXISTS recommendation_text VARCHAR;

ALTER TABLE subsidy_recommendations ADD COLUMN IF NOT EXISTS analysis_run_id INTEGER;
ALTER TABLE subsidy_recommendations ADD COLUMN IF NOT EXISTS yield_alignment_factor FLOAT;
ALTER TABLE subsidy_recommendations ADD COLUMN IF NOT EXISTS calculation_note VARCHAR;

ALTER TABLE credit_score_results ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE;
ALTER TABLE credit_score_results ADD COLUMN IF NOT EXISTS subsidy_performance FLOAT;
ALTER TABLE credit_score_results ADD COLUMN IF NOT EXISTS consistency_score FLOAT;
ALTER TABLE credit_score_results ADD COLUMN IF NOT EXISTS climate_risk_score FLOAT;
ALTER TABLE credit_score_results ADD COLUMN IF NOT EXISTS irrigation_efficiency_score FLOAT;
ALTER TABLE credit_score_results ADD COLUMN IF NOT EXISTS final_score FLOAT;
ALTER TABLE credit_score_results ADD COLUMN IF NOT EXISTS explanation_text VARCHAR;
ALTER TABLE credit_score_results ADD COLUMN IF NOT EXISTS productivity_score FLOAT;

-- 🔥 CRITICAL FIX FOR YOUR ERROR
ALTER TABLE credit_score_results ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE credit_score_results ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_scenarios_slug ON scenarios (slug);

UPDATE scenarios
SET
    slug = COALESCE(slug, lower(regexp_replace(name, '[^a-zA-Z0-9]+', '_', 'g'))),
    soil_moisture_modifier = COALESCE(soil_moisture_modifier, moisture_modifier),
    is_active = COALESCE(is_active, CASE WHEN id = 1 THEN TRUE ELSE FALSE END);

UPDATE crops
SET
    growth_days = COALESCE(growth_days, CASE lower(name)
        WHEN 'wheat' THEN 125
        WHEN 'cotton' THEN 180
        WHEN 'corn' THEN 110
        WHEN 'sunflower' THEN 115
        WHEN 'grape' THEN 220
        ELSE 120
    END),
    season = COALESCE(season, CASE lower(name)
        WHEN 'wheat' THEN 'autumn'
        WHEN 'cotton' THEN 'warm'
        WHEN 'corn' THEN 'summer'
        WHEN 'sunflower' THEN 'spring'
        WHEN 'grape' THEN 'perennial'
        ELSE 'general'
    END);

UPDATE crops
SET field_id = COALESCE(crops.field_id, sub.field_id)
FROM (
    SELECT crop_id, MIN(id) AS field_id
    FROM fields
    WHERE crop_id IS NOT NULL
    GROUP BY crop_id
) AS sub
WHERE crops.id = sub.crop_id;

UPDATE fields
SET
    crop_type = COALESCE(fields.crop_type, crops.name),
    irrigation_type = COALESCE(fields.irrigation_type, 'drip'),
    latitude = COALESCE(fields.latitude, 39.0 + (fields.id * 0.1)),
    longitude = COALESCE(fields.longitude, 46.0 + (fields.id * 0.1)),
    ndvi_score = COALESCE(fields.ndvi_score, 0.55 + (fields.id * 0.02)),
    ndwi_score = COALESCE(fields.ndwi_score, 0.45 + (fields.id * 0.015))
FROM crops
WHERE fields.crop_id = crops.id;

UPDATE analysis_runs
SET
    scenario_id = COALESCE(scenario_id, 1),
    timestamp = COALESCE(timestamp, analyzed_at),
    potential_yield_t = COALESCE(potential_yield_t, ROUND((productivity_score / 10.0)::numeric, 2)),
    actual_yield_t = COALESCE(actual_yield_t, ROUND(((productivity_score / 10.0) * 0.9)::numeric, 2)),
    confidence_pct = COALESCE(confidence_pct, ROUND((80 + productivity_score / 20.0)::numeric, 2));

UPDATE sensor_readings
SET
    timestamp = COALESCE(timestamp, recorded_at),
    water_flow_lph = COALESCE(water_flow_lph, water_flow_ml_min),
    air_temperature_c = COALESCE(air_temperature_c, temperature_c),
    rain_mm = COALESCE(rain_mm, rainfall_mm);

UPDATE weather_snapshots
SET
    date = COALESCE(date, recorded_at::date),
    max_temp_c = COALESCE(max_temp_c, temperature_c),
    min_temp_c = COALESCE(min_temp_c, temperature_c - 4),
    wind_kmh = COALESCE(wind_kmh, wind_speed_kmh);

UPDATE irrigation_recommendations
SET
    timestamp = COALESCE(timestamp, created_at),
    current_soil_moisture = COALESCE(current_soil_moisture, 55),
    target_soil_moisture = COALESCE(target_soil_moisture, 65),
    recommended_water_mm = COALESCE(recommended_water_mm, water_needed_mm),
    estimated_savings_pct = COALESCE(estimated_savings_pct, 12),
    recommendation_text = COALESCE(recommendation_text, 'Auto-generated irrigation recommendation');

UPDATE subsidy_recommendations
SET
    analysis_run_id = COALESCE(analysis_run_id, NULL),
    yield_alignment_factor = COALESCE(yield_alignment_factor, 1.0),
    calculation_note = COALESCE(calculation_note, 'Seeded demo subsidy calculation');

UPDATE credit_score_results
SET
    timestamp = COALESCE(timestamp, evaluated_at),
    subsidy_performance = COALESCE(subsidy_performance, financial_health_score),
    consistency_score = COALESCE(consistency_score, land_productivity_score),
    climate_risk_score = COALESCE(climate_risk_score, water_efficiency_score),
    irrigation_efficiency_score = COALESCE(irrigation_efficiency_score, water_efficiency_score),
    final_score = COALESCE(final_score, overall_score),
    explanation_text = COALESCE(explanation_text, 'Seeded credit score result');

COMMIT;
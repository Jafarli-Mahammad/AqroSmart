-- AqroSmart Database Schema - Manual SQL
-- Copy and paste these statements into Render PostgreSQL Console
-- Execute in this order (dependency order)

-- 1. Independent tables (no foreign keys)
CREATE TABLE IF NOT EXISTS farmers (
    id SERIAL NOT NULL, 
    name VARCHAR NOT NULL, 
    fin_code VARCHAR NOT NULL UNIQUE, 
    region VARCHAR, 
    farm_count INTEGER, 
    years_active INTEGER, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE, 
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS crops (
    id SERIAL NOT NULL, 
    name VARCHAR NOT NULL UNIQUE, 
    typical_yield_kg_ha FLOAT, 
    water_req_mm FLOAT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS scenarios (
    id SERIAL NOT NULL, 
    name VARCHAR NOT NULL UNIQUE, 
    description VARCHAR, 
    weather_modifier FLOAT DEFAULT 1.0, 
    moisture_modifier FLOAT DEFAULT 1.0, 
    ndvi_modifier FLOAT DEFAULT 1.0, 
    yield_modifier FLOAT DEFAULT 1.0, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id)
);

-- 2. Tables with single FK dependency
CREATE TABLE IF NOT EXISTS farms (
    id SERIAL NOT NULL, 
    farmer_id INTEGER NOT NULL, 
    name VARCHAR NOT NULL, 
    total_area_ha FLOAT, 
    region VARCHAR, 
    district VARCHAR, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(farmer_id) REFERENCES farmers (id)
);

CREATE TABLE IF NOT EXISTS credit_score_results (
    id SERIAL NOT NULL, 
    farmer_id INTEGER NOT NULL, 
    risk_tier VARCHAR NOT NULL, 
    financial_health_score FLOAT NOT NULL, 
    land_productivity_score FLOAT NOT NULL, 
    water_efficiency_score FLOAT NOT NULL, 
    overall_score FLOAT NOT NULL, 
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(farmer_id) REFERENCES farmers (id)
);

-- 3. Tables depending on farms
CREATE TABLE IF NOT EXISTS fields (
    id SERIAL NOT NULL, 
    farm_id INTEGER NOT NULL, 
    crop_id INTEGER, 
    field_name VARCHAR, 
    area_ha FLOAT, 
    soil_type VARCHAR, 
    moisture_level FLOAT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(farm_id) REFERENCES farms (id),
    FOREIGN KEY(crop_id) REFERENCES crops (id)
);

-- 4. Tables depending on fields
CREATE TABLE IF NOT EXISTS analysis_runs (
    id SERIAL NOT NULL, 
    field_id INTEGER NOT NULL, 
    productivity_score FLOAT, 
    crop_health_score FLOAT, 
    moisture_stress_score FLOAT, 
    disease_risk_score FLOAT, 
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(field_id) REFERENCES fields (id)
);

CREATE TABLE IF NOT EXISTS sensor_readings (
    id SERIAL NOT NULL, 
    field_id INTEGER NOT NULL, 
    soil_moisture_pct FLOAT, 
    water_flow_ml_min FLOAT, 
    temperature_c FLOAT, 
    humidity_pct FLOAT, 
    rainfall_mm FLOAT, 
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(field_id) REFERENCES fields (id)
);

CREATE TABLE IF NOT EXISTS satellite_snapshots (
    id SERIAL NOT NULL, 
    field_id INTEGER NOT NULL, 
    ndvi FLOAT, 
    ndwi FLOAT, 
    vegetation_health_score FLOAT, 
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(field_id) REFERENCES fields (id)
);

CREATE TABLE IF NOT EXISTS weather_snapshots (
    id SERIAL NOT NULL, 
    field_id INTEGER NOT NULL, 
    temperature_c FLOAT, 
    rainfall_mm FLOAT, 
    wind_speed_kmh FLOAT, 
    drought_index FLOAT, 
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(field_id) REFERENCES fields (id)
);

CREATE TABLE IF NOT EXISTS plant_image_analyses (
    id SERIAL NOT NULL, 
    field_id INTEGER NOT NULL, 
    image_path VARCHAR NOT NULL, 
    disease_detected VARCHAR NOT NULL, 
    confidence_pct FLOAT NOT NULL, 
    health_score FLOAT NOT NULL, 
    recommendations JSON NOT NULL, 
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(field_id) REFERENCES fields (id)
);

CREATE TABLE IF NOT EXISTS irrigation_recommendations (
    id SERIAL NOT NULL, 
    field_id INTEGER NOT NULL, 
    water_needed_mm FLOAT NOT NULL, 
    urgency_level VARCHAR NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(field_id) REFERENCES fields (id)
);

CREATE TABLE IF NOT EXISTS subsidy_recommendations (
    id SERIAL NOT NULL, 
    field_id INTEGER NOT NULL, 
    base_subsidy_azn FLOAT NOT NULL, 
    performance_factor FLOAT NOT NULL, 
    efficiency_factor FLOAT NOT NULL, 
    water_use_factor FLOAT NOT NULL, 
    final_subsidy_azn FLOAT NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(field_id) REFERENCES fields (id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS ix_farms_farmer_id ON farms (farmer_id);
CREATE INDEX IF NOT EXISTS ix_fields_farm_id ON fields (farm_id);
CREATE INDEX IF NOT EXISTS ix_fields_crop_id ON fields (crop_id);
CREATE INDEX IF NOT EXISTS ix_analysis_runs_field_id ON analysis_runs (field_id);
CREATE INDEX IF NOT EXISTS ix_sensor_readings_field_id ON sensor_readings (field_id);
CREATE INDEX IF NOT EXISTS ix_satellite_snapshots_field_id ON satellite_snapshots (field_id);
CREATE INDEX IF NOT EXISTS ix_weather_snapshots_field_id ON weather_snapshots (field_id);
CREATE INDEX IF NOT EXISTS ix_plant_image_analyses_field_id ON plant_image_analyses (field_id);
CREATE INDEX IF NOT EXISTS ix_irrigation_recommendations_field_id ON irrigation_recommendations (field_id);
CREATE INDEX IF NOT EXISTS ix_subsidy_recommendations_field_id ON subsidy_recommendations (field_id);
CREATE INDEX IF NOT EXISTS ix_credit_score_results_farmer_id ON credit_score_results (farmer_id);

-- 5. Seed data
-- WARNING: This section truncates all tables.
-- For a live database, run RENDER_SCHEMA_ALIGNMENT.sql instead.
BEGIN;

TRUNCATE TABLE
    subsidy_recommendations,
    irrigation_recommendations,
    plant_image_analyses,
    weather_snapshots,
    satellite_snapshots,
    sensor_readings,
    analysis_runs,
    fields,
    credit_score_results,
    farms,
    crops,
    scenarios,
    farmers
RESTART IDENTITY CASCADE;

INSERT INTO farmers (id, name, fin_code, region, farm_count, years_active)
VALUES
    (1, 'Murad Hasanov', '5XK2JH1', 'Zangilan', 2, 12),
    (2, 'Aytan Quliyeva', '7MP4RT3', 'Fuzuli', 1, 6),
    (3, 'Rauf Babayev', '2LN8YQ9', 'Agdam', 2, 18),
    (4, 'Leyla Mammadova', '9TR6MK4', 'Gabala', 1, 9),
    (5, 'Kamran Aliyev', '4GH7PL2', 'Sheki', 1, 14);

INSERT INTO crops (id, name, typical_yield_kg_ha, water_req_mm)
VALUES
    (1, 'Wheat', 4500.0, 350.0),
    (2, 'Cotton', 2800.0, 600.0),
    (3, 'Corn', 7500.0, 450.0),
    (4, 'Sunflower', 2200.0, 300.0),
    (5, 'Grape', 15000.0, 400.0);

INSERT INTO scenarios (id, name, description, weather_modifier, moisture_modifier, ndvi_modifier, yield_modifier)
VALUES
    (1, 'Healthy Field', 'All metrics optimal', 1.0, 1.0, 1.0, 1.0),
    (2, 'Drought Stress', 'Low soil moisture', 1.2, 0.6, 0.8, 0.7),
    (3, 'Disease Outbreak', 'High humidity', 0.8, 1.1, 0.5, 0.5),
    (4, 'Pest Damage', 'Visible damage', 0.9, 0.9, 0.6, 0.6),
    (5, 'Waterlogging', 'Excessive rainfall', 1.5, 1.3, 0.4, 0.5),
    (6, 'Nutrient Deficiency', 'Low NDVI', 0.7, 0.8, 0.4, 0.6),
    (7, 'Optimal Growth', 'Perfect conditions', 0.9, 1.0, 1.2, 1.2);

INSERT INTO farms (id, farmer_id, name, total_area_ha, region, district)
VALUES
    (1, 1, 'North Farm 1', 25.5, 'Zangilan', 'Mincivan'),
    (2, 1, 'North Farm 2', 18.0, 'Zangilan', 'Aghali'),
    (3, 2, 'City Farm', 12.0, 'Fuzuli', 'Horadiz'),
    (4, 3, 'Central Farm 1', 35.0, 'Agdam', 'Xindiristan'),
    (5, 3, 'Central Farm 2', 28.5, 'Agdam', 'Khanabag'),
    (6, 4, 'Valley Farm', 22.0, 'Gabala', 'Vandam'),
    (7, 5, 'South Farm', 40.0, 'Sheki', 'Bash Goynuk');

INSERT INTO fields (id, farm_id, crop_id, field_name, area_ha, soil_type, moisture_level)
VALUES
    (1, 1, 1, 'North Field 1', 10.0, 'Loamy', 65.0),
    (2, 1, 2, 'North Field 2', 15.5, 'Sandy', 55.0),
    (3, 2, 4, 'North Field 3', 18.0, 'Clay', 70.0),
    (4, 3, 5, 'City Vineyard', 12.0, 'Loamy', 60.0),
    (5, 4, 3, 'Central Field 1', 20.0, 'Loamy', 62.0),
    (6, 4, 1, 'Central Field 2', 15.0, 'Clay', 68.0),
    (7, 5, 2, 'Central Field 3', 13.5, 'Sandy', 58.0),
    (8, 6, 4, 'Valley Field 1', 10.0, 'Loamy', 64.0),
    (9, 6, 1, 'Valley Field 2', 12.0, 'Clay', 71.0),
    (10, 7, 5, 'South Orchard', 16.5, 'Loamy', 59.0);

INSERT INTO analysis_runs (field_id, productivity_score, crop_health_score, moisture_stress_score, disease_risk_score, analyzed_at)
SELECT
    f.id,
    ROUND((72 + (f.id * 1.4))::numeric, 2),
    ROUND((68 + (f.id * 1.1))::numeric, 2),
    ROUND((18 + ((f.id % 5) * 4.0))::numeric, 2),
    ROUND((12 + ((f.id % 4) * 3.5))::numeric, 2),
    NOW() - (f.id * INTERVAL '1 day')
FROM fields f;

INSERT INTO sensor_readings (field_id, soil_moisture_pct, water_flow_ml_min, temperature_c, humidity_pct, rainfall_mm, recorded_at)
SELECT
    f.id,
    ROUND((48 + (gs * 1.2) - (f.id * 0.4))::numeric, 2),
    ROUND((1100 + (gs * 35) + (f.id * 12))::numeric, 2),
    ROUND((24 + (f.id * 0.4) + (gs * 0.2))::numeric, 2),
    ROUND((52 + ((gs % 5) * 4) - (f.id * 0.2))::numeric, 2),
    ROUND(((gs % 3) * 1.8)::numeric, 2),
    NOW() - ((gs + ((f.id - 1) * 10)) * INTERVAL '1 day')
FROM fields f
CROSS JOIN generate_series(1, 10) AS gs;

INSERT INTO satellite_snapshots (field_id, ndvi, ndwi, vegetation_health_score, captured_at)
SELECT
    f.id,
    ROUND((0.55 + (f.id * 0.02) + (gs * 0.015))::numeric, 2),
    ROUND((0.35 + (f.id * 0.018) + (gs * 0.01))::numeric, 2),
    ROUND((58 + (f.id * 1.8) + (gs * 2.2))::numeric, 2),
    NOW() - ((gs * 7) * INTERVAL '1 day')
FROM fields f
CROSS JOIN generate_series(1, 5) AS gs;

INSERT INTO weather_snapshots (field_id, temperature_c, rainfall_mm, wind_speed_kmh, drought_index, recorded_at)
SELECT
    f.id,
    ROUND((29 + (f.id * 0.3) + (gs * 0.4))::numeric, 2),
    ROUND(((gs % 4) * 2.1)::numeric, 2),
    ROUND((9 + (gs * 0.7) + (f.id * 0.2))::numeric, 2),
    ROUND((0.22 + ((f.id % 5) * 0.05) + (gs * 0.01))::numeric, 2),
    NOW() - ((gs + ((f.id - 1) * 10)) * INTERVAL '1 day')
FROM fields f
CROSS JOIN generate_series(1, 10) AS gs;

INSERT INTO plant_image_analyses (field_id, image_path, disease_detected, confidence_pct, health_score, recommendations, analyzed_at)
SELECT
    f.id,
    '/uploads/plant_images/field_' || f.id || '_img_' || gs || '.jpg',
    CASE gs
        WHEN 1 THEN 'Healthy'
        WHEN 2 THEN 'Water stress'
        ELSE 'Leaf spot'
    END,
    ROUND((84 - ((gs - 1) * 9) - (f.id * 0.6))::numeric, 2),
    ROUND((78 - ((gs - 1) * 8) - (f.id * 0.7))::numeric, 2),
    CASE gs
        WHEN 1 THEN '["Continue current irrigation schedule", "Monitor NDVI weekly"]'::json
        WHEN 2 THEN '["Increase irrigation frequency", "Check soil moisture sensors"]'::json
        ELSE '["Inspect for fungal treatment", "Apply targeted fungicide"]'::json
    END,
    NOW() - ((gs + f.id) * INTERVAL '1 day')
FROM fields f
CROSS JOIN generate_series(1, 3) AS gs;

INSERT INTO irrigation_recommendations (field_id, water_needed_mm, urgency_level, created_at)
SELECT
    f.id,
    ROUND((16 + (f.id * 1.9))::numeric, 2),
    CASE
        WHEN f.id IN (4, 7) THEN 'high'
        WHEN f.id IN (2, 6, 10) THEN 'medium'
        ELSE 'low'
    END,
    NOW() - (f.id * INTERVAL '1 day')
FROM fields f;

INSERT INTO subsidy_recommendations (field_id, base_subsidy_azn, performance_factor, efficiency_factor, water_use_factor, final_subsidy_azn, created_at)
SELECT
    f.id,
    ROUND((900 + (f.id * 80))::numeric, 2),
    ROUND((0.86 + ((f.id % 4) * 0.04))::numeric, 2),
    ROUND((0.88 + ((f.id % 3) * 0.03))::numeric, 2),
    ROUND((0.90 + ((f.id % 5) * 0.02))::numeric, 2),
    ROUND(((900 + (f.id * 80)) * (0.86 + ((f.id % 4) * 0.04)) * (0.88 + ((f.id % 3) * 0.03)) * (0.90 + ((f.id % 5) * 0.02)))::numeric, 2),
    NOW() - (f.id * INTERVAL '1 day')
FROM fields f;

INSERT INTO credit_score_results (id, farmer_id, risk_tier, financial_health_score, land_productivity_score, water_efficiency_score, overall_score, evaluated_at)
VALUES
    (1, 1, 'A', 84.0, 82.0, 86.0, 84.0, NOW() - INTERVAL '10 days'),
    (2, 2, 'B', 77.0, 75.0, 73.0, 75.0, NOW() - INTERVAL '9 days'),
    (3, 3, 'A', 88.0, 85.0, 87.0, 86.7, NOW() - INTERVAL '8 days'),
    (4, 4, 'C', 68.0, 70.0, 66.0, 68.0, NOW() - INTERVAL '7 days'),
    (5, 5, 'B', 79.0, 78.0, 80.0, 79.0, NOW() - INTERVAL '6 days');

SELECT setval(pg_get_serial_sequence('farmers', 'id'), COALESCE((SELECT MAX(id) FROM farmers), 1), true);
SELECT setval(pg_get_serial_sequence('crops', 'id'), COALESCE((SELECT MAX(id) FROM crops), 1), true);
SELECT setval(pg_get_serial_sequence('scenarios', 'id'), COALESCE((SELECT MAX(id) FROM scenarios), 1), true);
SELECT setval(pg_get_serial_sequence('farms', 'id'), COALESCE((SELECT MAX(id) FROM farms), 1), true);
SELECT setval(pg_get_serial_sequence('fields', 'id'), COALESCE((SELECT MAX(id) FROM fields), 1), true);
SELECT setval(pg_get_serial_sequence('analysis_runs', 'id'), COALESCE((SELECT MAX(id) FROM analysis_runs), 1), true);
SELECT setval(pg_get_serial_sequence('sensor_readings', 'id'), COALESCE((SELECT MAX(id) FROM sensor_readings), 1), true);
SELECT setval(pg_get_serial_sequence('satellite_snapshots', 'id'), COALESCE((SELECT MAX(id) FROM satellite_snapshots), 1), true);
SELECT setval(pg_get_serial_sequence('weather_snapshots', 'id'), COALESCE((SELECT MAX(id) FROM weather_snapshots), 1), true);
SELECT setval(pg_get_serial_sequence('plant_image_analyses', 'id'), COALESCE((SELECT MAX(id) FROM plant_image_analyses), 1), true);
SELECT setval(pg_get_serial_sequence('irrigation_recommendations', 'id'), COALESCE((SELECT MAX(id) FROM irrigation_recommendations), 1), true);
SELECT setval(pg_get_serial_sequence('subsidy_recommendations', 'id'), COALESCE((SELECT MAX(id) FROM subsidy_recommendations), 1), true);
SELECT setval(pg_get_serial_sequence('credit_score_results', 'id'), COALESCE((SELECT MAX(id) FROM credit_score_results), 1), true);

COMMIT;

-- 6. Align the live schema with the current ORM models
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
ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE satellite_snapshots ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE satellite_snapshots ADD COLUMN IF NOT EXISTS cloud_cover_pct FLOAT;
ALTER TABLE satellite_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE satellite_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE weather_snapshots ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE weather_snapshots ADD COLUMN IF NOT EXISTS max_temp_c FLOAT;
ALTER TABLE weather_snapshots ADD COLUMN IF NOT EXISTS min_temp_c FLOAT;
ALTER TABLE weather_snapshots ADD COLUMN IF NOT EXISTS rain_mm FLOAT;
ALTER TABLE weather_snapshots ADD COLUMN IF NOT EXISTS wind_kmh FLOAT;
ALTER TABLE weather_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE weather_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE irrigation_recommendations ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE;
ALTER TABLE irrigation_recommendations ADD COLUMN IF NOT EXISTS current_soil_moisture FLOAT;
ALTER TABLE irrigation_recommendations ADD COLUMN IF NOT EXISTS target_soil_moisture FLOAT;
ALTER TABLE irrigation_recommendations ADD COLUMN IF NOT EXISTS recommended_water_mm FLOAT;
ALTER TABLE irrigation_recommendations ADD COLUMN IF NOT EXISTS estimated_savings_pct FLOAT;
ALTER TABLE irrigation_recommendations ADD COLUMN IF NOT EXISTS recommendation_text VARCHAR;
ALTER TABLE irrigation_recommendations ADD COLUMN IF NOT EXISTS urgency_level VARCHAR;
ALTER TABLE irrigation_recommendations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE subsidy_recommendations ADD COLUMN IF NOT EXISTS analysis_run_id INTEGER;
ALTER TABLE subsidy_recommendations ADD COLUMN IF NOT EXISTS yield_alignment_factor FLOAT;
ALTER TABLE subsidy_recommendations ADD COLUMN IF NOT EXISTS calculation_note VARCHAR;
ALTER TABLE subsidy_recommendations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE credit_score_results ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE;
ALTER TABLE credit_score_results ADD COLUMN IF NOT EXISTS productivity_score FLOAT;
ALTER TABLE credit_score_results ADD COLUMN IF NOT EXISTS subsidy_performance FLOAT;
ALTER TABLE credit_score_results ADD COLUMN IF NOT EXISTS consistency_score FLOAT;
ALTER TABLE credit_score_results ADD COLUMN IF NOT EXISTS climate_risk_score FLOAT;
ALTER TABLE credit_score_results ADD COLUMN IF NOT EXISTS irrigation_efficiency_score FLOAT;
ALTER TABLE credit_score_results ADD COLUMN IF NOT EXISTS final_score FLOAT;
ALTER TABLE credit_score_results ADD COLUMN IF NOT EXISTS explanation_text VARCHAR;
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
    rain_mm = COALESCE(rain_mm, rainfall_mm),
    created_at = COALESCE(created_at, recorded_at);

UPDATE satellite_snapshots
SET
    date = COALESCE(date, captured_at::date),
    cloud_cover_pct = COALESCE(cloud_cover_pct, 15),
    created_at = COALESCE(created_at, captured_at);

UPDATE weather_snapshots
SET
    date = COALESCE(date, recorded_at::date),
    max_temp_c = COALESCE(max_temp_c, temperature_c),
    min_temp_c = COALESCE(min_temp_c, temperature_c - 4),
    wind_kmh = COALESCE(wind_kmh, wind_speed_kmh),
    created_at = COALESCE(created_at, recorded_at);

UPDATE irrigation_recommendations
SET
    timestamp = COALESCE(timestamp, created_at),
    current_soil_moisture = COALESCE(current_soil_moisture, 55),
    target_soil_moisture = COALESCE(target_soil_moisture, 65),
    recommended_water_mm = COALESCE(recommended_water_mm, water_needed_mm),
    estimated_savings_pct = COALESCE(estimated_savings_pct, 12),
    recommendation_text = COALESCE(recommendation_text, 'Auto-generated irrigation recommendation'),
    urgency_level = COALESCE(urgency_level, CASE
        WHEN COALESCE(recommended_water_mm, water_needed_mm, 0) >= 35 THEN 'critical'
        WHEN COALESCE(recommended_water_mm, water_needed_mm, 0) >= 20 THEN 'high'
        WHEN COALESCE(recommended_water_mm, water_needed_mm, 0) >= 10 THEN 'medium'
        ELSE 'low'
    END);

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

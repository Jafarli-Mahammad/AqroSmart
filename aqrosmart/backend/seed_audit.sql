TRUNCATE TABLE farmers, farms, fields, scenarios, analysis_runs, credit_score_results, subsidy_recommendations, irrigation_recommendations, sensor_readings, satellite_snapshots, weather_snapshots, crops, plant_image_analyses RESTART IDENTITY CASCADE;

INSERT INTO farmers (id, name, fin_code, region, farm_count, years_active) VALUES
(1, 'Elcin Mammadov', 'FIN001', 'Agdash', 2, 8),
(2, 'Rashad Huseynov', 'FIN002', 'Sheki', 1, 5),
(3, 'Gunel Ismayilova', 'FIN003', 'Lankaran', 3, 12);

INSERT INTO farms (id, name, farmer_id, region, district, total_area_ha) VALUES
(1, 'Gunesh Fermasi', 1, 'Agdash', 'Lek', 25.0),
(2, 'Sheki Baglari', 2, 'Sheki', 'Kish', 18.5),
(3, 'Lankaran Chay', 3, 'Lankaran', 'Lerik', 40.0);

INSERT INTO fields (id, farm_id, crop_type, area_ha, soil_type, irrigation_type, latitude, longitude, ndvi_score, ndwi_score) VALUES
(1, 1, 'wheat', 10.0, 'loam', 'drip', 40.6, 47.5, 0.72, 0.35),
(2, 1, 'cotton', 15.0, 'clay', 'sprinkler', 40.7, 47.6, 0.58, 0.28),
(3, 2, 'hazelnut', 18.5, 'sandy_loam', 'furrow', 41.2, 47.1, 0.81, 0.42),
(4, 3, 'tea', 20.0, 'clay_loam', 'drip', 38.7, 48.8, 0.65, 0.38),
(5, 3, 'citrus', 10.0, 'loam', 'basin', 38.8, 48.9, 0.55, 0.22),
(6, 3, 'rice', 10.0, 'clay', 'flood', 38.6, 48.7, 0.48, 0.51);

INSERT INTO scenarios (id, slug, name, is_active, base_yield_factor, price_factor, subsidy_factor) VALUES
(1, 'baseline', 'Baseline 2024', true, 1.0, 1.0, 1.0),
(2, 'drought', 'Drought Scenario', false, 0.65, 1.3, 1.5),
(3, 'eu_integration', 'EU Integration', false, 1.15, 1.2, 0.8);

INSERT INTO analysis_runs (id, field_id, timestamp, productivity_score, crop_health_score, moisture_stress_score, disease_risk_score) VALUES
(1, 1, NOW() - interval '2 days', 78.5, 82.0, 25.0, 12.0),
(2, 2, NOW() - interval '1 day', 65.0, 70.0, 40.0, 18.0),
(3, 3, NOW() - interval '3 hours', 88.0, 91.0, 15.0, 5.0),
(4, 4, NOW(), 55.0, 60.0, 50.0, 30.0),
(5, 5, NOW(), 42.0, 45.0, 60.0, 45.0),
(6, 6, NOW(), 70.0, 72.0, 35.0, 20.0);

INSERT INTO subsidy_recommendations (id, field_id, final_subsidy_azn, calculation_note) VALUES
(1, 1, 1250.00, 'High NDVI wheat yield'),
(2, 2, 980.50, 'Moderate cotton yield'),
(3, 3, 2100.00, 'Premium hazelnut'),
(4, 4, 450.00, 'Tea subsidy base'),
(5, 5, 320.00, 'Low citrus yield');

INSERT INTO irrigation_recommendations (id, field_id, recommended_mm, method, priority, note) VALUES
(1, 1, 45.0, 'drip', 'medium', 'Soil moisture adequate'),
(2, 2, 80.0, 'sprinkler', 'high', 'Stress detected'),
(3, 4, 60.0, 'drip', 'high', 'Tea requires more water'),
(4, 6, 120.0, 'flood', 'critical', 'Rice paddy low');

INSERT INTO credit_score_results (id, farmer_id, final_score, risk_category, scoring_breakdown) VALUES
(1, 1, 72.5, 'moderate', '{"yield": 28, "history": 20, "diversity": 12, "financial": 12.5}'),
(2, 2, 85.0, 'low', '{"yield": 35, "history": 22, "diversity": 15, "financial": 13}'),
(3, 3, 58.0, 'high', '{"yield": 18, "history": 15, "diversity": 12, "financial": 13}');

SELECT setval('farmers_id_seq', 3);
SELECT setval('farms_id_seq', 3);
SELECT setval('fields_id_seq', 6);
SELECT setval('scenarios_id_seq', 3);
SELECT setval('analysis_runs_id_seq', 6);
SELECT setval('subsidy_recommendations_id_seq', 5);
SELECT setval('irrigation_recommendations_id_seq', 4);
SELECT setval('credit_score_results_id_seq', 3);

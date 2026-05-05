-- Fix remaining tables that failed
INSERT INTO scenarios (id, slug, name, is_active, weather_modifier, soil_moisture_modifier, ndvi_modifier, yield_modifier) VALUES
(1, 'baseline', 'Baseline 2024', true, 1.0, 1.0, 1.0, 1.0),
(2, 'drought', 'Drought Scenario', false, 0.65, 0.5, 0.7, 0.65),
(3, 'eu_integration', 'EU Integration', false, 1.0, 1.0, 1.15, 1.15);

INSERT INTO irrigation_recommendations (id, field_id, current_soil_moisture, target_soil_moisture, recommended_water_mm, estimated_savings_pct, recommendation_text, urgency_level) VALUES
(1, 1, 35.0, 55.0, 45.0, 15.0, 'Soil moisture adequate', 'low'),
(2, 2, 20.0, 55.0, 80.0, 8.0, 'Stress detected - increase irrigation', 'high'),
(3, 4, 28.0, 50.0, 60.0, 12.0, 'Tea requires more water', 'medium'),
(4, 6, 15.0, 60.0, 120.0, 5.0, 'Rice paddy critically low', 'critical');

INSERT INTO credit_score_results (id, farmer_id, productivity_score, subsidy_performance, consistency_score, climate_risk_score, irrigation_efficiency_score, final_score, risk_tier, explanation_text) VALUES
(1, 1, 78.5, 65.0, 72.0, 30.0, 80.0, 72.5, 'moderate', 'Solid performer with room for improvement'),
(2, 2, 88.0, 82.0, 85.0, 20.0, 90.0, 85.0, 'low', 'Excellent track record'),
(3, 3, 55.0, 45.0, 50.0, 55.0, 60.0, 58.0, 'high', 'Climate risk and low consistency');

SELECT setval('scenarios_id_seq', 3);
SELECT setval('irrigation_recommendations_id_seq', 4);
SELECT setval('credit_score_results_id_seq', 3);

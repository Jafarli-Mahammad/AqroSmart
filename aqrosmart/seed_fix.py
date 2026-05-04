import asyncio
from sqlalchemy import text
from app.database import AsyncSessionLocal

async def seed_via_sql():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            # Scenarios
            await session.execute(text("""
                INSERT INTO scenarios (slug, name, description, weather_modifier, soil_moisture_modifier, ndvi_modifier, yield_modifier, is_active)
                VALUES 
                ('healthy_field', 'Healthy Field', 'Baseline healthy crop conditions.', 1.0, 1.1, 1.05, 0.93, true),
                ('drought_stress', 'Drought Stress', 'Water stress and low moisture conditions.', 0.7, 0.5, 0.6, 0.55, false),
                ('disease_outbreak', 'Disease Outbreak', 'Lower vegetation health due to disease pressure.', 0.9, 1.0, 0.5, 0.65, false),
                ('irrigation_recovery', 'Irrigation Recovery', 'Field recovering after irrigation intervention.', 1.0, 1.2, 0.8, 0.80, false),
                ('high_efficiency', 'High Efficiency', 'Optimized irrigation and weather performance.', 1.1, 1.15, 1.1, 0.95, false),
                ('low_efficiency', 'Low Efficiency', 'Reduced field efficiency and output.', 0.9, 0.8, 0.85, 0.70, false),
                ('subsidy_improvement', 'Subsidy Improvement', 'Improved subsidy eligibility scenario.', 1.05, 1.05, 1.05, 0.90, false)
                ON CONFLICT (slug) DO NOTHING;
            """))
            
            # Farmers
            await session.execute(text("""
                INSERT INTO farmers (name, fin_code, region, years_active)
                VALUES 
                ('Murad Həsənov', '5XK2JH1', 'Zəngilan', 12),
                ('Aytən Quliyeva', '7MP4RT3', 'Füzuli', 6),
                ('Rauf Babayev', '2LN8YQ9', 'Ağdam', 18)
                ON CONFLICT (fin_code) DO NOTHING;
            """))
            
            # Farms
            await session.execute(text("""
                INSERT INTO farms (name, farmer_id, region, district, total_area_ha)
                SELECT 'Mincivan Highland Farm', f.id, 'Zəngilan', 'Mincivan', 42.0 FROM farmers f WHERE f.fin_code = '5XK2JH1'
                UNION ALL
                SELECT 'Ağalı Araz Farm', f.id, 'Zəngilan', 'Ağalı', 18.5 FROM farmers f WHERE f.fin_code = '5XK2JH1'
                UNION ALL
                SELECT 'Horadiz Green Belt Farm', f.id, 'Füzuli', 'Horadiz', 26.0 FROM farmers f WHERE f.fin_code = '7MP4RT3'
                UNION ALL
                SELECT 'Alxanlı Terrace Farm', f.id, 'Füzuli', 'Alxanlı', 14.0 FROM farmers f WHERE f.fin_code = '7MP4RT3'
                UNION ALL
                SELECT 'Xındırıstan Prosperity Farm', f.id, 'Ağdam', 'Xındırıstan', 33.5 FROM farmers f WHERE f.fin_code = '2LN8YQ9'
                ON CONFLICT DO NOTHING;
            """))
            
            # Fields
            await session.execute(text("""
                INSERT INTO fields (farm_id, crop_type, area_ha, soil_type, irrigation_type, latitude, longitude, ndvi_score, ndwi_score)
                SELECT fm.id, 'wheat', 6.5, 'loam', 'drip', 39.148, 46.630, 0.82, 0.54 FROM farms fm WHERE fm.name = 'Mincivan Highland Farm'
                UNION ALL
                SELECT fm.id, 'cotton', 5.8, 'clay loam', 'sprinkler', 39.155, 46.645, 0.67, 0.48 FROM farms fm WHERE fm.name = 'Mincivan Highland Farm'
                UNION ALL
                SELECT fm.id, 'corn', 7.2, 'sandy loam', 'drip', 39.180, 46.700, 0.74, 0.59 FROM farms fm WHERE fm.name = 'Ağalı Araz Farm'
                UNION ALL
                SELECT fm.id, 'sunflower', 8.1, 'loam', 'flood', 39.465, 47.010, 0.58, 0.44 FROM farms fm WHERE fm.name = 'Horadiz Green Belt Farm'
                UNION ALL
                SELECT fm.id, 'grape', 4.3, 'clay loam', 'sprinkler', 39.472, 47.025, 0.71, 0.62 FROM farms fm WHERE fm.name = 'Horadiz Green Belt Farm'
                UNION ALL
                SELECT fm.id, 'wheat', 5.1, 'loam', 'sprinkler', 39.410, 46.910, 0.61, 0.51 FROM farms fm WHERE fm.name = 'Alxanlı Terrace Farm'
                UNION ALL
                SELECT fm.id, 'cotton', 6.9, 'sandy loam', 'flood', 39.920, 46.930, 0.45, 0.39 FROM farms fm WHERE fm.name = 'Xındırıstan Prosperity Farm'
                UNION ALL
                SELECT fm.id, 'sunflower', 5.7, 'loam', 'drip', 39.935, 46.955, 0.79, 0.67 FROM farms fm WHERE fm.name = 'Xındırıstan Prosperity Farm'
                ON CONFLICT DO NOTHING;
            """))
            
            print('✓ Seeded: scenarios, farmers, farms, fields')

asyncio.run(seed_via_sql())

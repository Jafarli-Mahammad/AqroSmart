# AqroSmart Product Specification Document

**Version:** 1.0  
**Date:** May 5, 2026  
**Product:** AqroSmart - AI-Powered Agricultural Intelligence Platform  
**Target Market:** Azerbaijan Agricultural Sector

---

## Executive Summary

AqroSmart is an AI-driven agricultural platform designed to modernize subsidy distribution, optimize water usage, and improve farmer creditworthiness in Azerbaijan's liberated territories (Qarabağ region: Zəngilan, Füzuli, Ağdam). The platform integrates satellite imagery, IoT sensor data, and machine learning to create a transparent, performance-based agricultural ecosystem.

**Core Value Proposition:**
- **For Government:** Dynamic subsidy allocation based on actual productivity, not just land area
- **For Farmers:** Actionable insights to improve yield, reduce water waste, and access better financing
- **For Banks/Insurers:** Data-driven credit scoring to reduce lending risk in agriculture

---

## 1. Product Vision & Goals

### Vision
Transform Azerbaijan's agriculture from subsidy-dependent to performance-driven through AI-powered transparency and optimization.

### Primary Goals
1. **Subsidy Reform:** Replace fixed area-based subsidies with dynamic performance-based calculations
2. **Water Efficiency:** Reduce agricultural water consumption by 20-30% through smart irrigation
3. **Financial Inclusion:** Enable farmers to access credit based on productivity data, not just collateral
4. **Disease Prevention:** Early detection of crop diseases through AI image analysis

### Success Metrics
- 15% increase in average crop yields within pilot region
- 25% reduction in water usage per hectare
- 40% reduction in subsidy fraud/waste
- 60% of farmers achieve credit score improvement within 12 months

---

## 2. User Personas

### Primary Users

**1. Farmer (Fermer)**
- **Profile:** 35-55 years old, operates 10-50 hectare farm, limited tech literacy
- **Goals:** Maximize yield, minimize costs, access credit, prove performance for subsidies
- **Pain Points:** Unpredictable subsidies, water scarcity, lack of credit access, manual disease detection
- **Key Features Used:** Field monitoring, irrigation recommendations, plant health AI, credit score tracking

**2. Government Agricultural Officer**
- **Profile:** Ministry official responsible for subsidy allocation and agricultural policy
- **Goals:** Fair subsidy distribution, fraud prevention, data-driven policy making
- **Pain Points:** No visibility into actual farm performance, subsidy abuse, outdated manual processes
- **Key Features Used:** Dashboard analytics, subsidy engine, performance reports, regional comparisons

**3. Bank Loan Officer**
- **Profile:** Commercial bank employee evaluating agricultural loan applications
- **Goals:** Assess farmer creditworthiness, minimize default risk
- **Pain Points:** Lack of objective farmer data, high agricultural loan defaults
- **Key Features Used:** Farmer credit scoring, historical productivity data, risk assessment reports

**4. Insurance Provider**
- **Profile:** Agricultural insurance company assessing coverage eligibility
- **Goals:** Price policies accurately based on risk
- **Pain Points:** No real-time crop health data, reactive instead of proactive
- **Key Features Used:** Satellite monitoring, weather/drought indices, disease outbreak tracking

---

## 3. Core Features & Functionality

### 3.1 Dashboard (Ümumi Baxış)

**Purpose:** High-level operational view of the entire agricultural system

**Key Components:**
- Total farms, fields, and registered farmers (live counts)
- Crop distribution breakdown (wheat, cotton, sunflower, corn, grape)
- Average productivity score across all farms
- Total subsidy allocated (in AZN) and distribution by region
- Water savings percentage from smart irrigation adoption
- Active scenario indicator (simulation mode status)

**Data Sources:**
- PostgreSQL database (farms, fields, farmers tables)
- Real-time aggregation of analysis_runs table
- Subsidy_recommendations table for allocation totals

**User Actions:**
- Filter by region (Zəngilan, Füzuli, Ağdam)
- Filter by date range
- Export summary report (PDF)
- Quick-navigate to underperforming farms

---

### 3.2 Farm Management (Təsərrüfatlar)

**Purpose:** Browse and manage all farms in the system

**Farm List View:**
- Farm name + farmer name
- Region and district
- Crop types (with icons)
- Number of fields
- Average productivity score (0-100)
- Credit score tier (A/B/C/D badge)
- Quick actions: View details, Run analysis

**Farm Detail View:**
- Farmer information (name, FIN code, years active, region)
- Total farm area (hectares)
- List of fields with individual metrics:
  - Crop type, area, soil type, irrigation method
  - Latest NDVI (vegetation health) and NDWI (water stress) scores
  - Most recent analysis timestamp
  - Productivity gap (actual vs potential yield)
- Historical performance chart (last 6 months)
- Subsidy history
- Credit score evolution

**Data Sources:**
- Farms table (farm metadata)
- Fields table (individual field data)
- Farmers table (farmer profile)
- Latest records from: satellite_snapshots, sensor_readings, analysis_runs

**User Actions:**
- Search farms by name or farmer FIN
- Filter by region, crop type, productivity range
- Navigate to field-level details
- Trigger new analysis for specific farm
- Export farm report

---

### 3.3 Field-Level Analysis

**Purpose:** Deep-dive into individual field performance

**Field Detail View:**
- Field metadata: crop, area, soil, irrigation, GPS coordinates
- Current health indicators:
  - NDVI score (0-1, color-coded)
  - NDWI score (0-1, color-coded)
  - Soil moisture % (from latest sensor reading)
  - Weather conditions (temp, humidity, rainfall)
- AI Analysis Results:
  - Potential yield estimate (tons)
  - Actual yield (if harvest recorded)
  - Productivity score (0-100)
  - Crop health score (0-100)
  - Moisture stress score (0-100)
  - Disease risk score (0-100)
  - Confidence level (%)
- Subsidy Recommendation:
  - Base subsidy (AZN)
  - Performance multiplier
  - Efficiency multiplier
  - Final recommended subsidy (AZN)
  - Calculation explanation
- Irrigation Recommendation:
  - Current vs target soil moisture
  - Recommended water amount (mm)
  - Estimated water savings (liters)
  - Urgency level (low/medium/high/critical)
  - Actionable text recommendation

**Data Sources:**
- Fields table
- Latest satellite_snapshot (NDVI/NDWI)
- Latest sensor_reading (soil moisture, weather)
- Latest analysis_run (AI-generated scores)
- Latest subsidy_recommendation
- Latest irrigation_recommendation

**User Actions:**
- Run new analysis (triggers AI simulation)
- View historical trend charts
- Download field report (PDF)
- Link to plant health image analysis

---

### 3.4 Scenario Simulation Engine (Simulyasiya)

**Purpose:** Test different agricultural conditions and see impact on yields, subsidies, and irrigation

**Available Scenarios:**
1. **Healthy Field (Sağlam Sahə)** - Baseline optimal conditions
2. **Drought Stress (Quraqlıq Stresi)** - Water scarcity conditions
3. **Disease Outbreak (Xəstəlik Ocağı)** - Crop disease pressure
4. **Irrigation Recovery (Suvarma Bərpası)** - Post-intervention improvement
5. **High Efficiency (Yüksək Səmərəlilik)** - Best-case optimization
6. **Low Efficiency (Aşağı Səmərəlilik)** - Poor management
7. **Subsidy Improvement (Subsidiya Təkmilləşməsi)** - Targeted improvement scenario

**Scenario Parameters (Modifiers):**
- Weather modifier (0.7 - 1.1x)
- Soil moisture modifier (0.5 - 1.2x)
- NDVI modifier (0.5 - 1.1x)
- Yield modifier (0.55 - 0.95x)

**How It Works:**
1. User selects a scenario from admin panel
2. Backend applies scenario modifiers to all fields
3. Sensor readings, satellite snapshots, and weather data are regenerated with modifiers
4. All analysis_runs are recalculated with new simulated data
5. Dashboard and field views update in real-time to reflect scenario
6. Subsidies and irrigation recommendations adjust accordingly

**Use Cases:**
- Demo different conditions to government stakeholders
- Train farmers on what good vs bad conditions look like
- Test policy changes (e.g., "what if we increase water efficiency weighting in subsidy formula?")
- Forecast impact of climate scenarios

**Data Sources:**
- Scenarios table (7 predefined scenarios)
- Simulation engine service (applies modifiers to generate synthetic data)

**User Actions:**
- Switch active scenario (POST /simulation/scenario/{slug})
- Reset to baseline (POST /simulation/reset)
- View simulation state (GET /simulation/state)

---

### 3.5 Smart Irrigation Hub (Suvarma Mərkəzi)

**Purpose:** Provide water optimization recommendations for farmers in pilot regions

**Dashboard View:**
- Regional overview map (Qarabağ region highlighted)
- Total water saved across all fields (liters)
- Average water efficiency score
- Breakdown by irrigation type (drip, sprinkler, flood)

**Field-Specific Recommendations:**
- Current soil moisture reading (from IoT sensors)
- Target soil moisture for crop type
- Recommended irrigation amount (mm of water)
- Estimated water usage before optimization (liters)
- Estimated water usage after optimization (liters)
- Water savings percentage
- Urgency indicator (color-coded: green/yellow/orange/red)
- Actionable recommendation text

**Recommendation Logic:**
```
target_moisture = crop_water_requirements[crop_type]
current_moisture = latest_sensor_reading.soil_moisture_pct
moisture_deficit = target_moisture - current_moisture

if moisture_deficit > 0:
    water_needed_mm = (moisture_deficit / 100) * field_depth_cm * 10
    urgency = "high" if moisture_deficit > 20 else "medium"
else:
    water_needed_mm = 0
    urgency = "low"

water_before = historical_avg_water_usage
water_after = water_needed_mm * field_area_ha * 10000  # liters
savings_pct = (water_before - water_after) / water_before * 100
```

**Data Sources:**
- Sensor_readings table (soil moisture, flow rate)
- Crops table (water requirements per crop)
- Fields table (area, crop type, irrigation type)
- Irrigation_recommendations table

**User Actions:**
- View recommendations by field
- Filter by urgency level
- Export irrigation schedule (PDF)
- Mark recommendation as "actioned"

---

### 3.6 Dynamic Subsidy Engine (Subsidiya Mühərriki)

**Purpose:** Calculate fair, performance-based subsidies instead of fixed area payments

**Traditional Model (Replaced):**
```
subsidy = land_area_ha * fixed_rate_per_ha
```
Problem: Rewards land ownership, not productivity. Encourages fraud (claiming unused land).

**AqroSmart Model:**
```
base_subsidy = land_area_ha * base_rate_per_ha  (e.g., 500 AZN/ha)

performance_factor = (actual_yield / potential_yield) * 1.2
efficiency_factor = 1.0 + (water_saved / target_water) * 0.3
yield_alignment_factor = 1.0 - abs(actual - potential) / potential

final_subsidy = base_subsidy * performance_factor * efficiency_factor * yield_alignment_factor

# Capped between 0 and 10,000 AZN per farm
```

**Subsidy Breakdown Display:**
- Base subsidy amount (AZN)
- Performance multiplier (0.5 - 1.2x)
- Efficiency multiplier (0.7 - 1.3x)
- Water use multiplier (0.8 - 1.2x)
- Yield alignment multiplier (0.6 - 1.0x)
- **Final recommended subsidy (AZN)**
- Explanation text (why this amount?)

**Transparency Features:**
- Farmers see exactly how subsidy is calculated
- Government sees aggregate subsidy distribution by region
- Historical subsidy trends (am I improving?)
- Comparison to regional average

**Data Sources:**
- Analysis_runs table (actual vs potential yield)
- Irrigation_recommendations table (water efficiency)
- Subsidy_recommendations table (stored calculations)

**User Actions:**
- View subsidy for specific farm/field
- Simulate "what if I improve X metric?" scenarios
- Export subsidy report for tax purposes
- Contest calculation (flag for review)

---

### 3.7 Farmer Credit Scoring (Kredit Skorinqi)

**Purpose:** Enable farmers to access loans from banks based on agricultural performance data

**Credit Score Components:**

1. **Productivity Score (30% weight)**
   - Based on actual vs potential yield over last 2 growing seasons
   - Consistency of yield (variance penalty)

2. **Subsidy Performance (25% weight)**
   - Historical subsidy amounts received
   - Trend (increasing = good, decreasing = bad)

3. **Consistency Score (20% weight)**
   - Seasonal variance in productivity
   - Adherence to best practices (irrigation timing, disease response)

4. **Climate Risk Score (15% weight)**
   - Exposure to drought (based on region and weather data)
   - Irrigation infrastructure quality

5. **Irrigation Efficiency (10% weight)**
   - Water savings percentage
   - Soil moisture management quality

**Score Output:**
- Final score: 0-100
- Risk tier: A (85-100), B (70-84), C (55-69), D (0-54)
- Percentile ranking (better than X% of farmers in region)
- Score trend (improving/stable/declining)

**Credit Report Includes:**
- Farmer profile (name, region, years active, total farm area)
- Individual component scores (with visual gauges)
- Historical productivity chart
- Risk assessment summary
- Recommendations to improve score
- Exportable PDF for bank submission

**Data Sources:**
- Farmers table (profile)
- Analysis_runs table (productivity history)
- Subsidy_recommendations table (subsidy performance)
- Irrigation_recommendations table (water efficiency)
- Weather_snapshots table (climate risk)

**User Actions:**
- View own credit score
- Export credit report (PDF)
- See improvement recommendations
- Track score evolution over time
- Share report with bank (permission-based)

---

### 3.8 AI Plant Health Analysis (Bitki Sağlamlığı AI)

**Purpose:** Enable farmers to detect crop diseases early using smartphone photos

**Workflow:**
1. Farmer uploads plant image (drag-and-drop or file select)
2. Image sent to backend API endpoint
3. Hugging Face AI model analyzes image (`linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification`)
4. Model returns top 3 predictions with confidence scores
5. Results displayed with recommendations

**Analysis Output:**
- **Disease detected:** Parsed disease name (e.g., "Tomato Late Blight" → "Late Blight")
- **Confidence:** Model confidence % (0-100)
- **Health score:** Derived from disease severity and confidence
- **Recommendations:** Actionable steps based on disease type

**Confidence Handling:**
- **High confidence (>60%):** Display disease with recommendations
- **Low confidence (<60%):** Display "Unable to determine" + image quality tips

**Supported Diseases:**
38 plant diseases across 14 crop types (PlantVillage dataset):
- Tomato: Early blight, Late blight, Leaf mold, Septoria leaf spot, etc.
- Potato: Early blight, Late blight
- Corn: Common rust, Northern leaf blight
- Grape: Black rot, Leaf blight
- Apple, Cherry, Peach, Pepper, Strawberry diseases, etc.

**Demo Features:**
- 3 pre-loaded sample images (healthy plant, diseased plant, inconclusive)
- "Try Demo Image" buttons for quick testing
- Image preview before analysis

**Technical Specs:**
- Model: MobileNetV2 fine-tuned on PlantVillage (90MB)
- Input: JPG/PNG/WEBP, max 10MB
- Response time: <5 seconds
- Caching: Model loaded once, reused across requests

**Data Sources:**
- Uploaded image file
- Hugging Face transformers library
- Plant_image_analyses table (stores results)

**User Actions:**
- Upload plant photo
- Select field to associate analysis with
- View analysis results
- Save to field history
- Export analysis report

---

### 3.9 Admin/Demo Control Panel (Admin)

**Purpose:** Control simulation scenarios, seed data, and manage system state for demos

**Features:**

1. **Simulation Control**
   - Reset all simulation data (clears analysis_runs, sensor_readings, etc.)
   - Seed database with demo data
   - Switch active scenario (7 scenario buttons)
   - Auto-cycle scenarios (for automated demos)
   - Display current active scenario prominently

2. **System Status**
   - API health status (green/red indicator)
   - Database connection status
   - Number of farmers, farms, fields in system
   - Total analysis runs completed

3. **Demo Mode Features**
   - Presentation mode toggle (simplified UI, larger text)
   - Auto-refresh dashboard (live updates)
   - Disable user inputs (read-only mode for presentations)

**Data Sources:**
- GET /health (API status)
- GET /simulation/state (current scenario)
- Database counts

**User Actions:**
- Reset simulation (POST /simulation/reset)
- Change scenario (POST /simulation/scenario/{slug})
- Toggle presentation mode
- View system logs

---

## 4. Data Architecture

### 4.1 Database Schema

**Core Entities:**

```sql
farmers (
  id SERIAL PRIMARY KEY,
  name VARCHAR,
  fin_code VARCHAR UNIQUE,
  region VARCHAR,
  years_active INT,
  farm_count INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

farms (
  id SERIAL PRIMARY KEY,
  name VARCHAR,
  farmer_id INT REFERENCES farmers(id),
  region VARCHAR,
  district VARCHAR,
  total_area_ha DECIMAL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

fields (
  id SERIAL PRIMARY KEY,
  farm_id INT REFERENCES farms(id),
  crop_type VARCHAR,
  area_ha DECIMAL,
  soil_type VARCHAR,
  irrigation_type VARCHAR,
  latitude DECIMAL,
  longitude DECIMAL,
  ndvi_score DECIMAL,
  ndwi_score DECIMAL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

crops (
  id SERIAL PRIMARY KEY,
  name VARCHAR UNIQUE,
  typical_yield_per_ha DECIMAL,
  water_requirement_mm DECIMAL,
  growth_days INT,
  season VARCHAR,
  field_id INT REFERENCES fields(id)
)

sensor_readings (
  id SERIAL PRIMARY KEY,
  field_id INT REFERENCES fields(id),
  timestamp TIMESTAMP,
  soil_moisture_pct DECIMAL,
  water_flow_lph DECIMAL,
  air_temperature_c DECIMAL,
  humidity_pct DECIMAL,
  rain_mm DECIMAL
)

satellite_snapshots (
  id SERIAL PRIMARY KEY,
  field_id INT REFERENCES fields(id),
  date DATE,
  ndvi DECIMAL,
  ndwi DECIMAL,
  cloud_cover_pct DECIMAL,
  vegetation_health_score DECIMAL
)

weather_snapshots (
  id SERIAL PRIMARY KEY,
  field_id INT REFERENCES fields(id),
  date DATE,
  max_temp_c DECIMAL,
  min_temp_c DECIMAL,
  rain_mm DECIMAL,
  wind_kmh DECIMAL,
  drought_index DECIMAL
)

scenarios (
  id SERIAL PRIMARY KEY,
  slug VARCHAR UNIQUE,
  name VARCHAR,
  description TEXT,
  weather_modifier DECIMAL,
  soil_moisture_modifier DECIMAL,
  ndvi_modifier DECIMAL,
  yield_modifier DECIMAL,
  is_active BOOLEAN
)

analysis_runs (
  id SERIAL PRIMARY KEY,
  field_id INT REFERENCES fields(id),
  timestamp TIMESTAMP,
  potential_yield_t DECIMAL,
  actual_yield_t DECIMAL,
  productivity_score DECIMAL,
  crop_health_score DECIMAL,
  moisture_stress_score DECIMAL,
  disease_risk_score DECIMAL,
  confidence_pct DECIMAL
)

subsidy_recommendations (
  id SERIAL PRIMARY KEY,
  field_id INT REFERENCES fields(id),
  analysis_run_id INT REFERENCES analysis_runs(id),
  base_subsidy_azn DECIMAL,
  performance_factor DECIMAL,
  efficiency_factor DECIMAL,
  water_use_factor DECIMAL,
  yield_alignment_factor DECIMAL,
  final_subsidy_azn DECIMAL,
  calculation_note TEXT,
  created_at TIMESTAMP
)

irrigation_recommendations (
  id SERIAL PRIMARY KEY,
  field_id INT REFERENCES fields(id),
  sensor_reading_id INT REFERENCES sensor_readings(id),
  timestamp TIMESTAMP,
  current_soil_moisture DECIMAL,
  target_soil_moisture DECIMAL,
  recommended_water_mm DECIMAL,
  estimated_savings_pct DECIMAL,
  recommendation_text TEXT,
  urgency_level VARCHAR
)

plant_image_analyses (
  id SERIAL PRIMARY KEY,
  field_id INT REFERENCES fields(id),
  image_path VARCHAR,
  disease_detected VARCHAR,
  confidence_pct DECIMAL,
  health_score DECIMAL,
  recommendations JSON,
  analyzed_at TIMESTAMP
)

credit_score_results (
  id SERIAL PRIMARY KEY,
  farmer_id INT REFERENCES farmers(id),
  productivity_score DECIMAL,
  subsidy_performance DECIMAL,
  consistency_score DECIMAL,
  climate_risk_score DECIMAL,
  irrigation_efficiency_score DECIMAL,
  final_score DECIMAL,
  risk_tier VARCHAR,
  explanation_text TEXT,
  calculated_at TIMESTAMP
)
```

### 4.2 API Endpoints

**Dashboard:**
- `GET /dashboard/summary` - Overall stats

**Farms:**
- `GET /farms` - List all farms
- `GET /farms/{farm_id}` - Farm details

**Fields:**
- `GET /fields/{field_id}` - Field details

**Analysis:**
- `POST /analysis/run` - Trigger new analysis for field

**Subsidy:**
- `GET /subsidy/recommendation/{field_id}` - Get subsidy calc

**Irrigation:**
- `GET /irrigation/recommendation/{field_id}` - Get irrigation rec

**Credit Scoring:**
- `GET /credit-score/{farmer_id}` - Get farmer credit score

**Simulation:**
- `GET /simulation/state` - Current scenario
- `POST /simulation/scenario/{scenario_slug}` - Change scenario
- `POST /simulation/reset` - Reset simulation

**Plant Health:**
- `POST /analysis/plant-image` - Upload + analyze plant image

**Health:**
- `GET /health` - API + DB health check

---

## 5. AI/ML Components

### 5.1 Yield Prediction Model (Simulated)

**Purpose:** Estimate potential yield based on field conditions

**Inputs:**
- Crop type
- Field area (ha)
- Soil type
- Irrigation type
- NDVI score (vegetation health)
- NDWI score (water stress)
- Weather conditions (temp, rainfall)
- Historical yield data

**Algorithm (Simulation):**
```python
base_yield = crops[crop_type].typical_yield_per_ha * field_area_ha

health_factor = (ndvi_score + (1 - ndwi_score)) / 2  # Higher NDVI good, lower NDWI good
weather_factor = scenario.weather_modifier
moisture_factor = scenario.soil_moisture_modifier

potential_yield = base_yield * health_factor * weather_factor * moisture_factor
actual_yield = potential_yield * scenario.yield_modifier * random(0.9, 1.1)

productivity_score = (actual_yield / potential_yield) * 100
```

**Output:**
- Potential yield (tons)
- Actual yield (tons)
- Productivity score (0-100)
- Confidence level (0-100)

**Note:** In production, this would be a trained ML model (RandomForest, XGBoost, or neural network) trained on historical farm data. For MVP, we use deterministic simulation.

### 5.2 Plant Disease Detection Model (Real AI)

**Model:** `linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification`
- Architecture: MobileNetV2
- Training data: PlantVillage (54K images, 38 disease classes)
- Input: 224x224 RGB image
- Output: Top-3 predictions with confidence scores

**Integration:**
```python
from transformers import pipeline

classifier = pipeline(
    "image-classification",
    model="linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
)

results = classifier(image_path, top_k=3)
# [{'label': 'Tomato___Late_blight', 'score': 0.94}, ...]
```

**Post-processing:**
- Parse label (split on "___")
- Filter low confidence (<0.6)
- Map to actionable recommendations
- Store in database

### 5.3 Satellite Data Processing (Simulated)

**Real-world:** Would integrate with Sentinel-2 or Landsat APIs
**MVP:** Simulated satellite data with realistic NDVI/NDWI ranges

**NDVI (Normalized Difference Vegetation Index):**
- Range: -1 to 1
- Healthy crops: 0.6-0.9
- Stressed crops: 0.2-0.5
- Bare soil: <0.2

**NDWI (Normalized Difference Water Index):**
- Range: -1 to 1
- High water content: >0.5
- Moderate: 0.2-0.5
- Water stress: <0.2

**Simulation:**
```python
base_ndvi = field.ndvi_score
base_ndwi = field.ndwi_score

ndvi = base_ndvi * scenario.ndvi_modifier * random(0.95, 1.05)
ndwi = base_ndwi * scenario.soil_moisture_modifier * random(0.95, 1.05)

vegetation_health_score = (ndvi * 100 + (1 - ndwi) * 50) / 1.5
```

---

## 6. Technology Stack

### Backend
- **Framework:** FastAPI (Python 3.11)
- **Database:** PostgreSQL 15
- **ORM:** SQLAlchemy (async)
- **Migrations:** Alembic
- **AI/ML:** Hugging Face Transformers, PyTorch
- **Validation:** Pydantic v2
- **Environment:** Docker + Docker Compose

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Charts:** Recharts
- **HTTP Client:** Axios
- **State Management:** React Context + useState
- **Language:** Azerbaijani (az)

### Infrastructure
- **Deployment:** Docker Compose (dev), Kubernetes (prod)
- **Database:** PostgreSQL 15 with PostGIS (for geospatial)
- **File Storage:** Local filesystem (dev), S3-compatible (prod)
- **API Docs:** FastAPI auto-generated OpenAPI/Swagger

### External Integrations (Future)
- Sentinel Hub API (satellite imagery)
- OpenWeather API (weather data)
- SMS gateway (farmer notifications)
- Payment gateway (subsidy disbursement)

---

## 7. User Workflows

### Workflow 1: Farmer Checks Field Health & Gets Irrigation Advice

1. Farmer logs in to AqroSmart
2. Navigates to "Təsərrüfatlar" (Farms)
3. Selects their farm → field
4. Views field detail page showing:
   - NDVI: 0.72 (healthy)
   - NDWI: 0.38 (mild water stress)
   - Soil moisture: 42%
5. Sees irrigation recommendation:
   - "Apply 15mm irrigation within 2 days"
   - "Water needed: 1,500 liters"
   - "This will save 30% vs traditional schedule"
6. Farmer irrigates field
7. Next day, soil moisture updates to 58% (from sensor)
8. Irrigation rec updates: "Moisture adequate, no action needed"

### Workflow 2: Government Officer Allocates Subsidies

1. Officer logs in to admin panel
2. Views dashboard summary:
   - 7 farms registered
   - 10 fields analyzed
   - Total subsidy allocated: 42,350 AZN
3. Navigates to "Təsərrüfatlar" (Farms)
4. Sees farm list with productivity scores
5. Clicks "Mincivan Highland Farm" (74% productivity)
6. Views subsidy breakdown:
   - Base: 21,000 AZN (42 ha × 500 AZN/ha)
   - Performance factor: 0.89x (74% productivity)
   - Efficiency factor: 1.12x (good water use)
   - **Final subsidy: 20,950 AZN**
7. Compares to "Qəbələ Valley Farm" (0% productivity):
   - **Final subsidy: 0 AZN** (no production = no subsidy)
8. Exports subsidy allocation report for ministry
9. Approves payments via external system

### Workflow 3: Farmer Detects Crop Disease Early

1. Farmer notices yellow spots on tomato leaves
2. Opens AqroSmart → "Bitki sağlamlığı (AI)"
3. Takes photo with phone, uploads to platform
4. Clicks "Analiz et" (Analyze)
5. AI processes image (3 seconds)
6. Results show:
   - Disease: "Tomato Late Blight"
   - Confidence: 89%
   - Health score: 45% (unhealthy)
   - Recommendations:
     - "Remove infected leaves immediately"
     - "Apply copper-based fungicide"
     - "Reduce irrigation to prevent spread"
     - "Monitor closely for 7 days"
7. Farmer follows recommendations
8. Analysis saved to field history
9. Next subsidy calculation factors in disease response speed (positive for credit score)

### Workflow 4: Bank Evaluates Farmer Loan Application

1. Farmer applies for 50,000 AZN loan at bank
2. Bank requests credit report from AqroSmart
3. Farmer grants permission (one-time link)
4. Bank officer views credit score page:
   - Overall score: 78.9 (Tier B)
   - Productivity: 77.6%
   - Subsidy performance: 76.0%
   - Consistency: 60.0%
   - Climate risk: 75.3%
   - Irrigation efficiency: 78.1%
5. Officer sees:
   - "Better than 68% of farmers in Zəngilan region"
   - "Score improved +12 points in last 6 months"
   - 2-year productivity trend chart (upward)
6. Officer downloads PDF report for loan file
7. Approves loan at favorable interest rate (8% vs 12% for no-data farmer)

---

## 8. Security & Privacy

### Data Protection
- Farmer data is confidential
- Role-based access control (RBAC):
  - Farmer: Own farms only
  - Government: All farms, read-only
  - Bank: Specific farmer (with permission)
- No PII in logs
- Database encryption at rest
- HTTPS/TLS for all API calls

### Authentication (Future)
- JWT-based auth
- Multi-factor authentication for sensitive actions
- Session timeout after 30 min inactivity

### Farmer Consent
- Credit score sharing requires explicit farmer approval
- Farmers can revoke bank access anytime
- Audit log of all data access

---

## 9. Localization

**Primary Language:** Azerbaijani (az)

**Key Terms:**
- Təsərrüfat = Farm
- Sahə = Field
- Fermer = Farmer
- Məhsuldarlıq = Productivity
- Subsidiya = Subsidy
- Suvarma = Irrigation
- Bitki sağlamlığı = Plant health
- Kredit skorinqi = Credit scoring

**Number Formats:**
- Currency: AZN (Azerbaijani Manat)
- Decimal separator: . (dot)
- Thousands separator: , (comma)
- Example: 1,234.56 AZN

---

## 10. Success Criteria & KPIs

### Technical KPIs
- API response time <500ms (p95)
- System uptime >99.5%
- Zero data loss
- Plant disease detection accuracy >85%

### Business KPIs
- 100+ farmers registered in first 3 months
- 500+ fields analyzed
- 20% average water savings demonstrated
- 30% reduction in subsidy waste
- 70% of farmers improve credit score within 12 months

### User Satisfaction
- Net Promoter Score (NPS) >40
- Farmer app usage >3x per week
- Government user satisfaction >4.5/5

---

## 11. Future Roadmap

### Phase 2 (Q3 2026)
- Real satellite integration (Sentinel-2)
- IoT sensor hardware deployment (soil moisture sensors)
- Mobile app (iOS/Android)
- SMS notifications for irrigation alerts
- Multi-language support (Russian, English)

### Phase 3 (Q4 2026)
- Predictive analytics (yield forecasting 3 months ahead)
- Marketplace integration (connect farmers to buyers)
- Weather-based insurance products
- Blockchain subsidy disbursement (transparency)

### Phase 4 (2027)
- Expand to other regions of Azerbaijan
- Livestock management module
- Carbon credit tracking
- AI-powered pest detection

---

## 12. Competitive Landscape

**Direct Competitors:**
- None in Azerbaijan market (greenfield opportunity)

**Indirect Competitors:**
- Traditional agricultural extension services (manual, slow)
- Generic farm management software (not integrated with government systems)

**Differentiation:**
- Only platform integrating satellite + IoT + AI + subsidy system
- Government partnership (access to official farm registry)
- Localized for Azerbaijan (language, crops, regulations)
- Free for farmers (government-funded)

---

## 13. Risk Mitigation

### Technical Risks
- **Risk:** AI model accuracy too low
  - **Mitigation:** Multiple models, confidence thresholds, human-in-loop validation
- **Risk:** Satellite data unavailable
  - **Mitigation:** Fallback to drone imagery or manual field visits

### Adoption Risks
- **Risk:** Farmers resist tech adoption
  - **Mitigation:** Free training, simple UI, tangible financial benefits (credit access)
- **Risk:** Government subsidy formula rejection
  - **Mitigation:** Gradual rollout, pilot program, transparent calculations

### Data Risks
- **Risk:** Data manipulation by farmers
  - **Mitigation:** Cross-validate sensor data with satellite data, audit trails
- **Risk:** Privacy concerns
  - **Mitigation:** Clear consent flows, data anonymization for analytics

---

## 14. Conclusion

AqroSmart transforms Azerbaijan's agriculture from subsidy-dependent to performance-driven. By combining satellite monitoring, IoT sensors, and AI analysis, the platform creates transparency, optimizes resource usage, and enables financial inclusion for farmers.

**Key Innovations:**
1. **Dynamic subsidies:** Pay for performance, not just land
2. **Smart irrigation:** Save water while maintaining yields
3. **Credit scoring:** Enable farmer access to capital
4. **AI disease detection:** Prevent crop losses early

**Expected Impact:**
- 15% yield increase
- 25% water reduction
- 40% subsidy efficiency improvement
- 60% of farmers gain credit access

This document serves as the technical and functional specification for building, deploying, and scaling AqroSmart across Azerbaijan's agricultural sector.

---

**Document Version:** 1.0  
**Last Updated:** May 5, 2026  
**Contact:** AqroSmart Product Team

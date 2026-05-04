import os

files = {
    "aqrosmart/docker-compose.yml": """version: '3.8'
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: aqrosmart
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d aqrosmart"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    environment:
      - DATABASE_URL=postgresql+asyncpg://user:password@db:5432/aqrosmart
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:8000
    command: npm run dev -- --host 0.0.0.0
    depends_on:
      - backend

volumes:
  pgdata:
""",
    "aqrosmart/.env.example": """DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/aqrosmart
VITE_API_URL=http://localhost:8000
""",
    "aqrosmart/backend/Dockerfile": """FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
""",
    "aqrosmart/backend/requirements.txt": """fastapi==0.103.1
uvicorn[standard]==0.23.2
sqlalchemy[asyncio]==2.0.20
alembic==1.12.0
asyncpg==0.28.0
pydantic-settings==2.0.3
psycopg2-binary==2.9.7
""",
    "aqrosmart/backend/alembic.ini": """[alembic]
script_location = alembic
sqlalchemy.url = postgresql+asyncpg://user:password@db:5432/aqrosmart
[loggers]
keys = root,sqlalchemy,alembic
[handlers]
keys = console
[formatters]
keys = generic
[logger_root]
level = WARN
handlers = console
[logger_sqlalchemy]
level = WARN
handlers = console
qualname = sqlalchemy.engine
[logger_alembic]
level = INFO
handlers = console
qualname = alembic
[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic
[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
""",
    "aqrosmart/backend/alembic/env.py": """import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context
from app.database import Base
from app.config import settings

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = settings.DATABASE_URL
    context.configure(
        url=url, target_metadata=target_metadata, literal_binds=True, dialect_opts={"paramstyle": "named"}
    )
    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = settings.DATABASE_URL
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
""",
    "aqrosmart/backend/app/config.py": """from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/aqrosmart"

    class Config:
        env_file = ".env"

settings = Settings()
""",
    "aqrosmart/backend/app/database.py": """from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
""",
    "aqrosmart/backend/app/models/farmer.py": """from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.orm import relationship
from app.database import Base

class Farmer(Base):
    __tablename__ = "farmers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    financial_score = Column(Float, default=0.0)
    farms = relationship("Farm", back_populates="farmer")
""",
    "aqrosmart/backend/app/models/farm.py": """from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Farm(Base):
    __tablename__ = "farms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    location = Column(String)
    farmer_id = Column(Integer, ForeignKey("farmers.id"))
    farmer = relationship("Farmer", back_populates="farms")
    fields = relationship("Field", back_populates="farm")
""",
    "aqrosmart/backend/app/models/field.py": """from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Field(Base):
    __tablename__ = "fields"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    area_hectares = Column(Float)
    farm_id = Column(Integer, ForeignKey("farms.id"))
    farm = relationship("Farm", back_populates="fields")
    crops = relationship("Crop", back_populates="field")
""",
    "aqrosmart/backend/app/models/crop.py": """from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Crop(Base):
    __tablename__ = "crops"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    variety = Column(String)
    field_id = Column(Integer, ForeignKey("fields.id"))
    field = relationship("Field", back_populates="crops")
""",
    "aqrosmart/backend/app/models/sensor_reading.py": """from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.database import Base

class SensorReading(Base):
    __tablename__ = "sensor_readings"
    id = Column(Integer, primary_key=True, index=True)
    moisture_level = Column(Float)
    temperature = Column(Float)
    field_id = Column(Integer, ForeignKey("fields.id"))
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
""",
    "aqrosmart/backend/app/models/satellite_snapshot.py": """from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.database import Base

class SatelliteSnapshot(Base):
    __tablename__ = "satellite_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    ndvi_index = Column(Float)
    image_url = Column(String)
    field_id = Column(Integer, ForeignKey("fields.id"))
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
""",
    "aqrosmart/backend/app/models/weather_snapshot.py": """from sqlalchemy import Column, Integer, Float, String, DateTime
from sqlalchemy.sql import func
from app.database import Base

class WeatherSnapshot(Base):
    __tablename__ = "weather_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    location = Column(String)
    precipitation_mm = Column(Float)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
""",
    "aqrosmart/backend/app/models/analysis_run.py": """from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.database import Base

class AnalysisRun(Base):
    __tablename__ = "analysis_runs"
    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"))
    result_summary = Column(String)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
""",
    "aqrosmart/backend/app/models/subsidy_recommendation.py": """from sqlalchemy import Column, Integer, String, Float, ForeignKey
from app.database import Base

class SubsidyRecommendation(Base):
    __tablename__ = "subsidy_recommendations"
    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"))
    program_name = Column(String)
    estimated_amount = Column(Float)
""",
    "aqrosmart/backend/app/models/irrigation_recommendation.py": """from sqlalchemy import Column, Integer, Float, String, ForeignKey
from app.database import Base

class IrrigationRecommendation(Base):
    __tablename__ = "irrigation_recommendations"
    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"))
    water_volume_liters = Column(Float)
    schedule = Column(String)
""",
    "aqrosmart/backend/app/models/credit_score_result.py": """from sqlalchemy import Column, Integer, Float, ForeignKey
from app.database import Base

class CreditScoreResult(Base):
    __tablename__ = "credit_score_results"
    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"))
    score = Column(Float)
""",
    "aqrosmart/backend/app/models/scenario.py": """from sqlalchemy import Column, Integer, String
from app.database import Base

class Scenario(Base):
    __tablename__ = "scenarios"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(String)
""",
    # Schemas
    "aqrosmart/backend/app/schemas/dashboard.py": """from pydantic import BaseModel

class DashboardStats(BaseModel):
    total_farms: int
    total_fields: int
    avg_health: float
""",
    "aqrosmart/backend/app/schemas/farm.py": """from pydantic import BaseModel

class FarmBase(BaseModel):
    name: str
    location: str

class FarmCreate(FarmBase):
    farmer_id: int

class FarmResponse(FarmBase):
    id: int
    model_config = {"from_attributes": True}
""",
    "aqrosmart/backend/app/schemas/field.py": """from pydantic import BaseModel

class FieldBase(BaseModel):
    name: str
    area_hectares: float

class FieldCreate(FieldBase):
    farm_id: int

class FieldResponse(FieldBase):
    id: int
    model_config = {"from_attributes": True}
""",
    "aqrosmart/backend/app/schemas/analysis.py": """from pydantic import BaseModel
from datetime import datetime

class AnalysisResult(BaseModel):
    id: int
    field_id: int
    result_summary: str
    timestamp: datetime
    model_config = {"from_attributes": True}
""",
    "aqrosmart/backend/app/schemas/subsidy.py": """from pydantic import BaseModel

class SubsidyResponse(BaseModel):
    id: int
    farm_id: int
    program_name: str
    estimated_amount: float
    model_config = {"from_attributes": True}
""",
    "aqrosmart/backend/app/schemas/irrigation.py": """from pydantic import BaseModel

class IrrigationResponse(BaseModel):
    id: int
    field_id: int
    water_volume_liters: float
    schedule: str
    model_config = {"from_attributes": True}
""",
    "aqrosmart/backend/app/schemas/credit_score.py": """from pydantic import BaseModel

class CreditScoreResponse(BaseModel):
    id: int
    farmer_id: int
    score: float
    model_config = {"from_attributes": True}
""",
    "aqrosmart/backend/app/schemas/simulation.py": """from pydantic import BaseModel

class SimulationResponse(BaseModel):
    success: bool
    scenario_id: int
    message: str
""",
    # Services
    "aqrosmart/backend/app/services/simulation_engine.py": """async def run_simulation(scenario_id: int) -> str:
    return "Simulation completed successfully."
""",
    "aqrosmart/backend/app/services/subsidy_engine.py": """async def calculate_subsidy(farm_id: int) -> float:
    return 1500.0
""",
    "aqrosmart/backend/app/services/irrigation_engine.py": """async def calculate_irrigation(field_id: int) -> float:
    return 200.5
""",
    "aqrosmart/backend/app/services/credit_score_engine.py": """async def calculate_credit_score(farmer_id: int) -> float:
    return 750.0
""",
    "aqrosmart/backend/app/services/analysis_engine.py": """async def run_analysis(field_id: int) -> str:
    return "Crop health is optimal."
""",
    # Routers
    "aqrosmart/backend/app/routers/dashboard.py": """from fastapi import APIRouter
from app.schemas.dashboard import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/", response_model=DashboardStats)
async def get_dashboard():
    return DashboardStats(total_farms=10, total_fields=50, avg_health=85.5)
""",
    "aqrosmart/backend/app/routers/farms.py": """from fastapi import APIRouter
from app.schemas.farm import FarmResponse

router = APIRouter(prefix="/farms", tags=["farms"])

@router.get("/", response_model=list[FarmResponse])
async def list_farms():
    return []
""",
    "aqrosmart/backend/app/routers/fields.py": """from fastapi import APIRouter
from app.schemas.field import FieldResponse

router = APIRouter(prefix="/fields", tags=["fields"])

@router.get("/", response_model=list[FieldResponse])
async def list_fields():
    return []
""",
    "aqrosmart/backend/app/routers/analysis.py": """from fastapi import APIRouter
from app.schemas.analysis import AnalysisResult
from app.services.analysis_engine import run_analysis
from datetime import datetime

router = APIRouter(prefix="/analysis", tags=["analysis"])

@router.post("/{field_id}", response_model=AnalysisResult)
async def run_field_analysis(field_id: int):
    res = await run_analysis(field_id)
    return AnalysisResult(id=1, field_id=field_id, result_summary=res, timestamp=datetime.now())
""",
    "aqrosmart/backend/app/routers/subsidy.py": """from fastapi import APIRouter
from app.schemas.subsidy import SubsidyResponse
from app.services.subsidy_engine import calculate_subsidy

router = APIRouter(prefix="/subsidy", tags=["subsidy"])

@router.post("/{farm_id}", response_model=SubsidyResponse)
async def get_subsidy(farm_id: int):
    amount = await calculate_subsidy(farm_id)
    return SubsidyResponse(id=1, farm_id=farm_id, program_name="Eco Grant", estimated_amount=amount)
""",
    "aqrosmart/backend/app/routers/irrigation.py": """from fastapi import APIRouter
from app.schemas.irrigation import IrrigationResponse
from app.services.irrigation_engine import calculate_irrigation

router = APIRouter(prefix="/irrigation", tags=["irrigation"])

@router.post("/{field_id}", response_model=IrrigationResponse)
async def get_irrigation(field_id: int):
    vol = await calculate_irrigation(field_id)
    return IrrigationResponse(id=1, field_id=field_id, water_volume_liters=vol, schedule="Daily")
""",
    "aqrosmart/backend/app/routers/credit_score.py": """from fastapi import APIRouter
from app.schemas.credit_score import CreditScoreResponse
from app.services.credit_score_engine import calculate_credit_score

router = APIRouter(prefix="/credit", tags=["credit"])

@router.post("/{farmer_id}", response_model=CreditScoreResponse)
async def compute_credit(farmer_id: int):
    score = await calculate_credit_score(farmer_id)
    return CreditScoreResponse(id=1, farmer_id=farmer_id, score=score)
""",
    "aqrosmart/backend/app/routers/simulation.py": """from fastapi import APIRouter
from app.schemas.simulation import SimulationResponse
from app.services.simulation_engine import run_simulation

router = APIRouter(prefix="/simulation", tags=["simulation"])

@router.post("/{scenario_id}", response_model=SimulationResponse)
async def start_simulation(scenario_id: int):
    msg = await run_simulation(scenario_id)
    return SimulationResponse(success=True, scenario_id=scenario_id, message=msg)
""",
    "aqrosmart/backend/app/main.py": """from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import dashboard, farms, fields, analysis, subsidy, irrigation, credit_score, simulation

app = FastAPI(title="AqroSmart API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(farms.router)
app.include_router(fields.router)
app.include_router(analysis.router)
app.include_router(subsidy.router)
app.include_router(irrigation.router)
app.include_router(credit_score.router)
app.include_router(simulation.router)

@app.get("/health")
async def health():
    return {"status": "ok"}
""",
    "aqrosmart/backend/app/seed/seed.py": """import asyncio
from app.database import AsyncSessionLocal

async def seed_data():
    pass

if __name__ == "__main__":
    asyncio.run(seed_data())
""",

    # Frontend
    "aqrosmart/frontend/Dockerfile": """FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
""",
    "aqrosmart/frontend/package.json": """{
  "name": "aqrosmart-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.16.0",
    "axios": "^1.5.0",
    "recharts": "^2.8.0",
    "zustand": "^4.4.1",
    "@tailwindcss/forms": "^0.5.6"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.3",
    "autoprefixer": "^10.4.15",
    "postcss": "^8.4.29",
    "tailwindcss": "^3.3.3",
    "vite": "^4.4.5"
  }
}
""",
    "aqrosmart/frontend/vite.config.js": """import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
""",
    "aqrosmart/frontend/tailwind.config.js": """/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms')
  ],
}
""",
    "aqrosmart/frontend/index.html": """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AqroSmart</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = { corePlugins: { preflight: false } }
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
""",
    "aqrosmart/frontend/src/main.jsx": """import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
""",
    "aqrosmart/frontend/src/App.jsx": """import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import Dashboard from './pages/Dashboard'
import FarmDetail from './pages/FarmDetail'
import FieldAnalysis from './pages/FieldAnalysis'
import SimulationControl from './pages/SimulationControl'
import IrrigationHub from './pages/IrrigationHub'
import SubsidyEngine from './pages/SubsidyEngine'
import CreditScoring from './pages/CreditScoring'
import AdminDemo from './pages/AdminDemo'

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/farm/:id" element={<FarmDetail />} />
              <Route path="/field/:id" element={<FieldAnalysis />} />
              <Route path="/simulation" element={<SimulationControl />} />
              <Route path="/irrigation" element={<IrrigationHub />} />
              <Route path="/subsidy" element={<SubsidyEngine />} />
              <Route path="/credit" element={<CreditScoring />} />
              <Route path="/admin" element={<AdminDemo />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
""",
    "aqrosmart/frontend/src/api/client.js": """import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

export default client
""",
    "aqrosmart/frontend/src/pages/Dashboard.jsx": """import React from 'react'

export default function Dashboard() {
  return <div className="p-6">Dashboard content</div>
}
""",
    "aqrosmart/frontend/src/pages/FarmDetail.jsx": """import React from 'react'

export default function FarmDetail() {
  return <div className="p-6">Farm Detail content</div>
}
""",
    "aqrosmart/frontend/src/pages/FieldAnalysis.jsx": """import React from 'react'

export default function FieldAnalysis() {
  return <div className="p-6">Field Analysis content</div>
}
""",
    "aqrosmart/frontend/src/pages/SimulationControl.jsx": """import React from 'react'

export default function SimulationControl() {
  return <div className="p-6">Simulation Control content</div>
}
""",
    "aqrosmart/frontend/src/pages/IrrigationHub.jsx": """import React from 'react'

export default function IrrigationHub() {
  return <div className="p-6">Irrigation Hub content</div>
}
""",
    "aqrosmart/frontend/src/pages/SubsidyEngine.jsx": """import React from 'react'

export default function SubsidyEngine() {
  return <div className="p-6">Subsidy Engine content</div>
}
""",
    "aqrosmart/frontend/src/pages/CreditScoring.jsx": """import React from 'react'

export default function CreditScoring() {
  return <div className="p-6">Credit Scoring content</div>
}
""",
    "aqrosmart/frontend/src/pages/AdminDemo.jsx": """import React from 'react'

export default function AdminDemo() {
  return <div className="p-6">Admin Demo content</div>
}
""",
    "aqrosmart/frontend/src/components/layout/Sidebar.jsx": """import React from 'react'
import { Link } from 'react-router-dom'

export default function Sidebar() {
  return (
    <div className="w-64 bg-green-800 text-white flex flex-col">
      <div className="p-4 font-bold text-2xl">AqroSmart</div>
      <nav className="flex-1 p-4 space-y-2">
        <Link to="/" className="block py-2">Dashboard</Link>
        <Link to="/simulation" className="block py-2">Simulations</Link>
        <Link to="/irrigation" className="block py-2">Irrigation</Link>
        <Link to="/subsidy" className="block py-2">Subsidies</Link>
        <Link to="/credit" className="block py-2">Credit Score</Link>
      </nav>
    </div>
  )
}
""",
    "aqrosmart/frontend/src/components/layout/TopBar.jsx": """import React from 'react'

export default function TopBar() {
  return (
    <header className="h-16 bg-white shadow flex items-center justify-between px-6">
      <h2 className="text-xl font-semibold">Welcome</h2>
    </header>
  )
}
""",
    "aqrosmart/frontend/src/components/cards/MetricCard.jsx": """import React from 'react'

export default function MetricCard({ title, value }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="text-gray-500">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
""",
    "aqrosmart/frontend/src/components/cards/FieldCard.jsx": """import React from 'react'

export default function FieldCard({ fieldName }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-bold">{fieldName}</h3>
    </div>
  )
}
""",
    "aqrosmart/frontend/src/components/cards/ScoreCard.jsx": """import React from 'react'

export default function ScoreCard({ score }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="text-gray-500">Credit Score</h3>
      <p className="text-2xl font-bold text-blue-600">{score}</p>
    </div>
  )
}
""",
    "aqrosmart/frontend/src/components/charts/YieldComparisonChart.jsx": """import React from 'react'

export default function YieldComparisonChart() {
  return <div>Chart Placeholder</div>
}
""",
    "aqrosmart/frontend/src/components/charts/SubsidyBreakdownChart.jsx": """import React from 'react'

export default function SubsidyBreakdownChart() {
  return <div>Chart Placeholder</div>
}
""",
    "aqrosmart/frontend/src/components/charts/SensorGaugeChart.jsx": """import React from 'react'

export default function SensorGaugeChart() {
  return <div>Chart Placeholder</div>
}
""",
    "aqrosmart/frontend/src/store/scenarioStore.js": """import { create } from 'zustand'

const useScenarioStore = create((set) => ({
  activeScenario: null,
  setActiveScenario: (scenario) => set({ activeScenario: scenario }),
}))

export default useScenarioStore
"""
}

import os
for path, content in files.items():
    full_path = os.path.join(os.getcwd(), path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)
print("File creation complete.")

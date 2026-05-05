import asyncio
import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
import sentry_sdk
from sqlalchemy import func, select, text
from sqlalchemy.exc import SQLAlchemyError
from alembic.config import Config
from alembic import command
from pathlib import Path

from app.config import settings
from app.routers import dashboard, farms, fields, analysis, subsidy, irrigation, credit_score, simulation, plant_analysis
from app.database import AsyncSessionLocal
from app.models.farm import Farm
from app.models.scenario import Scenario
from app.seed.seed import seed_data

logger = logging.getLogger("aqrosmart")

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        traces_sample_rate=0.2,
    )

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
app.include_router(plant_analysis.router)
Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.exception_handler(Exception)
async def generic_exception_handler(_: Request, exc: Exception):
    logger.exception("Unhandled API error", exc_info=exc)
    return JSONResponse(status_code=500, content={"error": True, "message": "Internal server error", "code": "INTERNAL_ERROR"})


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    code = "NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR"
    message = str(exc.detail) if exc.detail else "Request failed"
    return JSONResponse(status_code=exc.status_code, content={"error": True, "message": message, "code": code})


@app.exception_handler(404)
async def not_found_handler(_: Request, __):
    return JSONResponse(status_code=404, content={"error": True, "message": "Resource not found", "code": "NOT_FOUND"})


async def run_migrations_async() -> None:
    """Run Alembic migrations asynchronously."""
    def _run_migrations():
        # Try to find alembic.ini in common locations
        alembic_ini_paths = [
            Path("/app/alembic.ini"),
            Path("alembic.ini"),
            Path(__file__).parent.parent / "alembic.ini",
        ]
        
        alembic_ini = None
        for path in alembic_ini_paths:
            if path.exists():
                alembic_ini = path
                break
        
        if alembic_ini is None:
            logger.warning("alembic.ini not found; skipping migrations (assuming pre-migrated schema)")
            return
        
        logger.info(f"Using alembic.ini from {alembic_ini}")
        alembic_cfg = Config(str(alembic_ini))
        alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
        command.upgrade(alembic_cfg, "head")
    
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _run_migrations)


@app.on_event("startup")
async def verify_database_on_startup() -> None:
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        
        logger.info("Running Alembic migrations...")
        await run_migrations_async()
        logger.info("Migrations completed.")
        
        async with AsyncSessionLocal() as session:
            farm_count = (await session.execute(select(func.count(Farm.id)))).scalar_one()
            scenario_count = (await session.execute(select(func.count(Scenario.id)))).scalar_one()
            if farm_count == 0 or scenario_count == 0:
                logger.info("Database is empty on startup; seeding AqroSmart demo data.")
                await seed_data()
                logger.info("Seeding completed.")
    except SQLAlchemyError as exc:
        logger.critical("Database unavailable at startup. Shutting down.", exc_info=exc)
        raise RuntimeError("Database unavailable at startup") from exc
    except Exception as exc:
        logger.critical("Startup failed: %s", exc, exc_info=exc)
        raise RuntimeError(f"Startup failed: {exc}") from exc


@app.get("/health")
async def health():
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok", "database": "ok"}
    except SQLAlchemyError:
        return JSONResponse(status_code=503, content={"error": True, "message": "Database unavailable", "code": "DB_UNAVAILABLE"})

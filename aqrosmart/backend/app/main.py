import asyncio
import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
import sentry_sdk
from sqlalchemy import func, select, text
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.routers import dashboard, farms, fields, analysis, subsidy, irrigation, credit_score, simulation, plant_analysis
from app.database import AsyncSessionLocal, engine, Base
from app.models.farm import Farm
from app.models.scenario import Scenario
from app.seed.seed import seed_data
import app.models  # Import all models to register them with Base

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


async def create_tables_async() -> None:
    """Create database tables using raw SQL text."""
    logger.info("Creating database schema from ORM models...")
    try:
        from sqlalchemy.schema import CreateTable
        from sqlalchemy.dialects import postgresql
        
        # Get all tables
        tables_to_create = list(Base.metadata.tables.values())
        
        # Sort by foreign key dependencies
        def get_fk_deps(table):
            return {fk.column.table for fk in table.foreign_keys}
        
        sorted_tables = []
        remaining = set(tables_to_create)
        
        while remaining:
            ready = [t for t in remaining if not (get_fk_deps(t) & remaining)]
            if not ready:
                ready = list(remaining)
            sorted_tables.extend(ready)
            remaining -= set(ready)
        
        # Create tables as text SQL
        async with engine.begin() as conn:
            for table in sorted_tables:
                try:
                    # Generate raw SQL text
                    create_stmt = CreateTable(table).compile(
                        dialect=postgresql.dialect()
                    )
                    sql_text = text(str(create_stmt))
                    logger.info(f"Creating table: {table.name}")
                    await conn.execute(sql_text)
                except Exception as e:
                    error_str = str(e).lower()
                    if "already exists" in error_str or "duplicate" in error_str:
                        logger.info(f"Table {table.name} already exists")
                    else:
                        logger.warning(f"Table {table.name}: {e}")
        
        logger.info("Schema creation completed successfully.")
    except Exception as exc:
        logger.error(f"Failed to create tables: {exc}", exc_info=exc)
        raise


@app.on_event("startup")
async def verify_database_on_startup() -> None:
    try:
        # Test database connection
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        
        logger.info("Database connected. Creating schema if needed...")
        await create_tables_async()
        
        # Seed data if database is empty
        async with AsyncSessionLocal() as session:
            farm_count = (await session.execute(select(func.count(Farm.id)))).scalar_one()
            scenario_count = (await session.execute(select(func.count(Scenario.id)))).scalar_one()
            if farm_count == 0 or scenario_count == 0:
                logger.info("Database is empty. Seeding AqroSmart demo data...")
                await seed_data()
                logger.info("Seeding completed successfully.")
            else:
                logger.info(f"Database ready: {farm_count} farms, {scenario_count} scenarios found.")
    except SQLAlchemyError as exc:
        logger.critical("Database unavailable at startup.", exc_info=exc)
        raise RuntimeError("Database unavailable at startup") from exc
    except Exception as exc:
        logger.critical("Startup initialization failed.", exc_info=exc)
        raise RuntimeError(f"Startup failed: {exc}") from exc


@app.get("/health")
async def health():
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok", "database": "ok"}
    except SQLAlchemyError:
        return JSONResponse(status_code=503, content={"error": True, "message": "Database unavailable", "code": "DB_UNAVAILABLE"})

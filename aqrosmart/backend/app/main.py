import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.routers import dashboard, farms, fields, analysis, subsidy, irrigation, credit_score, simulation
from app.database import AsyncSessionLocal

logger = logging.getLogger("aqrosmart")

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


@app.on_event("startup")
async def verify_database_on_startup() -> None:
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.critical("Database unavailable at startup. Shutting down.", exc_info=exc)
        raise RuntimeError("Database unavailable at startup") from exc


@app.get("/health")
async def health():
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok", "database": "ok"}
    except SQLAlchemyError:
        return JSONResponse(status_code=503, content={"error": True, "message": "Database unavailable", "code": "DB_UNAVAILABLE"})

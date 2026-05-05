import pytest
import pytest_asyncio
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from app.main import app
from app.database import engine, Base, AsyncSessionLocal

@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

@pytest_asyncio.fixture(autouse=True)
async def clean_database():
    async with engine.begin() as conn:
        tables = Base.metadata.sorted_tables
        if tables:
            table_names = ", ".join(f'"{t.name}"' for t in tables)
            await conn.execute(text(f"TRUNCATE TABLE {table_names} CASCADE"))
    yield

@pytest_asyncio.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


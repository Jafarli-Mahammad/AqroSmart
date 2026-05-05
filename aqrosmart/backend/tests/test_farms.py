import pytest
from httpx import AsyncClient
from app.models.farm import Farm
from app.models.farmer import Farmer
from app.database import AsyncSessionLocal
import uuid

@pytest.mark.asyncio
async def test_get_farms_empty(async_client: AsyncClient):
    response = await async_client.get("/farms")
    assert response.status_code == 200
    assert response.json() == []

@pytest.mark.asyncio
async def test_get_farm_not_found(async_client: AsyncClient):
    response = await async_client.get("/farms/999999")
    assert response.status_code == 404
    assert response.json() == {"error": True, "message": "Resource not found", "code": "NOT_FOUND"}

@pytest.mark.asyncio
async def test_get_farm_invalid_id_type(async_client: AsyncClient):
    response = await async_client.get("/farms/invalid_string_id")
    # Should trigger generic validation error handled by FastAPI
    assert response.status_code == 422

@pytest.mark.asyncio
async def test_get_farms_pagination(async_client: AsyncClient):
    # Seed data
    async with AsyncSessionLocal() as session:
        farmer = Farmer(name="Test Farmer", fin_code="1234567")
        session.add(farmer)
        await session.commit()
        await session.refresh(farmer)

        for i in range(15):
            farm = Farm(name=f"Farm {i}", farmer_id=farmer.id, region="Test Region")
            session.add(farm)
        await session.commit()

    # Test limit
    response = await async_client.get("/farms?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5

    # Test offset
    response = await async_client.get("/farms?limit=5&offset=5")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5
    assert data[0]["name"] == "Farm 5"

@pytest.mark.asyncio
async def test_get_farms_sql_injection(async_client: AsyncClient):
    response = await async_client.get("/farms?limit=10; DROP TABLE farms;--")
    # Should be 422 because limit must be an integer
    assert response.status_code == 422

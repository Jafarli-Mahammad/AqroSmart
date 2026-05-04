from fastapi import APIRouter
from app.schemas.dashboard import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/", response_model=DashboardStats)
async def get_dashboard():
    return DashboardStats(total_farms=10, total_fields=50, avg_health=85.5)

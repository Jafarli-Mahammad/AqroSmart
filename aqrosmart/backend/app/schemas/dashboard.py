from pydantic import BaseModel

class DashboardStats(BaseModel):
    total_farms: int
    total_fields: int
    avg_health: float

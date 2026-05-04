from fastapi import APIRouter
from app.schemas.irrigation import IrrigationResponse
from app.services.irrigation_engine import calculate_irrigation

router = APIRouter(prefix="/irrigation", tags=["irrigation"])

@router.post("/{field_id}", response_model=IrrigationResponse)
async def get_irrigation(field_id: int):
    vol = await calculate_irrigation(field_id)
    return IrrigationResponse(id=1, field_id=field_id, water_volume_liters=vol, schedule="Daily")

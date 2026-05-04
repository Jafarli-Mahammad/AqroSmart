from fastapi import APIRouter
from app.schemas.subsidy import SubsidyResponse
from app.services.subsidy_engine import calculate_subsidy

router = APIRouter(prefix="/subsidy", tags=["subsidy"])

@router.post("/{farm_id}", response_model=SubsidyResponse)
async def get_subsidy(farm_id: int):
    amount = await calculate_subsidy(farm_id)
    return SubsidyResponse(id=1, farm_id=farm_id, program_name="Eco Grant", estimated_amount=amount)

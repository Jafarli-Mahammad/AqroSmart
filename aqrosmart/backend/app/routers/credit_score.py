from fastapi import APIRouter
from app.schemas.credit_score import CreditScoreResponse
from app.services.credit_score_engine import calculate_credit_score

router = APIRouter(prefix="/credit", tags=["credit"])

@router.post("/{farmer_id}", response_model=CreditScoreResponse)
async def compute_credit(farmer_id: int):
    score = await calculate_credit_score(farmer_id)
    return CreditScoreResponse(id=1, farmer_id=farmer_id, score=score)

from fastapi import APIRouter
from app.schemas.farm import FarmResponse

router = APIRouter(prefix="/farms", tags=["farms"])

@router.get("/", response_model=list[FarmResponse])
async def list_farms():
    return []

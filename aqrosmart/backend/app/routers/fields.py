from fastapi import APIRouter
from app.schemas.field import FieldResponse

router = APIRouter(prefix="/fields", tags=["fields"])

@router.get("/", response_model=list[FieldResponse])
async def list_fields():
    return []

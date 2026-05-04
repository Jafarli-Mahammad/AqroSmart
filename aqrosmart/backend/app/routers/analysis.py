from fastapi import APIRouter
from app.schemas.analysis import AnalysisResult
from app.services.analysis_engine import run_analysis
from datetime import datetime

router = APIRouter(prefix="/analysis", tags=["analysis"])

@router.post("/{field_id}", response_model=AnalysisResult)
async def run_field_analysis(field_id: int):
    res = await run_analysis(field_id)
    return AnalysisResult(id=1, field_id=field_id, result_summary=res, timestamp=datetime.now())

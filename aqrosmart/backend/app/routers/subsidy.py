from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.field import Field
from app.models.subsidy_recommendation import SubsidyRecommendation
from app.services.subsidy_engine import SubsidyBreakdown

router = APIRouter(prefix="/subsidy", tags=["subsidy"])


@router.get("/recommendation/{field_id}", response_model=SubsidyBreakdown)
async def get_subsidy_recommendation(field_id: int, session: AsyncSession = Depends(get_db)) -> SubsidyBreakdown:
    field = (await session.execute(select(Field).where(Field.id == field_id))).scalar_one_or_none()
    if field is None:
        raise HTTPException(status_code=404, detail="Field not found")

    recommendation = (
        await session.execute(select(SubsidyRecommendation).where(SubsidyRecommendation.field_id == field_id).order_by(SubsidyRecommendation.id.desc()).limit(1))
    ).scalar_one_or_none()
    if recommendation is None:
        raise HTTPException(status_code=404, detail="Subsidy recommendation not found")

    return SubsidyBreakdown(
        base_subsidy_azn=float(recommendation.base_subsidy_azn or 0.0),
        performance_factor=float(recommendation.performance_factor or 0.0),
        efficiency_factor=float(recommendation.efficiency_factor or 0.0),
        water_use_factor=float(recommendation.water_use_factor or 0.0),
        yield_alignment_factor=float(recommendation.yield_alignment_factor or 0.0),
        final_subsidy_azn=float(recommendation.final_subsidy_azn or 0.0),
        calculation_note=recommendation.calculation_note or "",
    )

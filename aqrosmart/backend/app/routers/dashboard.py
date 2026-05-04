from __future__ import annotations

from collections import Counter
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.analysis_run import AnalysisRun
from app.models.farm import Farm
from app.models.field import Field
from app.models.farmer import Farmer
from app.models.scenario import Scenario
from app.models.credit_score_result import CreditScoreResult
from app.models.subsidy_recommendation import SubsidyRecommendation
from app.services.response_cache import response_cache

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class DashboardSummary(BaseModel):
    total_farms: int
    total_fields: int
    total_farmers: int
    total_analysis_runs: int
    crop_distribution: dict[str, int]
    avg_productivity_score: float
    avg_credit_score: float
    total_subsidy_allocated_azn: float
    water_savings_pct: float
    active_scenario: str

    model_config = ConfigDict(from_attributes=True)


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(session: AsyncSession = Depends(get_db)) -> DashboardSummary:
    cached = response_cache.get("dashboard:summary")
    if cached is not None:
        return cached
    total_farms = (await session.execute(select(func.count(Farm.id)))).scalar_one()
    total_fields = (await session.execute(select(func.count(Field.id)))).scalar_one()
    total_farmers = (await session.execute(select(func.count(Farmer.id)))).scalar_one()
    total_analysis_runs = (await session.execute(select(func.count(AnalysisRun.id)))).scalar_one()

    crop_rows = await session.execute(select(Field.crop_type))
    crop_distribution = Counter(crop for crop in crop_rows.scalars().all() if crop)

    avg_productivity_score = (
        await session.execute(select(func.coalesce(func.avg(AnalysisRun.productivity_score), 0.0)))
    ).scalar_one()
    avg_credit_score = (
        await session.execute(select(func.coalesce(func.avg(CreditScoreResult.final_score), 0.0)))
    ).scalar_one()
    total_subsidy_allocated_azn = (
        await session.execute(select(func.coalesce(func.sum(SubsidyRecommendation.final_subsidy_azn), 0.0)))
    ).scalar_one()

    water_savings_pct = 0.0
    if total_fields:
        irrigation_savings = await session.execute(
            select(func.coalesce(func.avg(AnalysisRun.moisture_stress_score), 0.0))
        )
        water_savings_pct = max(0.0, min(100.0, 100.0 - float(irrigation_savings.scalar_one())))

    active_scenario = (
        await session.execute(select(Scenario.slug).where(Scenario.is_active.is_(True)).limit(1))
    ).scalar_one_or_none()
    if active_scenario is None:
        active_scenario = (
            await session.execute(select(Scenario.slug).order_by(Scenario.id.asc()).limit(1))
        ).scalar_one_or_none()
    if active_scenario is None:
        raise HTTPException(status_code=404, detail="No scenarios are configured")

    result = DashboardSummary(
        total_farms=total_farms,
        total_fields=total_fields,
        total_farmers=total_farmers,
        total_analysis_runs=total_analysis_runs,
        crop_distribution=dict(crop_distribution),
        avg_productivity_score=round(float(avg_productivity_score or 0.0), 1),
        avg_credit_score=round(float(avg_credit_score or 0.0), 1),
        total_subsidy_allocated_azn=round(float(total_subsidy_allocated_azn or 0.0), 2),
        water_savings_pct=round(float(water_savings_pct), 1),
        active_scenario=active_scenario,
    )
    response_cache.set("dashboard:summary", result)
    return result

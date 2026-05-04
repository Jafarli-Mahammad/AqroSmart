from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.analysis_run import AnalysisRun
from app.models.farm import Farm
from app.models.credit_score_result import CreditScoreResult
from app.models.farmer import Farmer
from app.models.field import Field
from app.models.subsidy_recommendation import SubsidyRecommendation
from app.services.credit_score_engine import CreditScoreBreakdown, calculate_credit_score

router = APIRouter(prefix="/credit-score", tags=["credit-score"])


@router.get("/{farmer_id}", response_model=CreditScoreBreakdown)
async def get_credit_score(farmer_id: int, session: AsyncSession = Depends(get_db)) -> CreditScoreBreakdown:
    farmer = (await session.execute(select(Farmer).where(Farmer.id == farmer_id))).scalar_one_or_none()
    if farmer is None:
        raise HTTPException(status_code=404, detail="Farmer not found")

    analysis_rows = (
        await session.execute(
            select(AnalysisRun, Field)
            .join(Field, Field.id == AnalysisRun.field_id)
            .join(Farm, Farm.id == Field.farm_id)
            .join(Farmer, Farmer.id == Farm.farmer_id)
            .where(Farmer.id == farmer_id)
            .order_by(AnalysisRun.timestamp.desc().nullslast(), AnalysisRun.id.desc())
            .limit(5)
        )
    ).all()

    payloads: list[Any] = []
    for analysis_run, field in analysis_rows:
        subsidy = (
            await session.execute(
                select(SubsidyRecommendation)
                .where(SubsidyRecommendation.analysis_run_id == analysis_run.id)
                .order_by(SubsidyRecommendation.id.desc())
                .limit(1)
            )
        ).scalar_one_or_none()

        payloads.append(
            {
                "productivity_score": analysis_run.productivity_score or 0.0,
                "moisture_stress_score": analysis_run.moisture_stress_score or 0.0,
                "disease_risk_score": analysis_run.disease_risk_score or 0.0,
                "final_subsidy_azn": subsidy.final_subsidy_azn if subsidy else None,
                "base_subsidy_azn": subsidy.base_subsidy_azn if subsidy else None,
                "field": {"irrigation_type": field.irrigation_type},
            }
        )

    return calculate_credit_score({"name": farmer.name, "irrigation_type": None}, payloads)

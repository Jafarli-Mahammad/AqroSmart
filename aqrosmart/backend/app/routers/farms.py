from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.analysis_run import AnalysisRun
from app.models.farm import Farm
from app.models.field import Field
from app.models.farmer import Farmer

router = APIRouter(prefix="/farms", tags=["farms"])


class FarmListItem(BaseModel):
    id: int
    name: str
    farmer_id: int
    farmer_name: str
    farmer_years_active: int | None
    region: str | None
    field_count: int
    avg_productivity_score: float

    model_config = ConfigDict(from_attributes=True)


class FieldAnalysisSummary(BaseModel):
    id: int
    timestamp: datetime | None
    productivity_score: float | None
    crop_health_score: float | None
    moisture_stress_score: float | None
    disease_risk_score: float | None

    model_config = ConfigDict(from_attributes=True)


class FarmFieldItem(BaseModel):
    id: int
    crop_type: str | None
    area_ha: float | None
    soil_type: str | None
    irrigation_type: str | None
    ndvi_score: float | None
    ndwi_score: float | None
    latest_analysis_run: FieldAnalysisSummary | None

    model_config = ConfigDict(from_attributes=True)


class FarmDetailResponse(BaseModel):
    id: int
    name: str
    farmer_name: str
    region: str | None
    district: str | None
    total_area_ha: float | None
    fields: list[FarmFieldItem]

    model_config = ConfigDict(from_attributes=True)


@router.get("", response_model=list[FarmListItem])
async def list_farms(session: AsyncSession = Depends(get_db)) -> list[FarmListItem]:
    farms = (
        await session.execute(
            select(
                Farm,
                Farmer.id,
                Farmer.name,
                Farmer.years_active,
                func.count(distinct(Field.id)),
                func.coalesce(func.avg(AnalysisRun.productivity_score), 0.0),
            )
            .join(Farmer, Farm.farmer_id == Farmer.id)
            .outerjoin(Field, Field.farm_id == Farm.id)
            .outerjoin(AnalysisRun, AnalysisRun.field_id == Field.id)
            .group_by(Farm.id, Farmer.id, Farmer.name, Farmer.years_active)
            .order_by(Farm.id.asc())
        )
    ).all()

    response: list[FarmListItem] = []
    for farm, farmer_id, farmer_name, farmer_years_active, field_count, avg_productivity in farms:
        response.append(
            FarmListItem(
                id=farm.id,
                name=farm.name,
                farmer_id=farmer_id,
                farmer_name=farmer_name,
                farmer_years_active=farmer_years_active,
                region=farm.region,
                field_count=int(field_count or 0),
                avg_productivity_score=round(float(avg_productivity or 0.0), 1),
            )
        )
    return response


@router.get("/{farm_id}", response_model=FarmDetailResponse)
async def get_farm(farm_id: int, session: AsyncSession = Depends(get_db)) -> FarmDetailResponse:
    farm = (
        await session.execute(
            select(Farm).options(selectinload(Farm.fields).selectinload(Field.analysis_runs), selectinload(Farm.farmer)).where(Farm.id == farm_id)
        )
    ).scalar_one_or_none()
    if farm is None:
        raise HTTPException(status_code=404, detail="Farm not found")

    fields: list[FarmFieldItem] = []
    for field in farm.fields:
        latest_analysis = None
        if field.analysis_runs:
            latest = sorted(field.analysis_runs, key=lambda item: item.timestamp or datetime.min, reverse=True)[0]
            latest_analysis = FieldAnalysisSummary(
                id=latest.id,
                timestamp=latest.timestamp,
                productivity_score=latest.productivity_score,
                crop_health_score=latest.crop_health_score,
                moisture_stress_score=latest.moisture_stress_score,
                disease_risk_score=latest.disease_risk_score,
            )

        fields.append(
            FarmFieldItem(
                id=field.id,
                crop_type=field.crop_type,
                area_ha=field.area_ha,
                soil_type=field.soil_type,
                irrigation_type=field.irrigation_type,
                ndvi_score=field.ndvi_score,
                ndwi_score=field.ndwi_score,
                latest_analysis_run=latest_analysis,
            )
        )

    return FarmDetailResponse(
        id=farm.id,
        name=farm.name,
        farmer_id=farm.farmer_id,
        farmer_name=farm.farmer.name if farm.farmer else "Unknown",
        region=farm.region,
        district=farm.district,
        total_area_ha=farm.total_area_ha,
        fields=fields,
    )

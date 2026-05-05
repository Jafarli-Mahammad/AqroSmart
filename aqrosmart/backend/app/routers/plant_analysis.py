from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from celery.result import AsyncResult
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.celery_app import celery_app
from app.database import get_db
from app.models.field import Field
from app.models.plant_image_analysis import PlantImageAnalysis
from app.tasks import process_plant_image_task
from app.services.plant_analysis import analyze_plant_image, save_upload, validate_image_file

router = APIRouter(prefix="/analysis", tags=["plant-analysis"])


class PlantAnalysisResponse(BaseModel):
    disease_detected: str
    confidence_pct: float
    health_score: float
    recommendations: list[str]
    quality_messages: list[str]
    field_id: int | None
    priority_flag: str | None
    discrepancy_note: str | None
    analysis_source: str
    analyzed_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlantAnalysisTaskCreated(BaseModel):
    task_id: str
    status: str
    field_id: int | None
    analysis_source: str


class PlantAnalysisTaskStatus(BaseModel):
    task_id: str
    status: str
    result: dict | None = None
    analyzed_at: datetime | None = None


def _supplement_with_field_rules(result: dict, field: Field | None) -> tuple[str | None, str | None, list[str]]:
    recommendations = list(result.get("recommendations", []))
    priority_flag = None
    discrepancy_note = None
    disease_detected = str(result.get("disease_detected", ""))

    ndvi = float(field.ndvi_score or 0.0) if field else 0.0
    ndwi = float(field.ndwi_score or 0.0) if field else 0.0

    if disease_detected.lower() != "healthy" and ndvi < 0.5:
        priority_flag = "high"
        recommendations.append("NDVI aşağıdır və xəstəlik riski var: yüksək prioritetli aqronom yoxlaması tələb olunur.")

    lower_recs = " ".join(recommendations).lower()
    if "water" in lower_recs or "suvar" in lower_recs:
        if ndwi >= 0.4:
            discrepancy_note = "Model su ehtiyacı bildirir, lakin peyk NDWI göstəricisi rütubətin yetərli olduğunu göstərir."
        else:
            recommendations.append("NDWI aşağıdır: su stresi ehtimalı yüksəkdir, suvarmanı prioritetləşdirin.")

    if float(result.get("confidence_pct", 0.0)) < 60:
        if ndvi < 0.5:
            recommendations.append("Aşağı etibarlılıq + aşağı NDVI: mümkün qida çatışmazlığı.")
        if ndwi < 0.4:
            recommendations.append("Aşağı etibarlılıq + aşağı NDWI: su stresi müşahidə olunur.")
        if ndvi >= 0.5 and ndwi >= 0.4:
            recommendations.append("Model etibarlılığı aşağıdır, davamlı monitorinq tövsiyə olunur.")

    return priority_flag, discrepancy_note, recommendations


@router.post("/plant-image", response_model=PlantAnalysisResponse)
async def analyze_plant_upload(
    image: UploadFile = File(...),
    field_id: int | None = Form(default=None),
    session: AsyncSession = Depends(get_db),
) -> PlantAnalysisResponse:
    field: Field | None = None
    if field_id is not None:
        field = (await session.execute(select(Field).where(Field.id == field_id))).scalar_one_or_none()
        if field is None:
            raise HTTPException(status_code=404, detail="Field not found")

    content = await image.read()
    try:
        validate_image_file(image.filename or "", content)
        saved_path = save_upload(image.filename or "plant.jpg", content)
        result = analyze_plant_image(saved_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=f"Model hazır deyil: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Şəkil analizi uğursuz oldu: {exc}") from exc

    priority_flag, discrepancy_note, recommendations = _supplement_with_field_rules(result, field)

    analysis_row = PlantImageAnalysis(
        field_id=field_id,
        image_path=str(saved_path),
        disease_detected=result["disease_detected"],
        confidence_pct=result["confidence_pct"],
        health_score=result["health_score"],
        recommendations=recommendations,
    )
    session.add(analysis_row)
    await session.commit()

    return PlantAnalysisResponse(
        disease_detected=result["disease_detected"],
        confidence_pct=result["confidence_pct"],
        health_score=result["health_score"],
        recommendations=recommendations,
        quality_messages=result.get("quality_messages", []),
        field_id=field_id,
        priority_flag=priority_flag,
        discrepancy_note=discrepancy_note,
        analysis_source="model",
        analyzed_at=datetime.now(timezone.utc),
    )


@router.post("/plant-image/async", response_model=PlantAnalysisTaskCreated)
async def analyze_plant_upload_async(
    image: UploadFile = File(...),
    field_id: int | None = Form(default=None),
    session: AsyncSession = Depends(get_db),
) -> PlantAnalysisTaskCreated:
    if field_id is not None:
        field = (await session.execute(select(Field).where(Field.id == field_id))).scalar_one_or_none()
        if field is None:
            raise HTTPException(status_code=404, detail="Field not found")

    content = await image.read()
    try:
        validate_image_file(image.filename or "", content)
        saved_path = save_upload(image.filename or "plant.jpg", content)
        task = process_plant_image_task.delay(str(saved_path))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Tapşırıq yaradıla bilmədi: {exc}") from exc

    return PlantAnalysisTaskCreated(
        task_id=task.id,
        status="queued",
        field_id=field_id,
        analysis_source="celery",
    )


@router.get("/plant-image/task/{task_id}", response_model=PlantAnalysisTaskStatus)
async def get_plant_analysis_task_status(task_id: str) -> PlantAnalysisTaskStatus:
    task_result = AsyncResult(task_id, app=celery_app)
    if task_result.state == "PENDING":
        return PlantAnalysisTaskStatus(task_id=task_id, status="pending")
    if task_result.state in {"RECEIVED", "STARTED", "RETRY"}:
        return PlantAnalysisTaskStatus(task_id=task_id, status=task_result.state.lower())
    if task_result.state == "FAILURE":
        return PlantAnalysisTaskStatus(task_id=task_id, status="failure")

    payload = task_result.result if isinstance(task_result.result, dict) else None
    return PlantAnalysisTaskStatus(
        task_id=task_id,
        status="success",
        result=payload,
        analyzed_at=datetime.now(timezone.utc),
    )


@router.post("/plant-image/sample/{sample_id}", response_model=PlantAnalysisResponse)
async def analyze_sample_image(
    sample_id: int,
    field_id: int | None = None,
    session: AsyncSession = Depends(get_db),
) -> PlantAnalysisResponse:
    row = (
        await session.execute(
            select(PlantImageAnalysis).order_by(PlantImageAnalysis.id.asc()).offset(max(sample_id - 1, 0)).limit(1)
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Sample analysis not found")

    field: Field | None = None
    if field_id is not None:
        field = (await session.execute(select(Field).where(Field.id == field_id))).scalar_one_or_none()

    result = {
        "disease_detected": row.disease_detected,
        "confidence_pct": float(row.confidence_pct),
        "health_score": float(row.health_score),
        "recommendations": list(row.recommendations or []),
    }
    priority_flag, discrepancy_note, recommendations = _supplement_with_field_rules(result, field)
    return PlantAnalysisResponse(
        disease_detected=result["disease_detected"],
        confidence_pct=result["confidence_pct"],
        health_score=result["health_score"],
        recommendations=recommendations,
        quality_messages=[],
        field_id=field_id,
        priority_flag=priority_flag,
        discrepancy_note=discrepancy_note,
        analysis_source="sample",
        analyzed_at=datetime.now(timezone.utc),
    )

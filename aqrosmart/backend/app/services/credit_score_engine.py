from __future__ import annotations

from statistics import mean, pstdev
from typing import Any, Iterable

from pydantic import BaseModel, ConfigDict, Field


class RiskTier(str):
    A = "A"
    B = "B"
    C = "C"
    D = "D"


class CreditScoreBreakdown(BaseModel):
    productivity_score: float = Field(ge=0, le=100)
    subsidy_performance: float = Field(ge=0, le=100)
    consistency_score: float = Field(ge=0, le=100)
    climate_risk_score: float = Field(ge=0, le=100)
    irrigation_efficiency_score: float = Field(ge=0, le=100)
    final_score: float = Field(ge=0, le=100)
    risk_tier: str
    explanation_text: str

    model_config = ConfigDict(from_attributes=True)


def _get_value(source: Any, name: str, default: Any = None) -> Any:
    if source is None:
        return default
    if isinstance(source, dict):
        return source.get(name, default)
    return getattr(source, name, default)


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _as_list(values: Iterable[Any] | None) -> list[Any]:
    if values is None:
        return []
    return list(values)


def _extract_irrigation_type(farmer: Any, analysis_results: list[Any]) -> str:
    for result in analysis_results:
        field = _get_value(result, "field")
        irrigation_type = _get_value(field, "irrigation_type")
        if irrigation_type:
            return str(irrigation_type).lower()
        direct_irrigation = _get_value(result, "irrigation_type")
        if direct_irrigation:
            return str(direct_irrigation).lower()

    direct_farmer_irrigation = _get_value(farmer, "irrigation_type")
    if direct_farmer_irrigation:
        return str(direct_farmer_irrigation).lower()
    return "flood"


def _extract_subsidy_ratios(analysis_results: list[Any]) -> list[float]:
    ratios: list[float] = []
    for result in analysis_results:
        received = _get_value(result, "final_subsidy_azn")
        maximum = _get_value(result, "max_subsidy_azn") or _get_value(result, "base_subsidy_azn")
        if received is None and _get_value(result, "subsidy_breakdown") is not None:
            breakdown = _get_value(result, "subsidy_breakdown")
            received = _get_value(breakdown, "final_subsidy_azn")
            maximum = _get_value(breakdown, "base_subsidy_azn") or maximum
        if received is not None and maximum:
            ratios.append(_clamp(float(received) / float(maximum) * 100.0, 0.0, 100.0))
    return ratios


def _climate_risk_from_result(result: Any) -> float:
    drought_risk = float(_get_value(result, "moisture_stress_score", 0.0) or 0.0)
    disease_risk = float(_get_value(result, "disease_risk_score", 0.0) or 0.0)
    return _clamp((drought_risk + disease_risk) / 2.0, 0.0, 100.0)


def calculate_credit_score(farmer: Any, analysis_results: list[Any]) -> CreditScoreBreakdown:
    results = _as_list(analysis_results)
    productivity_scores = [float(_get_value(result, "productivity_score", 0.0) or 0.0) for result in results]

    if productivity_scores:
        productivity_score = mean(productivity_scores)
        consistency_penalty = pstdev(productivity_scores) if len(productivity_scores) > 1 else 0.0
    else:
        productivity_score = 0.0
        consistency_penalty = 0.0

    subsidy_ratios = _extract_subsidy_ratios(results)
    subsidy_performance = mean(subsidy_ratios) if subsidy_ratios else _clamp(productivity_score, 0.0, 100.0)

    consistency_score = _clamp(100.0 - (consistency_penalty * 2.0), 0.0, 100.0)

    climate_risks = [_climate_risk_from_result(result) for result in results]
    average_climate_risk = mean(climate_risks) if climate_risks else 0.0
    climate_risk_score = _clamp(100.0 - average_climate_risk, 0.0, 100.0)

    irrigation_type = _extract_irrigation_type(farmer, results)
    if irrigation_type == "drip":
        irrigation_efficiency_score = 92.0
    elif irrigation_type == "sprinkler":
        irrigation_efficiency_score = 76.0
    else:
        irrigation_efficiency_score = 56.0

    region = str(_get_value(farmer, "region", "") or "").lower()
    years_active = float(_get_value(farmer, "years_active", 0.0) or 0.0)
    regional_bonus = 3.0 if region in {"zəngilan", "füzuli", "ağdam"} else 0.0
    experience_score = _clamp(55.0 + years_active * 2.5, 55.0, 90.0)

    final_score = (
        productivity_score * 0.26
        + consistency_score * 0.20
        + irrigation_efficiency_score * 0.18
        + climate_risk_score * 0.16
        + subsidy_performance * 0.10
        + experience_score * 0.10
    )
    final_score += regional_bonus
    final_score = _clamp(final_score, 0.0, 100.0)

    if final_score >= 80.0:
        risk_tier = "A"
    elif final_score >= 65.0:
        risk_tier = "B"
    elif final_score >= 50.0:
        risk_tier = "C"
    else:
        risk_tier = "D"

    farmer_name = _get_value(farmer, "name", "the farmer")
    explanation_text = (
        f"{farmer_name} üçün kredit profili {risk_tier} səviyyəsində qiymətləndirildi. "
        f"Hesab məhsuldarlıq ({productivity_score:.1f}%), iqlim riski və suvarma səmərəliliyinə əsaslanır."
    )

    return CreditScoreBreakdown(
        productivity_score=round(productivity_score, 1),
        subsidy_performance=round(subsidy_performance, 1),
        consistency_score=round(consistency_score, 1),
        climate_risk_score=round(climate_risk_score, 1),
        irrigation_efficiency_score=round(irrigation_efficiency_score, 1),
        final_score=round(final_score, 1),
        risk_tier=risk_tier,
        explanation_text=explanation_text,
    )

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SubsidyBreakdown(BaseModel):
    base_subsidy_azn: float = Field(ge=0)
    performance_factor: float = Field(ge=0)
    efficiency_factor: float = Field(ge=0)
    water_use_factor: float = Field(ge=0)
    yield_alignment_factor: float = Field(ge=0)
    final_subsidy_azn: float = Field(ge=0)
    calculation_note: str

    model_config = ConfigDict(from_attributes=True)


def _get_value(source: Any, name: str, default: Any = None) -> Any:
    if source is None:
        return default
    if isinstance(source, dict):
        return source.get(name, default)
    return getattr(source, name, default)


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _format_note(performance_factor: float, efficiency_factor: float, water_use_factor: float, yield_alignment_factor: float) -> str:
    factors = {
        "productivity": performance_factor,
        "irrigation": efficiency_factor,
        "water use": water_use_factor,
        "yield alignment": yield_alignment_factor,
    }
    main_driver = max(factors, key=factors.get)
    note_map = {
        "productivity": "Productivity was the primary subsidy driver.",
        "irrigation": "Irrigation efficiency had the strongest effect on the payout.",
        "water use": "Water-use efficiency was the main factor affecting the payout.",
        "yield alignment": "Yield alignment above the baseline boosted the payout most.",
    }
    return note_map[main_driver]


def calculate_subsidy(analysis_result: Any, field: Any = None, farmer: Any = None) -> SubsidyBreakdown:
    area_ha = float(_get_value(field, "area_ha", 1.0) or 1.0)
    irrigation_type = str(_get_value(field, "irrigation_type", "") or "").lower()
    productivity_score = float(_get_value(analysis_result, "productivity_score", 0.0) or 0.0)
    moisture_stress_score = float(_get_value(analysis_result, "moisture_stress_score", 0.0) or 0.0)

    base_subsidy_azn = area_ha * 120.0
    performance_factor = _clamp(productivity_score / 100.0, 0.0, 1.0)

    if irrigation_type == "drip":
        efficiency_factor = 1.15
    elif irrigation_type == "sprinkler":
        efficiency_factor = 1.0
    else:
        efficiency_factor = 0.9

    water_use_factor = _clamp(1.0 + (moisture_stress_score * -0.2), 0.0, 2.0)
    yield_alignment_factor = _clamp(1.0 + ((productivity_score - 70.0) / 100.0), 0.0, 2.0)

    final_subsidy_azn = base_subsidy_azn * performance_factor * efficiency_factor * water_use_factor * yield_alignment_factor

    return SubsidyBreakdown(
        base_subsidy_azn=round(base_subsidy_azn, 2),
        performance_factor=round(performance_factor, 4),
        efficiency_factor=round(efficiency_factor, 4),
        water_use_factor=round(water_use_factor, 4),
        yield_alignment_factor=round(yield_alignment_factor, 4),
        final_subsidy_azn=round(final_subsidy_azn, 2),
        calculation_note=_format_note(performance_factor, efficiency_factor, water_use_factor, yield_alignment_factor),
    )

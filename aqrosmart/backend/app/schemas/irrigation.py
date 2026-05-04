from pydantic import BaseModel

class IrrigationResponse(BaseModel):
    id: int
    field_id: int
    water_volume_liters: float
    schedule: str
    model_config = {"from_attributes": True}

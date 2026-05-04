from pydantic import BaseModel

class FieldBase(BaseModel):
    name: str
    area_hectares: float

class FieldCreate(FieldBase):
    farm_id: int

class FieldResponse(FieldBase):
    id: int
    model_config = {"from_attributes": True}

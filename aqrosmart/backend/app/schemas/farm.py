from pydantic import BaseModel

class FarmBase(BaseModel):
    name: str
    location: str

class FarmCreate(FarmBase):
    farmer_id: int

class FarmResponse(FarmBase):
    id: int
    model_config = {"from_attributes": True}

from pydantic import BaseModel

class SubsidyResponse(BaseModel):
    id: int
    farm_id: int
    program_name: str
    estimated_amount: float
    model_config = {"from_attributes": True}

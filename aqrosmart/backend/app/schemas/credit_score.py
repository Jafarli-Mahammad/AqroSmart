from pydantic import BaseModel

class CreditScoreResponse(BaseModel):
    id: int
    farmer_id: int
    score: float
    model_config = {"from_attributes": True}

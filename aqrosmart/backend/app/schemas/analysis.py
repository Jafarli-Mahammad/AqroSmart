from pydantic import BaseModel
from datetime import datetime

class AnalysisResult(BaseModel):
    id: int
    field_id: int
    result_summary: str
    timestamp: datetime
    model_config = {"from_attributes": True}

from pydantic import BaseModel

class SimulationResponse(BaseModel):
    success: bool
    scenario_id: int
    message: str

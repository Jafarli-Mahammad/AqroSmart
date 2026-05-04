from fastapi import APIRouter
from app.schemas.simulation import SimulationResponse
from app.services.simulation_engine import run_simulation

router = APIRouter(prefix="/simulation", tags=["simulation"])

@router.post("/{scenario_id}", response_model=SimulationResponse)
async def start_simulation(scenario_id: int):
    msg = await run_simulation(scenario_id)
    return SimulationResponse(success=True, scenario_id=scenario_id, message=msg)

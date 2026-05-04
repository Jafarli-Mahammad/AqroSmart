from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import dashboard, farms, fields, analysis, subsidy, irrigation, credit_score, simulation

app = FastAPI(title="AqroSmart API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(farms.router)
app.include_router(fields.router)
app.include_router(analysis.router)
app.include_router(subsidy.router)
app.include_router(irrigation.router)
app.include_router(credit_score.router)
app.include_router(simulation.router)

@app.get("/health")
async def health():
    return {"status": "ok"}

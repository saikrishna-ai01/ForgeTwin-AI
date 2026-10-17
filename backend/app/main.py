from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.machines import router as machines_router
from app.api.telemetry import router as telemetry_router
from app.api.incidents import router as incidents_router
from app.api.copilot import router as copilot_router
from app.api.energy import router as energy_router
from app.api.operations import router as operations_router


app = FastAPI(
    title="ForgeTwin AI",
    description="AI Manufacturing Plant Digital Twin & Operations Platform",
    version="0.1.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# API ROUTES
# =========================================================

app.include_router(operations_router)

app.include_router(energy_router)

app.include_router(machines_router)

app.include_router(telemetry_router)

app.include_router(incidents_router)

app.include_router(copilot_router)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
async def root():
    return {
        "application": "ForgeTwin AI",
        "status": "online",
        "version": "0.1.0",
    }


# =========================================================
# HEALTH
# =========================================================

@app.get("/health")
async def health_check():
    return {
        "status": "healthy"
    }
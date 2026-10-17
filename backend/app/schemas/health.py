from pydantic import BaseModel


class HealthResponse(BaseModel):
    machine_id: int
    health_score: float
    status: str
    temperature_status: str
    vibration_status: str
    power_status: str
    rpm_status: str
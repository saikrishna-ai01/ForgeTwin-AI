from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MachineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    machine_code: str
    name: str
    machine_type: str
    location: str
    status: str
    temperature: float | None
    vibration: float | None
    power_consumption: float | None
    rpm: float | None
    health_score: float
    is_active: bool
    created_at: datetime
    updated_at: datetime
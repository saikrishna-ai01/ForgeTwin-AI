from pydantic import BaseModel

from app.schemas.machine import MachineResponse


class DashboardResponse(BaseModel):
    total_machines: int
    online_machines: int
    healthy_machines: int
    warning_machines: int
    critical_machines: int
    offline_machines: int
    machines: list[MachineResponse]
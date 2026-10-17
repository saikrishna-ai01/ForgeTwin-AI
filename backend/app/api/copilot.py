from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.copilot_service import CopilotService
from app.api.energy import get_energy_analytics
from app.core.database import get_db
from app.models.incident import Incident
from app.models.machine import Machine
from app.models.telemetry import Telemetry
from app.services.anomaly_service import analyze_machine_anomaly
from app.services.machine_health import evaluate_machine_health
from app.services.maintenance_service import assess_machine_maintenance


router = APIRouter(
    prefix="/copilot",
    tags=["AI Operations Copilot"],
)


class CopilotRequest(BaseModel):
    machine_id: int = Field(
        ...,
        description="Machine ID to analyze.",
    )
    question: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Operator question.",
    )


copilot_service = CopilotService()


def build_operations_summary(
    db: Session,
    machine_id: int,
) -> dict:

    machine = (
        db.query(Machine)
        .filter(Machine.id == machine_id)
        .first()
    )

    if machine is None:
        raise HTTPException(
            status_code=404,
            detail="Machine not found.",
        )

    latest_telemetry = (
        db.query(Telemetry)
        .filter(Telemetry.machine_id == machine_id)
        .order_by(Telemetry.recorded_at.desc())
        .first()
    )

    if latest_telemetry is None:
        raise HTTPException(
            status_code=404,
            detail="No telemetry available for this machine.",
        )

    health = evaluate_machine_health(
        temperature=float(latest_telemetry.temperature),
        vibration=float(latest_telemetry.vibration),
        power_consumption=float(
            latest_telemetry.power_consumption
        ),
        rpm=float(latest_telemetry.rpm),
    )

    try:
        anomaly = analyze_machine_anomaly(
            db=db,
            machine_id=machine_id,
            latest_telemetry=latest_telemetry,
        )
    except ValueError as exc:
        anomaly = {
            "machine_id": machine_id,
            "telemetry_id": latest_telemetry.id,
            "recorded_at": latest_telemetry.recorded_at,
            "is_anomaly": False,
            "anomaly_score": None,
            "risk_level": "insufficient_data",
            "training_records": 0,
            "analysis_status": "insufficient_data",
            "message": str(exc),
        }

    maintenance = assess_machine_maintenance(
        db=db,
        machine_id=machine_id,
        latest_telemetry=latest_telemetry,
        anomaly_result=anomaly,
    )

    incidents = (
        db.query(Incident)
        .filter(
            Incident.machine_id == machine_id,
            Incident.status == "open",
        )
        .order_by(Incident.created_at.desc())
        .all()
    )

    try:
        energy = get_energy_analytics(
            machine_id=machine_id,
            hours=1,
            db=db,
        )
    except HTTPException as exc:
        if exc.status_code == 404:
            energy = {
                "status": "unavailable",
                "message": exc.detail,
                "period": {
                    "hours": 1,
                },
            }
        else:
            raise

    machine_data = {
        "id": machine.id,
        "machine_code": machine.machine_code,
        "name": machine.name,
        "machine_type": machine.machine_type,
        "location": machine.location,
        "status": machine.status,
        "temperature": machine.temperature,
        "vibration": machine.vibration,
        "power_consumption": machine.power_consumption,
        "rpm": machine.rpm,
        "health_score": machine.health_score,
        "is_active": machine.is_active,
    }

    telemetry_data = {
        "id": latest_telemetry.id,
        "machine_id": latest_telemetry.machine_id,

        # Preserve the existing frontend API contract.
        # Units are explicitly documented in the AI evidence context.
        "temperature": float(
            latest_telemetry.temperature
        ),
        "vibration": float(
            latest_telemetry.vibration
        ),
        "power_consumption": float(
            latest_telemetry.power_consumption
        ),
        "rpm": float(latest_telemetry.rpm),

        "recorded_at": latest_telemetry.recorded_at,
    }

    health_data = {
        "health_score": health.health_score,
        "status": health.status,
        "temperature_status": health.temperature_status,
        "vibration_status": health.vibration_status,
        "power_status": health.power_status,
        "rpm_status": health.rpm_status,
    }

    incident_data = [
        {
            "id": incident.id,
            "severity": incident.severity,
            "title": incident.title,
            "description": incident.description,
            "temperature": incident.temperature,
            "vibration": incident.vibration,
            "power_consumption": incident.power_consumption,
            "rpm": incident.rpm,
            "health_score": incident.health_score,
            "status": incident.status,
            "created_at": incident.created_at,
            "resolved_at": incident.resolved_at,
        }
        for incident in incidents
    ]

    return {
        "snapshot": {
            "telemetry_id": latest_telemetry.id,
            "recorded_at": latest_telemetry.recorded_at,
        },
        "units": {
            "temperature": "°C",
            "vibration": "mm/s",
            "power_consumption": "kW",
            "energy": "kWh",
            "rpm": "RPM",
        },
        "machine": machine_data,
        "telemetry": telemetry_data,
        "health": health_data,
        "anomaly": anomaly,
        "maintenance": maintenance,
        "incidents": incident_data,
        "energy": energy,
    }


@router.post("/chat")
def chat_with_copilot(
    request: CopilotRequest,
    db: Session = Depends(get_db),
):
    operations_summary = build_operations_summary(
        db=db,
        machine_id=request.machine_id,
    )

    try:
        answer = copilot_service.ask(
            question=request.question,
            operations_summary=operations_summary,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc

    return {
        "machine_id": request.machine_id,
        "question": request.question,
        "answer": answer,
        "evidence_snapshot": operations_summary[
            "snapshot"
        ],
        "evidence": {
            "machine": operations_summary["machine"],
            "telemetry": operations_summary["telemetry"],
            "health": operations_summary["health"],
            "anomaly": operations_summary["anomaly"],
            "maintenance": operations_summary[
                "maintenance"
            ],
            "energy": operations_summary[
                "energy"
            ],
            "active_incidents": operations_summary[
                "incidents"
            ],
            "units": operations_summary["units"],
        },
    }
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.machine import Machine
from app.models.telemetry import Telemetry
from app.schemas.health import HealthResponse
from app.services.anomaly_service import analyze_machine_anomaly
from app.services.incident_service import create_or_update_incident
from app.services.machine_health import evaluate_machine_health


router = APIRouter(
    prefix="/telemetry",
    tags=["Telemetry"],
)


# ============================================================
# CREATE TELEMETRY
# POST /telemetry/{machine_id}
# ============================================================

@router.post("/{machine_id}")
def create_telemetry(
    machine_id: int,
    temperature: float,
    vibration: float,
    power_consumption: float,
    rpm: float,
    db: Session = Depends(get_db),
):
    machine = (
        db.query(Machine)
        .filter(Machine.id == machine_id)
        .first()
    )

    if machine is None:
        raise HTTPException(
            status_code=404,
            detail="Machine not found",
        )

    telemetry = Telemetry(
        machine_id=machine_id,
        temperature=temperature,
        vibration=vibration,
        power_consumption=power_consumption,
        rpm=rpm,
    )

    db.add(telemetry)
    db.commit()
    db.refresh(telemetry)

    # --------------------------------------------------------
    # Evaluate machine health
    # --------------------------------------------------------

    health = evaluate_machine_health(
        temperature=temperature,
        vibration=vibration,
        power_consumption=power_consumption,
        rpm=rpm,
    )

    # --------------------------------------------------------
    # Update machine's latest state
    # --------------------------------------------------------

    machine.temperature = temperature
    machine.vibration = vibration
    machine.power_consumption = power_consumption
    machine.rpm = rpm
    machine.health_score = health.health_score
    machine.status = health.status

    db.commit()
    db.refresh(machine)

    # --------------------------------------------------------
    # Create/update incident if required
    # --------------------------------------------------------

    create_or_update_incident(
        db=db,
        machine=machine,
        telemetry=telemetry,
    )

    return {
        "id": telemetry.id,
        "machine_id": telemetry.machine_id,
        "temperature": telemetry.temperature,
        "vibration": telemetry.vibration,
        "power_consumption": telemetry.power_consumption,
        "rpm": telemetry.rpm,
        "recorded_at": telemetry.recorded_at,
    }


# ============================================================
# MACHINE ANOMALY ANALYSIS
# GET /telemetry/{machine_id}/anomaly
# ============================================================

@router.get("/{machine_id}/anomaly")
def get_machine_anomaly(
    machine_id: int,
    db: Session = Depends(get_db),
):
    machine = (
        db.query(Machine)
        .filter(Machine.id == machine_id)
        .first()
    )

    if machine is None:
        raise HTTPException(
            status_code=404,
            detail="Machine not found",
        )

    try:
        return analyze_machine_anomaly(
            db=db,
            machine_id=machine_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )


# ============================================================
# MACHINE HEALTH
# GET /telemetry/{machine_id}/health
# ============================================================

@router.get(
    "/{machine_id}/health",
    response_model=HealthResponse,
)
def get_machine_health(
    machine_id: int,
    db: Session = Depends(get_db),
):
    machine = (
        db.query(Machine)
        .filter(Machine.id == machine_id)
        .first()
    )

    if machine is None:
        raise HTTPException(
            status_code=404,
            detail="Machine not found",
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
            detail="No telemetry available for this machine",
        )

    health = evaluate_machine_health(
        temperature=latest_telemetry.temperature,
        vibration=latest_telemetry.vibration,
        power_consumption=latest_telemetry.power_consumption,
        rpm=latest_telemetry.rpm,
    )

    return HealthResponse(
        machine_id=machine_id,
        health_score=health.health_score,
        status=health.status,
        temperature_status=health.temperature_status,
        vibration_status=health.vibration_status,
        power_status=health.power_status,
        rpm_status=health.rpm_status,
    )


# ============================================================
# MACHINE TELEMETRY HISTORY
# GET /telemetry/{machine_id}
#
# IMPORTANT:
# Keep this generic route LAST.
# ============================================================

@router.get("/{machine_id}")
def get_machine_telemetry(
    machine_id: int,
    db: Session = Depends(get_db),
):
    machine = (
        db.query(Machine)
        .filter(Machine.id == machine_id)
        .first()
    )

    if machine is None:
        raise HTTPException(
            status_code=404,
            detail="Machine not found",
        )

    return (
        db.query(Telemetry)
        .filter(Telemetry.machine_id == machine_id)
        .order_by(Telemetry.recorded_at.desc())
        .all()
    )
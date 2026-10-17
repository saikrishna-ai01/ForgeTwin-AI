
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.machine import Machine
from app.models.telemetry import Telemetry
from app.models.incident import Incident
from app.schemas.dashboard import DashboardResponse
from app.schemas.machine import MachineResponse
from app.services.maintenance_service import assess_machine_maintenance
from app.services.machine_health import evaluate_machine_health
from app.services.anomaly_service import analyze_machine_anomaly

router = APIRouter(prefix="/machines", tags=["Machines"])


# =========================================================
# CREATE MACHINE
# =========================================================

@router.post("/", response_model=MachineResponse)
def create_machine(
    machine_code: str,
    name: str,
    machine_type: str,
    location: str,
    db: Session = Depends(get_db),
):
    machine = Machine(
        machine_code=machine_code,
        name=name,
        machine_type=machine_type,
        location=location,
    )

    db.add(machine)
    db.commit()
    db.refresh(machine)

    return machine


# =========================================================
# GET ALL MACHINES
# =========================================================

@router.get("/", response_model=list[MachineResponse])
def get_machines(db: Session = Depends(get_db)):
    return db.query(Machine).all()


# =========================================================
# DASHBOARD SUMMARY
# =========================================================

@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db)):
    """
    Calculate dashboard connectivity from the latest telemetry.

    Connectivity:
        Online  = latest telemetry is no older than two minutes.
        Offline = telemetry is missing or older than two minutes.

    Health categories are calculated from the latest known telemetry.
    Offline status does not erase the last-known health assessment.
    No machine status is written to the database by this GET endpoint.
    """
    machines = (
        db.query(Machine)
        .filter(Machine.is_active.is_(True))
        .order_by(Machine.id.asc())
        .all()
    )

    now = datetime.utcnow()
    recent_cutoff = now - timedelta(minutes=2)

    online_machines = 0
    offline_machines = 0
    healthy_machines = 0
    warning_machines = 0
    critical_machines = 0

    dashboard_machines = []

    for machine in machines:
        latest = (
            db.query(Telemetry)
            .filter(Telemetry.machine_id == machine.id)
            .order_by(Telemetry.recorded_at.desc())
            .first()
        )

        if latest is not None:
            temperature = float(latest.temperature)
            vibration = float(latest.vibration)
            power_consumption = float(latest.power_consumption)
            rpm = float(latest.rpm)

            is_online = latest.recorded_at >= recent_cutoff
            last_updated = latest.recorded_at
        else:
            temperature = (
                float(machine.temperature)
                if machine.temperature is not None
                else 0.0
            )
            vibration = (
                float(machine.vibration)
                if machine.vibration is not None
                else 0.0
            )
            power_consumption = (
                float(machine.power_consumption)
                if machine.power_consumption is not None
                else 0.0
            )
            rpm = (
                float(machine.rpm)
                if machine.rpm is not None
                else 0.0
            )

            is_online = False
            last_updated = machine.updated_at

        health = evaluate_machine_health(
            temperature=temperature,
            vibration=vibration,
            power_consumption=power_consumption,
            rpm=rpm,
        )

        if latest is not None:
            if health.status == "healthy":
                healthy_machines += 1
            elif health.status == "warning":
                warning_machines += 1
            elif health.status == "critical":
                critical_machines += 1

        if is_online:
            online_machines += 1
            displayed_status = health.status
        else:
            offline_machines += 1
            displayed_status = "offline"

        # Build a response-only representation. Do not mutate
        # machine.status or commit changes in this GET endpoint.
        machine_data = {
            "id": machine.id,
            "machine_code": machine.machine_code,
            "name": machine.name,
            "machine_type": machine.machine_type,
            "location": machine.location,
            "status": displayed_status,
            "temperature": temperature,
            "vibration": vibration,
            "power_consumption": power_consumption,
            "rpm": rpm,
            "health_score": health.health_score,
            "is_active": machine.is_active,
            "created_at": machine.created_at,
            "updated_at": last_updated,
        }

        dashboard_machines.append(machine_data)

    return DashboardResponse(
        total_machines=len(machines),
        online_machines=online_machines,
        healthy_machines=healthy_machines,
        warning_machines=warning_machines,
        critical_machines=critical_machines,
        offline_machines=offline_machines,
        machines=dashboard_machines,
    )


# =========================================================
# AI OPERATIONS SUMMARY
# =========================================================

@router.get("/{machine_id}/operations-summary")
def get_machine_operations_summary(
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
        temperature=float(latest_telemetry.temperature),
        vibration=float(latest_telemetry.vibration),
        power_consumption=float(latest_telemetry.power_consumption),
        rpm=float(latest_telemetry.rpm),
    )

    try:
        anomaly = analyze_machine_anomaly(
            db=db,
            machine_id=machine_id,
            latest_telemetry=latest_telemetry,
        )
        maintenance = assess_machine_maintenance(
            db=db,
            machine_id=machine_id,
            latest_telemetry=latest_telemetry,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    active_incidents = (
        db.query(Incident)
        .filter(
            Incident.machine_id == machine_id,
            Incident.status == "open",
        )
        .order_by(Incident.created_at.desc())
        .all()
    )

    return {
        "snapshot": {
            "telemetry_id": latest_telemetry.id,
            "recorded_at": latest_telemetry.recorded_at,
        },
        "machine": {
            "id": machine.id,
            "machine_code": machine.machine_code,
            "name": machine.name,
            "machine_type": machine.machine_type,
            "location": machine.location,
            "status": machine.status,
            "health_score": machine.health_score,
            "is_active": machine.is_active,
        },
        "telemetry": {
            "id": latest_telemetry.id,
            "temperature": float(latest_telemetry.temperature),
            "vibration": float(latest_telemetry.vibration),
            "power_consumption": float(latest_telemetry.power_consumption),
            "rpm": float(latest_telemetry.rpm),
            "recorded_at": latest_telemetry.recorded_at,
        },
        "health": {
            "health_score": health.health_score,
            "status": health.status,
            "temperature_status": health.temperature_status,
            "vibration_status": health.vibration_status,
            "power_status": health.power_status,
            "rpm_status": health.rpm_status,
        },
        "anomaly": {
            "is_anomaly": anomaly["is_anomaly"],
            "anomaly_score": anomaly["anomaly_score"],
            "risk_level": anomaly["risk_level"],
            "training_records": anomaly["training_records"],
        },
        "maintenance": {
            "maintenance_priority": maintenance.maintenance_priority,
            "recommended_action": maintenance.recommended_action,
            "temperature_trend": maintenance.temperature_trend,
            "vibration_trend": maintenance.vibration_trend,
            "power_trend": maintenance.power_trend,
            "rpm_trend": maintenance.rpm_trend,
            "evidence": maintenance.evidence,
            "assessed_at": maintenance.assessed_at,
        },
        "incidents": [
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
            for incident in active_incidents
        ],
    }


# =========================================================
# MACHINE MAINTENANCE
# =========================================================

@router.get("/{machine_id}/maintenance")
def get_machine_maintenance(
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
        assessment = assess_machine_maintenance(
            db=db,
            machine_id=machine_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {
        "machine_id": assessment.machine_id,
        "machine_code": assessment.machine_code,
        "machine_name": assessment.machine_name,
        "status": assessment.status,
        "health_score": assessment.health_score,
        "anomaly_score": assessment.anomaly_score,
        "risk_level": assessment.risk_level,
        "temperature": assessment.temperature,
        "vibration": assessment.vibration,
        "power_consumption": assessment.power_consumption,
        "rpm": assessment.rpm,
        "temperature_trend": assessment.temperature_trend,
        "vibration_trend": assessment.vibration_trend,
        "power_trend": assessment.power_trend,
        "rpm_trend": assessment.rpm_trend,
        "maintenance_priority": assessment.maintenance_priority,
        "recommended_action": assessment.recommended_action,
        "evidence": assessment.evidence,
        "assessed_at": assessment.assessed_at,
    }

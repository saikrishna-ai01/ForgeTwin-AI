
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.machine import Machine
from app.models.telemetry import Telemetry
from app.models.incident import Incident
from app.services.machine_health import evaluate_machine_health


router = APIRouter(
    prefix="/operations",
    tags=["Operations"],
)


@router.get("/live")
def get_live_operations(db: Session = Depends(get_db)):
    machines = (
        db.query(Machine)
        .filter(Machine.is_active.is_(True))
        .order_by(Machine.id.asc())
        .all()
    )

    now = datetime.utcnow()
    recent_cutoff = now - timedelta(minutes=2)

    machine_data = []

    healthy_count = 0
    warning_count = 0
    critical_count = 0
    offline_count = 0
    total_power = 0.0

    for machine in machines:
        latest = (
            db.query(Telemetry)
            .filter(Telemetry.machine_id == machine.id)
            .order_by(Telemetry.recorded_at.desc())
            .first()
        )

        # Retrieve the latest known telemetry.
        if latest is not None:
            temperature = float(latest.temperature)
            vibration = float(latest.vibration)
            power_consumption = float(latest.power_consumption)
            rpm = float(latest.rpm)
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
            last_updated = machine.updated_at

        # Evaluate the last-known sensor readings.
        health = evaluate_machine_health(
            temperature=temperature,
            vibration=vibration,
            power_consumption=power_consumption,
            rpm=rpm,
        )

        health_score = round(float(health.health_score), 1)

        # Determine connectivity independently of sensor health.
        is_offline = (
            latest is None
            or latest.recorded_at < recent_cutoff
        )

        if is_offline:
            live_status = "offline"
            offline_count += 1
        else:
            live_status = health.status

            # Count health only for machines reporting recently.
            if health.status == "healthy":
                healthy_count += 1
            elif health.status == "warning":
                warning_count += 1
            elif health.status == "critical":
                critical_count += 1

        # Offline machines contribute no assumed live power.
        if not is_offline:
            total_power += power_consumption

        machine_data.append(
            {
                "id": machine.id,
                "machine_code": machine.machine_code,
                "name": machine.name,
                "machine_type": machine.machine_type,
                "location": machine.location,
                "status": live_status,
                "health_score": health_score,
                "temperature": round(temperature, 2),
                "vibration": round(vibration, 2),
                "power_consumption": round(power_consumption, 2),
                "rpm": round(rpm, 1),
                "last_updated": last_updated,
            }
        )

    active_incidents = (
        db.query(Incident)
        .filter(Incident.status == "open")
        .count()
    )

    return {
        "timestamp": now,
        "plant": {
            "machines_total": len(machines),
            "machines_online": len(machines) - offline_count,
            "machines_offline": offline_count,
            "healthy": healthy_count,
            "warning": warning_count,
            "critical": critical_count,
            "active_incidents": active_incidents,
            "total_power_kw": round(total_power, 2),
        },
        "machines": machine_data,
    }

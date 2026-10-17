from datetime import datetime

from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.machine import Machine
from app.models.telemetry import Telemetry


def create_or_update_incident(
    db: Session,
    machine: Machine,
    telemetry: Telemetry,
) -> Incident | None:
    """Create, update, or resolve incidents based on machine health."""

    now = datetime.utcnow()

    try:
        # Fetch all currently open incidents for this machine.
        open_incidents = (
            db.query(Incident)
            .filter(
                Incident.machine_id == machine.id,
                Incident.status == "open",
            )
            .order_by(Incident.created_at.desc())
            .all()
        )

        # Resolve incidents when the machine returns to healthy status.
        if machine.status == "healthy":
            for incident in open_incidents:
                incident.status = "resolved"
                incident.resolved_at = now

            if open_incidents:
                db.commit()

            return None

        # Do not create or resolve incidents for offline machines.
        if machine.status == "offline":
            return None

        # Ignore statuses that do not represent an actionable condition.
        if machine.status not in {"warning", "critical"}:
            return None

        severity = machine.status

        # Keep only the incident matching the current severity open.
        matching_incidents = [
            incident
            for incident in open_incidents
            if incident.severity == severity
        ]

        existing_incident = (
            matching_incidents[0] if matching_incidents else None
        )

        # Resolve incidents with a different severity.
        for incident in open_incidents:
            if incident.severity != severity:
                incident.status = "resolved"
                incident.resolved_at = now

        # If duplicate open incidents already exist, resolve the extras.
        for duplicate in matching_incidents[1:]:
            duplicate.status = "resolved"
            duplicate.resolved_at = now

        description = (
            f"{machine.name} is operating in {severity} condition. "
            f"Latest telemetry: temperature "
            f"{telemetry.temperature:.2f} deg C, "
            f"vibration {telemetry.vibration:.2f} mm/s, "
            f"power {telemetry.power_consumption:.2f} kW, "
            f"RPM {telemetry.rpm:.1f}."
        )

        # Update the existing incident instead of creating another one.
        if existing_incident is not None:
            existing_incident.temperature = telemetry.temperature
            existing_incident.vibration = telemetry.vibration
            existing_incident.power_consumption = (
                telemetry.power_consumption
            )
            existing_incident.rpm = telemetry.rpm
            existing_incident.health_score = machine.health_score
            existing_incident.description = description

            db.commit()
            db.refresh(existing_incident)

            return existing_incident

        # Create an incident only if no matching open incident exists.
        if severity == "critical":
            title = f"Critical condition detected - {machine.name}"
        else:
            title = f"Machine health degradation - {machine.name}"

        incident = Incident(
            machine_id=machine.id,
            severity=severity,
            title=title,
            description=description,
            temperature=telemetry.temperature,
            vibration=telemetry.vibration,
            power_consumption=telemetry.power_consumption,
            rpm=telemetry.rpm,
            health_score=machine.health_score,
            status="open",
        )

        db.add(incident)
        db.commit()
        db.refresh(incident)

        return incident

    except Exception:
        db.rollback()
        raise

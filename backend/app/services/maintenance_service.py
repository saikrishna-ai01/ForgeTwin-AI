
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.machine import Machine
from app.models.telemetry import Telemetry
from app.services.anomaly_service import analyze_machine_anomaly
from app.services.machine_health import evaluate_machine_health


@dataclass
class MaintenanceAssessment:
    machine_id: int
    machine_code: str
    machine_name: str
    status: str

    health_score: float
    anomaly_score: float
    risk_level: str

    temperature: float
    vibration: float
    power_consumption: float
    rpm: float

    temperature_trend: str
    vibration_trend: str
    power_trend: str
    rpm_trend: str

    maintenance_priority: str
    recommended_action: str
    evidence: list[str]

    assessed_at: datetime


def _calculate_trend(values: list[float]) -> str:
    """Calculate a trend by comparing the averages of two data halves."""

    if len(values) < 4:
        return "insufficient_data"

    midpoint = len(values) // 2
    first_half = values[:midpoint]
    second_half = values[midpoint:]

    first_average = sum(first_half) / len(first_half)
    second_average = sum(second_half) / len(second_half)

    if first_average == 0:
        return "stable"

    percentage_change = (
        (second_average - first_average) / abs(first_average)
    ) * 100

    if percentage_change >= 5:
        return "increasing"

    if percentage_change <= -5:
        return "decreasing"

    return "stable"


def _determine_priority(
    health_score: float,
    anomaly_score: float,
    risk_level: str,
    evidence_count: int,
) -> str:
    """
    Determine priority from machine health and validated risk.

    A moderate anomaly score or increasing trends alone do not
    justify high priority when machine health and risk are normal.
    """

    normalized_risk = risk_level.strip().lower()

    # Critical condition: poor health, critical risk, or very high score.
    if (
        health_score < 50
        or normalized_risk == "critical"
        or anomaly_score >= 70
    ):
        return "critical"

    # High priority: significantly degraded health or warning risk.
    if health_score < 80 or normalized_risk == "warning":
        return "high"

    # Medium priority: some health degradation without high risk.
    if health_score < 90:
        return "medium"

    # Healthy machine with normal risk: routine monitoring.
    # Trend evidence is reported separately and does not alone
    # escalate maintenance priority.
    return "low"


def _build_recommendation(priority: str) -> str:
    """Return a maintenance action appropriate to the assigned priority."""

    if priority == "critical":
        return (
            "Inspect the machine immediately and consider taking "
            "it out of service until the abnormal condition is "
            "investigated."
        )

    if priority == "high":
        return (
            "Schedule a maintenance inspection within 24-48 hours "
            "and investigate the abnormal telemetry indicators."
        )

    if priority == "medium":
        return (
            "Continue monitoring the machine and schedule a "
            "preventive inspection during the next maintenance window."
        )

    return (
        "Machine is operating within the current expected range. "
        "Continue routine monitoring."
    )


def assess_machine_maintenance(
    db: Session,
    machine_id: int,
    history_limit: int = 50,
    latest_telemetry: Telemetry | None = None,
    anomaly_result: dict | None = None,
) -> MaintenanceAssessment:
    """
    Assess machine health, telemetry trends, anomaly status,
    maintenance priority, and recommended action.

    Reuses supplied telemetry and anomaly results when available.
    """

    machine = (
        db.query(Machine)
        .filter(Machine.id == machine_id)
        .first()
    )

    if machine is None:
        raise ValueError("Machine not found.")

    telemetry_records = (
        db.query(Telemetry)
        .filter(Telemetry.machine_id == machine_id)
        .order_by(Telemetry.recorded_at.desc())
        .limit(history_limit)
        .all()
    )

    if not telemetry_records:
        raise ValueError("No telemetry available for this machine.")

    # Database records are retrieved newest-first; reverse for trend
    # calculation so the values run from oldest to newest.
    ordered_records = list(reversed(telemetry_records))

    if latest_telemetry is None:
        latest_telemetry = ordered_records[-1]

    latest = latest_telemetry

    # Calculate trends from the available telemetry history.
    temperatures = [
        float(record.temperature) for record in ordered_records
    ]
    vibrations = [
        float(record.vibration) for record in ordered_records
    ]
    power_values = [
        float(record.power_consumption) for record in ordered_records
    ]
    rpm_values = [
        float(record.rpm) for record in ordered_records
    ]

    temperature_trend = _calculate_trend(temperatures)
    vibration_trend = _calculate_trend(vibrations)
    power_trend = _calculate_trend(power_values)
    rpm_trend = _calculate_trend(rpm_values)

    # Evaluate the latest telemetry against machine health thresholds.
    health = evaluate_machine_health(
        temperature=float(latest.temperature),
        vibration=float(latest.vibration),
        power_consumption=float(latest.power_consumption),
        rpm=float(latest.rpm),
    )

    # Reuse anomaly analysis when the caller has already supplied it.
    if anomaly_result is None:
        anomaly = analyze_machine_anomaly(
            db=db,
            machine_id=machine_id,
            history_limit=min(history_limit, 100),
            latest_telemetry=latest,
        )
    else:
        anomaly = anomaly_result

    anomaly_detected = bool(anomaly["is_anomaly"])
    anomaly_score = float(anomaly["anomaly_score"])
    risk_level = str(anomaly["risk_level"]).strip().lower()

    # Collect measurable evidence from health checks, ML classification,
    # and telemetry trends. Trends are reported but do not independently
    # escalate maintenance priority.
    evidence: list[str] = []

    if health.temperature_status == "critical":
        evidence.append(
            f"Temperature is critically high at "
            f"{latest.temperature:.2f} deg C."
        )
    elif health.temperature_status == "warning":
        evidence.append(
            f"Temperature is elevated at {latest.temperature:.2f} deg C."
        )

    if health.vibration_status == "critical":
        evidence.append(
            f"Vibration is critically high at "
            f"{latest.vibration:.2f} mm/s."
        )
    elif health.vibration_status == "warning":
        evidence.append(
            f"Vibration is elevated at {latest.vibration:.2f} mm/s."
        )

    if health.power_status == "critical":
        evidence.append(
            f"Power consumption is critically high at "
            f"{latest.power_consumption:.2f} kW."
        )
    elif health.power_status == "warning":
        evidence.append(
            f"Power consumption is elevated at "
            f"{latest.power_consumption:.2f} kW."
        )

    if health.rpm_status == "warning":
        evidence.append(
            f"RPM is outside the expected operating range "
            f"at {latest.rpm:.0f} RPM."
        )

    if anomaly_detected:
        evidence.append(
            "The anomaly detection model classified the latest "
            "telemetry as anomalous."
        )

    if temperature_trend == "increasing":
        evidence.append("Temperature is showing an increasing trend.")

    if vibration_trend == "increasing":
        evidence.append("Vibration is showing an increasing trend.")

    if power_trend == "increasing":
        evidence.append(
            "Power consumption is showing an increasing trend."
        )

    if rpm_trend == "increasing":
        evidence.append("RPM is showing an increasing trend.")

    if (
        temperature_trend == "decreasing"
        or vibration_trend == "decreasing"
        or power_trend == "decreasing"
        or rpm_trend == "decreasing"
    ):
        evidence.append(
            "One or more telemetry measurements are showing "
            "a decreasing trend."
        )

    # Count supporting evidence for compatibility with the priority
    # function. Trend indicators are not used as an escalation rule.
    supporting_evidence_count = len(evidence)

    if anomaly_detected:
        supporting_evidence_count = max(
            supporting_evidence_count - 1,
            0,
        )

    priority = _determine_priority(
        health_score=float(health.health_score),
        anomaly_score=anomaly_score,
        risk_level=risk_level,
        evidence_count=supporting_evidence_count,
    )

    return MaintenanceAssessment(
        machine_id=machine.id,
        machine_code=machine.machine_code,
        machine_name=machine.name,
        status=health.status,
        health_score=float(health.health_score),
        anomaly_score=anomaly_score,
        risk_level=risk_level,
        temperature=float(latest.temperature),
        vibration=float(latest.vibration),
        power_consumption=float(latest.power_consumption),
        rpm=float(latest.rpm),
        temperature_trend=temperature_trend,
        vibration_trend=vibration_trend,
        power_trend=power_trend,
        rpm_trend=rpm_trend,
        maintenance_priority=priority,
        recommended_action=_build_recommendation(priority),
        evidence=evidence,
        assessed_at=datetime.utcnow(),
    )
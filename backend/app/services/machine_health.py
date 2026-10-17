from dataclasses import dataclass


@dataclass
class HealthResult:
    health_score: float
    status: str
    temperature_status: str
    vibration_status: str
    power_status: str
    rpm_status: str


def evaluate_machine_health(
    temperature: float,
    vibration: float,
    power_consumption: float,
    rpm: float,
) -> HealthResult:
    score = 100.0

    # Temperature
    if temperature > 90:
        temperature_status = "critical"
        score -= 30
    elif temperature > 80:
        temperature_status = "warning"
        score -= 15
    else:
        temperature_status = "normal"

    # Vibration
    if vibration > 7:
        vibration_status = "critical"
        score -= 30
    elif vibration > 5:
        vibration_status = "warning"
        score -= 15
    else:
        vibration_status = "normal"

    # Power consumption
    if power_consumption > 20:
        power_status = "critical"
        score -= 20
    elif power_consumption > 17:
        power_status = "warning"
        score -= 10
    else:
        power_status = "normal"

    # RPM
    if rpm < 1500 or rpm > 2000:
        rpm_status = "warning"
        score -= 10
    else:
        rpm_status = "normal"

    score = max(0.0, min(100.0, score))

    if score < 50:
        status = "critical"
    elif score < 80:
        status = "warning"
    else:
        status = "healthy"

    return HealthResult(
        health_score=round(score, 2),
        status=status,
        temperature_status=temperature_status,
        vibration_status=vibration_status,
        power_status=power_status,
        rpm_status=rpm_status,
    )
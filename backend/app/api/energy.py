from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.machine import Machine
from app.models.telemetry import Telemetry


router = APIRouter(
    prefix="/analytics/energy",
    tags=["Energy Analytics"],
)


@router.get("/{machine_id}")
def get_energy_analytics(
    machine_id: int,
    hours: int = Query(
        default=1,
        ge=1,
        le=24,
        description="Number of hours of telemetry to analyze.",
    ),
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
            detail="Machine not found.",
        )

    cutoff = datetime.utcnow() - timedelta(
        hours=hours
    )

    telemetry_records = (
        db.query(Telemetry)
        .filter(
            Telemetry.machine_id == machine_id,
            Telemetry.recorded_at >= cutoff,
        )
        .order_by(Telemetry.recorded_at.asc())
        .all()
    )

    if not telemetry_records:
        raise HTTPException(
            status_code=404,
            detail="No telemetry available for the requested period.",
        )

    power_values = [
        float(record.power_consumption)
        for record in telemetry_records
    ]

    average_power = sum(power_values) / len(
        power_values
    )

    peak_power = max(power_values)
    minimum_power = min(power_values)

    estimated_energy_kwh = 0.0

    for current, next_record in zip(
        telemetry_records,
        telemetry_records[1:],
    ):
        elapsed_seconds = (
            next_record.recorded_at
            - current.recorded_at
        ).total_seconds()

        # Ignore abnormal gaps so a disconnected simulator
        # cannot create a false energy spike.
        if elapsed_seconds <= 0:
            continue

        if elapsed_seconds > 60:
            continue

        average_interval_power = (
            float(current.power_consumption)
            + float(next_record.power_consumption)
        ) / 2.0

        estimated_energy_kwh += (
            average_interval_power
            * elapsed_seconds
            / 3600.0
        )

    latest = telemetry_records[-1]

    high_consumption_threshold = 20.0

    high_consumption_readings = [
        record
        for record in telemetry_records
        if float(record.power_consumption)
        >= high_consumption_threshold
    ]

    if peak_power >= 20:
        energy_status = "high"
    elif average_power >= 17:
        energy_status = "elevated"
    else:
        energy_status = "normal"

    return {
        "machine": {
            "id": machine.id,
            "machine_code": machine.machine_code,
            "name": machine.name,
            "location": machine.location,
        },
        "period": {
            "hours": hours,
            "from": telemetry_records[0].recorded_at,
            "to": telemetry_records[-1].recorded_at,
            "telemetry_records": len(
                telemetry_records
            ),
        },
        "energy": {
            "current_power_kw": round(
                float(latest.power_consumption),
                2,
            ),
            "average_power_kw": round(
                average_power,
                2,
            ),
            "peak_power_kw": round(
                peak_power,
                2,
            ),
            "minimum_power_kw": round(
                minimum_power,
                2,
            ),
            "estimated_energy_kwh": round(
                estimated_energy_kwh,
                3,
            ),
            "energy_status": energy_status,
        },
        "high_consumption": {
            "threshold_kw": high_consumption_threshold,
            "readings": len(
                high_consumption_readings
            ),
            "percentage": round(
                (
                    len(high_consumption_readings)
                    / len(telemetry_records)
                )
                * 100,
                2,
            ),
        },
        "latest_reading": {
            "power_consumption": round(
                float(latest.power_consumption),
                2,
            ),
            "recorded_at": latest.recorded_at,
        },
    }
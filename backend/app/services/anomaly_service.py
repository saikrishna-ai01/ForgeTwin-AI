from pathlib import Path
import sys

from sqlalchemy.orm import Session

from app.models.telemetry import Telemetry

PROJECT_ROOT = Path(__file__).resolve().parents[3]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.anomaly_detector import MachineAnomalyDetector


MINIMUM_TRAINING_RECORDS = 10
DEFAULT_HISTORY_LIMIT = 100


def analyze_machine_anomaly(
    db: Session,
    machine_id: int,
    history_limit: int = DEFAULT_HISTORY_LIMIT,
    latest_telemetry: Telemetry | None = None,
):
    telemetry_records = (
        db.query(Telemetry)
        .filter(
            Telemetry.machine_id == machine_id
        )
        .order_by(
            Telemetry.recorded_at.desc()
        )
        .limit(history_limit)
        .all()
    )

    if len(telemetry_records) < MINIMUM_TRAINING_RECORDS:
        raise ValueError(
            f"At least {MINIMUM_TRAINING_RECORDS} telemetry "
            "records are required for anomaly analysis."
        )

    # -----------------------------------------------------
    # TRAINING DATA
    # -----------------------------------------------------

    training_rows = [
        {
            "temperature": float(record.temperature),
            "vibration": float(record.vibration),
            "power_consumption": float(
                record.power_consumption
            ),
            "rpm": float(record.rpm),
        }
        for record in reversed(telemetry_records)
    ]

    detector = MachineAnomalyDetector()
    detector.fit(training_rows)

    # -----------------------------------------------------
    # AUTHORITATIVE TELEMETRY SNAPSHOT
    # -----------------------------------------------------

    if latest_telemetry is None:
        latest_telemetry = telemetry_records[0]

    # -----------------------------------------------------
    # PREDICT
    # -----------------------------------------------------

    result = detector.predict(
        temperature=float(
            latest_telemetry.temperature
        ),
        vibration=float(
            latest_telemetry.vibration
        ),
        power_consumption=float(
            latest_telemetry.power_consumption
        ),
        rpm=float(
            latest_telemetry.rpm
        ),
    )

    return {
        "machine_id": int(machine_id),
        "telemetry_id": int(
            latest_telemetry.id
        ),
        "recorded_at": (
            latest_telemetry.recorded_at
        ),
        "temperature": float(
            latest_telemetry.temperature
        ),
        "vibration": float(
            latest_telemetry.vibration
        ),
        "power_consumption": float(
            latest_telemetry.power_consumption
        ),
        "rpm": float(
            latest_telemetry.rpm
        ),
        "is_anomaly": bool(
            result.is_anomaly
        ),
        "anomaly_score": float(
            result.anomaly_score
        ),
        "risk_level": str(
            result.risk_level
        ),
        "training_records": int(
            len(training_rows)
        ),
    }
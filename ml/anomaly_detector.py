from dataclasses import dataclass

import numpy as np
from sklearn.ensemble import IsolationForest


# =========================================================
# ANOMALY RESULT
# =========================================================

@dataclass
class AnomalyResult:
    is_anomaly: bool
    anomaly_score: float
    risk_level: str


# =========================================================
# FEATURE CONFIGURATION
# =========================================================

FEATURES = [
    "temperature",
    "vibration",
    "power_consumption",
    "rpm",
]


# =========================================================
# ANOMALY DETECTOR
# =========================================================

class MachineAnomalyDetector:
    """
    Manufacturing telemetry detector combining:
    1. Isolation Forest statistical anomaly detection.
    2. Existing engineering operating limits.

    The 0-100 anomaly score is a diagnostic score, not a
    calibrated probability or a substitute for machine safety rules.
    """

    def __init__(
        self,
        contamination: float = 0.10,
        random_state: int = 42,
        critical_score_threshold: float = 70.0,
    ):
        if not 0.0 < contamination <= 0.5:
            raise ValueError(
                "contamination must be greater than 0 and at most 0.5."
            )

        if not 0.0 <= critical_score_threshold <= 100.0:
            raise ValueError(
                "critical_score_threshold must be between 0 and 100."
            )

        self.model = IsolationForest(
            n_estimators=200,
            contamination=contamination,
            random_state=random_state,
        )
        self.critical_score_threshold = critical_score_threshold
        self.is_fitted = False

    # =====================================================
    # TRAIN MODEL
    # =====================================================

    def fit(self, telemetry_rows: list[dict]) -> None:
        if len(telemetry_rows) < 10:
            raise ValueError(
                "At least 10 telemetry records are required "
                "to train the anomaly detector."
            )

        X = np.array(
            [
                [
                    float(row["temperature"]),
                    float(row["vibration"]),
                    float(row["power_consumption"]),
                    float(row["rpm"]),
                ]
                for row in telemetry_rows
            ],
            dtype=float,
        )

        if not np.isfinite(X).all():
            raise ValueError(
                "Telemetry features must contain only finite numeric values."
            )

        self.model.fit(X)
        self.is_fitted = True

    # =====================================================
    # PREDICT ANOMALY
    # =====================================================

    def predict(
        self,
        temperature: float,
        vibration: float,
        power_consumption: float,
        rpm: float,
    ) -> AnomalyResult:
        if not self.is_fitted:
            raise RuntimeError(
                "Anomaly detector has not been fitted."
            )

        values = {
            "temperature": float(temperature),
            "vibration": float(vibration),
            "power_consumption": float(power_consumption),
            "rpm": float(rpm),
        }

        X = np.array(
            [[values[name] for name in FEATURES]],
            dtype=float,
        )

        if not np.isfinite(X).all():
            raise ValueError(
                "Telemetry features must contain only finite numeric values."
            )

        # Isolation Forest classification:
        # -1 = statistical anomaly, 1 = normal.
        prediction = int(self.model.predict(X)[0])
        model_anomaly = prediction == -1

        # Custom diagnostic score; not a probability.
        raw_score = float(self.model.decision_function(X)[0])
        anomaly_score = float(
            np.clip((0.5 - raw_score) * 100.0, 0.0, 100.0)
        )

        # Engineering limits consistent with machine_health.py.
        critical_violation = (
            values["temperature"] > 90
            or values["vibration"] > 7
            or values["power_consumption"] > 20
        )

        warning_violation = (
            values["temperature"] > 80
            or values["vibration"] > 5
            or values["power_consumption"] > 17
            or values["rpm"] < 1500
            or values["rpm"] > 2000
        )

        is_anomaly = (
            model_anomaly
            or critical_violation
            or warning_violation
        )

        # Engineering critical limits take precedence over
        # statistical scoring.
        if critical_violation:
            risk_level = "critical"
        elif model_anomaly or warning_violation:
            risk_level = "warning"
        else:
            risk_level = "normal"

        return AnomalyResult(
            is_anomaly=is_anomaly,
            anomaly_score=round(anomaly_score, 2),
            risk_level=risk_level,
        )

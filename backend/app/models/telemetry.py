from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Telemetry(Base):
    __tablename__ = "telemetry"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    machine_id: Mapped[int] = mapped_column(
        ForeignKey("machines.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    temperature: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    vibration: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    power_consumption: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    rpm: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )
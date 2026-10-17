from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Machine(Base):
    __tablename__ = "machines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    machine_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    machine_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    location: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="offline",
        nullable=False,
    )

    temperature: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    vibration: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    power_consumption: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    rpm: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    health_score: Mapped[float] = mapped_column(
        Float,
        default=100.0,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
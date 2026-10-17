from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.incident import Incident


router = APIRouter(
    prefix="/incidents",
    tags=["Incidents"],
)


@router.get("/")
def get_incidents(
    db: Session = Depends(get_db),
):
    incidents = (
        db.query(Incident)
        .order_by(Incident.created_at.desc())
        .all()
    )

    return incidents


@router.get("/active")
def get_active_incidents(
    db: Session = Depends(get_db),
):
    incidents = (
        db.query(Incident)
        .filter(Incident.status == "open")
        .order_by(Incident.created_at.desc())
        .all()
    )

    return incidents


@router.get("/{incident_id}")
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
):
    incident = (
        db.query(Incident)
        .filter(Incident.id == incident_id)
        .first()
    )

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    return incident
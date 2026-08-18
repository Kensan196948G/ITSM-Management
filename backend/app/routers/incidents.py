from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.incident import (
    IncidentCommentCreate,
    IncidentCommentResponse,
    IncidentCreate,
    IncidentListResponse,
    IncidentResponse,
    IncidentUpdate,
)
from app.services import incident_service
from app.utils.sla import calc_sla_status

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


def _to_response(incident, db) -> IncidentResponse:
    data = IncidentResponse.model_validate(incident)
    data.sla_status = calc_sla_status(incident.due_at, incident.resolved_at)
    return data


@router.get("", response_model=IncidentListResponse)
def list_incidents(
    skip: int = 0,
    limit: int = 50,
    status: str | None = None,
    priority: str | None = None,
    assignee_id: int | None = None,
    site: str | None = None,
    system_name: str | None = None,
    keyword: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = incident_service.get_incidents(
        db, skip, limit, status, priority, assignee_id, site, system_name, keyword
    )
    return IncidentListResponse(
        items=[_to_response(i, db) for i in items],
        total=total,
        page=skip // limit + 1 if limit else 1,
        size=limit,
    )


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    incident = incident_service.get_incident(db, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return _to_response(incident, db)


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(
    data: IncidentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("operator")),
):
    incident = incident_service.create_incident(db, data, user_id=current_user.id, ip=request.client.host if request.client else None)
    return _to_response(incident, db)


@router.put("/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: int,
    data: IncidentUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("operator")),
):
    incident = incident_service.update_incident(db, incident_id, data, user_id=current_user.id, ip=request.client.host if request.client else None)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return _to_response(incident, db)


@router.delete("/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_incident(
    incident_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("operator")),
):
    if not incident_service.delete_incident(db, incident_id, user_id=current_user.id, ip=request.client.host if request.client else None):
        raise HTTPException(status_code=404, detail="Incident not found")


@router.post("/{incident_id}/comments", response_model=IncidentCommentResponse, status_code=status.HTTP_201_CREATED)
def add_comment(
    incident_id: int,
    data: IncidentCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = incident_service.add_comment(db, incident_id, data.comment, user_id=current_user.id)
    if not comment:
        raise HTTPException(status_code=404, detail="Incident not found")
    return comment


@router.get("/{incident_id}/comments", response_model=list[IncidentCommentResponse])
def get_comments(incident_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return incident_service.get_comments(db, incident_id)

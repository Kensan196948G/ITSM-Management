import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.incident import Incident, IncidentComment
from app.schemas.incident import IncidentCreate, IncidentUpdate
from app.utils.sla import calc_sla_status
from app.utils.ticket_no import generate_ticket_no


def get_incidents(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    status: str | None = None,
    priority: str | None = None,
    assignee_id: int | None = None,
    site: str | None = None,
    system_name: str | None = None,
    keyword: str | None = None,
) -> tuple[list[Incident], int]:
    q = db.query(Incident)
    if status:
        q = q.filter(Incident.status == status)
    if priority:
        q = q.filter(Incident.priority == priority)
    if assignee_id:
        q = q.filter(Incident.assignee_id == assignee_id)
    if site:
        q = q.filter(Incident.site == site)
    if system_name:
        q = q.filter(Incident.system_name == system_name)
    if keyword:
        q = q.filter(Incident.title.contains(keyword) | Incident.description.contains(keyword))
    total = q.count()
    items = q.order_by(Incident.created_at.desc()).offset(skip).limit(limit).all()
    return items, total


def get_incident(db: Session, incident_id: int) -> Incident | None:
    return db.query(Incident).filter(Incident.id == incident_id).first()


def create_incident(db: Session, data: IncidentCreate, user_id: int | None = None, ip: str | None = None) -> Incident:
    ticket_no = generate_ticket_no(db, Incident, "INC")
    incident = Incident(**data.model_dump(), ticket_no=ticket_no)
    db.add(incident)
    db.flush()
    _audit(db, "incident", incident.id, "create", None, incident, user_id, ip)
    db.commit()
    db.refresh(incident)
    return incident


def update_incident(db: Session, incident_id: int, data: IncidentUpdate, user_id: int | None = None, ip: str | None = None) -> Incident | None:
    incident = get_incident(db, incident_id)
    if not incident:
        return None
    before = _snapshot(incident)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(incident, field, value)
    incident.updated_at = datetime.now(timezone.utc)
    _audit(db, "incident", incident.id, "update", before, incident, user_id, ip)
    db.commit()
    db.refresh(incident)
    return incident


def delete_incident(db: Session, incident_id: int, user_id: int | None = None, ip: str | None = None) -> bool:
    incident = get_incident(db, incident_id)
    if not incident:
        return False
    _audit(db, "incident", incident.id, "delete", _snapshot(incident), None, user_id, ip)
    db.delete(incident)
    db.commit()
    return True


def add_comment(db: Session, incident_id: int, comment: str, user_id: int | None = None) -> IncidentComment | None:
    if not get_incident(db, incident_id):
        return None
    obj = IncidentComment(incident_id=incident_id, comment=comment, user_id=user_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_comments(db: Session, incident_id: int) -> list[IncidentComment]:
    return db.query(IncidentComment).filter(IncidentComment.incident_id == incident_id).order_by(IncidentComment.created_at).all()


def enrich_sla(incidents: list[Incident]) -> list[dict]:
    result = []
    for inc in incidents:
        d = {c.name: getattr(inc, c.name) for c in inc.__table__.columns}
        d["sla_status"] = calc_sla_status(inc.due_at, inc.resolved_at)
        result.append(d)
    return result


def _snapshot(incident: Incident) -> str:
    return json.dumps({c.name: str(getattr(incident, c.name)) for c in incident.__table__.columns})


def _audit(db: Session, entity_type: str, entity_id: int, action: str, before: str | None, after: object | None, user_id: int | None, ip: str | None) -> None:
    after_json = _snapshot(after) if after else None
    log = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        before_json=before,
        after_json=after_json,
        user_id=user_id,
        ip_address=ip,
    )
    db.add(log)

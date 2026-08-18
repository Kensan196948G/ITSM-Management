from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.user import UserResponse


class IncidentCommentBase(BaseModel):
    comment: str


class IncidentCommentCreate(IncidentCommentBase):
    pass


class IncidentCommentResponse(IncidentCommentBase):
    id: int
    incident_id: int
    user_id: int | None
    created_at: datetime
    author: UserResponse | None = None

    model_config = {"from_attributes": True}


IncidentPriority = Literal["low", "medium", "high", "critical"]
IncidentStatus = Literal["open", "in_progress", "resolved", "closed"]


class IncidentBase(BaseModel):
    title: str
    description: str | None = None
    priority: IncidentPriority = "medium"
    status: IncidentStatus = "open"
    category: str | None = None
    assignee_id: int | None = None
    reporter_id: int | None = None
    location: str | None = None
    site: str | None = None
    system_name: str | None = None
    impact: str | None = None
    urgency: str | None = None
    due_at: datetime | None = None


class IncidentCreate(IncidentBase):
    pass


class IncidentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: IncidentPriority | None = None
    status: IncidentStatus | None = None
    category: str | None = None
    assignee_id: int | None = None
    location: str | None = None
    site: str | None = None
    system_name: str | None = None
    impact: str | None = None
    urgency: str | None = None
    due_at: datetime | None = None
    resolved_at: datetime | None = None


class IncidentResponse(IncidentBase):
    id: int
    ticket_no: str
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime
    assignee: UserResponse | None = None
    reporter: UserResponse | None = None
    sla_status: str = "safe"  # safe/risk/urgent — computed, not stored

    model_config = {"from_attributes": True}


class IncidentListResponse(BaseModel):
    items: list[IncidentResponse]
    total: int
    page: int
    size: int

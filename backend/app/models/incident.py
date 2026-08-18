from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    ticket_no: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="medium")  # critical/high/medium/low
    status: Mapped[str] = mapped_column(String(20), default="open")  # open/in_progress/on_hold/resolved/closed
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reporter_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    location: Mapped[str | None] = mapped_column(String(100), nullable=True)
    site: Mapped[str | None] = mapped_column(String(100), nullable=True)
    system_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    impact: Mapped[str | None] = mapped_column(String(20), nullable=True)   # high/medium/low
    urgency: Mapped[str | None] = mapped_column(String(20), nullable=True)  # high/medium/low
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    assignee: Mapped["User | None"] = relationship("User", foreign_keys=[assignee_id])
    reporter: Mapped["User | None"] = relationship("User", foreign_keys=[reporter_id])
    comments: Mapped[list["IncidentComment"]] = relationship("IncidentComment", back_populates="incident", cascade="all, delete-orphan")


class IncidentComment(Base):
    __tablename__ = "incident_comments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    comment: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    incident: Mapped["Incident"] = relationship("Incident", back_populates="comments")
    author: Mapped["User | None"] = relationship("User", foreign_keys=[user_id])

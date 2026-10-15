"""ORM tables for the Smart Course Scheduler."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from sqlalchemy import JSON, DateTime, Integer, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class SubjectRow(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    theory_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    lab_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    batch: Mapped[str] = mapped_column(String(50), nullable=False)

    def as_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "theory_hours": self.theory_hours,
            "lab_hours": self.lab_hours,
            "batch": self.batch,
        }


class RoomRow(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    room_type: Mapped[str] = mapped_column(String(2), nullable=False)  # 'CR' | 'CL'
    floor: Mapped[int] = mapped_column(Integer, nullable=False)


class DayRow(Base):
    __tablename__ = "days"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)


class TimeSlotRow(Base):
    __tablename__ = "time_slots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    label: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)


class TimetableRow(Base):
    """One saved scheduler run (the full response JSON)."""
    __tablename__ = "timetables"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    result: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)

"""Read/write helpers so api.py never touches ORM details directly."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from db.models import DayRow, RoomRow, SubjectRow, TimeSlotRow, TimetableRow


# ── Subjects ─────────────────────────────────────────────────────────────────

def list_subjects(s: Session) -> List[Dict[str, Any]]:
    return [r.as_dict() for r in s.scalars(select(SubjectRow).order_by(SubjectRow.id))]


def find_subject(s: Session, name: str) -> Optional[SubjectRow]:
    return s.scalar(select(SubjectRow).where(func.lower(SubjectRow.name) == name.lower()))


# ── Rooms ────────────────────────────────────────────────────────────────────

def list_rooms(s: Session) -> List[Dict[str, Any]]:
    rows = s.scalars(select(RoomRow).order_by(RoomRow.room_type, RoomRow.floor, RoomRow.name))
    return [{"name": r.name, "type": r.room_type, "floor": r.floor} for r in rows]


def find_room(s: Session, name: str) -> Optional[RoomRow]:
    return s.scalar(select(RoomRow).where(RoomRow.name == name))


# ── Days / time slots ────────────────────────────────────────────────────────

def list_days(s: Session) -> List[str]:
    return list(s.scalars(select(DayRow.name).order_by(DayRow.position)))


def find_day(s: Session, name: str) -> Optional[DayRow]:
    return s.scalar(select(DayRow).where(func.lower(DayRow.name) == name.lower()))


def next_day_position(s: Session) -> int:
    last = s.scalar(select(DayRow.position).order_by(DayRow.position.desc()).limit(1))
    return 0 if last is None else last + 1


def shift_days_from(s: Session, position: int) -> None:
    """Make room at `position` by pushing that day and everything after it down."""
    for row in s.scalars(select(DayRow).where(DayRow.position >= position)):
        row.position += 1
    s.flush()


def list_slots(s: Session) -> List[str]:
    return list(s.scalars(select(TimeSlotRow.label).order_by(TimeSlotRow.position)))


def find_slot(s: Session, label: str) -> Optional[TimeSlotRow]:
    return s.scalar(select(TimeSlotRow).where(func.lower(TimeSlotRow.label) == label.lower()))


def next_slot_position(s: Session) -> int:
    last = s.scalar(select(TimeSlotRow.position).order_by(TimeSlotRow.position.desc()).limit(1))
    return 0 if last is None else last + 1


def shift_slots_from(s: Session, position: int) -> None:
    """Make room at `position` by pushing that slot and everything after it down."""
    for row in s.scalars(select(TimeSlotRow).where(TimeSlotRow.position >= position)):
        row.position += 1
    s.flush()


# ── Saved timetables ─────────────────────────────────────────────────────────

def save_timetable(s: Session, result: Dict[str, Any]) -> int:
    row = TimetableRow(status=result["status"], result=result)
    s.add(row)
    s.flush()
    return row.id


def latest_timetable(s: Session) -> Optional[Dict[str, Any]]:
    """Latest *successful* run, so a later failed attempt does not hide a good one."""
    row = s.scalar(
        select(TimetableRow).where(TimetableRow.status == "success")
        .order_by(TimetableRow.id.desc()).limit(1)
    )
    return row.result if row else None


def list_timetables(s: Session, limit: int = 20) -> List[Dict[str, Any]]:
    rows = s.scalars(select(TimetableRow).order_by(TimetableRow.id.desc()).limit(limit))
    return [
        {"id": r.id, "created_at": r.created_at.isoformat(), "status": r.status,
         "stats": r.result.get("stats", {})}
        for r in rows
    ]


def get_timetable(s: Session, timetable_id: int) -> Optional[Dict[str, Any]]:
    row = s.get(TimetableRow, timetable_id)
    return row.result if row else None

"""Seed the database from the original hardcoded data (only into empty tables)."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from data.rooms import ROOMS, get_floor
from data.sample_data import SUBJECTS
from data.timeslots import DAYS, SLOT_TIMES
from db.models import DayRow, RoomRow, SubjectRow, TimeSlotRow


def _is_empty(session: Session, model) -> bool:
    return session.scalar(select(func.count()).select_from(model)) == 0


def seed_defaults(session: Session) -> None:
    if _is_empty(session, SubjectRow):
        session.add_all(SubjectRow(**s) for s in SUBJECTS)
    if _is_empty(session, RoomRow):
        for room_type, names in ROOMS.items():
            session.add_all(
                RoomRow(name=n, room_type=room_type, floor=get_floor(n)) for n in names
            )
    if _is_empty(session, DayRow):
        session.add_all(DayRow(name=d, position=i) for i, d in enumerate(DAYS))
    if _is_empty(session, TimeSlotRow):
        session.add_all(TimeSlotRow(label=t, position=i) for i, t in enumerate(SLOT_TIMES))

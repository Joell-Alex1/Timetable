"""
FastAPI REST API for the Smart Course Scheduler.

All data (subjects, rooms, days, time slots, generated timetables) is stored
in MySQL — see db/. Defaults are seeded from data/ on first start.

Endpoints:

  POST   /schedule              Run the CSP solver on the DB data; saves + returns the timetable.
  GET    /timetable             Most recent successful timetable.
  GET    /timetables            History of saved runs (newest first).
  GET    /timetables/{id}       One saved run.
  GET    /rooms/summary         Floor-wise room allocation from the last schedule.
  GET    /rooms/unused          Rooms not used in the last schedule.
  GET    /rooms                 All rooms.
  POST   /rooms                 Add a room (e.g. CR901 / CL902).
  DELETE /rooms/{name}          Remove a room.
  GET    /timings               Days and time slots.
  POST   /timings/days          Add a day.
  DELETE /timings/days/{name}   Remove a day.
  POST   /timings/slots         Add a time slot (appended after the last one).
  DELETE /timings/slots/{label} Remove a time slot.
  GET    /subjects              List subjects.
  POST   /subjects              Add a subject.
  DELETE /subjects/{name}       Remove a subject.
"""

from __future__ import annotations

import re
from contextlib import asynccontextmanager
from typing import Any, Dict, Iterator

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from data.rooms import get_floor
from db import get_session, init_db
from db import repository as repo
from db.models import DayRow, RoomRow, SubjectRow, TimeSlotRow
from scheduler.timetable import Resources, create_schedule

# ── App setup ─────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()  # create DB/tables and seed defaults on first run
    yield


app = FastAPI(
    title="Smart Course Scheduler",
    description=(
        "AI-Based Smart Course Scheduler using CSP + Backtracking with heuristics. "
        "Lab project for AI Course 702CO0C032 · NMIMS MPSTME · Module 4: CSP."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def db_session() -> Iterator[Session]:
    with get_session() as session:
        yield session


_ROOM_RE = re.compile(r"^C[RL]\d{3}$")  # CR401 / CL805 — floor digit at index 2


# ── Request models ────────────────────────────────────────────────────────────

class SubjectIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=150, description="Subject display name")
    theory_hours: int = Field(..., ge=0, description="Weekly theory hours (each = 1 session)")
    lab_hours: int = Field(..., ge=0, description="Weekly lab hours (must be even; each session = 2 hrs)")
    batch: str = Field(..., min_length=1, max_length=50, description="Batch/stream identifier, e.g. 'CE'")

    def model_post_init(self, __context: Any) -> None:
        if self.lab_hours % 2 != 0:
            raise ValueError("lab_hours must be even (each lab session is 2 consecutive hours)")


class RoomIn(BaseModel):
    name: str = Field(..., description="Room code: CR### (theory) or CL### (lab), e.g. CR901")


class DayIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=20)


class SlotIn(BaseModel):
    label: str = Field(..., min_length=1, max_length=20, description="Slot label, e.g. '17:00'")


def _commit_or_409(session: Session, message: str) -> None:
    try:
        session.flush()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=409, detail=message)


def _load_resources(session: Session) -> Resources:
    rooms = repo.list_rooms(session)
    return Resources(
        cr_rooms=[r["name"] for r in rooms if r["type"] == "CR"],
        cl_rooms=[r["name"] for r in rooms if r["type"] == "CL"],
        days=repo.list_days(session),
        slot_times=repo.list_slots(session),
    )


# ── Scheduling ────────────────────────────────────────────────────────────────

@app.post("/schedule", summary="Run the CSP scheduler")
def run_schedule(session: Session = Depends(db_session)) -> Dict[str, Any]:
    subjects = repo.list_subjects(session)
    res = _load_resources(session)

    problems = []
    if not subjects:
        problems.append("no subjects")
    if not res.days:
        problems.append("no days")
    if not res.slot_times:
        problems.append("no time slots")
    if not res.cr_rooms and any(s["theory_hours"] for s in subjects):
        problems.append("no theory rooms (CR)")
    if not res.cl_rooms and any(s["lab_hours"] for s in subjects):
        problems.append("no lab rooms (CL)")
    if problems:
        raise HTTPException(status_code=422, detail="Cannot schedule: " + ", ".join(problems) + ".")

    result = create_schedule(subjects=subjects, res=res)
    repo.save_timetable(session, result)

    if result["status"] == "failure":
        return JSONResponse(status_code=422, content=result)
    return result


@app.get("/timetable", summary="Return the last successful timetable")
def get_timetable(session: Session = Depends(db_session)) -> Dict[str, Any]:
    result = repo.latest_timetable(session)
    if result is None:
        raise HTTPException(status_code=404, detail="No timetable available. POST /schedule first.")
    return result


@app.get("/timetables", summary="History of saved schedule runs")
def list_timetables(limit: int = 20, session: Session = Depends(db_session)) -> Dict[str, Any]:
    return {"timetables": repo.list_timetables(session, limit=max(1, min(limit, 100)))}


@app.get("/timetables/{timetable_id}", summary="One saved schedule run")
def get_saved_timetable(timetable_id: int, session: Session = Depends(db_session)) -> Dict[str, Any]:
    result = repo.get_timetable(session, timetable_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Timetable {timetable_id} not found.")
    return result


# ── Rooms ─────────────────────────────────────────────────────────────────────

@app.get("/rooms/summary", summary="Floor-wise room allocation summary")
def rooms_summary(session: Session = Depends(db_session)) -> Dict[str, Any]:
    result = repo.latest_timetable(session)
    if result is None:
        raise HTTPException(status_code=404, detail="No timetable available. POST /schedule first.")
    return {"room_summary": result["room_summary"]}


@app.get("/rooms/unused", summary="List unused rooms")
def unused_rooms(session: Session = Depends(db_session)) -> Dict[str, Any]:
    result = repo.latest_timetable(session)
    if result is None:
        return {"unused_rooms": [r["name"] for r in repo.list_rooms(session)]}
    return {"unused_rooms": result["unused_rooms"]}


@app.get("/rooms", summary="List all rooms")
def get_rooms(session: Session = Depends(db_session)) -> Dict[str, Any]:
    return {"rooms": repo.list_rooms(session)}


@app.post("/rooms", summary="Add a room", status_code=201)
def add_room(body: RoomIn, session: Session = Depends(db_session)) -> Dict[str, Any]:
    name = body.name.strip().upper()
    if not _ROOM_RE.match(name):
        raise HTTPException(
            status_code=422,
            detail="Room code must look like CR401 (theory) or CL805 (lab): CR/CL + 3 digits, first digit = floor.",
        )
    session.add(RoomRow(name=name, room_type=name[:2], floor=get_floor(name)))
    _commit_or_409(session, f"Room '{name}' already exists.")
    return {"rooms": repo.list_rooms(session)}


@app.delete("/rooms/{name}", summary="Remove a room")
def delete_room(name: str, session: Session = Depends(db_session)) -> Dict[str, Any]:
    row = repo.find_room(session, name.strip().upper())
    if row is None:
        raise HTTPException(status_code=404, detail=f"Room '{name}' not found.")
    session.delete(row)
    session.flush()
    return {"deleted": row.name, "rooms": repo.list_rooms(session)}


# ── Timings (days + slots) ────────────────────────────────────────────────────

def _timings(session: Session) -> Dict[str, Any]:
    return {"days": repo.list_days(session), "slots": repo.list_slots(session)}


@app.get("/timings", summary="List days and time slots")
def get_timings(session: Session = Depends(db_session)) -> Dict[str, Any]:
    return _timings(session)


@app.post("/timings/days", summary="Add a day", status_code=201)
def add_day(body: DayIn, session: Session = Depends(db_session)) -> Dict[str, Any]:
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Day name is required.")
    if repo.find_day(session, name):
        raise HTTPException(status_code=409, detail=f"Day '{name}' already exists.")
    session.add(DayRow(name=name, position=repo.next_day_position(session)))
    _commit_or_409(session, f"Day '{name}' already exists.")
    return _timings(session)


@app.delete("/timings/days/{name}", summary="Remove a day")
def delete_day(name: str, session: Session = Depends(db_session)) -> Dict[str, Any]:
    row = repo.find_day(session, name)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Day '{name}' not found.")
    session.delete(row)
    session.flush()
    return {"deleted": row.name, **_timings(session)}


@app.post("/timings/slots", summary="Add a time slot", status_code=201)
def add_slot(body: SlotIn, session: Session = Depends(db_session)) -> Dict[str, Any]:
    label = body.label.strip()
    if not label:
        raise HTTPException(status_code=422, detail="Slot label is required.")
    if repo.find_slot(session, label):
        raise HTTPException(status_code=409, detail=f"Slot '{label}' already exists.")
    session.add(TimeSlotRow(label=label, position=repo.next_slot_position(session)))
    _commit_or_409(session, f"Slot '{label}' already exists.")
    return _timings(session)


@app.delete("/timings/slots/{label}", summary="Remove a time slot")
def delete_slot(label: str, session: Session = Depends(db_session)) -> Dict[str, Any]:
    row = repo.find_slot(session, label)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Slot '{label}' not found.")
    session.delete(row)
    session.flush()
    return {"deleted": row.label, **_timings(session)}


# ── Subjects ──────────────────────────────────────────────────────────────────

@app.get("/subjects", summary="List subjects and their hour requirements")
def get_subjects(session: Session = Depends(db_session)) -> Dict[str, Any]:
    return {"subjects": repo.list_subjects(session)}


@app.post("/subjects", summary="Add a new subject", status_code=201)
def add_subject(body: SubjectIn, session: Session = Depends(db_session)) -> Dict[str, Any]:
    name = body.name.strip()
    if repo.find_subject(session, name):
        raise HTTPException(status_code=409, detail=f"Subject '{name}' already exists.")
    entry = {"name": name, "theory_hours": body.theory_hours,
             "lab_hours": body.lab_hours, "batch": body.batch.strip()}
    session.add(SubjectRow(**entry))
    _commit_or_409(session, f"Subject '{name}' already exists.")
    return {"subject": entry, "subjects": repo.list_subjects(session)}


@app.delete("/subjects/{name}", summary="Remove a subject by name")
def delete_subject(name: str, session: Session = Depends(db_session)) -> Dict[str, Any]:
    row = repo.find_subject(session, name)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Subject '{name}' not found.")
    session.delete(row)
    session.flush()
    return {"deleted": row.name, "subjects": repo.list_subjects(session)}


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
def root() -> Dict[str, str]:
    return {"service": "Smart Course Scheduler API", "docs": "/docs", "redoc": "/redoc"}

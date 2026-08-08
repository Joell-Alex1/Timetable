"""
FastAPI REST API for the Smart Course Scheduler.

Endpoints:

  POST /schedule              Run the CSP solver; returns the full timetable JSON.
  GET  /timetable             Return the most recently generated timetable.
  GET  /rooms/summary         Floor-wise room allocation from the last schedule.
  GET  /rooms/unused          Rooms that were not used in the last schedule.
  GET  /subjects              List all subjects with their hour requirements.
  POST /subjects              Add a new subject.
  DELETE /subjects/{name}     Remove a subject by name.
"""

from __future__ import annotations

import copy
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Any, Dict, List

from scheduler.timetable import create_schedule
from data.sample_data import SUBJECTS as _DEFAULT_SUBJECTS
from data.rooms import ALL_ROOMS

# ── App setup ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Smart Course Scheduler",
    description=(
        "AI-Based Smart Course Scheduler using CSP + Backtracking with heuristics. "
        "Lab project for AI Course 702CO0C032 · NMIMS MPSTME · Module 4: CSP."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mutable in-memory subject list (seeded from sample data)
_subjects: List[Dict[str, Any]] = copy.deepcopy(_DEFAULT_SUBJECTS)

# In-memory cache for the last generated schedule
_last_result: Dict[str, Any] | None = None


# ── Request / Response models ─────────────────────────────────────────────────

class SubjectIn(BaseModel):
    name: str = Field(..., min_length=1, description="Subject display name")
    theory_hours: int = Field(..., ge=0, description="Weekly theory hours (each = 1 session)")
    lab_hours: int = Field(..., ge=0, description="Weekly lab hours (must be even; each session = 2 hrs)")
    batch: str = Field(..., min_length=1, description="Batch/stream identifier, e.g. 'CE', 'IT', 'Civil'")

    def model_post_init(self, __context: Any) -> None:
        if self.lab_hours % 2 != 0:
            raise ValueError("lab_hours must be even (each lab session is 2 consecutive hours)")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.post("/schedule", summary="Run the CSP scheduler")
def run_schedule() -> Dict[str, Any]:
    global _last_result
    result = create_schedule(subjects=_subjects)
    _last_result = result

    if result["status"] == "failure":
        return JSONResponse(status_code=422, content=result)

    return result


@app.get("/timetable", summary="Return the last generated timetable")
def get_timetable() -> Dict[str, Any]:
    if _last_result is None:
        raise HTTPException(status_code=404, detail="No timetable available. POST /schedule first.")
    return _last_result


@app.get("/rooms/summary", summary="Floor-wise room allocation summary")
def rooms_summary() -> Dict[str, Any]:
    if _last_result is None:
        raise HTTPException(status_code=404, detail="No timetable available. POST /schedule first.")
    return {"room_summary": _last_result["room_summary"]}


@app.get("/rooms/unused", summary="List unused rooms")
def unused_rooms() -> Dict[str, Any]:
    if _last_result is None:
        return {"unused_rooms": ALL_ROOMS}
    return {"unused_rooms": _last_result["unused_rooms"]}


@app.get("/subjects", summary="List subjects and their hour requirements")
def get_subjects() -> Dict[str, Any]:
    return {"subjects": _subjects}


@app.post("/subjects", summary="Add a new subject", status_code=201)
def add_subject(body: SubjectIn) -> Dict[str, Any]:
    if any(s["name"].lower() == body.name.lower() for s in _subjects):
        raise HTTPException(status_code=409, detail=f"Subject '{body.name}' already exists.")
    entry = {"name": body.name, "theory_hours": body.theory_hours, "lab_hours": body.lab_hours, "batch": body.batch}
    _subjects.append(entry)
    return {"subject": entry, "subjects": _subjects}


@app.delete("/subjects/{name}", summary="Remove a subject by name")
def delete_subject(name: str) -> Dict[str, Any]:
    global _subjects
    match = next((s for s in _subjects if s["name"].lower() == name.lower()), None)
    if match is None:
        raise HTTPException(status_code=404, detail=f"Subject '{name}' not found.")
    _subjects = [s for s in _subjects if s["name"].lower() != name.lower()]
    return {"deleted": match["name"], "subjects": _subjects}


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
def root() -> Dict[str, str]:
    return {"service": "Smart Course Scheduler API", "docs": "/docs", "redoc": "/redoc"}

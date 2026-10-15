"""
Timetable builder for the Smart Course Scheduler.

Orchestrates the full scheduling pipeline:
  1. build_sessions()       — Convert subject definitions into Session variables.
                              Lab sessions are placed first (harder to schedule).
  2. build_domains()        — Generate all valid (day, slot, room) values per session.
  3. setup_csp()            — Assemble the CSPModel and build the constraint graph.
  4. create_schedule()      — Run the CSP solver and return structured JSON output.
  5. format_timetable()     — Convert a completed assignment into the API response dict.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any

from csp.model import Session, Value, CSPModel
from csp.backtracking import solve
from data.rooms import CR_ROOMS, CL_ROOMS, get_floor
from data.timeslots import DAYS, SLOT_TIMES
from data.sample_data import SUBJECTS
from scheduler.constraints import build_constraint_graph


# ── 0. Scheduling resources ───────────────────────────────────────────────────

@dataclass
class Resources:
    """Rooms, days and time slots the solver may use (defaults = built-in data)."""
    cr_rooms:   List[str] = field(default_factory=lambda: list(CR_ROOMS))
    cl_rooms:   List[str] = field(default_factory=lambda: list(CL_ROOMS))
    days:       List[str] = field(default_factory=lambda: list(DAYS))
    slot_times: List[str] = field(default_factory=lambda: list(SLOT_TIMES))

    @property
    def all_rooms(self) -> List[str]:
        return self.cr_rooms + self.cl_rooms

    @property
    def num_slots(self) -> int:
        return len(self.slot_times)

    @property
    def floors(self) -> List[int]:
        return sorted({get_floor(r) for r in self.all_rooms})


# ── 1. Session builder ────────────────────────────────────────────────────────

def build_sessions(subjects: List[Dict] = None) -> List[Session]:
    """
    Convert subject definitions into a flat list of Session variables.

    Lab sessions are inserted before theory sessions so that the MRV
    heuristic assigns the more-constrained variables first.

    Each lab requires 2 consecutive slots (duration=2), so `lab_hours / 2`
    sessions are created per subject.  Each theory hour becomes one session
    (duration=1).

    Args:
        subjects : List of subject dicts from sample_data (or custom list).

    Returns:
        List of Session objects (labs first, then theory).
    """
    if subjects is None:
        subjects = SUBJECTS

    sessions: List[Session] = []

    # ── Lab sessions first (harder to place) ─────────────────────────────────
    for subject in subjects:
        lab_sessions = subject["lab_hours"] // 2  # each session = 2 consecutive hrs
        batch = subject.get("batch", "default")
        for i in range(lab_sessions):
            sessions.append(Session(
                id=f"{subject['name']}_lab_{i}",
                subject=subject["name"],
                session_type="Lab",
                duration=2,
                session_number=i,
                batch=batch,
            ))

    # ── Theory sessions second ────────────────────────────────────────────────
    for subject in subjects:
        batch = subject.get("batch", "default")
        for i in range(subject["theory_hours"]):
            sessions.append(Session(
                id=f"{subject['name']}_theory_{i}",
                subject=subject["name"],
                session_type="Theory",
                duration=1,
                session_number=i,
                batch=batch,
            ))

    return sessions


# ── 2. Domain builder ─────────────────────────────────────────────────────────

def build_domains(sessions: List[Session], res: Optional[Resources] = None) -> Dict[str, List[Value]]:
    """
    Generate all valid (day, start_slot, room) combinations for each session.

    Room type enforcement (hard constraint 3):
      - Theory sessions → CR rooms only
      - Lab    sessions → CL rooms only

    Consecutive-slot enforcement (hard constraint 4):
      - Lab sessions: start_slot ≤ num_slots − duration
        (ensures slot+1 is also valid within the day)

    Args:
        sessions : List of Session objects.

    Returns:
        Dict mapping session_id → List[Value].
    """
    res = res or Resources()
    domains: Dict[str, List[Value]] = {}

    for session in sessions:
        if session.session_type == "Theory":
            rooms = res.cr_rooms
            max_start = res.num_slots                          # every slot
        else:
            rooms = res.cl_rooms
            max_start = res.num_slots - session.duration + 1  # leave room for the 2nd hour

        # Rooms interleaved by room-number within floor: (num, floor) sort key.
        # e.g. CR401, CR501, CR601, CR701, CR801, CR402, CR502, ...
        # This ensures equal-score tiebreaking spreads across floors before
        # reusing rooms on the same floor, giving realistic 2–3 floor utilisation.
        rooms_interleaved = sorted(rooms, key=lambda r: (r[-1], r[2]))

        # Iterate slot → day → room so the domain naturally interleaves days.
        # With stable sorting, equal-soft-score values are tried in this order,
        # which means the solver explores different days at the same slot
        # before moving to the next slot — preventing Monday-first collapse.
        values: List[Value] = [
            Value(day=day, start_slot=slot, room=room)
            for slot in range(max_start)
            for day in res.days
            for room in rooms_interleaved
        ]
        domains[session.id] = values

    return domains


# ── 3. CSP assembler ──────────────────────────────────────────────────────────

def setup_csp(subjects: List[Dict] = None, res: Optional[Resources] = None) -> tuple:
    """
    Build the complete CSPModel ready for the solver.

    Steps:
      a. Create Session variables.
      b. Build domains for each variable.
      c. Instantiate CSPModel, register variables + domains.
      d. Build the constraint graph (populate neighbour lists).

    Returns:
        Tuple (csp, sessions_map) where sessions_map is {id: Session}.
    """
    sessions = build_sessions(subjects)
    domains  = build_domains(sessions, res)

    csp = CSPModel()
    for session in sessions:
        csp.add_variable(session, domains[session.id])

    build_constraint_graph(csp, sessions)

    sessions_map: Dict[str, Session] = {s.id: s for s in sessions}
    return csp, sessions_map


# ── 4. Schedule runner ────────────────────────────────────────────────────────

def create_schedule(subjects: List[Dict] = None, res: Optional[Resources] = None) -> Dict[str, Any]:
    """
    Run the full CSP scheduling pipeline and return the result dict.

    Args:
        subjects : Optional custom subject list; defaults to SUBJECTS.
        res      : Optional rooms/days/slots; defaults to the built-in data.

    Returns:
        A dict matching the required JSON output format with keys:
        status, message, timetable, room_summary, unused_rooms, stats.
    """
    if subjects is None:
        subjects = SUBJECTS
    res = res or Resources()

    csp, sessions_map = setup_csp(subjects, res)
    success = solve(csp, sessions_map)

    if success:
        return format_timetable(csp.assignment, sessions_map, res)

    # ── Failure response ──────────────────────────────────────────────────────
    return {
        "status": "failure",
        "message": (
            "No valid schedule could be found. "
            "The constraints may be too tight for the given subjects and rooms."
        ),
        "timetable": {},
        "room_summary": {
            f"floor_{f}": {"theory": [], "lab": []}
            for f in res.floors
        },
        "unused_rooms": res.all_rooms,
        "stats": {
            "total_sessions_scheduled": 0,
            "floors_used": [],
            "subjects_fully_scheduled": 0,
        },
    }


# ── 5. Result formatter ───────────────────────────────────────────────────────

def format_timetable(
    assignment: Dict[str, Value],
    sessions_map: Dict[str, Session],
    res: Optional[Resources] = None,
) -> Dict[str, Any]:
    """
    Convert a completed CSP assignment into the structured API response.

    For lab sessions (duration=2) an entry is added for *each* occupied slot
    so the frontend can render individual hour blocks correctly.

    Args:
        assignment   : Completed {session_id: Value} mapping from the solver.
        sessions_map : {session_id: Session} lookup map.

    Returns:
        Full response dict (status, timetable, room_summary, unused_rooms, stats).
    """
    # ── Build nested timetable structure ─────────────────────────────────────
    res = res or Resources()
    timetable: Dict[str, Dict[str, List[Dict]]] = {
        day: {slot: [] for slot in res.slot_times}
        for day in res.days
    }
    used_rooms: set = set()

    for session_id, value in assignment.items():
        session = sessions_map[session_id]
        floor   = get_floor(value.room)

        # Add an entry for every occupied slot (important for 2-hr labs)
        for offset in range(session.duration):
            slot_time = res.slot_times[value.start_slot + offset]
            timetable[value.day][slot_time].append({
                "subject":    session.subject,
                "room":       value.room,
                "floor":      floor,
                "type":       session.session_type,
                "slot_index": value.start_slot + offset,
                "batch":      session.batch,
            })

        used_rooms.add(value.room)

    # Drop empty time slots from output (cleaner JSON)
    clean_timetable = {
        day: {
            slot: entries
            for slot, entries in slots.items()
            if entries
        }
        for day, slots in timetable.items()
    }

    # ── Room summary by floor ─────────────────────────────────────────────────
    room_summary: Dict[str, Dict[str, List[str]]] = {}
    for floor in res.floors:
        floor_key = f"floor_{floor}"
        used_theory = [r for r in res.cr_rooms if get_floor(r) == floor and r in used_rooms]
        used_lab    = [r for r in res.cl_rooms if get_floor(r) == floor and r in used_rooms]
        room_summary[floor_key] = {"theory": used_theory, "lab": used_lab}

    # ── Unused rooms ──────────────────────────────────────────────────────────
    unused_rooms = [r for r in res.all_rooms if r not in used_rooms]

    # ── Stats ─────────────────────────────────────────────────────────────────
    floors_used = sorted({get_floor(r) for r in used_rooms})
    subjects_scheduled = {sessions_map[sid].subject for sid in assignment}

    return {
        "status":  "success",
        "message": (
            "Timetable generated successfully using CSP + Backtracking "
            "(MRV, Degree, LCV, Forward Checking)."
        ),
        "timetable":    clean_timetable,
        "room_summary": room_summary,
        "unused_rooms": unused_rooms,
        "stats": {
            "total_sessions_scheduled":  len(assignment),
            "floors_used":               floors_used,
            "subjects_fully_scheduled":  len(subjects_scheduled),
        },
    }

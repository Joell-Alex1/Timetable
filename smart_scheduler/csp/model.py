"""
CSP model for the Smart Course Scheduler.

Defines the three core components of a formal CSP:
  - Variables : Session objects (each a single schedulable unit)
  - Domains   : List[Value] per session — valid (day, slot, room) combos
  - Constraints: Adjacency list (constraint graph) between sessions

A Session is any one schedulable unit:
  - Theory session  → 1 hour,  must go in a CR room
  - Lab session     → 2 consecutive hours, must go in a CL room

A Value is a candidate assignment (day, start_slot, room).
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional


# ── Variable ─────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class Session:
    """
    A single schedulable session — the CSP variable.

    Attributes:
        id             : Unique identifier, e.g. 'Machine Learning_lab_0'
        subject        : Human-readable subject name
        session_type   : 'Theory' or 'Lab'
        duration       : Number of consecutive slots required (1 or 2)
        session_number : Which session this is for the subject (0-based)
    """
    id: str
    subject: str
    session_type: str   # "Theory" | "Lab"
    duration: int       # 1 for theory, 2 for lab
    session_number: int
    batch: str          # e.g. "CE", "IT", "Civil" — sessions of the same batch cannot overlap in time


# ── Domain Value ─────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class Value:
    """
    A candidate assignment for a Session — the CSP domain element.

    Attributes:
        day        : Day of the week (e.g., 'Monday')
        start_slot : 0-based index of the first slot (0 = 9:00, 7 = 16:00)
        room       : Room name (e.g., 'CR501', 'CL403')
    """
    day: str
    start_slot: int
    room: str


# ── CSP Model ─────────────────────────────────────────────────────────────────

class CSPModel:
    """
    Formal CSP representation.

    Holds variables, their current domains, a constraint adjacency graph,
    and the current (partial) assignment.  The backtracking solver modifies
    `assignment` and `domains` in-place; both are restored on backtrack.
    """

    def __init__(self) -> None:
        self.variables: List[Session] = []
        self.domains: Dict[str, List[Value]] = {}       # session_id → [Value, ...]
        self.neighbors: Dict[str, List[str]] = {}       # session_id → [neighbor_id, ...]
        self.assignment: Dict[str, Value] = {}          # session_id → assigned Value

    # ── Variable / Domain management ─────────────────────────────────────────

    def add_variable(self, session: Session, domain: List[Value]) -> None:
        """Register a new variable with its initial domain."""
        self.variables.append(session)
        self.domains[session.id] = list(domain)
        self.neighbors[session.id] = []

    def add_constraint(self, id1: str, id2: str) -> None:
        """
        Add a binary constraint edge between two variables.
        The edge is undirected — both neighbor lists are updated.
        """
        if id2 not in self.neighbors[id1]:
            self.neighbors[id1].append(id2)
        if id1 not in self.neighbors[id2]:
            self.neighbors[id2].append(id1)

    # ── Assignment helpers ───────────────────────────────────────────────────

    def assign(self, session_id: str, value: Value) -> None:
        """Record a variable assignment."""
        self.assignment[session_id] = value

    def unassign(self, session_id: str) -> None:
        """Remove a variable from the current assignment."""
        self.assignment.pop(session_id, None)

    def is_assigned(self, session_id: str) -> bool:
        return session_id in self.assignment

    def get_unassigned(self) -> List[Session]:
        """Return all sessions that have not yet been assigned."""
        return [s for s in self.variables if s.id not in self.assignment]

    def is_complete(self) -> bool:
        """True when every variable has been assigned."""
        return len(self.assignment) == len(self.variables)

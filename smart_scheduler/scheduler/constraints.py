"""
Constraint definitions for the Smart Course Scheduler.

Hard constraints (must never be violated — enforced during backtracking):
  1. No two sessions share the same room at the same (or overlapping) time.
  2. A room can only be used by one session per slot.
     (Implied by #1 — unified into the single `conflicts` function.)
  3. Theory sessions → CR rooms only;  Lab sessions → CL rooms only.
     (Enforced at domain-construction time, not here.)
  4. Lab sessions occupy exactly 2 consecutive slots.
     (Enforced at domain-construction time via start_slot ≤ 6.)
  5. Total required sessions per subject are exactly satisfied.
     (Enforced by session count in timetable.py.)
  6. Same subject cannot appear twice in the same time slot.

Soft constraints (influence value ordering via `soft_score`, not blocking):
  7. Avoid scheduling the same subject in back-to-back slots (spread out).
  8. Prefer sessions of the same subject to be on the same floor.
"""

from __future__ import annotations
from typing import TYPE_CHECKING, Dict

if TYPE_CHECKING:
    from csp.model import Session, Value


# ── Hard constraint: pairwise conflict check ─────────────────────────────────

def conflicts(
    s1: "Session",
    v1: "Value",
    s2: "Session",
    v2: "Value",
) -> bool:
    """
    Return True if assigning s1=v1 and s2=v2 simultaneously violates any
    hard constraint.

    Checks:
      - Room conflict : same day, same room, overlapping slots.
      - Subject clash : same subject, same day, overlapping slots
                        (a subject cannot appear in two places at once).

    Args:
        s1, s2 : Session objects (carry subject / type / duration metadata).
        v1, v2 : Candidate Value assignments (day, start_slot, room).

    Returns:
        True  → the two assignments conflict (at least one constraint broken).
        False → the assignments are mutually consistent.
    """
    # Only check if on the same day (different days never conflict)
    if v1.day != v2.day:
        return False

    # Compute occupied slot ranges
    slots1 = set(range(v1.start_slot, v1.start_slot + s1.duration))
    slots2 = set(range(v2.start_slot, v2.start_slot + s2.duration))
    overlap = bool(slots1 & slots2)

    if not overlap:
        return False  # No time overlap → no conflict possible

    # Hard constraint 1 & 2: Room conflict
    if v1.room == v2.room:
        return True

    # Hard constraint 6: Same batch cannot have two sessions at the same time.
    # Different batches (e.g. CE and Civil) CAN run concurrently in separate rooms.
    if s1.batch == s2.batch:
        return True

    return False


# ── Soft constraint: preference score ────────────────────────────────────────

def soft_score(
    session: "Session",
    value: "Value",
    assignment: Dict[str, "Value"],
    sessions_map: Dict[str, "Session"],
) -> float:
    """
    Compute a soft-constraint penalty for assigning *session* = *value*,
    given the current partial *assignment*.

    Lower score = better (fewer soft-constraint violations).

    Penalty weights (applied cumulatively, lower = better):

    Cross-subject (spread across the whole week):
      +1.5  per session already on the same day   (day-load penalty)
      +2.0  per (day, slot) already occupied by any session  (slot-crowding)

    Same-subject (spread a subject's own sessions):
      +3.0  if another session of this subject is already on the same day
      +2.0  additional if those slots are also back-to-back (constraint 7)
      +0.5  per same-subject session on a different floor (constraint 8)

    Args:
        session      : The session being evaluated.
        value        : The candidate assignment for that session.
        assignment   : Current partial assignment {session_id: Value}.
        sessions_map : Full {session_id: Session} lookup map.

    Returns:
        Float penalty score (0.0 = perfect; higher = worse).
    """
    from data.rooms import get_floor

    score = 0.0
    new_slots = set(range(value.start_slot, value.start_slot + session.duration))
    new_floor = get_floor(value.room)

    # Pre-build a (day, slot) → count map scoped to the SAME batch only.
    # Cross-batch sessions running concurrently must NOT be penalised —
    # that is the whole point of multi-stream scheduling.
    batch_slot_load: dict = {}
    for sid, aval in assignment.items():
        asess = sessions_map[sid]
        if asess.batch != session.batch:
            continue
        for s in range(aval.start_slot, aval.start_slot + asess.duration):
            key = (aval.day, s)
            batch_slot_load[key] = batch_slot_load.get(key, 0) + 1

    # ── Within-batch day-load penalty ────────────────────────────────────────
    # Penalise choosing a day that already has many sessions for the SAME batch.
    # Different batches running concurrently is fine — only intra-batch crowding matters.
    batch_day_load = sum(
        1 for sid, aval in assignment.items()
        if sessions_map[sid].batch == session.batch and aval.day == value.day
    )
    score += batch_day_load * 1.5

    # ── Within-batch slot-crowding penalty ───────────────────────────────────
    # Penalise stacking two sessions of the SAME batch in the same (day, slot).
    # Cross-batch concurrency in the same slot is actively desirable — no penalty.
    for slot in new_slots:
        crowding = batch_slot_load.get((value.day, slot), 0)
        score += crowding * 2.0

    # ── Room reuse penalty ────────────────────────────────────────────────────
    # Penalise reusing a room that already has sessions assigned to it.
    # Sessions on different days never hard-conflict in the same room, so
    # without this penalty the solver just reuses room 401 for everything.
    # Weight 2.5: strong enough to prefer unused rooms, weak enough that
    # day/slot spread still dominates when days are unequally loaded.
    room_usage = sum(1 for v in assignment.values() if v.room == value.room)
    score += room_usage * 2.5

    # ── Same-subject spread penalties ────────────────────────────────────────
    # A subject's own sessions should be spread across the week, not all on one day.
    for sid, assigned_val in assignment.items():
        assigned_session = sessions_map[sid]
        if assigned_session.subject != session.subject:
            continue

        # Soft constraint 7a: same subject on the same day → push to other days
        if assigned_val.day == value.day:
            score += 3.0

            # Soft constraint 7b: back-to-back is extra bad
            a_slots = set(
                range(assigned_val.start_slot,
                      assigned_val.start_slot + assigned_session.duration)
            )
            if (max(a_slots) + 1 == min(new_slots) or
                    max(new_slots) + 1 == min(a_slots)):
                score += 2.0

        # Soft constraint 8: different floor for same subject
        if get_floor(assigned_val.room) != new_floor:
            score += 0.5

    return score


# ── Constraint graph builder ─────────────────────────────────────────────────

def build_constraint_graph(csp: "object", sessions: list) -> None:  # type: ignore[type-arg]
    """
    Populate the CSP model's constraint adjacency lists.

    Two sessions share a binary constraint (are neighbours) when there
    exists *any* assignment that would cause them to conflict:
      - Same session_type (both Theory or both Lab) → can share a room.
      - Same subject                                → can clash in time.

    Args:
        csp      : CSPModel instance (mutated in place).
        sessions : List of all Session objects.
    """
    n = len(sessions)
    for i in range(n):
        for j in range(i + 1, n):
            s1, s2 = sessions[i], sessions[j]
            # Can these two ever conflict?
            if s1.session_type == s2.session_type or s1.batch == s2.batch:
                csp.add_constraint(s1.id, s2.id)

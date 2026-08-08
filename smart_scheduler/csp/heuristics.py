"""
CSP heuristics for the Smart Course Scheduler.

Implements three standard heuristics that guide the backtracking search:

  1. MRV  (Minimum Remaining Values) — Variable ordering
         Pick the unassigned variable whose current domain is smallest.
         Fail-first: detect dead ends as early as possible.

  2. Degree Heuristic — Tiebreaker for MRV
         Among variables with equally small domains, prefer the one
         involved in the most constraints with other *unassigned* variables.
         More constraints → more influence → assign it first.

  3. LCV  (Least Constraining Value) — Value ordering
         For the chosen variable, order its domain values so that the value
         that eliminates the fewest choices from neighbouring variables
         comes first.  Prefer values that leave neighbours with the most
         options (stay-alive strategy).

  Additionally, soft-constraint scores are used as a secondary key inside
  LCV so that the solver naturally tends toward preferred schedules.
"""

from __future__ import annotations
from typing import TYPE_CHECKING, Dict, List, Tuple

if TYPE_CHECKING:
    from csp.model import CSPModel, Session, Value


# ── LCV helper: count eliminated values ──────────────────────────────────────

def _count_eliminated(
    csp: "CSPModel",
    session: "Session",
    value: "Value",
    sessions_map: Dict[str, "Session"],
) -> int:
    """
    Count how many values in unassigned neighbours' domains would be
    pruned if we assign session=value.

    To keep this O(|values| × |neighbours| × N) rather than
    O(|values| × |neighbours| × |full domain|), we cap the per-neighbour
    sample at MAX_SAMPLE values.  LCV is a heuristic, not an exact
    computation, so sampling is valid.
    """
    from scheduler.constraints import conflicts

    MAX_SAMPLE = 60
    eliminated = 0

    for neighbor_id in csp.neighbors[session.id]:
        if csp.is_assigned(neighbor_id):
            continue
        neighbor_session = sessions_map[neighbor_id]
        domain = csp.domains[neighbor_id]
        sample = domain[:MAX_SAMPLE]
        for v in sample:
            if conflicts(session, value, neighbor_session, v):
                eliminated += 1

    return eliminated


# ── Variable selection: MRV + Degree ─────────────────────────────────────────

def select_unassigned_variable(
    csp: "CSPModel",
    sessions_map: Dict[str, "Session"],  # noqa: ARG001  (kept for API symmetry)
) -> "Session":
    """
    Select the next variable to assign using:
      Primary   — MRV  : smallest remaining domain size
      Secondary — Degree: most constraints on unassigned neighbours

    Returns the chosen Session object.
    """
    unassigned = csp.get_unassigned()
    unassigned_ids = {s.id for s in unassigned}

    def score(session: "Session") -> Tuple[int, int]:
        domain_size = len(csp.domains[session.id])
        # Negate degree so that higher degree = lower sort key (preferred)
        degree = sum(1 for nid in csp.neighbors[session.id] if nid in unassigned_ids)
        return (domain_size, -degree)

    return min(unassigned, key=score)


# ── Value ordering: LCV + soft constraint secondary sort ─────────────────────

def order_domain_values(
    csp: "CSPModel",
    session: "Session",
    sessions_map: Dict[str, "Session"],
) -> List["Value"]:
    """
    Order the domain values for *session* from least to most constraining.

    Sort key (ascending):
      1. LCV score     — number of values eliminated from neighbours
                         (only computed when domain is small enough to
                          make the sample meaningful; skipped otherwise)
      2. Soft score    — penalty for violating soft constraints
                         (back-to-back sessions, floor dispersion)

    Returns the sorted list of Values.
    """
    from scheduler.constraints import soft_score

    domain = csp.domains[session.id]

    # LCV (hard constraint elimination count) is only computed when the domain
    # is small enough for sampling to be meaningful.  The soft score is ALWAYS
    # computed — it is the primary spread driver and must never be skipped,
    # even on the first assignment when domains are still large.
    use_lcv = len(domain) <= 200

    def sort_key(value: "Value") -> Tuple[int, float]:
        lcv = _count_eliminated(csp, session, value, sessions_map) if use_lcv else 0
        s   = soft_score(session, value, csp.assignment, sessions_map)
        return (lcv, s)
    # Note: sorted() is stable, so equal-score values retain their domain
    # insertion order (slot → day → room), which naturally interleaves days.

    return sorted(domain, key=sort_key)

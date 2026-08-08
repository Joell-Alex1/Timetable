"""
Backtracking solver for the Smart Course Scheduler.

Algorithm: Backtracking Search with Forward Checking
  1. Choose the next variable using MRV + Degree heuristic.
  2. Order its domain values using LCV + soft-constraint score.
  3. For each candidate value:
       a. Assign the variable.
       b. Run Forward Checking — propagate constraints to unassigned
          neighbours and prune any values that become inconsistent.
       c. If no domain wipes out → recurse.
       d. On failure → restore pruned values and try the next candidate.
  4. If all values fail → return False (triggers backtracking to caller).

Forward Checking is an arc-consistency approximation that prunes dead
ends early and dramatically reduces the effective search space compared
to simple chronological backtracking.
"""

from __future__ import annotations
from typing import Dict, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from csp.model import CSPModel, Session, Value

from csp.heuristics import select_unassigned_variable, order_domain_values


# ── Forward Checking ─────────────────────────────────────────────────────────

def _forward_check(
    csp: "CSPModel",
    session: "Session",
    value: "Value",
    sessions_map: Dict[str, "Session"],
) -> Optional[Dict[str, List["Value"]]]:
    """
    After assigning *session* = *value*, prune every value in each
    unassigned neighbour's domain that conflicts with this assignment.

    Returns:
        A dict  {neighbor_id: [pruned_values, ...]}  on success,
        or None if any neighbour's domain becomes empty (dead end).

    If None is returned, all pruning performed during this call is
    *already restored* before returning, so the caller only needs to
    undo the assignment itself.
    """
    from scheduler.constraints import conflicts

    pruned: Dict[str, List["Value"]] = {}

    for neighbor_id in csp.neighbors[session.id]:
        if csp.is_assigned(neighbor_id):
            continue

        neighbor_session = sessions_map[neighbor_id]
        to_remove = [
            v for v in csp.domains[neighbor_id]
            if conflicts(session, value, neighbor_session, v)
        ]

        if to_remove:
            pruned[neighbor_id] = to_remove
            for v in to_remove:
                csp.domains[neighbor_id].remove(v)

            if not csp.domains[neighbor_id]:
                # Domain wipeout — restore everything we just pruned
                _restore_pruned(csp, pruned)
                return None

    return pruned


def _restore_pruned(
    csp: "CSPModel",
    pruned: Dict[str, List["Value"]],
) -> None:
    """Re-add all pruned values back to their respective domains."""
    for var_id, vals in pruned.items():
        csp.domains[var_id].extend(vals)


# ── Main Backtracking Solver ─────────────────────────────────────────────────

def solve(
    csp: "CSPModel",
    sessions_map: Dict[str, "Session"],
) -> bool:
    """
    Entry point for the backtracking search.

    Modifies *csp.assignment* in place.  Domains may also be temporarily
    reduced by forward checking but are restored on failure.

    Args:
        csp          : The CSPModel with variables, domains, and constraint graph.
        sessions_map : Mapping from session_id → Session for fast lookup.

    Returns:
        True  if a complete, consistent assignment was found.
        False if the problem has no solution under the given constraints.
    """
    if csp.is_complete():
        return True  # Base case: all variables assigned

    # ── 1. Variable selection: MRV + Degree ──────────────────────────────────
    var = select_unassigned_variable(csp, sessions_map)

    # ── 2. Value ordering: LCV + soft constraints ─────────────────────────────
    ordered_values = order_domain_values(csp, var, sessions_map)

    # ── 3. Try each value ─────────────────────────────────────────────────────
    for value in ordered_values:
        # Assign
        csp.assign(var.id, value)

        # Forward Check — prune neighbours
        pruned = _forward_check(csp, var, value, sessions_map)

        if pruned is not None:
            # No domain wipeout — recurse
            if solve(csp, sessions_map):
                return True
            # Recursion failed — restore pruned values
            _restore_pruned(csp, pruned)

        # Undo assignment and try next value
        csp.unassign(var.id)

    # All values exhausted — backtrack
    return False

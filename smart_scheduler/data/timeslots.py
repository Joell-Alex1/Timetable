"""
Time slot definitions for the Smart Course Scheduler.

Covers Monday–Friday, 9 AM–5 PM with 1-hour slots (8 slots/day).
Slot indices run 0–7, mapping to times 9:00–16:00.
"""

from typing import List

# ── Days ────────────────────────────────────────────────────────────────────

DAYS: List[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

# ── Slots ───────────────────────────────────────────────────────────────────

SLOT_TIMES: List[str] = [f"{h}:00" for h in range(9, 17)]  # ['9:00', ..., '16:00']
NUM_SLOTS: int = len(SLOT_TIMES)                             # 8 slots per day
SLOT_INDICES: List[int] = list(range(NUM_SLOTS))             # [0, 1, 2, ..., 7]


def slot_index_to_time(index: int) -> str:
    """Convert a slot index (0–7) to its human-readable time string."""
    return SLOT_TIMES[index]


def time_to_slot_index(time_str: str) -> int:
    """Convert a time string (e.g., '9:00') to its slot index."""
    return SLOT_TIMES.index(time_str)

"""
Terminal display utilities for the Smart Course Scheduler.

Provides `print_timetable()` which renders a completed (or failed)
schedule as a formatted, human-readable table in the terminal.

Legend printed with the output:
  [T] = Theory session (1 hr, CR room)
  [L] = Lab    session (2 hrs, CL room — shown on each occupied slot)
"""

from typing import Dict, Any

from data.timeslots import DAYS, SLOT_TIMES

# Terminal width constant (used for separator lines)
_WIDTH = 84


def print_timetable(result: Dict[str, Any]) -> None:
    """
    Pretty-print the timetable result dict to stdout.

    Args:
        result : The dict returned by `create_schedule()` or the API.
                 Must contain at minimum 'status', 'timetable', and 'stats'.
    """
    _print_header()

    if result.get("status") == "failure":
        print(f"\n  !! SCHEDULING FAILED: {result.get('message', 'Unknown error')}\n")
        _print_footer(result)
        return

    timetable = result.get("timetable", {})

    for day in DAYS:
        _print_day_header(day)
        day_slots = timetable.get(day, {})

        has_sessions = any(day_slots.get(slot) for slot in SLOT_TIMES)
        if not has_sessions:
            print("  (no sessions scheduled)")
            continue

        for slot_time in SLOT_TIMES:
            entries = day_slots.get(slot_time, [])
            if not entries:
                continue
            for entry in entries:
                tag      = "[T]" if entry["type"] == "Theory" else "[L]"
                subject  = entry["subject"]
                room     = entry["room"]
                floor    = entry["floor"]
                print(
                    f"  {slot_time:<6s}  {tag}  {subject:<30s}  "
                    f"{room:<8s}  Floor {floor}"
                )

    _print_footer(result)


# ── Internal helpers ──────────────────────────────────────────────────────────

def _print_header() -> None:
    print()
    print("=" * _WIDTH)
    print(" SMART COURSE SCHEDULER — WEEKLY TIMETABLE ".center(_WIDTH, "="))
    print(" NMIMS MPSTME · AI Course 702CO0C032 · Module 4: CSP ".center(_WIDTH, "="))
    print("=" * _WIDTH)
    print("  Legend:  [T] Theory (1 hr, CR room)   [L] Lab (2 hrs, CL room)")
    print("=" * _WIDTH)


def _print_day_header(day: str) -> None:
    print()
    print(f"  {'─' * (_WIDTH - 4)}")
    print(f"  {day.upper()}")
    print(f"  {'─' * (_WIDTH - 4)}")


def _print_footer(result: Dict[str, Any]) -> None:
    stats = result.get("stats", {})
    print()
    print("=" * _WIDTH)
    print(
        f"  Sessions scheduled : {stats.get('total_sessions_scheduled', 0)}"
    )
    print(
        f"  Subjects completed : {stats.get('subjects_fully_scheduled', 0)}"
    )
    print(
        f"  Floors used        : {stats.get('floors_used', [])}"
    )
    unused = result.get("unused_rooms", [])
    print(f"  Unused rooms       : {len(unused)}")
    print("=" * _WIDTH)
    print()


def print_room_summary(result: Dict[str, Any]) -> None:
    """
    Print a floor-wise breakdown of which rooms were allocated.

    Args:
        result : The dict returned by `create_schedule()`.
    """
    summary = result.get("room_summary", {})
    print()
    print("=" * _WIDTH)
    print(" ROOM ALLOCATION SUMMARY (floor-wise) ".center(_WIDTH, "="))
    print("=" * _WIDTH)

    for floor in range(4, 9):
        key = f"floor_{floor}"
        data = summary.get(key, {"theory": [], "lab": []})
        theory_rooms = data.get("theory", [])
        lab_rooms    = data.get("lab", [])
        total_used   = len(theory_rooms) + len(lab_rooms)

        print(f"\n  Floor {floor}  ({total_used} room(s) used)")
        if theory_rooms:
            print(f"    Theory : {', '.join(theory_rooms)}")
        if lab_rooms:
            print(f"    Lab    : {', '.join(lab_rooms)}")
        if not theory_rooms and not lab_rooms:
            print("    (none used)")

    print()
    unused = result.get("unused_rooms", [])
    print(f"  Total unused rooms: {len(unused)}")
    print("=" * _WIDTH)
    print()

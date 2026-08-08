"""
Room definitions for the Smart Course Scheduler.

Dynamically generates all theory classrooms (CR) and lab classrooms (CL)
for floors 4–8 of the NMIMS MPSTME building.

  Theory rooms (CR): 8 per floor → CR401–CR408, CR501–CR508, ... CR801–CR808
  Lab rooms    (CL): 4 per floor → CL401–CL404, CL501–CL504, ... CL801–CL804
"""

from typing import Dict, List


def generate_rooms() -> Dict[str, List[str]]:
    """
    Dynamically generate all room names for floors 4–8.

    Returns:
        Dict with keys 'CR' (theory rooms) and 'CL' (lab rooms),
        each mapping to a list of room name strings.
    """
    rooms: Dict[str, List[str]] = {"CR": [], "CL": []}
    for floor in range(4, 9):
        for num in range(1, 9):      # 8 theory rooms per floor
            rooms["CR"].append(f"CR{floor}0{num}")
        for num in range(1, 5):      # 4 lab rooms per floor
            rooms["CL"].append(f"CL{floor}0{num}")
    return rooms


def get_floor(room_name: str) -> int:
    """
    Extract the floor number from a room name.

    The floor digit is always at index 2 in the room name string.
    e.g., 'CR401' → 4,  'CL805' → 8

    Args:
        room_name: Room identifier string (e.g., 'CR501', 'CL703').

    Returns:
        Integer floor number (4–8).
    """
    return int(room_name[2])


# ── Module-level constants ──────────────────────────────────────────────────

ROOMS: Dict[str, List[str]] = generate_rooms()
CR_ROOMS: List[str] = ROOMS["CR"]     # Theory classrooms (40 total)
CL_ROOMS: List[str] = ROOMS["CL"]     # Lab classrooms    (20 total)
ALL_ROOMS: List[str] = CR_ROOMS + CL_ROOMS

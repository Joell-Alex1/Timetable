"""
JSON export utilities for the Smart Course Scheduler.

Provides functions to serialise a timetable result dict:
  - export_to_json()  : Write the dict to a .json file on disk.
  - to_json_string()  : Return the dict as a formatted JSON string.

The exported format exactly matches the API response structure,
making it suitable for direct consumption by a frontend application.
"""

import json
from pathlib import Path
from typing import Any, Dict


def export_to_json(
    timetable_data: Dict[str, Any],
    filepath: str = "timetable.json",
    indent: int = 2,
) -> str:
    """
    Write a timetable result dict to a JSON file.

    Args:
        timetable_data : The dict returned by `create_schedule()`.
        filepath       : Destination file path (relative or absolute).
                         Defaults to 'timetable.json' in the current directory.
        indent         : JSON indentation level. Defaults to 2.

    Returns:
        The resolved absolute path of the written file as a string.

    Raises:
        OSError : If the destination directory does not exist or is not writable.
    """
    path = Path(filepath)
    path.parent.mkdir(parents=True, exist_ok=True)

    with open(path, "w", encoding="utf-8") as fh:
        json.dump(timetable_data, fh, indent=indent, ensure_ascii=False)

    return str(path.resolve())


def to_json_string(
    timetable_data: Dict[str, Any],
    indent: int = 2,
) -> str:
    """
    Convert a timetable result dict to a formatted JSON string.

    Args:
        timetable_data : The dict returned by `create_schedule()`.
        indent         : JSON indentation level. Defaults to 2.

    Returns:
        Pretty-printed JSON string.
    """
    return json.dumps(timetable_data, indent=indent, ensure_ascii=False)

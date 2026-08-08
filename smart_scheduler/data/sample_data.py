"""
Sample subject data for the AI course (702CO0C032) at NMIMS MPSTME.

Module 4: Constraint Satisfaction Problems — Smart Course Scheduler.

Each subject specifies:
  - name         : Display name of the subject
  - theory_hours : Weekly theory sessions required (1 hr each, in CR rooms)
  - lab_hours    : Weekly lab hours required (2 consecutive hrs per session, in CL rooms)

Note: lab_hours must be even — each lab session occupies 2 consecutive slots.
"""

from typing import List, Dict, Union

SubjectDef = Dict[str, Union[str, int]]

SUBJECTS: List[SubjectDef] = [
    {"name": "Artificial Intelligence", "theory_hours": 2, "lab_hours": 2, "batch": "CE"},
    {"name": "Data Structures",         "theory_hours": 3, "lab_hours": 2, "batch": "CE"},
    {"name": "Algorithms",              "theory_hours": 3, "lab_hours": 0, "batch": "CE"},
    {"name": "Machine Learning",        "theory_hours": 2, "lab_hours": 4, "batch": "IT"},
    {"name": "Database Systems",        "theory_hours": 2, "lab_hours": 2, "batch": "IT"},
    {"name": "Operating Systems",       "theory_hours": 2, "lab_hours": 2, "batch": "Civil"},
]

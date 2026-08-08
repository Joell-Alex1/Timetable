"""
Entry point for the Smart Course Scheduler.

Usage
-----
CLI mode (generate & print timetable, export JSON):
    python main.py

API mode (start FastAPI server on http://localhost:8000):
    python main.py api

Then visit:
    http://localhost:8000/docs     → Interactive Swagger UI
    http://localhost:8000/redoc    → ReDoc documentation
    POST http://localhost:8000/schedule   → Run the scheduler
"""

import sys


def run_cli() -> None:
    """
    Run the scheduler in CLI mode:
      1. Execute the CSP solver.
      2. Pretty-print the timetable to the terminal.
      3. Export the result to timetable.json.
    """
    from scheduler.timetable import create_schedule
    from utils.display import print_timetable, print_room_summary
    from utils.exporter import export_to_json

    print("\nStarting Smart Course Scheduler (CSP + Backtracking)…")
    print("Subjects: Artificial Intelligence, Data Structures, Algorithms,")
    print("          Machine Learning, Database Systems, Operating Systems\n")

    result = create_schedule()
    print_timetable(result)

    if result["status"] == "success":
        print_room_summary(result)
        filepath = export_to_json(result, "timetable.json")
        print(f"  Timetable exported to: {filepath}\n")
    else:
        sys.exit(1)


def run_api() -> None:
    """Start the FastAPI server using uvicorn."""
    import uvicorn
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "api":
        run_api()
    else:
        run_cli()

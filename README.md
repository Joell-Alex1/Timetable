# AI Smart Course Scheduler (Timetable Maker)

An AI-based smart course/timetable scheduler that generates conflict-free class timetables using a **Constraint Satisfaction Problem (CSP) + Backtracking** solver, with a **FastAPI** backend and a **Next.js + Tailwind** frontend.

> Lab project reference: AI Course 702CO0C032 · NMIMS MPSTME · Module 4: CSP.

## What it does

- Takes a list of subjects (theory/lab hours, batch) and available rooms/timeslots.
- Runs a CSP backtracking solver (with heuristics) to assign each session a day, timeslot, and room with no conflicts.
- Exposes the result via a REST API and visualizes it in a web UI (weekly grid, room/floor allocation, stats).

## Project structure

```
ai+proj/
├── start_api.py            # Root-level launcher for the FastAPI backend
├── package.json             # Root script to run backend + frontend together
├── smart_scheduler/         # Python backend (FastAPI + CSP solver)
│   ├── api.py                # FastAPI app & REST endpoints
│   ├── main.py                # CLI entry point (python main.py / main.py api)
│   ├── csp/                   # CSP model, backtracking algorithm, heuristics
│   ├── scheduler/              # Timetable generation + constraints
│   ├── data/                    # Sample subjects, rooms, timeslots
│   ├── utils/                    # Display + JSON export helpers
│   └── requirements.txt
└── frontend/                # Next.js + Tailwind UI
    ├── app/                    # Pages: /, /schedule, /subjects, /floors
    ├── components/              # TimetableGrid, FloorMap, StatsBar, etc.
    └── lib/api.js                 # API client (reads NEXT_PUBLIC_API_URL)
```

## Prerequisites

- **Python** 3.10+ (project uses `from __future__ import annotations` and `dict | None` syntax)
- **Node.js** 18+ and npm
- **MySQL** 8.0 running locally (all data is stored there)

## Setup

### 1. Backend (Python)

```bash
cd smart_scheduler
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

### 1b. Database (MySQL)

```bash
copy .env.example .env        # then edit .env and set DB_PASSWORD
```

On first start the API creates the `smart_scheduler` database and its tables, then seeds
them with the built-in subjects, rooms (floors 4-8), days and time slots. After that the
database is the source of truth: anything added through the UI or API is kept across restarts.
`.env` is git-ignored.

### 2. Frontend (Node)

```bash
cd frontend
npm install
```

The frontend reads the API URL from `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Root dependencies (for running both together)

```bash
npm install
```

## Running the app

### Option A — one command (recommended)

From the project root, this starts the FastAPI backend and the Next.js dev server together:

```bash
npm run dev
```

- Backend: http://localhost:8000
- Frontend: http://localhost:3000

### Option B — run backend and frontend separately

**Backend (FastAPI, from project root):**
```bash
python start_api.py
```
or, from inside `smart_scheduler/`:
```bash
python main.py api
```

**Frontend (from `frontend/`):**
```bash
npm run dev
```

### Option C — CLI-only mode (no API, no frontend)

Generates a timetable, prints it to the terminal, and exports it to `timetable.json`:

```bash
cd smart_scheduler
python main.py
```

## Using the app

1. Start both backend and frontend (Option A or B).
2. Open http://localhost:3000 in your browser.
3. Go to **Subjects** to review/add/remove subjects.
4. Click **Generate** to run the CSP scheduler.
5. View the result on the **Schedule** page (weekly grid) and **Floors** page (room/floor allocation).

## API reference

Interactive API docs (Swagger UI): http://localhost:8000/docs
ReDoc: http://localhost:8000/redoc

| Method | Endpoint | Description |
|---|---|---|
| POST | `/schedule` | Run the CSP solver; returns the full timetable |
| GET | `/timetable` | Return the most recently generated timetable |
| GET | `/timetables` | History of saved schedule runs |
| GET | `/timetables/{id}` | One saved run |
| GET / POST | `/rooms` | List / add a room (`CR###` theory, `CL###` lab) |
| DELETE | `/rooms/{name}` | Remove a room |
| GET | `/timings` | Days and time slots |
| POST / DELETE | `/timings/days[/{name}]` | Add / remove a day |
| POST / DELETE | `/timings/slots[/{label}]` | Add / remove a time slot |
| GET | `/rooms/summary` | Floor-wise room allocation from the last schedule |
| GET | `/rooms/unused` | Rooms not used in the last schedule |
| GET | `/subjects` | List all subjects with hour requirements |
| POST | `/subjects` | Add a new subject |
| DELETE | `/subjects/{name}` | Remove a subject by name |

**Subject fields:** `name`, `theory_hours` (each = 1 session), `lab_hours` (must be even; each lab session = 2 consecutive hours), `batch`.

## Troubleshooting

- **`ModuleNotFoundError` when starting the API**: run `python start_api.py` from the project root (it adds `smart_scheduler/` to `sys.path`), or `cd smart_scheduler && python main.py api`.
- **Frontend can't reach the backend**: confirm the backend is running on port 8000 and `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`.
- **`/schedule` returns 422**: the solver couldn't find a conflict-free assignment for the current subjects/rooms/timeslots — reduce hours or subjects, or check `smart_scheduler/data/` for available rooms/timeslots.

"""
Root-level API launcher.
Adds smart_scheduler/ to sys.path so bare imports (from scheduler.*, from data.*)
resolve correctly, then starts uvicorn — works from any working directory.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "smart_scheduler"))

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[os.path.join(os.path.dirname(__file__), "smart_scheduler")],
    )

"""
Database engine + session factory.

Connection settings come from environment variables (loaded from a git-ignored
`.env` file in smart_scheduler/ or the repo root):

  DATABASE_URL   Full SQLAlchemy URL; wins if set.
                 e.g. mysql+pymysql://root:secret@localhost:3306/smart_scheduler
  or the parts:  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
"""

from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL, make_url
from sqlalchemy.orm import Session, sessionmaker

_HERE = Path(__file__).resolve().parent.parent
load_dotenv(_HERE / ".env")
load_dotenv(_HERE.parent / ".env")


def _database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    return URL.create(
        "mysql+pymysql",
        username=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        database=os.getenv("DB_NAME", "smart_scheduler"),
    ).render_as_string(hide_password=False)


def _ensure_mysql_database(url_str: str) -> None:
    """Create the target MySQL database if it does not exist yet."""
    url = make_url(url_str)
    if not url.drivername.startswith("mysql") or not url.database:
        return
    tmp = create_engine(url.set(database=""))
    try:
        with tmp.connect() as conn:
            conn.execute(text(
                f"CREATE DATABASE IF NOT EXISTS `{url.database}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            ))
            conn.commit()
    finally:
        tmp.dispose()


DATABASE_URL = _database_url()
engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, future=True)


@contextmanager
def get_session() -> Iterator[Session]:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def init_db() -> None:
    """Create the database (MySQL), create tables, and seed defaults once."""
    from db.models import Base
    from db.seed import seed_defaults

    _ensure_mysql_database(DATABASE_URL)
    Base.metadata.create_all(engine)
    with get_session() as session:
        seed_defaults(session)

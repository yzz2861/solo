import os
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import declarative_base, sessionmaker

DB_PATH = os.environ.get("BADMINTON_DB_PATH", "badminton_tournament.db")
Base = declarative_base()

_engine = None
_SessionLocal = None
_initialized = False


def _register_models():
    from . import models  # noqa: F401
    return models


def _get_engine():
    global _engine, _SessionLocal, _initialized
    if _engine is None:
        db_path = os.environ.get("BADMINTON_DB_PATH", "badminton_tournament.db")
        _engine = create_engine(f"sqlite:///{db_path}", echo=False)
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    if not _initialized:
        _register_models()
        insp = inspect(_engine)
        existing = set(insp.get_table_names())
        expected = set(Base.metadata.tables.keys())
        if expected - existing:
            Base.metadata.create_all(bind=_engine)
        _initialized = True
    return _engine


def _get_session_local():
    _get_engine()
    return _SessionLocal


def get_db():
    db = _get_session_local()()
    try:
        yield db
    finally:
        db.close()


def init_db():
    global _initialized, _engine, _SessionLocal
    if _engine:
        import sqlalchemy
        try:
            _engine.dispose()
        except Exception:
            pass
    _engine = None
    _SessionLocal = None
    _initialized = False
    _get_engine()


def ensure_initialized():
    _get_engine()

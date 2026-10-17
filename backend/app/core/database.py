from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = (
    "postgresql+psycopg://"
    "forgetwin_user:forgetwin_password"
    "@localhost:5432/forgetwin"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from app.models.machine import Machine
    from app.models.telemetry import Telemetry
    from app.models.incident import Incident

    Base.metadata.create_all(bind=engine)
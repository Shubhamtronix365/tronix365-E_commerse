from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

# Format: postgresql://user:password@localhost/dbname
# Format: postgresql://user:password@localhost/dbname
# Default to SQLite for local development
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tronix365.db")

if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace(
        "postgres://", "postgresql://", 1
    )

# Ensure correct PostgreSQL driver is selected based on installed packages
if SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
    try:
        import psycopg  # psycopg 3
        has_psycopg = True
    except ImportError:
        has_psycopg = False

    try:
        import psycopg2  # psycopg 2
        has_psycopg2 = True
    except ImportError:
        has_psycopg2 = False

    if SQLALCHEMY_DATABASE_URL.startswith("postgresql+psycopg://") and not has_psycopg and has_psycopg2:
        SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgresql+psycopg://", "postgresql+psycopg2://", 1)
    elif SQLALCHEMY_DATABASE_URL.startswith("postgresql+psycopg2://") and not has_psycopg2 and has_psycopg:
        SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgresql+psycopg2://", "postgresql+psycopg://", 1)
    elif SQLALCHEMY_DATABASE_URL.startswith("postgresql://"):
        if has_psycopg and not has_psycopg2:
            SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
        elif has_psycopg2 and not has_psycopg:
            SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # pool_pre_ping checks if connection is alive before using it
    # pool_recycle refreshes connections every 5 minutes to prevent idle timeouts
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=10,
        max_overflow=20,
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

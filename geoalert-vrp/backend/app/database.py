"""Gestión de conexión a base de datos y ciclo de vida de sesiones con SQLAlchemy 2.0.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import DATABASE_URL

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Generador de contexto para inyección de dependencia en rutas FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Inicializa el esquema relacional en 3FN si no existe."""
    import app.models  # Asegura el registro de todas las entidades
    Base.metadata.create_all(bind=engine)

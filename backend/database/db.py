import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DB_PASSWORD = os.getenv("DB_PASSWORD")
if not DB_PASSWORD:
    raise RuntimeError("DB_PASSWORD environment variable is not set")

DATABASE_URL = f"mysql+pymysql://root:{DB_PASSWORD}@localhost:3306/SimplyStocked"

engine = create_engine(
    DATABASE_URL,
    echo=True  # Set to False in production — logs all SQL queries when True
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

# Dependency — use this in your route functions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

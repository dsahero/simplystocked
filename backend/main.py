import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from dotenv import load_dotenv
from database.db import Base, engine, get_db

load_dotenv()
from routes import (
    auth_routes,
    category_routes,
    vendor_routes,
    product_routes,
    inventory_routes,
    invoice_routes,
    checkpoint_routes,
    analytics_routes,
    waste_routes,
    predictions_routes,
)

try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Could not create tables on startup: {e}")

app = FastAPI(
    title="SimplyStocked API",
    version="1.0.0"
)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(category_routes.router)
app.include_router(vendor_routes.router)
app.include_router(product_routes.router)
app.include_router(inventory_routes.router)
app.include_router(invoice_routes.router)
app.include_router(checkpoint_routes.router)
app.include_router(analytics_routes.router)
app.include_router(waste_routes.router)
app.include_router(predictions_routes.router)


@app.on_event("startup")
def startup():
    print("SimplyStocked API starting up...")
    print("Database connection established.")


@app.on_event("shutdown")
def shutdown():
    print("SimplyStocked API shutting down...")


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}


@app.get("/")
def root():
    return {"message": "Welcome to the SimplyStocked API"}

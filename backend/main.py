from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from database.db import Base, engine, get_db
from routes import (
    auth_routes,
    category_routes,
    vendor_routes,
    product_routes,
    inventory_routes,
    invoice_routes,
    checkpoint_routes,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SimplyStocked API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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

from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from database.queries import waste_queries


def get_all_waste(db: Session, product_id: Optional[int] = None,
                  start_date: Optional[str] = None, end_date: Optional[str] = None) -> list:
    return [dict(r) for r in waste_queries.get_all_waste(db, product_id, start_date, end_date)]


def get_waste_by_id(db: Session, waste_id: int) -> dict:
    w = waste_queries.get_waste_by_id(db, waste_id)
    if not w:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waste record not found")
    return dict(w)


def create_waste(db: Session, product_id: int, quantity: int, reason: str,
                 waste_date: str, estimated_cost: float) -> dict:
    waste_id = waste_queries.create_waste(db, product_id, quantity, reason, waste_date, estimated_cost)
    return waste_queries.get_waste_by_id(db, waste_id)


def delete_waste(db: Session, waste_id: int) -> dict:
    w = waste_queries.get_waste_by_id(db, waste_id)
    if not w:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waste record not found")
    waste_queries.delete_waste(db, waste_id)
    return {"message": f"Waste record {waste_id} deleted"}

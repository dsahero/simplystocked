from typing import Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.db import get_db
from controllers import waste_controller

router = APIRouter(prefix="/waste", tags=["Waste"])


class CreateWasteRequest(BaseModel):
    product_id: int
    quantity: int
    reason: str          # spoiled | expired | pest_damage | damaged
    waste_date: str      # YYYY-MM-DD
    estimated_cost: float


@router.get("/")
def get_all_waste(
    product_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return waste_controller.get_all_waste(db, product_id, start_date, end_date)


@router.get("/{waste_id}")
def get_waste_by_id(waste_id: int, db: Session = Depends(get_db)):
    return waste_controller.get_waste_by_id(db, waste_id)


@router.post("/")
def create_waste(body: CreateWasteRequest, db: Session = Depends(get_db)):
    return waste_controller.create_waste(
        db, body.product_id, body.quantity, body.reason,
        body.waste_date, body.estimated_cost
    )


@router.delete("/{waste_id}")
def delete_waste(waste_id: int, db: Session = Depends(get_db)):
    return waste_controller.delete_waste(db, waste_id)

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.db import get_db
from controllers import inventory_controller

router = APIRouter(prefix="/inventory", tags=["Inventory"])


class AddStockRequest(BaseModel):
    program: str   # open_market | grocery
    quantity: int


class TransferRequest(BaseModel):
    from_program: str  # open_market | grocery
    to_program: str
    quantity: int


class SetBaselineRequest(BaseModel):
    open_market_qty: int
    grocery_qty: int


@router.get("/")
def get_all_stock(db: Session = Depends(get_db)):
    return inventory_controller.get_all_stock(db)


@router.get("/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    return inventory_controller.get_dashboard_stats(db)


@router.get("/{product_id}")
def get_stock_by_product(product_id: int, db: Session = Depends(get_db)):
    return inventory_controller.get_stock_by_product(db, product_id)


@router.post("/{product_id}/add")
def add_stock(product_id: int, body: AddStockRequest, db: Session = Depends(get_db)):
    return inventory_controller.add_stock(db, product_id, body.program, body.quantity)


@router.post("/{product_id}/transfer")
def transfer_stock(product_id: int, body: TransferRequest, db: Session = Depends(get_db)):
    return inventory_controller.transfer_stock(
        db, product_id, body.from_program, body.to_program, body.quantity
    )


@router.put("/{product_id}/baseline")
def set_stock_baseline(product_id: int, body: SetBaselineRequest, db: Session = Depends(get_db)):
    return inventory_controller.set_stock_baseline(
        db, product_id, body.open_market_qty, body.grocery_qty
    )

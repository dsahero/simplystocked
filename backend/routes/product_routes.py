from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from database.db import get_db
from controllers import product_controller

router = APIRouter(prefix="/products", tags=["Products"])


class CreateProductRequest(BaseModel):
    name: str
    price: float
    category_id: int
    open_market_qty: int = 0
    grocery_qty: int = 0


class UpdateProductRequest(BaseModel):
    name: str
    price: float
    category_id: int


@router.get("/")
def get_all_products(
    search: Optional[str] = Query(None, description="Search by product name"),
    category_id: Optional[int] = Query(None),
    low_stock: Optional[bool] = Query(None),
    threshold: int = Query(10),
    db: Session = Depends(get_db)
):
    if search:
        return product_controller.search_products(db, search)
    if category_id is not None:
        return product_controller.get_products_by_category(db, category_id)
    if low_stock:
        return product_controller.get_low_stock_products(db, threshold)
    return product_controller.get_all_products(db)


@router.get("/{product_id}")
def get_product_by_id(product_id: int, db: Session = Depends(get_db)):
    return product_controller.get_product_by_id(db, product_id)


@router.post("/")
def create_product(body: CreateProductRequest, db: Session = Depends(get_db)):
    return product_controller.create_product(
        db, body.name, body.price, body.category_id,
        body.open_market_qty, body.grocery_qty
    )


@router.put("/{product_id}")
def update_product(product_id: int, body: UpdateProductRequest, db: Session = Depends(get_db)):
    return product_controller.update_product(db, product_id, body.name, body.price, body.category_id)


@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    return product_controller.delete_product(db, product_id)

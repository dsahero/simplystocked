from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.db import get_db
from controllers import category_controller

router = APIRouter(prefix="/categories", tags=["Categories"])


class CategoryRequest(BaseModel):
    name: str


@router.get("/")
def get_all_categories(db: Session = Depends(get_db)):
    return category_controller.get_all_categories(db)


@router.get("/{category_id}")
def get_category_by_id(category_id: int, db: Session = Depends(get_db)):
    return category_controller.get_category_by_id(db, category_id)


@router.post("/")
def create_category(body: CategoryRequest, db: Session = Depends(get_db)):
    return category_controller.create_category(db, body.name)


@router.put("/{category_id}")
def update_category(category_id: int, body: CategoryRequest, db: Session = Depends(get_db)):
    return category_controller.update_category(db, category_id, body.name)

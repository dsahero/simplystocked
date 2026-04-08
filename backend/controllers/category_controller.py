from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from database.queries import category_queries


def get_all_categories(db: Session) -> list:
    return [dict(c) for c in category_queries.get_all_categories(db)]


def get_category_by_id(db: Session, category_id: int) -> dict:
    category = category_queries.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return dict(category)


def create_category(db: Session, name: str) -> dict:
    category_id = category_queries.create_category(db, name.strip())
    return {"CategoryId": category_id, "CategoryName": name.strip()}


def update_category(db: Session, category_id: int, name: str) -> dict:
    category = category_queries.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    category_queries.update_category(db, category_id, name.strip())
    return {"CategoryId": category_id, "CategoryName": name.strip()}

from sqlalchemy.orm import Session
from sqlalchemy import text


def get_all_categories(db: Session):
    result = db.execute(
        text("SELECT CategoryId, CategoryName FROM Category ORDER BY CategoryName")
    )
    return result.mappings().all()


def get_category_by_id(db: Session, category_id: int):
    result = db.execute(
        text("SELECT CategoryId, CategoryName FROM Category WHERE CategoryId = :category_id"),
        {"category_id": category_id}
    )
    return result.mappings().first()


def create_category(db: Session, name: str) -> int:
    result = db.execute(
        text("INSERT INTO Category (CategoryName) VALUES (:name)"),
        {"name": name}
    )
    db.commit()
    return result.lastrowid


def update_category(db: Session, category_id: int, name: str):
    db.execute(
        text("UPDATE Category SET CategoryName = :name WHERE CategoryId = :category_id"),
        {"name": name, "category_id": category_id}
    )
    db.commit()

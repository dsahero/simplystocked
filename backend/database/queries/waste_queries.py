from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text


def get_all_waste(db: Session, product_id: Optional[int] = None,
                  start_date: Optional[str] = None, end_date: Optional[str] = None):
    params: dict = {}
    conditions = []
    if product_id:
        conditions.append("w.FoodProductId = :product_id")
        params["product_id"] = product_id
    if start_date and end_date:
        conditions.append("w.WasteDate BETWEEN :start_date AND :end_date")
        params["start_date"] = start_date
        params["end_date"] = end_date

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    result = db.execute(text(f"""
        SELECT w.WasteId, w.FoodProductId, fp.ProductName, c.CategoryName,
               w.Quantity, w.Reason, w.WasteDate, w.EstimatedCost
        FROM Waste w
        JOIN FoodProduct fp ON w.FoodProductId = fp.FoodProductId
        JOIN Category c ON fp.CategoryId = c.CategoryId
        {where}
        ORDER BY w.WasteDate DESC
    """), params)
    return result.mappings().all()


def get_waste_by_id(db: Session, waste_id: int):
    result = db.execute(text("""
        SELECT w.WasteId, w.FoodProductId, fp.ProductName, c.CategoryName,
               w.Quantity, w.Reason, w.WasteDate, w.EstimatedCost
        FROM Waste w
        JOIN FoodProduct fp ON w.FoodProductId = fp.FoodProductId
        JOIN Category c ON fp.CategoryId = c.CategoryId
        WHERE w.WasteId = :waste_id
    """), {"waste_id": waste_id})
    return result.mappings().first()


def create_waste(db: Session, product_id: int, quantity: int, reason: str,
                 waste_date: str, estimated_cost: float) -> int:
    result = db.execute(text("""
        INSERT INTO Waste (FoodProductId, Quantity, Reason, WasteDate, EstimatedCost)
        VALUES (:product_id, :quantity, :reason, :waste_date, :estimated_cost)
    """), {"product_id": product_id, "quantity": quantity, "reason": reason,
           "waste_date": waste_date, "estimated_cost": estimated_cost})
    db.commit()
    return result.lastrowid


def delete_waste(db: Session, waste_id: int):
    db.execute(text("DELETE FROM Waste WHERE WasteId = :waste_id"),
               {"waste_id": waste_id})
    db.commit()

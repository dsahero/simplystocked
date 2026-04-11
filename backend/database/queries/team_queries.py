from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text


def get_team_overview(db: Session):
    """Per-user summary: transaction count, total value, last active date."""
    result = db.execute(text("""
        SELECT u.UserId, u.Username, u.Role,
               COUNT(t.TransactionId) AS transaction_count,
               COALESCE(SUM(t.TotalAmount), 0) AS total_value,
               MAX(t.TransactionDate) AS last_active
        FROM Users u
        LEFT JOIN `transaction` t ON u.UserId = t.UserId
        GROUP BY u.UserId, u.Username, u.Role
        ORDER BY transaction_count DESC
    """))
    return result.mappings().all()


def get_user_activity(db: Session, user_id: int,
                      start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Transactions for a specific user with item details."""
    params: dict = {"user_id": user_id}
    where = ""
    if start_date and end_date:
        where = "AND t.TransactionDate BETWEEN :start_date AND :end_date"
        params["start_date"] = start_date
        params["end_date"] = end_date

    transactions = db.execute(text(f"""
        SELECT t.TransactionId, t.TransactionDate, t.TotalAmount, t.Program
        FROM `transaction` t
        WHERE t.UserId = :user_id {where}
        ORDER BY t.TransactionDate DESC, t.TransactionId DESC
    """), params)

    items = db.execute(text(f"""
        SELECT ti.TransactionItemId, ti.TransactionId, ti.Quantity,
               fp.FoodProductId, fp.ProductName, fp.ProductPrice,
               c.CategoryName
        FROM TransactionItem ti
        JOIN `transaction` t ON ti.TransactionId = t.TransactionId
        JOIN FoodProduct fp ON ti.FoodProductId = fp.FoodProductId
        JOIN Category c ON fp.CategoryId = c.CategoryId
        WHERE t.UserId = :user_id {where}
        ORDER BY ti.TransactionId, fp.ProductName
    """), params)

    return transactions.mappings().all(), items.mappings().all()


def get_activity_by_date(db: Session, start_date: Optional[str] = None,
                         end_date: Optional[str] = None):
    """Daily activity across all users."""
    params: dict = {}
    where = ""
    if start_date and end_date:
        where = "WHERE t.TransactionDate BETWEEN :start_date AND :end_date"
        params = {"start_date": start_date, "end_date": end_date}

    result = db.execute(text(f"""
        SELECT t.TransactionDate,
               u.Username,
               COUNT(t.TransactionId) AS transaction_count,
               SUM(t.TotalAmount) AS total_value,
               SUM(ti_count.item_count) AS items_distributed
        FROM `transaction` t
        JOIN Users u ON t.UserId = u.UserId
        JOIN (
            SELECT TransactionId, SUM(Quantity) AS item_count
            FROM TransactionItem
            GROUP BY TransactionId
        ) ti_count ON t.TransactionId = ti_count.TransactionId
        {where}
        GROUP BY t.TransactionDate, u.UserId, u.Username
        ORDER BY t.TransactionDate DESC, total_value DESC
    """), params)
    return result.mappings().all()


def get_user_program_breakdown(db: Session, user_id: int):
    """Open Market vs Grocery breakdown for a user."""
    result = db.execute(text("""
        SELECT t.Program,
               COUNT(t.TransactionId) AS transaction_count,
               COALESCE(SUM(t.TotalAmount), 0) AS total_value
        FROM `transaction` t
        WHERE t.UserId = :user_id
        GROUP BY t.Program
    """), {"user_id": user_id})
    return result.mappings().all()

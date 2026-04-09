from sqlalchemy.orm import Session
from sqlalchemy import text


def get_all_checkpoints(db: Session):
    result = db.execute(text("""
        SELECT CheckPointId, Date, StartDate, EndDate,
               TotalSpent, TotalDistributedValue, TotalWasteCost, NetValue,
               ItemsReceived, ItemsDistributed, ItemsWasted,
               TransactionCount, UniqueVisitors, InvoiceCount,
               AvgTransactionValue, AvgItemsPerTransaction, LowStockAlerts, Notes
        FROM CheckPoint
        ORDER BY StartDate DESC
    """))
    return result.mappings().all()


def get_checkpoint_by_id(db: Session, checkpoint_id: int):
    result = db.execute(text("""
        SELECT CheckPointId, Date, StartDate, EndDate,
               TotalSpent, TotalDistributedValue, TotalWasteCost, NetValue,
               ItemsReceived, ItemsDistributed, ItemsWasted,
               TransactionCount, UniqueVisitors, InvoiceCount,
               AvgTransactionValue, AvgItemsPerTransaction, LowStockAlerts, Notes
        FROM CheckPoint
        WHERE CheckPointId = :checkpoint_id
    """), {"checkpoint_id": checkpoint_id})
    return result.mappings().first()


def create_checkpoint(db: Session, date: str, start_date: str, end_date: str) -> int:
    result = db.execute(text("""
        INSERT INTO CheckPoint (Date, StartDate, EndDate)
        VALUES (:date, :start_date, :end_date)
    """), {"date": date, "start_date": start_date, "end_date": end_date})
    db.commit()
    return result.lastrowid


def get_transactions_by_checkpoint(db: Session, checkpoint_id: int):
    transactions = db.execute(text("""
        SELECT t.TransactionId, t.TotalAmount, t.CheckPointId
        FROM Transaction t
        WHERE t.CheckPointId = :checkpoint_id
        ORDER BY t.TransactionId DESC
    """), {"checkpoint_id": checkpoint_id})

    items = db.execute(text("""
        SELECT ti.TransactionItemId, ti.TransactionId, ti.Quantity,
               fp.FoodProductId, fp.ProductName, fp.ProductPrice,
               c.CategoryName
        FROM TransactionItem ti
        JOIN FoodProduct fp ON ti.FoodProductId = fp.FoodProductId
        JOIN Category c ON fp.CategoryId = c.CategoryId
        JOIN Transaction t ON ti.TransactionId = t.TransactionId
        WHERE t.CheckPointId = :checkpoint_id
        ORDER BY ti.TransactionId, fp.ProductName
    """), {"checkpoint_id": checkpoint_id})

    return transactions.mappings().all(), items.mappings().all()


def create_transaction(db: Session, checkpoint_id: int, total_amount: float) -> int:
    result = db.execute(text("""
        INSERT INTO Transaction (CheckPointId, TotalAmount)
        VALUES (:checkpoint_id, :total_amount)
    """), {"checkpoint_id": checkpoint_id, "total_amount": total_amount})
    db.commit()
    return result.lastrowid


def add_transaction_item(db: Session, transaction_id: int, product_id: int, quantity: int):
    db.execute(text("""
        INSERT INTO TransactionItem (TransactionId, FoodProductId, Quantity)
        VALUES (:transaction_id, :product_id, :quantity)
    """), {"transaction_id": transaction_id, "product_id": product_id, "quantity": quantity})
    db.commit()


def get_year_end_summary(db: Session, checkpoint_id: int):
    """Aggregate totals for a checkpoint period — used for year-end rollover."""
    result = db.execute(text("""
        SELECT
            fp.FoodProductId,
            fp.ProductName,
            c.CategoryName,
            COALESCE(SUM(ti.Quantity), 0)          AS total_distributed,
            ss.Quantity                             AS current_stock,
            ss.OpenMarketQuantity,
            ss.GroceryStoreQuantity
        FROM FoodProduct fp
        JOIN Category c ON fp.CategoryId = c.CategoryId
        LEFT JOIN StockSnapshot ss ON fp.StockLevelId = ss.StockLevelId
        LEFT JOIN TransactionItem ti ON ti.FoodProductId = fp.FoodProductId
        LEFT JOIN Transaction t ON ti.TransactionId = t.TransactionId
                               AND t.CheckPointId = :checkpoint_id
        GROUP BY fp.FoodProductId, fp.ProductName, c.CategoryName,
                 ss.Quantity, ss.OpenMarketQuantity, ss.GroceryStoreQuantity
        ORDER BY fp.ProductName
    """), {"checkpoint_id": checkpoint_id})
    return result.mappings().all()

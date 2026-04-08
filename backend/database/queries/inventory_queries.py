from sqlalchemy.orm import Session
from sqlalchemy import text


def get_all_stock(db: Session):
    result = db.execute(text("""
        SELECT ss.StockLevelId, ss.FoodProductId, fp.ProductName,
               c.CategoryName,
               ss.StockLevel, ss.Quantity,
               ss.OpenMarketQuantity, ss.GroceryStoreQuantity, ss.LastUpdated
        FROM StockSnapshot ss
        JOIN FoodProduct fp ON ss.FoodProductId = fp.FoodProductId
        JOIN Category c ON fp.CategoryId = c.CategoryId
        ORDER BY fp.ProductName
    """))
    return result.mappings().all()


def get_stock_by_product(db: Session, product_id: int):
    result = db.execute(text("""
        SELECT ss.StockLevelId, ss.FoodProductId, fp.ProductName,
               ss.StockLevel, ss.Quantity,
               ss.OpenMarketQuantity, ss.GroceryStoreQuantity, ss.LastUpdated
        FROM StockSnapshot ss
        JOIN FoodProduct fp ON ss.FoodProductId = fp.FoodProductId
        WHERE ss.FoodProductId = :product_id
    """), {"product_id": product_id})
    return result.mappings().first()


def create_stock_snapshot(db: Session, product_id: int, stock_level: str,
                          quantity: int, open_market_qty: int, grocery_qty: int) -> int:
    result = db.execute(text("""
        INSERT INTO StockSnapshot
            (FoodProductId, StockLevel, Quantity, OpenMarketQuantity, GroceryStoreQuantity, LastUpdated)
        VALUES
            (:product_id, :stock_level, :quantity, :open_market_qty, :grocery_qty, NOW())
    """), {
        "product_id": product_id,
        "stock_level": stock_level,
        "quantity": quantity,
        "open_market_qty": open_market_qty,
        "grocery_qty": grocery_qty
    })
    db.commit()
    return result.lastrowid


def add_stock_to_program(db: Session, stock_level_id: int, program: str, quantity: int):
    """Add incoming stock to a specific program. program = 'open_market' or 'grocery'."""
    if program == "open_market":
        db.execute(text("""
            UPDATE StockSnapshot
            SET OpenMarketQuantity = OpenMarketQuantity + :quantity,
                Quantity = Quantity + :quantity,
                LastUpdated = NOW()
            WHERE StockLevelId = :stock_level_id
        """), {"quantity": quantity, "stock_level_id": stock_level_id})
    elif program == "grocery":
        db.execute(text("""
            UPDATE StockSnapshot
            SET GroceryStoreQuantity = GroceryStoreQuantity + :quantity,
                Quantity = Quantity + :quantity,
                LastUpdated = NOW()
            WHERE StockLevelId = :stock_level_id
        """), {"quantity": quantity, "stock_level_id": stock_level_id})
    db.commit()
    _refresh_stock_level(db, stock_level_id)


def transfer_stock(db: Session, stock_level_id: int, from_program: str, to_program: str, quantity: int):
    """Transfer stock between Open Market and Grocery Store programs."""
    if from_program == "open_market" and to_program == "grocery":
        db.execute(text("""
            UPDATE StockSnapshot
            SET OpenMarketQuantity = OpenMarketQuantity - :quantity,
                GroceryStoreQuantity = GroceryStoreQuantity + :quantity,
                LastUpdated = NOW()
            WHERE StockLevelId = :stock_level_id
              AND OpenMarketQuantity >= :quantity
        """), {"quantity": quantity, "stock_level_id": stock_level_id})
    elif from_program == "grocery" and to_program == "open_market":
        db.execute(text("""
            UPDATE StockSnapshot
            SET GroceryStoreQuantity = GroceryStoreQuantity - :quantity,
                OpenMarketQuantity = OpenMarketQuantity + :quantity,
                LastUpdated = NOW()
            WHERE StockLevelId = :stock_level_id
              AND GroceryStoreQuantity >= :quantity
        """), {"quantity": quantity, "stock_level_id": stock_level_id})
    db.commit()
    _refresh_stock_level(db, stock_level_id)


def set_stock_baseline(db: Session, stock_level_id: int, quantity: int,
                       open_market_qty: int, grocery_qty: int):
    """Manually set stock quantities — used during checkpoint creation."""
    db.execute(text("""
        UPDATE StockSnapshot
        SET Quantity = :quantity,
            OpenMarketQuantity = :open_market_qty,
            GroceryStoreQuantity = :grocery_qty,
            LastUpdated = NOW()
        WHERE StockLevelId = :stock_level_id
    """), {
        "quantity": quantity,
        "open_market_qty": open_market_qty,
        "grocery_qty": grocery_qty,
        "stock_level_id": stock_level_id
    })
    db.commit()
    _refresh_stock_level(db, stock_level_id)


def get_dashboard_stats(db: Session):
    result = db.execute(text("""
        SELECT
            COUNT(DISTINCT fp.FoodProductId)      AS total_products,
            SUM(ss.OpenMarketQuantity)             AS total_open_market_stock,
            SUM(ss.GroceryStoreQuantity)           AS total_grocery_stock,
            SUM(ss.Quantity)                       AS total_stock,
            SUM(CASE WHEN ss.Quantity <= 10 THEN 1 ELSE 0 END) AS low_stock_count
        FROM FoodProduct fp
        LEFT JOIN StockSnapshot ss ON fp.StockLevelId = ss.StockLevelId
    """))
    return result.mappings().first()


def _refresh_stock_level(db: Session, stock_level_id: int):
    """Recalculate and update StockLevel label based on total Quantity."""
    db.execute(text("""
        UPDATE StockSnapshot
        SET StockLevel = CASE
            WHEN Quantity = 0    THEN 'Out of Stock'
            WHEN Quantity <= 10  THEN 'Low'
            WHEN Quantity <= 50  THEN 'Medium'
            ELSE 'High'
        END
        WHERE StockLevelId = :stock_level_id
    """), {"stock_level_id": stock_level_id})
    db.commit()

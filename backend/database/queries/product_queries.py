from sqlalchemy.orm import Session
from sqlalchemy import text


def get_all_products(db: Session):
    result = db.execute(text("""
        SELECT fp.FoodProductId, fp.ProductName, fp.ProductPrice,
               c.CategoryId, c.CategoryName,
               ss.StockLevelId, ss.StockLevel, ss.Quantity,
               ss.OpenMarketQuantity, ss.GroceryStoreQuantity, ss.LastUpdated
        FROM FoodProduct fp
        JOIN Category c ON fp.CategoryId = c.CategoryId
        LEFT JOIN StockSnapshot ss ON fp.StockLevelId = ss.StockLevelId
        ORDER BY fp.ProductName
    """))
    return result.mappings().all()


def get_product_by_id(db: Session, product_id: int):
    result = db.execute(text("""
        SELECT fp.FoodProductId, fp.ProductName, fp.ProductPrice,
               c.CategoryId, c.CategoryName,
               ss.StockLevelId, ss.StockLevel, ss.Quantity,
               ss.OpenMarketQuantity, ss.GroceryStoreQuantity, ss.LastUpdated
        FROM FoodProduct fp
        JOIN Category c ON fp.CategoryId = c.CategoryId
        LEFT JOIN StockSnapshot ss ON fp.StockLevelId = ss.StockLevelId
        WHERE fp.FoodProductId = :product_id
    """), {"product_id": product_id})
    return result.mappings().first()


def search_products(db: Session, query: str):
    result = db.execute(text("""
        SELECT fp.FoodProductId, fp.ProductName, fp.ProductPrice,
               c.CategoryName,
               ss.StockLevelId, ss.StockLevel, ss.Quantity,
               ss.OpenMarketQuantity, ss.GroceryStoreQuantity
        FROM FoodProduct fp
        JOIN Category c ON fp.CategoryId = c.CategoryId
        LEFT JOIN StockSnapshot ss ON fp.StockLevelId = ss.StockLevelId
        WHERE fp.ProductName LIKE :query
        ORDER BY fp.ProductName
        LIMIT 20
    """), {"query": f"%{query}%"})
    return result.mappings().all()


def get_products_by_category(db: Session, category_id: int):
    result = db.execute(text("""
        SELECT fp.FoodProductId, fp.ProductName, fp.ProductPrice,
               c.CategoryName,
               ss.StockLevelId, ss.StockLevel, ss.Quantity,
               ss.OpenMarketQuantity, ss.GroceryStoreQuantity
        FROM FoodProduct fp
        JOIN Category c ON fp.CategoryId = c.CategoryId
        LEFT JOIN StockSnapshot ss ON fp.StockLevelId = ss.StockLevelId
        WHERE fp.CategoryId = :category_id
        ORDER BY fp.ProductName
    """), {"category_id": category_id})
    return result.mappings().all()


def get_low_stock_products(db: Session, threshold: int = 10):
    result = db.execute(text("""
        SELECT fp.FoodProductId, fp.ProductName, fp.ProductPrice,
               c.CategoryName,
               ss.StockLevelId, ss.StockLevel, ss.Quantity,
               ss.OpenMarketQuantity, ss.GroceryStoreQuantity
        FROM FoodProduct fp
        JOIN Category c ON fp.CategoryId = c.CategoryId
        JOIN StockSnapshot ss ON fp.StockLevelId = ss.StockLevelId
        WHERE ss.Quantity <= :threshold
        ORDER BY ss.Quantity ASC
    """), {"threshold": threshold})
    return result.mappings().all()


def create_product(db: Session, name: str, price: float, category_id: int) -> int:
    result = db.execute(text("""
        INSERT INTO FoodProduct (ProductName, ProductPrice, CategoryId)
        VALUES (:name, :price, :category_id)
    """), {"name": name, "price": price, "category_id": category_id})
    db.commit()
    return result.lastrowid


def update_product(db: Session, product_id: int, name: str, price: float, category_id: int):
    db.execute(text("""
        UPDATE FoodProduct
        SET ProductName = :name, ProductPrice = :price, CategoryId = :category_id
        WHERE FoodProductId = :product_id
    """), {"name": name, "price": price, "category_id": category_id, "product_id": product_id})
    db.commit()


def set_product_stock_level(db: Session, product_id: int, stock_level_id: int):
    db.execute(text("""
        UPDATE FoodProduct SET StockLevelId = :stock_level_id
        WHERE FoodProductId = :product_id
    """), {"stock_level_id": stock_level_id, "product_id": product_id})
    db.commit()


def delete_product(db: Session, product_id: int):
    # Remove child rows that reference this product
    db.execute(text("DELETE FROM StockHistory WHERE FoodProductId = :pid"), {"pid": product_id})
    db.execute(text("DELETE FROM Waste WHERE FoodProductId = :pid"), {"pid": product_id})
    db.execute(text("DELETE FROM TransactionItem WHERE FoodProductId = :pid"), {"pid": product_id})
    db.execute(text("DELETE FROM InvoiceItem WHERE FoodProductId = :pid"), {"pid": product_id})
    # Unlink stock snapshot, then delete it
    db.execute(text("UPDATE FoodProduct SET StockLevelId = NULL WHERE FoodProductId = :pid"), {"pid": product_id})
    db.execute(text("DELETE FROM StockSnapshot WHERE FoodProductId = :pid"), {"pid": product_id})
    db.execute(text("DELETE FROM FoodProduct WHERE FoodProductId = :pid"), {"pid": product_id})
    db.commit()

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from database.queries import inventory_queries, product_queries


def get_all_stock(db: Session) -> list:
    return [dict(s) for s in inventory_queries.get_all_stock(db)]


def get_stock_by_product(db: Session, product_id: int) -> dict:
    stock = inventory_queries.get_stock_by_product(db, product_id)
    if not stock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock record not found")
    return dict(stock)


def add_stock(db: Session, product_id: int, program: str, quantity: int) -> dict:
    if program not in ("open_market", "grocery"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="program must be 'open_market' or 'grocery'")
    if quantity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be positive")

    stock = inventory_queries.get_stock_by_product(db, product_id)
    if not stock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product has no stock record")

    inventory_queries.add_stock_to_program(db, stock["StockLevelId"], program, quantity)
    return dict(inventory_queries.get_stock_by_product(db, product_id))


def transfer_stock(db: Session, product_id: int, from_program: str,
                   to_program: str, quantity: int) -> dict:
    valid_programs = ("open_market", "grocery")
    if from_program not in valid_programs or to_program not in valid_programs:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid program")
    if from_program == to_program:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Source and destination programs must be different")
    if quantity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be positive")

    stock = inventory_queries.get_stock_by_product(db, product_id)
    if not stock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product has no stock record")

    available = stock["OpenMarketQuantity"] if from_program == "open_market" else stock["GroceryStoreQuantity"]
    if quantity > available:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Not enough stock in {from_program} (available: {available})")

    inventory_queries.transfer_stock(db, stock["StockLevelId"], from_program, to_program, quantity)
    return dict(inventory_queries.get_stock_by_product(db, product_id))


def set_stock_baseline(db: Session, product_id: int, open_market_qty: int, grocery_qty: int) -> dict:
    """Manually set stock quantities — used when creating a checkpoint baseline."""
    if open_market_qty < 0 or grocery_qty < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantities cannot be negative")

    stock = inventory_queries.get_stock_by_product(db, product_id)
    if not stock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product has no stock record")

    total = open_market_qty + grocery_qty
    inventory_queries.set_stock_baseline(
        db, stock["StockLevelId"], total, open_market_qty, grocery_qty
    )
    return dict(inventory_queries.get_stock_by_product(db, product_id))


def get_dashboard_stats(db: Session) -> dict:
    stats = inventory_queries.get_dashboard_stats(db)
    return dict(stats)

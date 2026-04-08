from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from database.queries import product_queries, inventory_queries


def get_all_products(db: Session) -> list:
    return [dict(p) for p in product_queries.get_all_products(db)]


def get_product_by_id(db: Session, product_id: int) -> dict:
    product = product_queries.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return dict(product)


def search_products(db: Session, query: str) -> list:
    return [dict(p) for p in product_queries.search_products(db, query)]


def get_products_by_category(db: Session, category_id: int) -> list:
    return [dict(p) for p in product_queries.get_products_by_category(db, category_id)]


def get_low_stock_products(db: Session, threshold: int = 10) -> list:
    return [dict(p) for p in product_queries.get_low_stock_products(db, threshold)]


def create_product(db: Session, name: str, price: float, category_id: int,
                   open_market_qty: int = 0, grocery_qty: int = 0) -> dict:
    """Create a product and its stock snapshot together."""
    product_id = product_queries.create_product(db, name, price, category_id)

    total_qty = open_market_qty + grocery_qty
    stock_level = _calculate_stock_level(total_qty)
    stock_level_id = inventory_queries.create_stock_snapshot(
        db, product_id, stock_level, total_qty, open_market_qty, grocery_qty
    )

    product_queries.set_product_stock_level(db, product_id, stock_level_id)

    return product_queries.get_product_by_id(db, product_id)


def update_product(db: Session, product_id: int, name: str, price: float, category_id: int) -> dict:
    existing = product_queries.get_product_by_id(db, product_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    product_queries.update_product(db, product_id, name, price, category_id)
    return dict(product_queries.get_product_by_id(db, product_id))


def delete_product(db: Session, product_id: int) -> dict:
    existing = product_queries.get_product_by_id(db, product_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    product_queries.delete_product(db, product_id)
    return {"message": f"Product {product_id} deleted"}


def _calculate_stock_level(quantity: int) -> str:
    if quantity == 0:
        return "Out of Stock"
    elif quantity <= 10:
        return "Low"
    elif quantity <= 50:
        return "Medium"
    return "High"

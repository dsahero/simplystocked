from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from database.queries import invoice_queries, inventory_queries, product_queries


def get_all_invoices(db: Session) -> list:
    return [dict(i) for i in invoice_queries.get_all_invoices(db)]


def get_invoice_by_id(db: Session, invoice_id: int) -> dict:
    invoice, items = invoice_queries.get_invoice_by_id(db, invoice_id)
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return {**dict(invoice), "items": [dict(item) for item in items]}


def get_invoices_by_vendor(db: Session, vendor_id: int) -> list:
    return [dict(i) for i in invoice_queries.get_invoices_by_vendor(db, vendor_id)]


def create_invoice(db: Session, date: str, desc: str, vendor_id: int,
                   from_details: dict, bill_to_details: dict,
                   delivery_details: dict, items: list) -> dict:
    """
    Create a full invoice with address details and line items.
    Also adds incoming stock to the appropriate program for each item.

    items: list of {product_id, quantity, unit_price, program}
    """
    from_id = invoice_queries.create_invoice_address(db, **from_details)
    bill_to_id = invoice_queries.create_invoice_address(db, **bill_to_details)
    delivery_id = invoice_queries.create_invoice_address(db, **delivery_details)

    invoice_id = invoice_queries.create_invoice(
        db, date, desc, 0.0, vendor_id, from_id, bill_to_id, delivery_id
    )

    for item in items:
        invoice_queries.add_invoice_item(
            db, invoice_id, item["product_id"], item["quantity"], item["unit_price"]
        )
        # Update stock for incoming goods
        stock = inventory_queries.get_stock_by_product(db, item["product_id"])
        if stock:
            program = item.get("program", "open_market")
            inventory_queries.add_stock_to_program(db, stock["StockLevelId"], program, item["quantity"])

    invoice_queries.update_invoice_total(db, invoice_id)
    return get_invoice_by_id(db, invoice_id)


def add_invoice_item(db: Session, invoice_id: int, product_id: int,
                     quantity: int, unit_price: float, program: str = "open_market") -> dict:
    """Add a single line item to an existing invoice and update stock."""
    invoice, _ = invoice_queries.get_invoice_by_id(db, invoice_id)
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    invoice_queries.add_invoice_item(db, invoice_id, product_id, quantity, unit_price)

    stock = inventory_queries.get_stock_by_product(db, product_id)
    if stock:
        inventory_queries.add_stock_to_program(db, stock["StockLevelId"], program, quantity)

    invoice_queries.update_invoice_total(db, invoice_id)
    return get_invoice_by_id(db, invoice_id)

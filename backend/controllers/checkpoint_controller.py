from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from database.queries import checkpoint_queries, inventory_queries


def get_all_checkpoints(db: Session) -> list:
    return [dict(c) for c in checkpoint_queries.get_all_checkpoints(db)]


def get_checkpoint_by_id(db: Session, checkpoint_id: int) -> dict:
    checkpoint = checkpoint_queries.get_checkpoint_by_id(db, checkpoint_id)
    if not checkpoint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checkpoint not found")
    return dict(checkpoint)


def create_checkpoint(db: Session, date: str, start_date: str, end_date: str) -> dict:
    checkpoint_id = checkpoint_queries.create_checkpoint(db, date, start_date, end_date)
    return checkpoint_queries.get_checkpoint_by_id(db, checkpoint_id)


def get_transactions_by_checkpoint(db: Session, checkpoint_id: int) -> dict:
    checkpoint = checkpoint_queries.get_checkpoint_by_id(db, checkpoint_id)
    if not checkpoint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checkpoint not found")

    transactions, items = checkpoint_queries.get_transactions_by_checkpoint(db, checkpoint_id)

    # Group items by transaction
    items_by_transaction: dict = {}
    for item in items:
        tid = item["TransactionId"]
        if tid not in items_by_transaction:
            items_by_transaction[tid] = []
        items_by_transaction[tid].append(dict(item))

    transactions_out = []
    for t in transactions:
        t_dict = dict(t)
        t_dict["items"] = items_by_transaction.get(t["TransactionId"], [])
        transactions_out.append(t_dict)

    return {**dict(checkpoint), "transactions": transactions_out}


def create_transaction(db: Session, checkpoint_id: int, items: list) -> dict:
    """
    Create a transaction with line items.
    items: list of {product_id, quantity, unit_price}
    """
    checkpoint = checkpoint_queries.get_checkpoint_by_id(db, checkpoint_id)
    if not checkpoint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checkpoint not found")

    total = sum(item["quantity"] * item.get("unit_price", 0) for item in items)
    transaction_id = checkpoint_queries.create_transaction(db, checkpoint_id, total)

    for item in items:
        checkpoint_queries.add_transaction_item(
            db, transaction_id, item["product_id"], item["quantity"]
        )

    return {"TransactionId": transaction_id, "CheckPointId": checkpoint_id, "TotalAmount": total}


def get_year_end_summary(db: Session, checkpoint_id: int) -> dict:
    checkpoint = checkpoint_queries.get_checkpoint_by_id(db, checkpoint_id)
    if not checkpoint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checkpoint not found")

    rows = checkpoint_queries.get_year_end_summary(db, checkpoint_id)
    total_distributed = sum(r["total_distributed"] for r in rows)
    remaining_stock = sum(r["current_stock"] or 0 for r in rows)

    return {
        "checkpoint": dict(checkpoint),
        "total_distributed": total_distributed,
        "remaining_stock": remaining_stock,
        "products": [dict(r) for r in rows]
    }


def year_end_rollover(db: Session, closing_checkpoint_id: int,
                      new_start_date: str, new_end_date: str) -> dict:
    """
    Close out a checkpoint period and open a new one carrying remaining stock forward.
    Stock quantities are preserved — the new checkpoint starts with current stock as its baseline.
    """
    closing = checkpoint_queries.get_checkpoint_by_id(db, closing_checkpoint_id)
    if not closing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checkpoint not found")

    new_checkpoint_id = checkpoint_queries.create_checkpoint(
        db, new_start_date, new_start_date, new_end_date
    )

    return {
        "closed_checkpoint_id": closing_checkpoint_id,
        "new_checkpoint_id": new_checkpoint_id,
        "new_start_date": new_start_date,
        "new_end_date": new_end_date,
        "message": "Rollover complete. Remaining stock carried forward."
    }

from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from database.queries import team_queries


def get_team_overview(db: Session) -> list:
    return [dict(r) for r in team_queries.get_team_overview(db)]


def get_user_activity(db: Session, user_id: int,
                      start_date: Optional[str] = None,
                      end_date: Optional[str] = None) -> dict:
    transactions, items = team_queries.get_user_activity(db, user_id, start_date, end_date)
    tx_list = [dict(t) for t in transactions]
    item_list = [dict(i) for i in items]

    # Attach items to their transactions
    items_by_tx = {}
    for item in item_list:
        tid = item["TransactionId"]
        if tid not in items_by_tx:
            items_by_tx[tid] = []
        items_by_tx[tid].append(item)

    for tx in tx_list:
        tx["items"] = items_by_tx.get(tx["TransactionId"], [])

    program_breakdown = [dict(r) for r in team_queries.get_user_program_breakdown(db, user_id)]

    return {
        "transactions": tx_list,
        "program_breakdown": program_breakdown,
        "total_transactions": len(tx_list),
        "total_items": sum(i["Quantity"] for i in item_list),
    }


def get_activity_by_date(db: Session, start_date: Optional[str] = None,
                         end_date: Optional[str] = None) -> list:
    return [dict(r) for r in team_queries.get_activity_by_date(db, start_date, end_date)]

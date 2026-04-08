from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from database.db import get_db
from controllers import checkpoint_controller

router = APIRouter(prefix="/checkpoints", tags=["Checkpoints"])


class CreateCheckpointRequest(BaseModel):
    date: str        # YYYY-MM-DD — the date the checkpoint was recorded
    start_date: str  # YYYY-MM-DD — period start
    end_date: str    # YYYY-MM-DD — period end


class TransactionLineItem(BaseModel):
    product_id: int
    quantity: int
    unit_price: float = 0.0


class CreateTransactionRequest(BaseModel):
    items: List[TransactionLineItem]


class YearEndRolloverRequest(BaseModel):
    new_start_date: str  # YYYY-MM-DD
    new_end_date: str    # YYYY-MM-DD


@router.get("/")
def get_all_checkpoints(db: Session = Depends(get_db)):
    return checkpoint_controller.get_all_checkpoints(db)


@router.post("/")
def create_checkpoint(body: CreateCheckpointRequest, db: Session = Depends(get_db)):
    return checkpoint_controller.create_checkpoint(db, body.date, body.start_date, body.end_date)


@router.get("/{checkpoint_id}")
def get_checkpoint_by_id(checkpoint_id: int, db: Session = Depends(get_db)):
    return checkpoint_controller.get_checkpoint_by_id(db, checkpoint_id)


@router.get("/{checkpoint_id}/transactions")
def get_transactions(checkpoint_id: int, db: Session = Depends(get_db)):
    return checkpoint_controller.get_transactions_by_checkpoint(db, checkpoint_id)


@router.post("/{checkpoint_id}/transactions")
def create_transaction(checkpoint_id: int, body: CreateTransactionRequest, db: Session = Depends(get_db)):
    return checkpoint_controller.create_transaction(
        db, checkpoint_id, [item.model_dump() for item in body.items]
    )


@router.get("/{checkpoint_id}/summary")
def get_year_end_summary(checkpoint_id: int, db: Session = Depends(get_db)):
    return checkpoint_controller.get_year_end_summary(db, checkpoint_id)


@router.post("/{checkpoint_id}/rollover")
def year_end_rollover(checkpoint_id: int, body: YearEndRolloverRequest, db: Session = Depends(get_db)):
    return checkpoint_controller.year_end_rollover(
        db, checkpoint_id, body.new_start_date, body.new_end_date
    )

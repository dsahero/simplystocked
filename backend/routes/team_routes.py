from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database.db import get_db
from controllers import team_controller

router = APIRouter(prefix="/team", tags=["Team"])


@router.get("/overview")
def team_overview(db: Session = Depends(get_db)):
    """Per-member summary: transaction count, total value, last active date."""
    return team_controller.get_team_overview(db)


@router.get("/activity/{user_id}")
def user_activity(
    user_id: int,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Transaction history for a specific team member."""
    return team_controller.get_user_activity(db, user_id, start_date, end_date)


@router.get("/daily")
def daily_activity(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Daily activity log across all team members."""
    return team_controller.get_activity_by_date(db, start_date, end_date)

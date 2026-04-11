from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database.db import get_db
from controllers import analytics_controller

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard")
def dashboard_stats(db: Session = Depends(get_db)):
    """Aggregated stats from the latest checkpoint plus live inventory counts."""
    return analytics_controller.get_dashboard_stats(db)


@router.get("/stock-trends")
def stock_trends(
    product_id: Optional[int] = Query(None, description="Filter to a single product"),
    days: int = Query(30, description="Lookback window in days"),
    db: Session = Depends(get_db),
):
    """Daily stock levels from StockHistory. Omit product_id for system-wide totals."""
    return analytics_controller.get_stock_trends(db, product_id, days)


<<<<<<< HEAD
@router.get("/received-vs-distributed")
def received_vs_distributed(
    category_id: Optional[int] = Query(None, description="Filter to a single category"),
    db: Session = Depends(get_db),
):
    """Per-checkpoint units received (invoices) vs units distributed (transactions)."""
    return analytics_controller.get_received_vs_distributed(db, category_id)


=======
>>>>>>> invoice
@router.get("/distribution-by-category")
def distribution_by_category(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Total distributed quantities grouped by category."""
    return analytics_controller.get_distribution_by_category(db, start_date, end_date)


@router.get("/distribution-over-time")
def distribution_over_time(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    interval: str = Query("month", description="day | week | month"),
    db: Session = Depends(get_db),
):
    """Transaction totals grouped by time interval."""
    return analytics_controller.get_distribution_over_time(db, start_date, end_date, interval)


@router.get("/waste-summary")
def waste_summary(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Waste aggregated by reason and by month."""
    return analytics_controller.get_waste_summary(db, start_date, end_date)


@router.get("/top-products")
def top_products(
    limit: int = Query(10),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Most distributed products ranked by quantity."""
    return analytics_controller.get_top_products(db, limit, start_date, end_date)


@router.get("/vendor-spending")
def vendor_spending(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Invoice spend grouped by vendor."""
    return analytics_controller.get_vendor_spending(db, start_date, end_date)


@router.get("/program-comparison")
def program_comparison(db: Session = Depends(get_db)):
    """Current stock split between Open Market and Grocery Store programs."""
    return analytics_controller.get_program_comparison(db)


@router.get("/checkpoint-trends")
def checkpoint_trends(db: Session = Depends(get_db)):
    """Monthly checkpoint metrics for trend analysis."""
    return analytics_controller.get_checkpoint_trends(db)

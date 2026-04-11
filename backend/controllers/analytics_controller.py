from typing import Optional
from sqlalchemy.orm import Session
from database.queries import analytics_queries


def get_dashboard_stats(db: Session) -> dict:
    latest, live = analytics_queries.get_dashboard_stats(db)
    return {
        "latest_checkpoint": dict(latest) if latest else None,
        "total_products": live["total_products"] if live else 0,
        "total_stock": live["total_stock"] if live else 0,
        "low_stock_count": live["low_stock_count"] if live else 0,
        "vendor_count": live["vendor_count"] if live else 0,
<<<<<<< HEAD
        "total_transactions": live["total_transactions"] if live else 0,
        "total_transaction_value": float(live["total_transaction_value"]) if live else 0,
        "total_invoices": live["total_invoices"] if live else 0,
        "total_invoice_spending": float(live["total_invoice_spending"]) if live else 0,
        "total_waste_units": live["total_waste_units"] if live else 0,
        "total_waste_cost": float(live["total_waste_cost"]) if live else 0,
=======
>>>>>>> invoice
    }


def get_stock_trends(db: Session, product_id: Optional[int] = None, days: int = 30) -> list:
    return [dict(r) for r in analytics_queries.get_stock_trends(db, product_id, days)]


<<<<<<< HEAD
def get_received_vs_distributed(db: Session, category_id: Optional[int] = None) -> list:
    return [dict(r) for r in analytics_queries.get_received_vs_distributed(db, category_id)]


=======
>>>>>>> invoice
def get_distribution_by_category(db: Session, start_date: Optional[str] = None,
                                 end_date: Optional[str] = None) -> list:
    return [dict(r) for r in analytics_queries.get_distribution_by_category(db, start_date, end_date)]


def get_distribution_over_time(db: Session, start_date: Optional[str] = None,
                               end_date: Optional[str] = None, interval: str = "month") -> list:
    return [dict(r) for r in analytics_queries.get_distribution_over_time(db, start_date, end_date, interval)]


def get_waste_summary(db: Session, start_date: Optional[str] = None,
                      end_date: Optional[str] = None) -> dict:
    by_reason, by_month, totals = analytics_queries.get_waste_summary(db, start_date, end_date)
    return {
        "by_reason": [dict(r) for r in by_reason],
        "by_month": [dict(r) for r in by_month],
        "total_units": totals["total_units"] if totals else 0,
        "total_cost": float(totals["total_cost"]) if totals else 0.0,
    }


def get_top_products(db: Session, limit: int = 10, start_date: Optional[str] = None,
                     end_date: Optional[str] = None) -> list:
    return [dict(r) for r in analytics_queries.get_top_products(db, limit, start_date, end_date)]


def get_vendor_spending(db: Session, start_date: Optional[str] = None,
                        end_date: Optional[str] = None) -> list:
    return [dict(r) for r in analytics_queries.get_vendor_spending(db, start_date, end_date)]


def get_program_comparison(db: Session) -> dict:
    rows = analytics_queries.get_program_comparison(db)
    by_category = [dict(r) for r in rows]
    return {
        "open_market_total": sum(r["open_market"] or 0 for r in by_category),
        "grocery_total": sum(r["grocery"] or 0 for r in by_category),
        "by_category": by_category,
    }


def get_checkpoint_trends(db: Session) -> list:
    return [dict(r) for r in analytics_queries.get_checkpoint_trends(db)]

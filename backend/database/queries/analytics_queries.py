from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text


def get_dashboard_stats(db: Session):
    """Aggregate stats from the most recent checkpoint plus live counts."""
    result = db.execute(text("""
        SELECT cp.CheckPointId, cp.Date, cp.StartDate, cp.EndDate,
               cp.TotalSpent, cp.TotalDistributedValue, cp.TotalWasteCost, cp.NetValue,
               cp.ItemsReceived, cp.ItemsDistributed, cp.ItemsWasted,
               cp.TransactionCount, cp.UniqueVisitors, cp.InvoiceCount,
               cp.AvgTransactionValue, cp.AvgItemsPerTransaction,
               cp.LowStockAlerts, cp.TopCategoryId, cp.Notes,
               cat.CategoryName AS TopCategoryName
        FROM CheckPoint cp
        LEFT JOIN Category cat ON cp.TopCategoryId = cat.CategoryId
        ORDER BY cp.StartDate DESC
        LIMIT 1
    """))
    latest = result.mappings().first()

    counts = db.execute(text("""
        SELECT
            (SELECT COUNT(*) FROM FoodProduct) AS total_products,
            (SELECT SUM(ss.Quantity) FROM StockSnapshot ss) AS total_stock,
            (SELECT COUNT(*) FROM StockSnapshot WHERE StockLevel = 'Low') AS low_stock_count,
            (SELECT COUNT(DISTINCT VendorId) FROM Vendor) AS vendor_count
    """))
    live = counts.mappings().first()
    return latest, live


def get_stock_trends(db: Session, product_id: Optional[int] = None, days: int = 30):
    """Stock level history from StockHistory table."""
    if product_id:
        result = db.execute(text("""
            SELECT sh.SnapshotDate, sh.Quantity, sh.OpenMarketQuantity,
                   sh.GroceryStoreQuantity, sh.StockLevel,
                   fp.ProductName
            FROM StockHistory sh
            JOIN FoodProduct fp ON sh.FoodProductId = fp.FoodProductId
            WHERE sh.FoodProductId = :product_id
              AND sh.SnapshotDate >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
            ORDER BY sh.SnapshotDate
        """), {"product_id": product_id, "days": days})
    else:
        result = db.execute(text("""
            SELECT sh.SnapshotDate,
                   SUM(sh.Quantity) AS Quantity,
                   SUM(sh.OpenMarketQuantity) AS OpenMarketQuantity,
                   SUM(sh.GroceryStoreQuantity) AS GroceryStoreQuantity
            FROM StockHistory sh
            WHERE sh.SnapshotDate >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
            GROUP BY sh.SnapshotDate
            ORDER BY sh.SnapshotDate
        """), {"days": days})
    return result.mappings().all()


def get_received_vs_distributed(db: Session, category_id: Optional[int] = None):
    """Per-checkpoint: units received (invoices) vs units distributed (transactions), optionally by category."""
    cat_filter_inv = "AND fp.CategoryId = :category_id" if category_id else ""
    cat_filter_tx = "AND fp.CategoryId = :category_id" if category_id else ""
    params: dict = {}
    if category_id:
        params["category_id"] = category_id

    result = db.execute(text(f"""
        SELECT cp.CheckPointId, cp.StartDate, cp.EndDate,
               COALESCE(recv.units_received, 0) AS units_received,
               COALESCE(recv.cost_received, 0) AS cost_received,
               COALESCE(dist.units_distributed, 0) AS units_distributed,
               COALESCE(dist.value_distributed, 0) AS value_distributed
        FROM CheckPoint cp
        LEFT JOIN (
            SELECT cp2.CheckPointId,
                   SUM(ii.Quantity) AS units_received,
                   SUM(ii.Quantity * ii.UnitPrice) AS cost_received
            FROM CheckPoint cp2
            JOIN Invoice i ON i.Date BETWEEN cp2.StartDate AND cp2.EndDate
            JOIN InvoiceItem ii ON i.InvoiceId = ii.InvoiceId
            JOIN FoodProduct fp ON ii.FoodProductId = fp.FoodProductId
            WHERE 1=1 {cat_filter_inv}
            GROUP BY cp2.CheckPointId
        ) recv ON cp.CheckPointId = recv.CheckPointId
        LEFT JOIN (
            SELECT t.CheckPointId,
                   SUM(ti.Quantity) AS units_distributed,
                   SUM(ti.Quantity * fp.ProductPrice) AS value_distributed
            FROM `transaction` t
            JOIN TransactionItem ti ON t.TransactionId = ti.TransactionId
            JOIN FoodProduct fp ON ti.FoodProductId = fp.FoodProductId
            WHERE 1=1 {cat_filter_tx}
            GROUP BY t.CheckPointId
        ) dist ON cp.CheckPointId = dist.CheckPointId
        ORDER BY cp.StartDate
    """), params)
    return result.mappings().all()


def get_distribution_by_category(db: Session, start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Total distributed quantities grouped by category."""
    params: dict = {}
    where = ""
    if start_date and end_date:
        where = "AND t.TransactionDate BETWEEN :start_date AND :end_date"
        params = {"start_date": start_date, "end_date": end_date}

    result = db.execute(text(f"""
        SELECT c.CategoryName, SUM(ti.Quantity) AS total_distributed,
               COUNT(DISTINCT ti.TransactionId) AS transaction_count
        FROM TransactionItem ti
        JOIN FoodProduct fp ON ti.FoodProductId = fp.FoodProductId
        JOIN Category c ON fp.CategoryId = c.CategoryId
        JOIN `transaction` t ON ti.TransactionId = t.TransactionId
        WHERE 1=1 {where}
        GROUP BY c.CategoryId, c.CategoryName
        ORDER BY total_distributed DESC
    """), params)
    return result.mappings().all()


def get_distribution_over_time(db: Session, start_date: Optional[str] = None,
                               end_date: Optional[str] = None, interval: str = "month"):
    """Transaction totals grouped by time interval."""
    if interval == "week":
        date_fmt = "DATE_FORMAT(t.TransactionDate, '%x-W%v')"
    elif interval == "day":
        date_fmt = "DATE(t.TransactionDate)"
    else:
        date_fmt = "DATE_FORMAT(t.TransactionDate, '%Y-%m')"

    params: dict = {}
    where = ""
    if start_date and end_date:
        where = "WHERE t.TransactionDate BETWEEN :start_date AND :end_date"
        params = {"start_date": start_date, "end_date": end_date}

    result = db.execute(text(f"""
        SELECT {date_fmt} AS period,
               COUNT(DISTINCT t.TransactionId) AS transaction_count,
               SUM(ti.Quantity) AS items_distributed,
               SUM(t.TotalAmount) / COUNT(DISTINCT t.TransactionId) AS avg_value
        FROM `transaction` t
        JOIN TransactionItem ti ON t.TransactionId = ti.TransactionId
        {where}
        GROUP BY period
        ORDER BY period
    """), params)
    return result.mappings().all()


def get_waste_summary(db: Session, start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Waste aggregated by reason and by month."""
    params: dict = {}
    where = ""
    if start_date and end_date:
        where = "WHERE w.WasteDate BETWEEN :start_date AND :end_date"
        params = {"start_date": start_date, "end_date": end_date}

    by_reason = db.execute(text(f"""
        SELECT w.Reason, SUM(w.Quantity) AS total_units,
               SUM(w.EstimatedCost) AS total_cost, COUNT(*) AS event_count
        FROM Waste w
        {where}
        GROUP BY w.Reason
        ORDER BY total_units DESC
    """), params)

    by_month = db.execute(text(f"""
        SELECT DATE_FORMAT(w.WasteDate, '%Y-%m') AS month,
               SUM(w.Quantity) AS total_units, SUM(w.EstimatedCost) AS total_cost
        FROM Waste w
        {where}
        GROUP BY month
        ORDER BY month
    """), params)

    totals = db.execute(text(f"""
        SELECT COALESCE(SUM(w.Quantity), 0) AS total_units,
               COALESCE(SUM(w.EstimatedCost), 0) AS total_cost
        FROM Waste w
        {where}
    """), params)

    return by_reason.mappings().all(), by_month.mappings().all(), totals.mappings().first()


def get_top_products(db: Session, limit: int = 10, start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Most distributed products."""
    params: dict = {"limit": limit}
    where = ""
    if start_date and end_date:
        where = "AND t.TransactionDate BETWEEN :start_date AND :end_date"
        params["start_date"] = start_date
        params["end_date"] = end_date

    result = db.execute(text(f"""
        SELECT fp.FoodProductId, fp.ProductName, c.CategoryName,
               SUM(ti.Quantity) AS total_distributed
        FROM TransactionItem ti
        JOIN FoodProduct fp ON ti.FoodProductId = fp.FoodProductId
        JOIN Category c ON fp.CategoryId = c.CategoryId
        JOIN `transaction` t ON ti.TransactionId = t.TransactionId
        WHERE 1=1 {where}
        GROUP BY fp.FoodProductId, fp.ProductName, c.CategoryName
        ORDER BY total_distributed DESC
        LIMIT :limit
    """), params)
    return result.mappings().all()


def get_vendor_spending(db: Session, start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Invoice totals grouped by vendor."""
    params: dict = {}
    where = ""
    if start_date and end_date:
        where = "AND i.Date BETWEEN :start_date AND :end_date"
        params = {"start_date": start_date, "end_date": end_date}

    result = db.execute(text(f"""
        SELECT v.VendorId, v.VendorName,
               COUNT(i.InvoiceId) AS invoice_count,
               COALESCE(SUM(i.TotalPrice), 0) AS total_spent
        FROM Vendor v
        LEFT JOIN Invoice i ON v.VendorId = i.VendorId {'AND 1=1 ' + where if where else ''}
        GROUP BY v.VendorId, v.VendorName
        ORDER BY total_spent DESC
    """), params)
    return result.mappings().all()


def get_program_comparison(db: Session):
    """Current stock split by Open Market vs Grocery Store, by category."""
    result = db.execute(text("""
        SELECT c.CategoryName,
               SUM(ss.OpenMarketQuantity) AS open_market,
               SUM(ss.GroceryStoreQuantity) AS grocery
        FROM StockSnapshot ss
        JOIN FoodProduct fp ON ss.FoodProductId = fp.FoodProductId
        JOIN Category c ON fp.CategoryId = c.CategoryId
        GROUP BY c.CategoryId, c.CategoryName
        ORDER BY c.CategoryName
    """))
    return result.mappings().all()


def get_checkpoint_trends(db: Session):
    """Monthly checkpoint metrics for trend analysis."""
    result = db.execute(text("""
        SELECT cp.CheckPointId, cp.Date, cp.StartDate, cp.EndDate,
               cp.TotalSpent, cp.TotalDistributedValue, cp.TotalWasteCost, cp.NetValue,
               cp.ItemsReceived, cp.ItemsDistributed, cp.ItemsWasted,
               cp.TransactionCount, cp.UniqueVisitors, cp.InvoiceCount,
               cp.AvgTransactionValue, cp.AvgItemsPerTransaction,
               cp.LowStockAlerts, cp.Notes,
               cat.CategoryName AS TopCategoryName
        FROM CheckPoint cp
        LEFT JOIN Category cat ON cp.TopCategoryId = cat.CategoryId
        ORDER BY cp.StartDate
    """))
    return result.mappings().all()

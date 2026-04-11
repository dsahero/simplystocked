"""
SimplyStocked - Sample Dataset Generator
-----------------------------------------
Generates realistic CSV files that mirror the two SQL query outputs used by
demand_forecast.py, so you can train/test the model without a live database.

Output files (saved next to this script):
  sample_stock_snapshot.csv   → mirrors STOCK_QUERY output
  sample_invoices.csv         → mirrors invoice_query() output

Usage:
  python generate_sample_data.py

Then run demand_forecast.py in CSV/offline mode, or load the CSVs manually in
a notebook. See demand_forecast_csv_demo.py for a ready-made offline runner.
"""

import os
import random
import numpy as np
import pandas as pd
from datetime import date, timedelta

random.seed(42)
np.random.seed(42)

# ---------------------------------------------------------------------------
# Output paths (same directory as this script)
# ---------------------------------------------------------------------------
HERE             = os.path.dirname(os.path.abspath(__file__))
STOCK_CSV_PATH   = os.path.join(HERE, "sample_stock_snapshot.csv")
INVOICE_CSV_PATH = os.path.join(HERE, "sample_invoices.csv")

# ---------------------------------------------------------------------------
# 1. Define product catalogue (mirrors FoodProduct + Category + StockSnapshot)
# ---------------------------------------------------------------------------

CATEGORIES = [
    (1, "Produce"),
    (2, "Dairy"),
    (3, "Bakery"),
    (4, "Canned Goods"),
    (5, "Frozen Foods"),
    (6, "Beverages"),
    (7, "Snacks"),
    (8, "Meat & Seafood"),
]

# (FoodProductId, ProductName, CategoryId, ProductPrice)
PRODUCTS = [
    # Produce
    (1,  "Apples",              1,  1.49),
    (2,  "Bananas",             1,  0.59),
    (3,  "Carrots",             1,  0.99),
    (4,  "Potatoes",            1,  1.29),
    (5,  "Spinach",             1,  2.49),
    # Dairy
    (6,  "Whole Milk",          2,  3.99),
    (7,  "Cheddar Cheese",      2,  4.99),
    (8,  "Greek Yogurt",        2,  2.79),
    (9,  "Butter",              2,  3.49),
    # Bakery
    (10, "White Bread",         3,  2.49),
    (11, "Whole Wheat Bread",   3,  2.99),
    (12, "Dinner Rolls",        3,  3.49),
    # Canned Goods
    (13, "Canned Tomatoes",     4,  1.19),
    (14, "Black Beans",         4,  0.99),
    (15, "Chicken Broth",       4,  1.79),
    (16, "Corn",                4,  0.89),
    # Frozen Foods
    (17, "Frozen Peas",         5,  2.29),
    (18, "Frozen Pizza",        5,  6.99),
    (19, "Ice Cream",           5,  4.49),
    # Beverages
    (20, "Orange Juice",        6,  3.29),
    (21, "Apple Juice",         6,  2.99),
    (22, "Sparkling Water",     6,  1.49),
    # Snacks
    (23, "Granola Bars",        7,  3.79),
    (24, "Crackers",            7,  2.89),
    (25, "Peanut Butter",       7,  4.29),
    # Meat & Seafood
    (26, "Chicken Breast",      8,  7.99),
    (27, "Ground Beef",         8,  6.49),
    (28, "Salmon Fillet",       8,  9.99),
]

# ---------------------------------------------------------------------------
# 2. Seasonal demand coefficients per category
#    Format: {month: multiplier}  — 1.0 = baseline
# ---------------------------------------------------------------------------

SEASONAL_PROFILES = {
    # Produce   — peaks in summer (fresh harvest) and fall
    1: {1:0.8, 2:0.8, 3:0.9, 4:1.0, 5:1.1, 6:1.3, 7:1.4, 8:1.3, 9:1.2, 10:1.1, 11:0.9, 12:0.8},
    # Dairy     — fairly stable, slight winter uptick
    2: {1:1.1, 2:1.0, 3:0.9, 4:0.9, 5:1.0, 6:1.0, 7:1.0, 8:1.0, 9:1.0, 10:1.0, 11:1.1, 12:1.2},
    # Bakery    — holiday peaks (Nov–Dec) and summer dip
    3: {1:1.0, 2:0.9, 3:0.9, 4:1.0, 5:1.0, 6:0.9, 7:0.8, 8:0.9, 9:1.0, 10:1.0, 11:1.2, 12:1.4},
    # Canned    — high in winter (comfort food / pantry stocking)
    4: {1:1.3, 2:1.2, 3:1.0, 4:0.9, 5:0.9, 6:0.8, 7:0.8, 8:0.9, 9:1.0, 10:1.1, 11:1.3, 12:1.4},
    # Frozen    — peaks in summer (ice cream) and winter (easy meals)
    5: {1:1.2, 2:1.0, 3:0.9, 4:0.9, 5:1.0, 6:1.2, 7:1.4, 8:1.3, 9:1.0, 10:0.9, 11:1.1, 12:1.2},
    # Beverages — summer peak (juices/water)
    6: {1:0.8, 2:0.8, 3:0.9, 4:1.0, 5:1.1, 6:1.4, 7:1.5, 8:1.4, 9:1.1, 10:0.9, 11:0.8, 12:0.9},
    # Snacks    — back-to-school (Aug–Sep) and holiday season
    7: {1:1.0, 2:0.9, 3:0.9, 4:1.0, 5:1.0, 6:1.0, 7:1.0, 8:1.2, 9:1.3, 10:1.1, 11:1.2, 12:1.3},
    # Meat      — summer BBQ season and holiday dinners
    8: {1:0.9, 2:0.9, 3:1.0, 4:1.0, 5:1.1, 6:1.3, 7:1.4, 8:1.3, 9:1.1, 10:1.0, 11:1.2, 12:1.3},
}

# Base purchase quantities per product (open_market, grocery_store)
BASE_DEMAND = {
    1:  (30, 50),  2:  (40, 70),  3:  (25, 40),  4:  (35, 60),  5:  (20, 35),
    6:  (50, 80),  7:  (30, 45),  8:  (25, 40),  9:  (20, 30),
    10: (40, 65),  11: (35, 55),  12: (25, 40),
    13: (45, 70),  14: (40, 60),  15: (30, 50),  16: (35, 55),
    17: (30, 45),  18: (20, 35),  19: (25, 40),
    20: (35, 60),  21: (30, 50),  22: (40, 65),
    23: (30, 45),  24: (35, 55),  25: (25, 40),
    26: (40, 65),  27: (35, 55),  28: (20, 35),
}

# ---------------------------------------------------------------------------
# 3. Generate stock snapshot (current state — one row per product)
# ---------------------------------------------------------------------------

def generate_stock_snapshot() -> pd.DataFrame:
    cat_map  = {cid: cname for cid, cname in CATEGORIES}
    rows = []
    for pid, pname, cid, price in PRODUCTS:
        base_om, base_gs = BASE_DEMAND[pid]
        # Current stock as a fraction of base demand
        om_qty  = int(base_om * random.uniform(0.3, 1.2))
        gs_qty  = int(base_gs * random.uniform(0.3, 1.2))
        total   = om_qty + gs_qty
        if total < 20:
            level = "Low"
        elif total < 60:
            level = "Medium"
        else:
            level = "High"

        rows.append({
            "FoodProductId":        pid,
            "ProductName":          pname,
            "CategoryId":           cid,
            "CategoryName":         cat_map[cid],
            "ProductPrice":         price,
            "total_stock":          total,
            "open_market_qty":      om_qty,
            "grocery_store_qty":    gs_qty,
            "StockLevel":           level,
            "LastUpdated":          pd.Timestamp.now().floor("s"),
        })

    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# 4. Generate invoice history (two years of weekly restocks)
# ---------------------------------------------------------------------------

def demand_for(pid: int, cid: int, invoice_date: date, noise: float = 0.15) -> tuple[int, int]:
    """Return (open_market_qty, grocery_store_qty) for a product on a given date."""
    month      = invoice_date.month
    seasonal   = SEASONAL_PROFILES[cid][month]
    base_om, base_gs = BASE_DEMAND[pid]

    # Slight upward trend over time (1 % growth per quarter)
    start = date(2023, 1, 1)
    quarters_elapsed = ((invoice_date - start).days) / 91
    trend = 1.0 + 0.01 * quarters_elapsed

    om  = base_om  * seasonal * trend * (1 + np.random.normal(0, noise))
    gs  = base_gs  * seasonal * trend * (1 + np.random.normal(0, noise))

    # Weekend spike: +10–20 % if invoice falls on a Friday
    if invoice_date.weekday() == 4:
        om *= random.uniform(1.10, 1.20)
        gs *= random.uniform(1.10, 1.20)

    return max(1, int(round(om))), max(1, int(round(gs)))


def generate_invoices(start: date, end: date) -> pd.DataFrame:
    """
    Simulate weekly invoices for every product between start and end dates.
    Not every product is ordered every week — each has an 85 % chance of
    appearing on any given invoice date.
    """
    rows = []
    current = start

    invoice_id   = 1
    inv_item_id  = 1

    while current <= end:
        # One invoice per week; date is the Monday of that week
        for pid, _, cid, _ in PRODUCTS:
            if random.random() < 0.85:          # 85 % chance of being ordered
                om_qty, gs_qty = demand_for(pid, cid, current)
                qty_received   = om_qty + gs_qty   # total received per invoice
                rows.append({
                    "FoodProductId": pid,
                    "invoice_date":  current,
                    "qty_received":  qty_received,
                    # The forecast model uses open_market_qty / grocery_store_qty
                    # from the stock snapshot join — we just need the invoice qty here.
                    # (Included below for optional standalone use / analysis)
                    "_open_market_qty_that_week":   om_qty,
                    "_grocery_store_qty_that_week": gs_qty,
                })
        current += timedelta(weeks=1)

    df = pd.DataFrame(rows)
    return df


# ---------------------------------------------------------------------------
# 5. Build the final aggregated invoice frame (matches invoice_query output)
# ---------------------------------------------------------------------------

def aggregate_invoices(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aggregate to match the exact columns returned by demand_forecast's
    invoice_query():
        FoodProductId | invoice_date | qty_received
    """
    agg = (
        df.groupby(["FoodProductId", "invoice_date"], as_index=False)
        .agg(qty_received=("qty_received", "sum"))
        .sort_values("invoice_date")
        .reset_index(drop=True)
    )
    return agg


# ---------------------------------------------------------------------------
# 6. Main
# ---------------------------------------------------------------------------

def main():
    print("Generating stock snapshot...")
    df_stock = generate_stock_snapshot()

    print("Generating invoice history (2023-01-02 -> today)...")
    start_date = date(2023, 1, 2)       # first Monday of 2023
    end_date   = date.today()
    df_raw     = generate_invoices(start_date, end_date)
    df_invoices = aggregate_invoices(df_raw)

    # Save
    df_stock.to_csv(STOCK_CSV_PATH, index=False)
    df_invoices.to_csv(INVOICE_CSV_PATH, index=False)

    print(f"\n[OK]  Files written:")
    print(f"   Stock snapshot : {STOCK_CSV_PATH}")
    print(f"                    {len(df_stock)} products")
    print(f"   Invoice history: {INVOICE_CSV_PATH}")
    print(f"                    {len(df_invoices):,} rows  |  "
          f"{df_invoices['invoice_date'].nunique()} unique invoice dates  |  "
          f"date range {df_invoices['invoice_date'].min()} -> {df_invoices['invoice_date'].max()}")
    print()
    print(">>  Run `python demand_forecast_csv_demo.py` to train and test the model")
    print("   using only these CSV files (no database required).")


if __name__ == "__main__":
    main()

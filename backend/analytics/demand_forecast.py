"""
SimplyStocked - Demand Forecasting & Restock Recommendation Script
------------------------------------------------------------------
Predicts how much of each product to restock for:
  - Open Market Hours program
  - Grocery Store Model program

Incremental Training Strategy:
  - On first run, trains from scratch and saves models to disk.
  - On subsequent runs, loads the saved models and updates them with only
    new invoices that arrived since the last run (warm-start via XGBoost's
    xgb_model parameter — new trees are appended, no full retraining).
  - Use --retrain flag to force a full retrain from scratch at any time.

Usage:
  python demand_forecast.py              # incremental update (default)
  python demand_forecast.py --retrain    # force full retrain from scratch

Requirements:
  pip install mysql-connector-python pandas xgboost scikit-learn python-dotenv tabulate
"""

import os
import sys
import json
import warnings
from datetime import datetime

import pandas as pd
import numpy as np
from dotenv import load_dotenv
import mysql.connector
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from tabulate import tabulate

warnings.filterwarnings("ignore")
load_dotenv()

# ---------------------------------------------------------------------------
# Paths for persisted model state
# ---------------------------------------------------------------------------

ANALYTICS_DIR    = os.path.dirname(os.path.abspath(__file__))
MODEL_OM_PATH    = os.path.join(ANALYTICS_DIR, "model_open_market.json")
MODEL_GS_PATH    = os.path.join(ANALYTICS_DIR, "model_grocery_store.json")
STATE_PATH       = os.path.join(ANALYTICS_DIR, "model_state.json")
RESULTS_CSV_PATH = os.path.join(ANALYTICS_DIR, "restock_recommendations.csv")


# ---------------------------------------------------------------------------
# 1. Model State (tracks last trained invoice date)
# ---------------------------------------------------------------------------

def load_state() -> dict:
    """Load persisted model state (last trained date, invoice count, etc.)."""
    if os.path.exists(STATE_PATH):
        with open(STATE_PATH, "r") as f:
            return json.load(f)
    return {"last_invoice_date": None, "total_invoices_trained": 0, "trained_at": None}


def save_state(last_invoice_date: str, total_invoices: int):
    """Persist model state after training."""
    state = {
        "last_invoice_date":      last_invoice_date,
        "total_invoices_trained": total_invoices,
        "trained_at":             datetime.now().isoformat(),
    }
    with open(STATE_PATH, "w") as f:
        json.dump(state, f, indent=2)


def models_exist() -> bool:
    """Return True if both saved model files exist on disk."""
    return os.path.exists(MODEL_OM_PATH) and os.path.exists(MODEL_GS_PATH)


# ---------------------------------------------------------------------------
# 2. Database Connection
# ---------------------------------------------------------------------------

def get_connection():
    """Create and return a MySQL database connection using .env credentials."""
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "simplystocked")
    )


# ---------------------------------------------------------------------------
# 3. Data Extraction
# ---------------------------------------------------------------------------

STOCK_QUERY = """
SELECT
    ss.FoodProductId,
    fp.ProductName,
    fp.CategoryId,
    c.CategoryName,
    fp.ProductPrice,
    ss.Quantity              AS total_stock,
    ss.OpenMarketQuantity    AS open_market_qty,
    ss.GroceryStoreQuantity  AS grocery_store_qty,
    ss.StockLevel,
    ss.LastUpdated
FROM stocksnapshot ss
JOIN foodproduct fp ON ss.FoodProductId = fp.FoodProductId
JOIN category    c  ON fp.CategoryId    = c.CategoryId
"""

def invoice_query(since_date: str = None) -> str:
    """
    Build an invoice query. If since_date is provided, only fetch invoices
    with a Date strictly after that date (for incremental updates).
    """
    base = """
    SELECT
        ii.FoodProductId,
        inv.Date           AS invoice_date,
        SUM(ii.Quantity)   AS qty_received
    FROM invoiceitem ii
    JOIN invoice inv ON ii.InvoiceId = inv.InvoiceId
    """
    if since_date:
        base += f"WHERE inv.Date > '{since_date}'\n"
    base += "GROUP BY ii.FoodProductId, inv.Date\nORDER BY inv.Date"
    return base


def load_data(conn, since_date: str = None):
    """
    Load stock snapshot and invoice data.
    If since_date is given, only load invoices newer than that date.
    """
    df_stock   = pd.read_sql(STOCK_QUERY, conn)
    df_invoice = pd.read_sql(invoice_query(since_date), conn)
    return df_stock, df_invoice


# ---------------------------------------------------------------------------
# 4. Feature Engineering
# ---------------------------------------------------------------------------

def build_features(df_stock: pd.DataFrame, df_invoice: pd.DataFrame) -> pd.DataFrame:
    """
    Merge stock snapshot with invoice history and engineer date-based features.
    Each row = one (product, invoice_date) combination.
    """
    df = df_invoice.merge(df_stock, on="FoodProductId", how="left")

    df["invoice_date"] = pd.to_datetime(df["invoice_date"])
    df["LastUpdated"]  = pd.to_datetime(df["LastUpdated"])

    df["month"]       = df["invoice_date"].dt.month
    df["week"]        = df["invoice_date"].dt.isocalendar().week.astype(int)
    df["day_of_year"] = df["invoice_date"].dt.day_of_year
    df["year"]        = df["invoice_date"].dt.year
    df["quarter"]     = df["invoice_date"].dt.quarter

    stock_level_map = {"Low": 1, "Medium": 2, "High": 3}
    df["stock_level_ordinal"] = df["StockLevel"].map(stock_level_map).fillna(2)

    return df


FEATURES = [
    "FoodProductId",
    "CategoryId",
    "ProductPrice",
    "total_stock",
    "qty_received",
    "stock_level_ordinal",
    "month",
    "week",
    "day_of_year",
    "quarter",
]

TARGET_OPEN_MARKET   = "open_market_qty"
TARGET_GROCERY_STORE = "grocery_store_qty"

XGB_PARAMS = dict(
    n_estimators=100,
    max_depth=4,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="reg:squarederror",
    random_state=42,
    verbosity=0,
)


# ---------------------------------------------------------------------------
# 5. Model Training (full) and Incremental Update
# ---------------------------------------------------------------------------

def train_full(X: pd.DataFrame, y: pd.Series, label: str, save_path: str) -> XGBRegressor:
    """
    Train an XGBoost model from scratch on all available data and save to disk.
    """
    model = XGBRegressor(**XGB_PARAMS)

    if len(X) > 5:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        mae   = mean_absolute_error(y_test, preds)
        r2    = r2_score(y_test, preds)
        print(f"  [{label}]  Full train — MAE: {mae:.2f}  |  R²: {r2:.3f}")
    else:
        print(f"  [{label}]  Limited data — training on all {len(X)} rows.")
        model.fit(X, y)

    model.save_model(save_path)
    return model


def update_incremental(
    X_new: pd.DataFrame,
    y_new: pd.Series,
    label: str,
    save_path: str,
) -> XGBRegressor:
    """
    Incrementally update an existing saved model with new data using XGBoost's
    warm-start (xgb_model). New trees are appended to the existing model —
    no full retraining required.
    """
    model = XGBRegressor(**XGB_PARAMS)
    # xgb_model= tells XGBoost to continue from this checkpoint
    model.fit(X_new, y_new, xgb_model=save_path)
    model.save_model(save_path)
    print(f"  [{label}]  Incremental update — {len(X_new)} new rows appended.")
    return model


def load_saved_models() -> tuple[XGBRegressor, XGBRegressor]:
    """Load both saved models from disk."""
    model_om = XGBRegressor()
    model_gs = XGBRegressor()
    model_om.load_model(MODEL_OM_PATH)
    model_gs.load_model(MODEL_GS_PATH)
    return model_om, model_gs


# ---------------------------------------------------------------------------
# 6. Restock Recommendation
# ---------------------------------------------------------------------------

def generate_restock_recommendations(
    df_stock: pd.DataFrame,
    model_om: XGBRegressor,
    model_gs: XGBRegressor,
    df_features: pd.DataFrame,
) -> pd.DataFrame:
    """
    Predict demand for each product and compute how much new stock is needed
    per program.  Restock = max(0, predicted_need − current_on_hand).
    """
    latest = (
        df_features
        .sort_values("invoice_date", ascending=False)
        .drop_duplicates(subset="FoodProductId")
        .copy()
    )

    X_pred  = latest[FEATURES]
    pred_om = model_om.predict(X_pred).clip(min=0)
    pred_gs = model_gs.predict(X_pred).clip(min=0)

    results = latest[["FoodProductId", "ProductName", "CategoryName",
                       "open_market_qty", "grocery_store_qty", "StockLevel"]].copy()

    results["predicted_open_market"]   = np.round(pred_om).astype(int)
    results["predicted_grocery_store"] = np.round(pred_gs).astype(int)

    results["restock_open_market"]   = (
        results["predicted_open_market"]   - results["open_market_qty"]
    ).clip(lower=0)

    results["restock_grocery_store"] = (
        results["predicted_grocery_store"] - results["grocery_store_qty"]
    ).clip(lower=0)

    results["restock_total"] = (
        results["restock_open_market"] + results["restock_grocery_store"]
    )

    return results.sort_values("restock_total", ascending=False).reset_index(drop=True)


# ---------------------------------------------------------------------------
# 7. Display Results
# ---------------------------------------------------------------------------

def print_results(results: pd.DataFrame):
    """Pretty-print restock recommendations to the console."""
    display = results[[
        "ProductName", "CategoryName", "StockLevel",
        "open_market_qty", "grocery_store_qty",
        "restock_open_market", "restock_grocery_store", "restock_total",
    ]].rename(columns={
        "ProductName":           "Product",
        "CategoryName":          "Category",
        "StockLevel":            "Stock Level",
        "open_market_qty":       "OM Current",
        "grocery_store_qty":     "GS Current",
        "restock_open_market":   "OM Restock",
        "restock_grocery_store": "GS Restock",
        "restock_total":         "Total Restock",
    })

    print("\n" + "=" * 80)
    print("  SIMPLYSTOCKED — RESTOCK RECOMMENDATIONS")
    print("=" * 80)
    print(tabulate(display, headers="keys", tablefmt="rounded_outline", showindex=False))
    print()

    urgent = results[results["StockLevel"] == "Low"]
    if not urgent.empty:
        print("⚠️  LOW STOCK ITEMS — Prioritize These:")
        for _, row in urgent.iterrows():
            print(f"   • {row['ProductName']:<30} "
                  f"Open Market: +{row['restock_open_market']}  |  "
                  f"Grocery Store: +{row['restock_grocery_store']}")
        print()


# ---------------------------------------------------------------------------
# 8. Main
# ---------------------------------------------------------------------------

def main():
    force_retrain = "--retrain" in sys.argv

    state         = load_state()
    last_date     = state["last_invoice_date"]    # None on first run
    total_trained = state["total_invoices_trained"]

    # Decide mode
    if force_retrain or not models_exist():
        mode = "full"
        since_date = None
        if force_retrain:
            print("\n🔄  --retrain flag detected. Performing full retrain from scratch.")
        else:
            print("\n🆕  No saved models found. Performing initial full training.")
    else:
        mode       = "incremental"
        since_date = last_date
        print(f"\n⚡  Saved models found (last trained: {state.get('trained_at', 'unknown')}).")
        print(f"    Loading incrementally — only invoices after {since_date or 'beginning'}.")

    print("Connecting to database...")
    conn = get_connection()

    print("Loading data...")
    # Always load the full stock snapshot (current state)
    # Only load invoices that are new since last run (or all if full retrain)
    df_stock, df_invoice_new = load_data(conn, since_date=since_date if mode == "incremental" else None)

    # For recommendations we always want all invoice features, not just new ones
    if mode == "incremental":
        _, df_invoice_all = load_data(conn, since_date=None)
    else:
        df_invoice_all = df_invoice_new

    conn.close()

    if df_invoice_new.empty and mode == "incremental":
        print("\n✅  No new invoices since last run. Models are already up to date.")
        print("    Loading saved models to generate fresh recommendations...\n")
        model_om, model_gs = load_saved_models()
        df_features_all    = build_features(df_stock, df_invoice_all)
        results            = generate_restock_recommendations(
            df_stock, model_om, model_gs, df_features_all
        )
        print_results(results)
        results.to_csv(RESULTS_CSV_PATH, index=False)
        print(f"  Results saved to: {RESULTS_CSV_PATH}\n")
        return

    if df_invoice_new.empty and mode == "full":
        print("\n⚠️  No invoice data found. Cannot train without historical data.\n")
        return

    new_count = len(df_invoice_new)
    print(f"  {new_count} new invoice line(s) to process.\n")

    # Build features for new data (used for training update)
    df_features_new = build_features(df_stock, df_invoice_new)
    X_new = df_features_new[FEATURES]
    y_om_new = df_features_new[TARGET_OPEN_MARKET]
    y_gs_new = df_features_new[TARGET_GROCERY_STORE]

    # Build features for ALL data (used to generate recommendations)
    df_features_all = build_features(df_stock, df_invoice_all)

    print("Updating models...")
    if mode == "full":
        model_om = train_full(X_new, y_om_new, "Open Market",   MODEL_OM_PATH)
        model_gs = train_full(X_new, y_gs_new, "Grocery Store", MODEL_GS_PATH)
    else:
        model_om = update_incremental(X_new, y_om_new, "Open Market",   MODEL_OM_PATH)
        model_gs = update_incremental(X_new, y_gs_new, "Grocery Store", MODEL_GS_PATH)

    # Persist the latest invoice date so next run knows where to start
    latest_invoice_date = str(df_invoice_new["invoice_date"].max().date())
    save_state(latest_invoice_date, total_trained + new_count)

    print("\nGenerating restock recommendations...")
    results = generate_restock_recommendations(df_stock, model_om, model_gs, df_features_all)
    print_results(results)

    results.to_csv(RESULTS_CSV_PATH, index=False)
    print(f"  Results saved to: {RESULTS_CSV_PATH}\n")
    print(f"  Models saved to:  {ANALYTICS_DIR}\n")


if __name__ == "__main__":
    main()

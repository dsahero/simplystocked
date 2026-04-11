import os
import csv
import json
from fastapi import APIRouter

router = APIRouter(prefix="/predictions", tags=["Predictions"])

ANALYTICS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "analytics")


def _read_csv(filename):
    path = os.path.join(ANALYTICS_DIR, filename)
    if not os.path.exists(path):
        return []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = []
        for row in reader:
            # Convert numeric fields
            for key in row:
                try:
                    if "." in row[key]:
                        row[key] = float(row[key])
                    else:
                        row[key] = int(row[key])
                except (ValueError, TypeError):
                    pass
            rows.append(row)
        return rows


def _read_model_state():
    path = os.path.join(ANALYTICS_DIR, "model_state.json")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


@router.get("/restock")
def get_restock_recommendations():
    """Restock recommendations from the latest ML prediction run."""
    return _read_csv("restock_recommendations.csv")


@router.get("/model-state")
def get_model_state():
    """Training metadata: last trained date, invoice count, etc."""
    return _read_model_state()


@router.get("/summary")
def get_prediction_summary():
    """Aggregated summary of restock needs for the dashboard."""
    recs = _read_csv("restock_recommendations.csv")
    state = _read_model_state()

    needs_restock = [r for r in recs if r.get("restock_total", 0) > 0]
    well_stocked = [r for r in recs if r.get("restock_total", 0) == 0]

    total_restock_units = sum(r.get("restock_total", 0) for r in recs)
    total_open_market = sum(r.get("restock_open_market", 0) for r in recs)
    total_grocery = sum(r.get("restock_grocery_store", 0) for r in recs)

    # Group restock by category
    by_category = {}
    for r in needs_restock:
        cat = r.get("CategoryName", "Unknown")
        if cat not in by_category:
            by_category[cat] = {"category": cat, "products": 0, "total_units": 0}
        by_category[cat]["products"] += 1
        by_category[cat]["total_units"] += r.get("restock_total", 0)

    # Top urgent items (highest restock)
    urgent = sorted(needs_restock, key=lambda r: r.get("restock_total", 0), reverse=True)[:5]

    return {
        "model_state": state,
        "total_products": len(recs),
        "needs_restock_count": len(needs_restock),
        "well_stocked_count": len(well_stocked),
        "total_restock_units": total_restock_units,
        "total_open_market_restock": total_open_market,
        "total_grocery_restock": total_grocery,
        "by_category": list(by_category.values()),
        "urgent_items": urgent,
    }

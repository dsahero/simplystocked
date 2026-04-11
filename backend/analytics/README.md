# SimplyStocked — Demand Forecasting

Predicts how much of each product to restock for the **Open Market** and **Grocery Store** programs using XGBoost regression trained on invoice history and current stock snapshot data.

## Setup

### 1. Install dependencies
```bash
pip install mysql-connector-python pandas xgboost scikit-learn python-dotenv tabulate
```

### 2. Configure your database credentials
Copy `.env.example` to `.env` and fill in your MySQL credentials:
```bash
cp .env.example .env
```

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=simplystocked
```

### 3. Run the script
```bash
cd backend/analytics
python demand_forecast.py
```

## Output

The script prints a restock recommendation table to the console, highlights low-stock items, and saves results to `restock_recommendations.csv`.

| Column | Description |
|---|---|
| OM Current | Current Open Market quantity on hand |
| GS Current | Current Grocery Store quantity on hand |
| OM Restock | Recommended units to add for Open Market |
| GS Restock | Recommended units to add for Grocery Store |
| Total Restock | Combined restock recommendation |

## How It Works

1. **Data** — Pulls `StockSnapshot` (current stock split by program) and `InvoiceItem` (historical received quantities with dates) from MySQL.
2. **Features** — Uses product ID, category, price, stock level, and date-based signals (month, week, quarter) from invoice history.
3. **Models** — Trains two separate XGBoost regressors: one targeting `OpenMarketQuantity`, one targeting `GroceryStoreQuantity`.
4. **Recommendations** — Computes `restock = max(0, predicted_need − current_on_hand)` for each program.

## Notes

- Model accuracy improves significantly as more invoice records accumulate over time.
- Once `Transaction` / `TransactionItem` data is populated with real distribution records, switch the targets to actual demand quantities for more accurate predictions.

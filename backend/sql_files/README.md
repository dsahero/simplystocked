# sql_files

Run these in order in MySQL Workbench. Each file is self-contained with a USE statement.

| File | What it seeds | Depends on |
|------|--------------|------------|
| `00_reset.sql` | Clears all tables | — |
| `01_categories.sql` | 6 food categories | — |
| `02_brands.sql` | 4 brands | — |
| `03_vendors.sql` | 3 vendors (Feeding SW VA, Homefield Farm, NRV Food Bank) | — |
| `04_users.sql` | 4 users (admin, manager, 2 users) | — |
| `05_products_and_stock.sql` | 15 products + stock snapshots | 01, 02 |
| `06_invoice_addresses.sql` | 9 address records (From/BillTo/Delivery per invoice) | — |
| `07_invoices.sql` | 3 invoices | 03, 06 |
| `08_invoice_items.sql` | 15 line items + recalculates totals | 05, 07 |
| `09_checkpoints.sql` | 2 checkpoints (Fall 2025, Spring 2026) | — |
| `10_transactions.sql` | 4 distribution events + 19 transaction items | 05, 09 |

## Notes

- **Circular FK** between `foodproduct` ↔ `stocksnapshot` is handled in `05_products_and_stock.sql`
  by inserting products with `NULL` first, then updating after snapshots are created.
- **`transaction`** is a reserved word — always wrap in backticks in raw SQL.
- **Passwords** in `04_users.sql` are placeholder hashes. Generate real ones with:
  ```python
  from passlib.context import CryptContext
  print(CryptContext(schemes=["bcrypt"]).hash("your_password"))
  ```
- **Role values**: `'admin'` | `'manager'` | `'user'`

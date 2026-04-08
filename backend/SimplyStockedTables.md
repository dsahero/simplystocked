TABLE: FoodProduct 

+---------------+---------------------------------------+ 

| Column        | Notes                                 | 

+---------------+---------------------------------------+ 

| FoodProductId | INT, PK, AUTO_INCREMENT               | 

| ProductName   | VARCHAR(255)                          | 

| ProductPrice  | DECIMAL(10,2)                         | 

| StockLevelId  | INT, FK → StockSnapshot               | 

| CategoryId    | INT, FK → Category                    | 

+---------------+---------------------------------------+ 

  

TABLE: Category 

+--------------+------------------------------+ 

| Column       | Notes                        | 

+--------------+------------------------------+ 

| CategoryId   | INT, PK, AUTO_INCREMENT      | 

| CategoryName | VARCHAR(255)                 | 

+--------------+------------------------------+ 

  

TABLE: Brand 

+-----------+------------------------------+ 

| Column    | Notes                        | 

+-----------+------------------------------+ 

| BrandId   | INT, PK, AUTO_INCREMENT      | 

| BrandName | VARCHAR(255)                 | 

+-----------+------------------------------+ 

  

TABLE: Vendor 

+-----------+------------------------------+ 

| Column    | Notes                        | 

+-----------+------------------------------+ 

| VendorId  | INT, PK, AUTO_INCREMENT      | 

| Email     | VARCHAR(255)                 | 

| Phone     | VARCHAR(20)                  | 

| HQAddress | VARCHAR(255)                 | 

| HQCity    | VARCHAR(100)                 | 

| HQState   | VARCHAR(50)                  | 

| HQZip     | VARCHAR(10)                  | 

+-----------+------------------------------+ 

  

TABLE: Invoice 

+--------------------+----------------------------------------------+ 

| Column             | Notes                                        | 

+--------------------+----------------------------------------------+ 

| InvoiceId          | INT, PK, AUTO_INCREMENT                      | 

| Date               | DATE                                         | 

| Desc               | TEXT                                         | 

| TotalPrice         | DECIMAL(10,2)                                | 

| VendorId           | INT, FK → Vendor                             | 

| InvoiceFromId      | INT, FK → InvoiceAddressDetails              | 

| InvoiceBillToId    | INT, FK → InvoiceAddressDetails              | 

| InvoiceDeliveryId  | INT, FK → InvoiceAddressDetails              | 

+--------------------+----------------------------------------------+ 

  

TABLE: InvoiceAddressDetails 

+------------------------+------------------------------+ 

| Column                 | Notes                        | 

+------------------------+------------------------------+ 

| InvoiceAddressDetailsId| INT, PK, AUTO_INCREMENT      | 

| Attn                   | VARCHAR(255)                 | 

| Address                | VARCHAR(255)                 | 

| City                   | VARCHAR(100)                 | 

| State                  | VARCHAR(50)                  | 

| Zip                    | VARCHAR(10)                  | 

| Phone                  | VARCHAR(20)                  | 

| Email                  | VARCHAR(255)                 | 

+------------------------+------------------------------+ 

  

TABLE: InvoiceItem 

+---------------+-------------------------------+ 

| Column        | Notes                         | 

+---------------+-------------------------------+ 

| InvoiceItemId | INT, PK, AUTO_INCREMENT       | 

| InvoiceId     | INT, FK → Invoice             | 

| FoodProductId | INT, FK → FoodProduct         | 

| Quantity      | INT                           | 

| UnitPrice     | DECIMAL(10,2)                 | 

+---------------+-------------------------------+ 

  

TABLE: CheckPoint 

+--------------+------------------------------+ 

| Column       | Notes                        | 

+--------------+------------------------------+ 

| CheckPointId | INT, PK, AUTO_INCREMENT      | 

| Date         | DATE                         | 

| StartDate    | DATE                         | 

| EndDate      | DATE                         | 

+--------------+------------------------------+ 

  

TABLE: Transaction 

+---------------+------------------------------+ 

| Column        | Notes                        | 

+---------------+------------------------------+ 

| TransactionId | INT, PK, AUTO_INCREMENT      | 

| CheckPointId  | INT, FK → CheckPoint         | 

| TotalAmount   | DECIMAL(10,2)                | 

+---------------+------------------------------+ 

  

TABLE: TransactionItem 

+-------------------+------------------------------+ 

| Column            | Notes                        | 

+-------------------+------------------------------+ 

| TransactionItemId | INT, PK, AUTO_INCREMENT      | 

| TransactionId     | INT, FK → Transaction        | 

| FoodProductId     | INT, FK → FoodProduct        | 

| Quantity          | INT                          | 

+-------------------+------------------------------+ 

  

TABLE: StockSnapshot 

+----------------------+------------------------------+ 

| Column               | Notes                        | 

+----------------------+------------------------------+ 

| StockLevelId         | INT, PK, AUTO_INCREMENT      | 

| FoodProductId        | INT, FK → FoodProduct        | 

| StockLevel           | VARCHAR(50)                  | 

| Quantity             | INT                          | 

| LastUpdated          | TIMESTAMP                    | 

| OpenMarketQuantity   | INT                          | 

| GroceryStoreQuantity | INT                          | 

+----------------------+------------------------------+ 

  

TABLE: Users 

+---------------+-------------------------------------------+ 

| Column        | Notes                                     | 

+---------------+-------------------------------------------+ 

| UserId        | INT, PK, AUTO_INCREMENT                   | 

| Username      | VARCHAR(100)                              | 

| password_hash | VARCHAR(255)                              | 

| Role          | ENUM('admin', 'manager', volunteer)          | 

+---------------+-------------------------------------------+ 
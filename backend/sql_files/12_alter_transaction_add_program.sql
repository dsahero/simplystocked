-- Add Program column to Transaction table
ALTER TABLE `transaction`
ADD COLUMN `Program` ENUM('open_market', 'grocery') NOT NULL DEFAULT 'open_market'
AFTER `UserId`;

-- Seed existing transactions: if majority of items are perishable categories → grocery
UPDATE `transaction` t
SET Program = CASE
    WHEN (
        SELECT COUNT(*) FROM TransactionItem ti
        JOIN FoodProduct fp ON ti.FoodProductId = fp.FoodProductId
        JOIN Category c ON fp.CategoryId = c.CategoryId
        WHERE ti.TransactionId = t.TransactionId
        AND c.CategoryName IN ('Produce','Dairy','Dairy Substitutes','Protein','Frozen')
    ) >= (
        SELECT COUNT(*) FROM TransactionItem ti
        JOIN FoodProduct fp ON ti.FoodProductId = fp.FoodProductId
        JOIN Category c ON fp.CategoryId = c.CategoryId
        WHERE ti.TransactionId = t.TransactionId
        AND c.CategoryName IN ('Non-Perishables','Grains','Snacks','Beverages','Condiments','Bakery')
    )
    THEN 'grocery'
    ELSE 'open_market'
END;

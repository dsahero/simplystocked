-- Add VendorName column to Vendor table
ALTER TABLE Vendor
ADD COLUMN VendorName VARCHAR(255) NOT NULL DEFAULT '' AFTER VendorId;

-- Seed the existing vendors with names (adjust IDs to match your data)
UPDATE Vendor SET VendorName = 'Feeding Southwest Virginia' WHERE VendorId = 1;
UPDATE Vendor SET VendorName = 'Keany Produce & Gourmet'    WHERE VendorId = 2;
UPDATE Vendor SET VendorName = 'US Foods'                   WHERE VendorId = 3;

-- Run this SQL against your SimplyStocked MySQL database.
-- Creates the admin user (username: admin@simplystocked.com, password: password)
-- Also seeds a default category so products can be added.

-- 1. Create the admin user
INSERT INTO Users (Username, password_hash, Role)
VALUES (
    'admin@simplystocked.com',
    '$2b$12$IbmIk5SqirOuNLRdzU6yk.Lt2YjwTihcRe1e0k58Dzmogs4ZD9niG',
    'admin'
)
ON DUPLICATE KEY UPDATE UserId = UserId;

-- 2. Seed a default "General" category (required before adding products)
INSERT IGNORE INTO Category (CategoryName) VALUES ('General');
INSERT IGNORE INTO Category (CategoryName) VALUES ('Produce');
INSERT IGNORE INTO Category (CategoryName) VALUES ('Dairy');
INSERT IGNORE INTO Category (CategoryName) VALUES ('Bakery');
INSERT IGNORE INTO Category (CategoryName) VALUES ('Canned Goods');
INSERT IGNORE INTO Category (CategoryName) VALUES ('Frozen');
INSERT IGNORE INTO Category (CategoryName) VALUES ('Beverages');

SELECT 'Admin user and categories created successfully.' AS Status;

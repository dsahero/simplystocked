-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: simplystocked
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `brand`
--

DROP TABLE IF EXISTS `brand`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `brand` (
  `BrandId` int NOT NULL AUTO_INCREMENT,
  `BrandName` varchar(255) NOT NULL,
  PRIMARY KEY (`BrandId`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `brand`
--

LOCK TABLES `brand` WRITE;
/*!40000 ALTER TABLE `brand` DISABLE KEYS */;
INSERT INTO `brand` VALUES (1,'Great Value'),(2,'Nature\'s Own'),(3,'Del Monte'),(4,'General Mills');
/*!40000 ALTER TABLE `brand` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `category`
--

DROP TABLE IF EXISTS `category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category` (
  `CategoryId` int NOT NULL AUTO_INCREMENT,
  `CategoryName` varchar(255) NOT NULL,
  PRIMARY KEY (`CategoryId`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category`
--

LOCK TABLES `category` WRITE;
/*!40000 ALTER TABLE `category` DISABLE KEYS */;
INSERT INTO `category` VALUES (1,'Produce'),(2,'Dairy'),(3,'Dairy Substitutes'),(4,'Protein'),(5,'Non-Perishables'),(6,'Grains');
/*!40000 ALTER TABLE `category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `checkpoint`
--

DROP TABLE IF EXISTS `checkpoint`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `checkpoint` (
  `CheckPointId` int NOT NULL AUTO_INCREMENT,
  `Date` date DEFAULT NULL,
  `StartDate` date DEFAULT NULL,
  `EndDate` date DEFAULT NULL,
  PRIMARY KEY (`CheckPointId`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `checkpoint`
--

LOCK TABLES `checkpoint` WRITE;
/*!40000 ALTER TABLE `checkpoint` DISABLE KEYS */;
INSERT INTO `checkpoint` VALUES (1,'2025-12-31','2025-08-01','2025-12-31'),(2,'2026-04-08','2026-01-01','2026-04-30');
/*!40000 ALTER TABLE `checkpoint` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `foodproduct`
--

DROP TABLE IF EXISTS `foodproduct`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `foodproduct` (
  `FoodProductId` int NOT NULL AUTO_INCREMENT,
  `ProductName` varchar(255) NOT NULL,
  `ProductPrice` decimal(10,2) DEFAULT NULL,
  `StockLevelId` int DEFAULT NULL,
  `CategoryId` int DEFAULT NULL,
  PRIMARY KEY (`FoodProductId`),
  KEY `CategoryId` (`CategoryId`),
  KEY `fk_foodproduct_stocksnapshot` (`StockLevelId`),
  CONSTRAINT `fk_foodproduct_stocksnapshot` FOREIGN KEY (`StockLevelId`) REFERENCES `stocksnapshot` (`StockLevelId`),
  CONSTRAINT `foodproduct_ibfk_1` FOREIGN KEY (`CategoryId`) REFERENCES `category` (`CategoryId`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `foodproduct`
--

LOCK TABLES `foodproduct` WRITE;
/*!40000 ALTER TABLE `foodproduct` DISABLE KEYS */;
INSERT INTO `foodproduct` VALUES (1,'Whole Milk (1 gal)',2.99,1,2),(2,'White Bread (loaf)',1.49,2,6),(3,'Canned Corn (15 oz)',0.89,3,5),(4,'Canned Green Beans (15 oz)',0.89,4,5),(5,'Canned Chicken (12.5 oz)',2.49,5,4),(6,'Peanut Butter (16 oz)',3.99,6,4),(7,'Brown Rice (2 lb)',2.49,7,6),(8,'Penne Pasta (1 lb)',1.29,8,6),(9,'Oat Milk (64 oz)',3.99,9,3),(10,'Canned Diced Tomatoes',1.19,10,5),(11,'Eggs (dozen)',3.49,11,4),(12,'Apples (3 lb bag)',3.99,12,1),(13,'Bananas (bunch)',1.49,13,1),(14,'Baby Carrots (1 lb)',1.99,14,1),(15,'Chicken Breast (2 lb)',5.99,15,4);
/*!40000 ALTER TABLE `foodproduct` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice`
--

DROP TABLE IF EXISTS `invoice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice` (
  `InvoiceId` int NOT NULL AUTO_INCREMENT,
  `Date` date DEFAULT NULL,
  `Desc` text,
  `TotalPrice` decimal(10,2) DEFAULT NULL,
  `VendorId` int DEFAULT NULL,
  `InvoiceFromId` int DEFAULT NULL,
  `InvoiceBillToId` int DEFAULT NULL,
  `InvoiceDeliveryId` int DEFAULT NULL,
  PRIMARY KEY (`InvoiceId`),
  KEY `VendorId` (`VendorId`),
  KEY `InvoiceFromId` (`InvoiceFromId`),
  KEY `InvoiceBillToId` (`InvoiceBillToId`),
  KEY `InvoiceDeliveryId` (`InvoiceDeliveryId`),
  CONSTRAINT `invoice_ibfk_1` FOREIGN KEY (`VendorId`) REFERENCES `vendor` (`VendorId`),
  CONSTRAINT `invoice_ibfk_2` FOREIGN KEY (`InvoiceFromId`) REFERENCES `invoiceaddressdetails` (`InvoiceAddressDetailsId`),
  CONSTRAINT `invoice_ibfk_3` FOREIGN KEY (`InvoiceBillToId`) REFERENCES `invoiceaddressdetails` (`InvoiceAddressDetailsId`),
  CONSTRAINT `invoice_ibfk_4` FOREIGN KEY (`InvoiceDeliveryId`) REFERENCES `invoiceaddressdetails` (`InvoiceAddressDetailsId`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice`
--

LOCK TABLES `invoice` WRITE;
/*!40000 ALTER TABLE `invoice` DISABLE KEYS */;
INSERT INTO `invoice` VALUES (1,'2026-01-15','January non-perishables donation',202.10,1,1,2,3),(2,'2026-02-10','February produce from Homefield Farm',317.91,2,4,5,6),(3,'2026-03-05','March mixed goods from NRV Food Bank',259.78,3,7,8,9);
/*!40000 ALTER TABLE `invoice` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoiceaddressdetails`
--

DROP TABLE IF EXISTS `invoiceaddressdetails`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoiceaddressdetails` (
  `InvoiceAddressDetailsId` int NOT NULL AUTO_INCREMENT,
  `Attn` varchar(255) DEFAULT NULL,
  `Address` varchar(255) DEFAULT NULL,
  `City` varchar(100) DEFAULT NULL,
  `State` varchar(50) DEFAULT NULL,
  `Zip` varchar(10) DEFAULT NULL,
  `Phone` varchar(20) DEFAULT NULL,
  `Email` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`InvoiceAddressDetailsId`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoiceaddressdetails`
--

LOCK TABLES `invoiceaddressdetails` WRITE;
/*!40000 ALTER TABLE `invoiceaddressdetails` DISABLE KEYS */;
INSERT INTO `invoiceaddressdetails` VALUES (1,'Donations Coordinator','1025 Electric Rd','Salem','VA','24153','540-342-3011','contact@feedingswva.org'),(2,'The Market of VT','801 University City Blvd','Blacksburg','VA','24060','540-231-3086','themarket@vt.edu'),(3,'The Market of VT','801 University City Blvd','Blacksburg','VA','24060','540-231-3086','themarket@vt.edu'),(4,'Farm Manager','595 Prices Fork Rd','Blacksburg','VA','24061','540-231-0001','homefield@vt.edu'),(5,'The Market of VT','801 University City Blvd','Blacksburg','VA','24060','540-231-3086','themarket@vt.edu'),(6,'The Market of VT','801 University City Blvd','Blacksburg','VA','24060','540-231-3086','themarket@vt.edu'),(7,'Distribution Team','1573 N Franklin St','Christiansburg','VA','24073','540-381-1080','info@nrvfoodbank.org'),(8,'The Market of VT','801 University City Blvd','Blacksburg','VA','24060','540-231-3086','themarket@vt.edu'),(9,'The Market of VT','801 University City Blvd','Blacksburg','VA','24060','540-231-3086','themarket@vt.edu');
/*!40000 ALTER TABLE `invoiceaddressdetails` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoiceitem`
--

DROP TABLE IF EXISTS `invoiceitem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoiceitem` (
  `InvoiceItemId` int NOT NULL AUTO_INCREMENT,
  `InvoiceId` int DEFAULT NULL,
  `FoodProductId` int DEFAULT NULL,
  `Quantity` int DEFAULT NULL,
  `UnitPrice` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`InvoiceItemId`),
  KEY `InvoiceId` (`InvoiceId`),
  KEY `FoodProductId` (`FoodProductId`),
  CONSTRAINT `invoiceitem_ibfk_1` FOREIGN KEY (`InvoiceId`) REFERENCES `invoice` (`InvoiceId`),
  CONSTRAINT `invoiceitem_ibfk_2` FOREIGN KEY (`FoodProductId`) REFERENCES `foodproduct` (`FoodProductId`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoiceitem`
--

LOCK TABLES `invoiceitem` WRITE;
/*!40000 ALTER TABLE `invoiceitem` DISABLE KEYS */;
INSERT INTO `invoiceitem` VALUES (1,1,3,40,0.89),(2,1,4,25,0.89),(3,1,10,50,1.19),(4,1,5,10,2.49),(5,1,6,15,3.99),(6,2,12,20,3.99),(7,2,13,30,1.49),(8,2,14,25,1.99),(9,2,11,24,3.49),(10,2,15,10,5.99),(11,3,1,20,2.99),(12,3,2,30,1.49),(13,3,7,25,2.49),(14,3,8,35,1.29),(15,3,9,12,3.99);
/*!40000 ALTER TABLE `invoiceitem` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stocksnapshot`
--

DROP TABLE IF EXISTS `stocksnapshot`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stocksnapshot` (
  `StockLevelId` int NOT NULL AUTO_INCREMENT,
  `FoodProductId` int DEFAULT NULL,
  `StockLevel` varchar(50) DEFAULT NULL,
  `Quantity` int DEFAULT NULL,
  `LastUpdated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `OpenMarketQuantity` int DEFAULT NULL,
  `GroceryStoreQuantity` int DEFAULT NULL,
  PRIMARY KEY (`StockLevelId`),
  KEY `FoodProductId` (`FoodProductId`),
  CONSTRAINT `stocksnapshot_ibfk_1` FOREIGN KEY (`FoodProductId`) REFERENCES `foodproduct` (`FoodProductId`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stocksnapshot`
--

LOCK TABLES `stocksnapshot` WRITE;
/*!40000 ALTER TABLE `stocksnapshot` DISABLE KEYS */;
INSERT INTO `stocksnapshot` VALUES (1,1,'Medium',30,'2026-04-08 19:04:04',15,15),(2,2,'High',60,'2026-04-08 19:04:04',30,30),(3,3,'High',80,'2026-04-08 19:04:04',40,40),(4,4,'Medium',45,'2026-04-08 19:04:04',20,25),(5,5,'Low',8,'2026-04-08 19:04:04',5,3),(6,6,'Medium',25,'2026-04-08 19:04:04',10,15),(7,7,'High',55,'2026-04-08 19:04:04',25,30),(8,8,'High',70,'2026-04-08 19:04:04',35,35),(9,9,'Low',6,'2026-04-08 19:04:04',4,2),(10,10,'High',90,'2026-04-08 19:04:04',45,45),(11,11,'Medium',24,'2026-04-08 19:04:04',12,12),(12,12,'Low',9,'2026-04-08 19:04:04',5,4),(13,13,'Medium',20,'2026-04-08 19:04:04',10,10),(14,14,'Low',7,'2026-04-08 19:04:04',4,3),(15,15,'Low',5,'2026-04-08 19:04:04',3,2);
/*!40000 ALTER TABLE `stocksnapshot` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transaction`
--

DROP TABLE IF EXISTS `transaction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transaction` (
  `TransactionId` int NOT NULL AUTO_INCREMENT,
  `CheckPointId` int DEFAULT NULL,
  `TotalAmount` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`TransactionId`),
  KEY `CheckPointId` (`CheckPointId`),
  CONSTRAINT `transaction_ibfk_1` FOREIGN KEY (`CheckPointId`) REFERENCES `checkpoint` (`CheckPointId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transaction`
--

LOCK TABLES `transaction` WRITE;
/*!40000 ALTER TABLE `transaction` DISABLE KEYS */;
/*!40000 ALTER TABLE `transaction` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactionitem`
--

DROP TABLE IF EXISTS `transactionitem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactionitem` (
  `TransactionItemId` int NOT NULL AUTO_INCREMENT,
  `TransactionId` int DEFAULT NULL,
  `FoodProductId` int DEFAULT NULL,
  `Quantity` int DEFAULT NULL,
  PRIMARY KEY (`TransactionItemId`),
  KEY `TransactionId` (`TransactionId`),
  KEY `FoodProductId` (`FoodProductId`),
  CONSTRAINT `transactionitem_ibfk_1` FOREIGN KEY (`TransactionId`) REFERENCES `transaction` (`TransactionId`),
  CONSTRAINT `transactionitem_ibfk_2` FOREIGN KEY (`FoodProductId`) REFERENCES `foodproduct` (`FoodProductId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactionitem`
--

LOCK TABLES `transactionitem` WRITE;
/*!40000 ALTER TABLE `transactionitem` DISABLE KEYS */;
/*!40000 ALTER TABLE `transactionitem` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `UserId` int NOT NULL AUTO_INCREMENT,
  `Username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `Role` enum('admin','manager','user') NOT NULL,
  PRIMARY KEY (`UserId`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','$2b$12$LQv3c1yqBWVHxkd0LHAkCO3V.OT4E5CKA1GsIv9JzW2.BgfK2Q5Vu','admin'),(2,'mgr_shannon','$2b$12$LQv3c1yqBWVHxkd0LHAkCO3V.OT4E5CKA1GsIv9JzW2.BgfK2Q5Vu','manager'),(3,'user_brenna','$2b$12$LQv3c1yqBWVHxkd0LHAkCO3V.OT4E5CKA1GsIv9JzW2.BgfK2Q5Vu','user'),(4,'user_ellie','$2b$12$LQv3c1yqBWVHxkd0LHAkCO3V.OT4E5CKA1GsIv9JzW2.BgfK2Q5Vu','user');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor`
--

DROP TABLE IF EXISTS `vendor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor` (
  `VendorId` int NOT NULL AUTO_INCREMENT,
  `Email` varchar(255) DEFAULT NULL,
  `Phone` varchar(20) DEFAULT NULL,
  `HQAddress` varchar(255) DEFAULT NULL,
  `HQCity` varchar(100) DEFAULT NULL,
  `HQState` varchar(50) DEFAULT NULL,
  `HQZip` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`VendorId`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor`
--

LOCK TABLES `vendor` WRITE;
/*!40000 ALTER TABLE `vendor` DISABLE KEYS */;
INSERT INTO `vendor` VALUES (1,'contact@feedingswva.org','540-342-3011','1025 Electric Rd','Salem','VA','24153'),(2,'homefield@vt.edu','540-231-0001','595 Prices Fork Rd','Blacksburg','VA','24061'),(3,'info@nrvfoodbank.org','540-381-1080','1573 N Franklin St','Christiansburg','VA','24073');
/*!40000 ALTER TABLE `vendor` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-08 15:52:33

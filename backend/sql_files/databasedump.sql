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
-- Table structure for table `Brand`
--

DROP TABLE IF EXISTS `Brand`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Brand` (
  `BrandId` int NOT NULL AUTO_INCREMENT,
  `BrandName` varchar(255) NOT NULL,
  PRIMARY KEY (`BrandId`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Brand`
--

LOCK TABLES `Brand` WRITE;
/*!40000 ALTER TABLE `Brand` DISABLE KEYS */;
INSERT INTO `Brand` VALUES (1,'Great Value'),(2,'Nature\'s Own'),(3,'Del Monte'),(4,'General Mills');
/*!40000 ALTER TABLE `Brand` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Category`
--

DROP TABLE IF EXISTS `Category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Category` (
  `CategoryId` int NOT NULL AUTO_INCREMENT,
  `CategoryName` varchar(255) NOT NULL,
  PRIMARY KEY (`CategoryId`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Category`
--

LOCK TABLES `Category` WRITE;
/*!40000 ALTER TABLE `Category` DISABLE KEYS */;
INSERT INTO `Category` VALUES (1,'Produce'),(2,'Dairy'),(3,'Dairy Substitutes'),(4,'Protein'),(5,'Non-Perishables'),(6,'Grains');
/*!40000 ALTER TABLE `Category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `CheckPoint`
--

DROP TABLE IF EXISTS `CheckPoint`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CheckPoint` (
  `CheckPointId` int NOT NULL AUTO_INCREMENT,
  `Date` date DEFAULT NULL,
  `StartDate` date DEFAULT NULL,
  `EndDate` date DEFAULT NULL,
  PRIMARY KEY (`CheckPointId`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `CheckPoint`
--

LOCK TABLES `CheckPoint` WRITE;
/*!40000 ALTER TABLE `CheckPoint` DISABLE KEYS */;
INSERT INTO `CheckPoint` VALUES (1,'2025-12-31','2025-08-01','2025-12-31'),(2,'2026-04-08','2026-01-01','2026-04-30');
/*!40000 ALTER TABLE `CheckPoint` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `FoodProduct`
--

DROP TABLE IF EXISTS `FoodProduct`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `FoodProduct` (
  `FoodProductId` int NOT NULL AUTO_INCREMENT,
  `ProductName` varchar(255) NOT NULL,
  `ProductPrice` decimal(10,2) DEFAULT NULL,
  `StockLevelId` int DEFAULT NULL,
  `CategoryId` int DEFAULT NULL,
  PRIMARY KEY (`FoodProductId`),
  KEY `CategoryId` (`CategoryId`),
  KEY `fk_foodproduct_stocksnapshot` (`StockLevelId`),
  CONSTRAINT `fk_foodproduct_stocksnapshot` FOREIGN KEY (`StockLevelId`) REFERENCES `StockSnapshot` (`StockLevelId`),
  CONSTRAINT `foodproduct_ibfk_1` FOREIGN KEY (`CategoryId`) REFERENCES `Category` (`CategoryId`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `FoodProduct`
--

LOCK TABLES `FoodProduct` WRITE;
/*!40000 ALTER TABLE `FoodProduct` DISABLE KEYS */;
INSERT INTO `FoodProduct` VALUES (1,'Whole Milk (1 gal)',2.99,1,2),(2,'White Bread (loaf)',1.49,2,6),(3,'Canned Corn (15 oz)',0.89,3,5),(4,'Canned Green Beans (15 oz)',0.89,4,5),(5,'Canned Chicken (12.5 oz)',2.49,5,4),(6,'Peanut Butter (16 oz)',3.99,6,4),(7,'Brown Rice (2 lb)',2.49,7,6),(8,'Penne Pasta (1 lb)',1.29,8,6),(9,'Oat Milk (64 oz)',3.99,9,3),(10,'Canned Diced Tomatoes',1.19,10,5),(11,'Eggs (dozen)',3.49,11,4),(12,'Apples (3 lb bag)',3.99,12,1),(13,'Bananas (bunch)',1.49,13,1),(14,'Baby Carrots (1 lb)',1.99,14,1),(15,'Chicken Breast (2 lb)',5.99,15,4);
/*!40000 ALTER TABLE `FoodProduct` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Invoice`
--

DROP TABLE IF EXISTS `Invoice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Invoice` (
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
  CONSTRAINT `invoice_ibfk_1` FOREIGN KEY (`VendorId`) REFERENCES `Vendor` (`VendorId`),
  CONSTRAINT `invoice_ibfk_2` FOREIGN KEY (`InvoiceFromId`) REFERENCES `InvoiceAddressDetails` (`InvoiceAddressDetailsId`),
  CONSTRAINT `invoice_ibfk_3` FOREIGN KEY (`InvoiceBillToId`) REFERENCES `InvoiceAddressDetails` (`InvoiceAddressDetailsId`),
  CONSTRAINT `invoice_ibfk_4` FOREIGN KEY (`InvoiceDeliveryId`) REFERENCES `InvoiceAddressDetails` (`InvoiceAddressDetailsId`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Invoice`
--

LOCK TABLES `Invoice` WRITE;
/*!40000 ALTER TABLE `Invoice` DISABLE KEYS */;
INSERT INTO `Invoice` VALUES (1,'2026-01-15','January non-perishables donation',202.10,1,1,2,3),(2,'2026-02-10','February produce from Homefield Farm',317.91,2,4,5,6),(3,'2026-03-05','March mixed goods from NRV Food Bank',259.78,3,7,8,9);
/*!40000 ALTER TABLE `Invoice` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `InvoiceAddressDetails`
--

DROP TABLE IF EXISTS `InvoiceAddressDetails`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `InvoiceAddressDetails` (
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
-- Dumping data for table `InvoiceAddressDetails`
--

LOCK TABLES `InvoiceAddressDetails` WRITE;
/*!40000 ALTER TABLE `InvoiceAddressDetails` DISABLE KEYS */;
INSERT INTO `InvoiceAddressDetails` VALUES (1,'Donations Coordinator','1025 Electric Rd','Salem','VA','24153','540-342-3011','contact@feedingswva.org'),(2,'The Market of VT','801 University City Blvd','Blacksburg','VA','24060','540-231-3086','themarket@vt.edu'),(3,'The Market of VT','801 University City Blvd','Blacksburg','VA','24060','540-231-3086','themarket@vt.edu'),(4,'Farm Manager','595 Prices Fork Rd','Blacksburg','VA','24061','540-231-0001','homefield@vt.edu'),(5,'The Market of VT','801 University City Blvd','Blacksburg','VA','24060','540-231-3086','themarket@vt.edu'),(6,'The Market of VT','801 University City Blvd','Blacksburg','VA','24060','540-231-3086','themarket@vt.edu'),(7,'Distribution Team','1573 N Franklin St','Christiansburg','VA','24073','540-381-1080','info@nrvfoodbank.org'),(8,'The Market of VT','801 University City Blvd','Blacksburg','VA','24060','540-231-3086','themarket@vt.edu'),(9,'The Market of VT','801 University City Blvd','Blacksburg','VA','24060','540-231-3086','themarket@vt.edu');
/*!40000 ALTER TABLE `InvoiceAddressDetails` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `InvoiceItem`
--

DROP TABLE IF EXISTS `InvoiceItem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `InvoiceItem` (
  `InvoiceItemId` int NOT NULL AUTO_INCREMENT,
  `InvoiceId` int DEFAULT NULL,
  `FoodProductId` int DEFAULT NULL,
  `Quantity` int DEFAULT NULL,
  `UnitPrice` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`InvoiceItemId`),
  KEY `InvoiceId` (`InvoiceId`),
  KEY `FoodProductId` (`FoodProductId`),
  CONSTRAINT `invoiceitem_ibfk_1` FOREIGN KEY (`InvoiceId`) REFERENCES `Invoice` (`InvoiceId`),
  CONSTRAINT `invoiceitem_ibfk_2` FOREIGN KEY (`FoodProductId`) REFERENCES `FoodProduct` (`FoodProductId`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `InvoiceItem`
--

LOCK TABLES `InvoiceItem` WRITE;
/*!40000 ALTER TABLE `InvoiceItem` DISABLE KEYS */;
INSERT INTO `InvoiceItem` VALUES (1,1,3,40,0.89),(2,1,4,25,0.89),(3,1,10,50,1.19),(4,1,5,10,2.49),(5,1,6,15,3.99),(6,2,12,20,3.99),(7,2,13,30,1.49),(8,2,14,25,1.99),(9,2,11,24,3.49),(10,2,15,10,5.99),(11,3,1,20,2.99),(12,3,2,30,1.49),(13,3,7,25,2.49),(14,3,8,35,1.29),(15,3,9,12,3.99);
/*!40000 ALTER TABLE `InvoiceItem` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `StockSnapshot`
--

DROP TABLE IF EXISTS `StockSnapshot`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `StockSnapshot` (
  `StockLevelId` int NOT NULL AUTO_INCREMENT,
  `FoodProductId` int DEFAULT NULL,
  `StockLevel` varchar(50) DEFAULT NULL,
  `Quantity` int DEFAULT NULL,
  `LastUpdated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `OpenMarketQuantity` int DEFAULT NULL,
  `GroceryStoreQuantity` int DEFAULT NULL,
  PRIMARY KEY (`StockLevelId`),
  KEY `FoodProductId` (`FoodProductId`),
  CONSTRAINT `stocksnapshot_ibfk_1` FOREIGN KEY (`FoodProductId`) REFERENCES `FoodProduct` (`FoodProductId`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `StockSnapshot`
--

LOCK TABLES `StockSnapshot` WRITE;
/*!40000 ALTER TABLE `StockSnapshot` DISABLE KEYS */;
INSERT INTO `StockSnapshot` VALUES (1,1,'Medium',30,'2026-04-08 19:04:04',15,15),(2,2,'High',60,'2026-04-08 19:04:04',30,30),(3,3,'High',80,'2026-04-08 19:04:04',40,40),(4,4,'Medium',45,'2026-04-08 19:04:04',20,25),(5,5,'Low',8,'2026-04-08 19:04:04',5,3),(6,6,'Medium',25,'2026-04-08 19:04:04',10,15),(7,7,'High',55,'2026-04-08 19:04:04',25,30),(8,8,'High',70,'2026-04-08 19:04:04',35,35),(9,9,'Low',6,'2026-04-08 19:04:04',4,2),(10,10,'High',90,'2026-04-08 19:04:04',45,45),(11,11,'Medium',24,'2026-04-08 19:04:04',12,12),(12,12,'Low',9,'2026-04-08 19:04:04',5,4),(13,13,'Medium',20,'2026-04-08 19:04:04',10,10),(14,14,'Low',7,'2026-04-08 19:04:04',4,3),(15,15,'Low',5,'2026-04-08 19:04:04',3,2);
/*!40000 ALTER TABLE `StockSnapshot` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Transaction`
--

DROP TABLE IF EXISTS `Transaction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Transaction` (
  `TransactionId` int NOT NULL AUTO_INCREMENT,
  `CheckPointId` int DEFAULT NULL,
  `TotalAmount` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`TransactionId`),
  KEY `CheckPointId` (`CheckPointId`),
  CONSTRAINT `transaction_ibfk_1` FOREIGN KEY (`CheckPointId`) REFERENCES `CheckPoint` (`CheckPointId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Transaction`
--

LOCK TABLES `Transaction` WRITE;
/*!40000 ALTER TABLE `Transaction` DISABLE KEYS */;
/*!40000 ALTER TABLE `Transaction` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `TransactionItem`
--

DROP TABLE IF EXISTS `TransactionItem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TransactionItem` (
  `TransactionItemId` int NOT NULL AUTO_INCREMENT,
  `TransactionId` int DEFAULT NULL,
  `FoodProductId` int DEFAULT NULL,
  `Quantity` int DEFAULT NULL,
  PRIMARY KEY (`TransactionItemId`),
  KEY `TransactionId` (`TransactionId`),
  KEY `FoodProductId` (`FoodProductId`),
  CONSTRAINT `transactionitem_ibfk_1` FOREIGN KEY (`TransactionId`) REFERENCES `Transaction` (`TransactionId`),
  CONSTRAINT `transactionitem_ibfk_2` FOREIGN KEY (`FoodProductId`) REFERENCES `FoodProduct` (`FoodProductId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `TransactionItem`
--

LOCK TABLES `TransactionItem` WRITE;
/*!40000 ALTER TABLE `TransactionItem` DISABLE KEYS */;
/*!40000 ALTER TABLE `TransactionItem` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Users`
--

DROP TABLE IF EXISTS `Users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Users` (
  `UserId` int NOT NULL AUTO_INCREMENT,
  `Username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `Role` enum('admin','manager','user') NOT NULL,
  `Email` varchar(255) DEFAULT NULL,
  `google_sub` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`UserId`),
  UNIQUE KEY `uk_users_email` (`Email`),
  UNIQUE KEY `uk_users_google_sub` (`google_sub`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Users`
--

LOCK TABLES `Users` WRITE;
/*!40000 ALTER TABLE `Users` DISABLE KEYS */;
INSERT INTO `Users` VALUES (1,'admin','$2b$12$CnRve/pywNCvnWGwacAZveAwIGDO.Gxkw.WNLNbgFz70KcUzgclb.','admin',NULL,NULL),(2,'mgr_shannon','$2b$12$CnRve/pywNCvnWGwacAZveAwIGDO.Gxkw.WNLNbgFz70KcUzgclb.','manager',NULL,NULL),(3,'user_brenna','$2b$12$CnRve/pywNCvnWGwacAZveAwIGDO.Gxkw.WNLNbgFz70KcUzgclb.','user',NULL,NULL),(4,'user_ellie','$2b$12$CnRve/pywNCvnWGwacAZveAwIGDO.Gxkw.WNLNbgFz70KcUzgclb.','user',NULL,NULL);
/*!40000 ALTER TABLE `Users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Vendor`
--

DROP TABLE IF EXISTS `Vendor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Vendor` (
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
-- Dumping data for table `Vendor`
--

LOCK TABLES `Vendor` WRITE;
/*!40000 ALTER TABLE `Vendor` DISABLE KEYS */;
INSERT INTO `Vendor` VALUES (1,'contact@feedingswva.org','540-342-3011','1025 Electric Rd','Salem','VA','24153'),(2,'homefield@vt.edu','540-231-0001','595 Prices Fork Rd','Blacksburg','VA','24061'),(3,'info@nrvfoodbank.org','540-381-1080','1573 N Franklin St','Christiansburg','VA','24073');
/*!40000 ALTER TABLE `Vendor` ENABLE KEYS */;
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

CREATE DATABASE  IF NOT EXISTS `iub_smart_shuttle_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `iub_smart_shuttle_db`;
-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: localhost    Database: iub_smart_shuttle_db
-- ------------------------------------------------------
-- Server version	8.0.40

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
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
INSERT INTO `sessions` VALUES ('XD6AVHCeR8ujCfB9RD1oloySZvGIgKpu',1735071983,'{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2024-12-24T20:10:36.800Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\"},\"user\":{\"user_id\":\"1921629\",\"iub_email\":\"1921629@iub.edu.bd\",\"full_name\":\"Tahfizul Hasan Zihan\",\"designation\":\"Moderator\",\"phone_number\":\"01889673292\",\"gender\":\"Male\",\"account_status\":\"Active\",\"profile_picture\":\"http://fablabiub.com/wp-content/uploads/2024/11/Tahfizul-Hasan-Zihan.png\"}}'),('bIRnT7A1vdXunGauY0lUptSU639xEbVF',1735031602,'{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2024-12-24T09:13:21.128Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\"},\"user\":{\"user_id\":\"1921629\",\"iub_email\":\"1921629@iub.edu.bd\",\"full_name\":\"Tahfizul Hasan Zihan\",\"designation\":\"Moderator\",\"phone_number\":\"01889673292\",\"gender\":\"Male\",\"account_status\":\"Active\",\"profile_picture\":\"http://fablabiub.com/wp-content/uploads/2024/11/Tahfizul-Hasan-Zihan.png\"}}'),('vwRo1qTx0gaJILDwS5rX6eQHvDy1PzRd',1735019713,'{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2024-12-24T04:04:49.999Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\"},\"user\":{\"user_id\":\"1921721\",\"iub_email\":\"1921721@iub.edu.bd\",\"full_name\":\"MD Hana Sultan Chowdhury\",\"designation\":\"Student\",\"phone_number\":\"01619996782\",\"gender\":null,\"account_status\":\"Active\",\"profile_picture\":null}}');
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-12-24 10:19:11

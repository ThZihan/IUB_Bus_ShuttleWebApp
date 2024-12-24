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
-- Table structure for table `user_accounts`
--

DROP TABLE IF EXISTS `user_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_accounts` (
  `user_id` varchar(20) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `iub_email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `designation` enum('Student','Faculty','Staff','Moderator','Other') NOT NULL,
  `phone_number` varchar(15) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `profile_picture` varchar(255) DEFAULT NULL,
  `account_status` enum('Active','Inactive','Suspended','Pending') NOT NULL DEFAULT 'Pending',
  `gender` enum('Male','Female','other') DEFAULT NULL,
  `rfID_code` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `iub_email` (`iub_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_accounts`
--

LOCK TABLES `user_accounts` WRITE;
/*!40000 ALTER TABLE `user_accounts` DISABLE KEYS */;
INSERT INTO `user_accounts` VALUES ('1234','Iqbal Hosen','iqbal@iub.edu.bd','$2b$10$LCBubpTJ70IHYopbNriUU.qrMXxxDT7l5PwjZlgx/LF5ZzCwNXBrq','Staff','01717878787','2024-12-10 05:14:48','https://asset.kalerkantho.com/public/news_images/2024/12/11/1733936774-cfa91b49aa13c81e4661b0860dcbc808.jpg','Active','Male','80909'),('1921629','Tahfizul Hasan Zihan','1921629@iub.edu.bd','$2b$10$nPqI6zhxy0FH5jUzKv5bQ.dkWo9hQDE5utx/Swol4FGMT5zE0SGX2','Moderator','01889673292','2024-12-09 16:33:33','http://fablabiub.com/wp-content/uploads/2024/11/Tahfizul-Hasan-Zihan.png','Active','Male',NULL),('1921721','MD Hana Sultan Chowdhury','1921721@iub.edu.bd','$2b$10$7KC5sGyPjw1HsGyC2TZSCeOYRw9rt0XZQq1ad0hbY/B6Sly4GnQ5W','Student','01619996782','2024-12-16 14:19:13',NULL,'Active',NULL,'F9338k'),('4485','Shirazim Munir Deap','shirazimmunirsets@iub.edu.bd','$2b$10$j6Iptg8S2TD5/B0ZQS7xZOfVXvx6RR8FbiumCA1l88PcwguIprEB6','Moderator','01777218019','2024-12-10 15:10:53','https://i1.rgstatic.net/ii/profile.image/542459408596992-1506343809196_Q512/Md-Munir-2.jpg','Active','Male',NULL);
/*!40000 ALTER TABLE `user_accounts` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-12-24 10:19:10

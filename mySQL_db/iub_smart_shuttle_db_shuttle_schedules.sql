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
-- Table structure for table `shuttle_schedules`
--

DROP TABLE IF EXISTS `shuttle_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shuttle_schedules` (
  `schedule_id` int NOT NULL AUTO_INCREMENT,
  `shuttle_id` varchar(5) NOT NULL,
  `route_id` varchar(5) NOT NULL,
  `departure_time` time NOT NULL,
  `arrival_time` time NOT NULL,
  `days_of_operation` set('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`schedule_id`),
  KEY `shuttle_id` (`shuttle_id`),
  KEY `route_id` (`route_id`),
  CONSTRAINT `shuttle_schedules_ibfk_1` FOREIGN KEY (`shuttle_id`) REFERENCES `shuttle_info` (`shuttle_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `shuttle_schedules_ibfk_2` FOREIGN KEY (`route_id`) REFERENCES `route_info` (`route_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shuttle_schedules`
--

LOCK TABLES `shuttle_schedules` WRITE;
/*!40000 ALTER TABLE `shuttle_schedules` DISABLE KEYS */;
INSERT INTO `shuttle_schedules` VALUES (6,'S0002','R0003','08:00:00','08:45:00','Monday,Tuesday,Thursday','2024-12-18 17:23:52'),(7,'S0003','R0003','08:00:00','08:45:00','Monday,Tuesday,Wednesday,Thursday,Friday','2024-12-18 18:32:17'),(11,'S0001','R0008','17:00:00','18:00:00','Wednesday,Saturday','2024-12-19 19:48:57');
/*!40000 ALTER TABLE `shuttle_schedules` ENABLE KEYS */;
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

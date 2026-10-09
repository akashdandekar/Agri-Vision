-- ============================================================================
-- KisanSetu Database Schema
-- Smart Agricultural Procurement Management System
-- Permanent Persistent Storage (MySQL/MariaDB)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `kisansetu` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `kisansetu`;

-- Disable foreign key checks during schema re-creation if needed
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users Table (Core Auth for Farmers and Admins)
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `procurements`;
DROP TABLE IF EXISTS `quality_tests`;
DROP TABLE IF EXISTS `queue_entries`;
DROP TABLE IF EXISTS `tokens`;
DROP TABLE IF EXISTS `bookings`;
DROP TABLE IF EXISTS `centre_slots`;
DROP TABLE IF EXISTS `farmer_produce`;
DROP TABLE IF EXISTS `procurement_centres`;
DROP TABLE IF EXISTS `admins`;
DROP TABLE IF EXISTS `farmers`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `phone` VARCHAR(15) NOT NULL UNIQUE,
  `email` VARCHAR(100) UNIQUE NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('FARMER', 'ADMIN') NOT NULL,
  `full_name` VARCHAR(120) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Farmers Table
CREATE TABLE `farmers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `aadhaar_hash` VARCHAR(64) NULL,
  `kisan_credit_card` VARCHAR(50) NULL,
  `village` VARCHAR(100) NOT NULL,
  `district` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL,
  `land_acres` DECIMAL(8,2) DEFAULT 0.00,
  `bank_account_no` VARCHAR(30) NULL,
  `bank_ifsc` VARCHAR(20) NULL,
  `preferred_language` ENUM('en', 'hi', 'mr') DEFAULT 'en',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_farmers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Procurement Centres Table
CREATE TABLE `procurement_centres` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `centre_code` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `location` VARCHAR(255) NOT NULL,
  `district` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL,
  `operating_days` VARCHAR(120) DEFAULT 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
  `opening_time` TIME NOT NULL DEFAULT '08:00:00',
  `closing_time` TIME NOT NULL DEFAULT '18:00:00',
  `slot_duration_minutes` INT NOT NULL DEFAULT 30,
  `max_farmers_per_day` INT NOT NULL DEFAULT 100,
  `max_produce_kg_per_day` DECIMAL(12,2) NOT NULL DEFAULT 25000.00,
  `max_farmers_per_slot` INT NOT NULL DEFAULT 10,
  `max_produce_kg_per_slot` DECIMAL(12,2) NOT NULL DEFAULT 2500.00,
  `emergency_farmer_quota` INT NOT NULL DEFAULT 15,
  `emergency_produce_kg_quota` DECIMAL(12,2) NOT NULL DEFAULT 3500.00,
  `active_counters` INT NOT NULL DEFAULT 3,
  `avg_processing_mins` DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  `status` ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE') DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Admins Table
CREATE TABLE `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `employee_id` VARCHAR(50) NOT NULL UNIQUE,
  `designation` VARCHAR(100) DEFAULT 'Procurement Officer',
  `assigned_centre_id` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_admins_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_admins_centre` FOREIGN KEY (`assigned_centre_id`) REFERENCES `procurement_centres` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Centre Slots Table (Configured time windows in 12-hour AM/PM format)
CREATE TABLE `centre_slots` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `centre_id` INT NOT NULL,
  `slot_start` TIME NOT NULL,
  `slot_end` TIME NOT NULL,
  `display_time` VARCHAR(50) NOT NULL,
  `max_farmers` INT NOT NULL DEFAULT 10,
  `max_produce_kg` DECIMAL(12,2) NOT NULL DEFAULT 2500.00,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_slots_centre` FOREIGN KEY (`centre_id`) REFERENCES `procurement_centres` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_centre_slot_time` (`centre_id`, `slot_start`, `slot_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Farmer Produce Table (Supports both kg and quintal, normalizes to kg)
CREATE TABLE `farmer_produce` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `farmer_id` INT NOT NULL,
  `crop_name` VARCHAR(100) NOT NULL,
  `quantity_input` DECIMAL(10,2) NOT NULL,
  `unit` ENUM('kg', 'quintal') NOT NULL DEFAULT 'quintal',
  `quantity_kg` DECIMAL(12,2) NOT NULL,
  `harvest_date` DATE NOT NULL,
  `perishability` ENUM('HIGH', 'MEDIUM', 'LOW') NOT NULL DEFAULT 'MEDIUM',
  `urgency` ENUM('EMERGENCY', 'URGENT', 'NORMAL') NOT NULL DEFAULT 'NORMAL',
  `description` TEXT NULL,
  `status` ENUM('AVAILABLE', 'BOOKED', 'PROCURED', 'ARCHIVED') DEFAULT 'AVAILABLE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_produce_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `farmers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Bookings Table (Supports Regular & Emergency, with strict capacity checks)
CREATE TABLE `bookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_reference` VARCHAR(40) NOT NULL UNIQUE,
  `farmer_id` INT NOT NULL,
  `produce_id` INT NOT NULL,
  `centre_id` INT NOT NULL,
  `slot_id` INT NOT NULL,
  `booking_date` DATE NOT NULL,
  `allocated_quantity_kg` DECIMAL(12,2) NOT NULL,
  `booking_type` ENUM('REGULAR', 'EMERGENCY') NOT NULL DEFAULT 'REGULAR',
  `status` ENUM('BOOKED', 'CHECKED_IN', 'IN_QUEUE', 'QUALITY_TESTING', 'PROCUREMENT', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'BOOKED',
  `cancellation_reason` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_bookings_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `farmers` (`id`),
  CONSTRAINT `fk_bookings_produce` FOREIGN KEY (`produce_id`) REFERENCES `farmer_produce` (`id`),
  CONSTRAINT `fk_bookings_centre` FOREIGN KEY (`centre_id`) REFERENCES `procurement_centres` (`id`),
  CONSTRAINT `fk_bookings_slot` FOREIGN KEY (`slot_id`) REFERENCES `centre_slots` (`id`),
  INDEX `idx_booking_date_centre` (`booking_date`, `centre_id`),
  INDEX `idx_booking_farmer_status` (`farmer_id`, `booking_date`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Digital Tokens Table (Sequentially generated per centre per day)
CREATE TABLE `tokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_id` INT NOT NULL UNIQUE,
  `centre_id` INT NOT NULL,
  `procurement_date` DATE NOT NULL,
  `token_number` VARCHAR(20) NOT NULL,
  `sequence_number` INT NOT NULL,
  `priority_score` INT DEFAULT 100,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tokens_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tokens_centre` FOREIGN KEY (`centre_id`) REFERENCES `procurement_centres` (`id`),
  UNIQUE KEY `unique_centre_date_token` (`centre_id`, `procurement_date`, `token_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Queue Entries Table (Live Queue Tracker)
CREATE TABLE `queue_entries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_id` INT NOT NULL UNIQUE,
  `centre_id` INT NOT NULL,
  `token_id` INT NOT NULL,
  `procurement_date` DATE NOT NULL,
  `status` ENUM('BOOKED', 'CHECKED_IN', 'WAITING', 'IN_PROGRESS', 'QUALITY_TESTING', 'PROCUREMENT', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'BOOKED',
  `check_in_time` DATETIME NULL,
  `stage_start_time` DATETIME NULL,
  `completed_time` DATETIME NULL,
  `counter_assigned` INT NULL,
  `estimated_wait_minutes` INT DEFAULT 0,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_queue_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_queue_centre` FOREIGN KEY (`centre_id`) REFERENCES `procurement_centres` (`id`),
  CONSTRAINT `fk_queue_token` FOREIGN KEY (`token_id`) REFERENCES `tokens` (`id`) ON DELETE CASCADE,
  INDEX `idx_queue_centre_date_status` (`centre_id`, `procurement_date`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Quality Tests Table
CREATE TABLE `quality_tests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_id` INT NOT NULL UNIQUE,
  `inspected_by_admin_id` INT NULL,
  `status` ENUM('PENDING', 'TESTING', 'PASSED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `grade` ENUM('GRADE_A', 'GRADE_B', 'GRADE_C', 'REJECTED') NULL,
  `moisture_percentage` DECIMAL(5,2) NULL,
  `foreign_matter_percentage` DECIMAL(5,2) NULL,
  `test_timestamp` DATETIME NULL,
  `remarks` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_quality_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_quality_admin` FOREIGN KEY (`inspected_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Procurements Table
CREATE TABLE `procurements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_id` INT NOT NULL UNIQUE,
  `processed_by_admin_id` INT NULL,
  `gross_weight_kg` DECIMAL(12,2) NULL,
  `tare_weight_kg` DECIMAL(12,2) NULL,
  `net_procured_kg` DECIMAL(12,2) NOT NULL,
  `rate_per_kg` DECIMAL(10,2) NOT NULL,
  `total_procurement_value` DECIMAL(12,2) NOT NULL,
  `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `procurement_time` DATETIME NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_procurement_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_procurement_admin` FOREIGN KEY (`processed_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Payments Table
CREATE TABLE `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_id` INT NOT NULL UNIQUE,
  `procurement_id` INT NULL,
  `farmer_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `status` ENUM('PENDING', 'PROCESSING', 'PAID', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `payment_mode` ENUM('DIRECT_BANK_TRANSFER', 'NEFT', 'RTGS', 'UPI') DEFAULT 'DIRECT_BANK_TRANSFER',
  `reference_number` VARCHAR(80) NULL,
  `payment_date` DATETIME NULL,
  `remarks` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_payments_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payments_procurement` FOREIGN KEY (`procurement_id`) REFERENCES `procurements` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payments_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `farmers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Notifications Table
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `is_read` BOOLEAN DEFAULT FALSE,
  `metadata_json` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

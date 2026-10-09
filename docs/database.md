# KisanSetu Database Schema & Storage Documentation

## 1. Storage Overview

The **KisanSetu** database utilizes **permanent persistent MySQL/MariaDB storage** (database `kisansetu`). All transactional states, user registrations, produce records, queue allocations, quality inspections, digital weighbridge scale readings, and DBT disbursements are permanently stored and preserved across browser closures, server restarts, and system reboots.

---

## 2. Entity-Relationship Data Flow

```
users (1) ──< farmers (1) ──< farmer_produce (N)
  │                                │
  │                                v
  │                         bookings (N) >── procurement_centres (1)
  │                                │           │
  │                                ├──> tokens (1)   └── centre_slots (N)
  │                                │
  │                                ├──> queue_entries (1)
  │                                │
  │                                ├──> quality_tests (1)
  │                                │
  │                                ├──> procurements (1)
  │                                │         │
  │                                │         v
  │                                └──> payments (1)
  v
notifications (N)
```

---

## 3. Table Dictionary & Constraints

### 3.1 `users`
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `phone` VARCHAR(15) UNIQUE NOT NULL (10-digit mobile)
- `email` VARCHAR(100) UNIQUE NULL
- `password_hash` VARCHAR(255) NOT NULL (bcrypt hashed with salt rounds)
- `role` ENUM('FARMER', 'ADMIN') NOT NULL
- `full_name` VARCHAR(120) NOT NULL
- `created_at`, `updated_at`

### 3.2 `farmers`
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `user_id` INT UNIQUE NOT NULL, FK -> `users(id)` ON DELETE CASCADE
- `village`, `district`, `state` VARCHAR(100) NOT NULL
- `land_acres` DECIMAL(8,2) DEFAULT 0.00
- `kisan_credit_card` VARCHAR(50) NULL
- `bank_account_no` VARCHAR(30) NULL
- `bank_ifsc` VARCHAR(20) NULL
- `preferred_language` ENUM('en', 'hi', 'mr') DEFAULT 'en'

### 3.3 `procurement_centres`
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `centre_code` VARCHAR(20) UNIQUE NOT NULL
- `name` VARCHAR(150) NOT NULL
- `location`, `district`, `state`
- `operating_days` VARCHAR(120) DEFAULT 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday'
- `opening_time`, `closing_time` TIME NOT NULL
- `slot_duration_minutes` INT NOT NULL DEFAULT 30
- `max_farmers_per_day` INT NOT NULL DEFAULT 100
- `max_produce_kg_per_day` DECIMAL(12,2) NOT NULL DEFAULT 25000.00
- `max_farmers_per_slot` INT NOT NULL DEFAULT 10
- `max_produce_kg_per_slot` DECIMAL(12,2) NOT NULL DEFAULT 2500.00
- `emergency_farmer_quota` INT NOT NULL DEFAULT 15
- `emergency_produce_kg_quota` DECIMAL(12,2) NOT NULL DEFAULT 3500.00
- `active_counters` INT NOT NULL DEFAULT 3
- `avg_processing_mins` DECIMAL(5,2) NOT NULL DEFAULT 15.00
- `status` ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE') DEFAULT 'ACTIVE'

### 3.4 `centre_slots`
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `centre_id` INT NOT NULL, FK -> `procurement_centres(id)` ON DELETE CASCADE
- `slot_start`, `slot_end` TIME NOT NULL
- `display_time` VARCHAR(50) NOT NULL (e.g. `09:00 AM – 09:30 AM`)
- `max_farmers` INT NOT NULL DEFAULT 10
- `max_produce_kg` DECIMAL(12,2) NOT NULL DEFAULT 2500.00
- `is_active` BOOLEAN DEFAULT TRUE
- UNIQUE KEY `(centre_id, slot_start, slot_end)`

### 3.5 `farmer_produce`
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `farmer_id` INT NOT NULL, FK -> `farmers(id)` ON DELETE CASCADE
- `crop_name` VARCHAR(100) NOT NULL
- `quantity_input` DECIMAL(10,2) NOT NULL
- `unit` ENUM('kg', 'quintal') NOT NULL DEFAULT 'quintal'
- `quantity_kg` DECIMAL(12,2) NOT NULL (Normalized: `quintal * 100`)
- `harvest_date` DATE NOT NULL
- `perishability` ENUM('HIGH', 'MEDIUM', 'LOW') NOT NULL DEFAULT 'MEDIUM'
- `urgency` ENUM('EMERGENCY', 'URGENT', 'NORMAL') NOT NULL DEFAULT 'NORMAL'
- `description` TEXT NULL
- `status` ENUM('AVAILABLE', 'BOOKED', 'PROCURED', 'ARCHIVED') DEFAULT 'AVAILABLE'

### 3.6 `bookings`
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `booking_reference` VARCHAR(40) UNIQUE NOT NULL (e.g. `KS-2026-PUN-XXXXX`)
- `farmer_id` INT NOT NULL, FK -> `farmers(id)`
- `produce_id` INT NOT NULL, FK -> `farmer_produce(id)`
- `centre_id` INT NOT NULL, FK -> `procurement_centres(id)`
- `slot_id` INT NOT NULL, FK -> `centre_slots(id)`
- `booking_date` DATE NOT NULL
- `allocated_quantity_kg` DECIMAL(12,2) NOT NULL
- `booking_type` ENUM('REGULAR', 'EMERGENCY') NOT NULL DEFAULT 'REGULAR'
- `status` ENUM('BOOKED', 'CHECKED_IN', 'IN_QUEUE', 'QUALITY_TESTING', 'PROCUREMENT', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'BOOKED'
- INDEX `(booking_date, centre_id)`, INDEX `(farmer_id, booking_date, status)`

### 3.7 `tokens`
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `booking_id` INT UNIQUE NOT NULL, FK -> `bookings(id)` ON DELETE CASCADE
- `centre_id` INT NOT NULL, FK -> `procurement_centres(id)`
- `procurement_date` DATE NOT NULL
- `token_number` VARCHAR(20) NOT NULL (e.g. `T001`, `T002`)
- `sequence_number` INT NOT NULL
- `priority_score` INT DEFAULT 100 (50 for emergency expedited intake)
- UNIQUE KEY `(centre_id, procurement_date, token_number)`

### 3.8 `queue_entries`
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `booking_id` INT UNIQUE NOT NULL, FK -> `bookings(id)` ON DELETE CASCADE
- `centre_id` INT NOT NULL, FK -> `procurement_centres(id)`
- `token_id` INT NOT NULL, FK -> `tokens(id)` ON DELETE CASCADE
- `procurement_date` DATE NOT NULL
- `status` ENUM('BOOKED', 'CHECKED_IN', 'WAITING', 'IN_PROGRESS', 'QUALITY_TESTING', 'PROCUREMENT', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'BOOKED'
- `check_in_time`, `stage_start_time`, `completed_time` DATETIME NULL
- `counter_assigned` INT NULL
- `estimated_wait_minutes` INT DEFAULT 0

### 3.9 `quality_tests`
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `booking_id` INT UNIQUE NOT NULL, FK -> `bookings(id)` ON DELETE CASCADE
- `inspected_by_admin_id` INT NULL, FK -> `admins(id)` ON DELETE SET NULL
- `status` ENUM('PENDING', 'TESTING', 'PASSED', 'REJECTED') DEFAULT 'PENDING'
- `grade` ENUM('GRADE_A', 'GRADE_B', 'GRADE_C', 'REJECTED') NULL
- `moisture_percentage`, `foreign_matter_percentage` DECIMAL(5,2) NULL
- `test_timestamp` DATETIME NULL
- `remarks` TEXT NULL

### 3.10 `procurements`
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `booking_id` INT UNIQUE NOT NULL, FK -> `bookings(id)` ON DELETE CASCADE
- `processed_by_admin_id` INT NULL, FK -> `admins(id)` ON DELETE SET NULL
- `gross_weight_kg`, `tare_weight_kg` DECIMAL(12,2) NULL
- `net_procured_kg` DECIMAL(12,2) NOT NULL
- `rate_per_kg` DECIMAL(10,2) NOT NULL
- `total_procurement_value` DECIMAL(12,2) NOT NULL
- `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING'
- `procurement_time` DATETIME NULL
- `notes` TEXT NULL

### 3.11 `payments`
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `booking_id` INT UNIQUE NOT NULL, FK -> `bookings(id)` ON DELETE CASCADE
- `procurement_id` INT NULL, FK -> `procurements(id)` ON DELETE SET NULL
- `farmer_id` INT NOT NULL, FK -> `farmers(id)`
- `amount` DECIMAL(12,2) NOT NULL
- `status` ENUM('PENDING', 'PROCESSING', 'PAID', 'FAILED') DEFAULT 'PENDING'
- `payment_mode` ENUM('DIRECT_BANK_TRANSFER', 'NEFT', 'RTGS', 'UPI') DEFAULT 'DIRECT_BANK_TRANSFER'
- `reference_number` VARCHAR(80) NULL
- `payment_date` DATETIME NULL
- `remarks` TEXT NULL

### 3.12 `notifications`
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `user_id` INT NOT NULL, FK -> `users(id)` ON DELETE CASCADE
- `title` VARCHAR(150) NOT NULL
- `message` TEXT NOT NULL
- `type` VARCHAR(50) NOT NULL
- `is_read` BOOLEAN DEFAULT FALSE
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

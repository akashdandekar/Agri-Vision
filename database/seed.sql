-- ============================================================================
-- KisanSetu Seed Data
-- Smart Agricultural Procurement Management System
-- Permanent Persistent Storage (MySQL/MariaDB)
-- Password for all seed accounts:
-- Admin: admin123  (Hash: $2a$10$vI8aWBnW3fID.ZQ4/vWzkuoQ7qK3g9F3uK9nFkJ8YyI8j5c4wPteS)
-- Farmers: farmer123 (Hash: $2a$10$zY4f6jH81B9p/9Nl8mEaDe4J3QOq3k.5Y7aP6C.6OqI8Lq7DkHwQ2)
-- ============================================================================

USE `kisansetu`;

-- 1. Insert Users (1 Admin, 3 Farmers)
INSERT INTO `users` (`id`, `phone`, `email`, `password_hash`, `role`, `full_name`) VALUES
(1, '9876543210', 'admin@kisansetu.gov.in', '$2a$10$vI8aWBnW3fID.ZQ4/vWzkuoQ7qK3g9F3uK9nFkJ8YyI8j5c4wPteS', 'ADMIN', 'Dr. Rajesh Deshmukh'),
(2, '9123456780', 'ramesh.patil@agri.in', '$2a$10$zY4f6jH81B9p/9Nl8mEaDe4J3QOq3k.5Y7aP6C.6OqI8Lq7DkHwQ2', 'FARMER', 'Ramesh Tukaram Patil'),
(3, '9123456781', 'suresh.sharma@agri.in', '$2a$10$zY4f6jH81B9p/9Nl8mEaDe4J3QOq3k.5Y7aP6C.6OqI8Lq7DkHwQ2', 'FARMER', 'Suresh Kumar Sharma'),
(4, '9123456782', 'anita.devi@agri.in', '$2a$10$zY4f6jH81B9p/9Nl8mEaDe4J3QOq3k.5Y7aP6C.6OqI8Lq7DkHwQ2', 'FARMER', 'Anita Devi Solanki')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- 2. Insert Farmers Detail Profiles
INSERT INTO `farmers` (`id`, `user_id`, `aadhaar_hash`, `kisan_credit_card`, `village`, `district`, `state`, `land_acres`, `bank_account_no`, `bank_ifsc`, `preferred_language`) VALUES
(1, 2, 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0', 'KCC-MH-2024-8841', 'Baramati Gram', 'Pune', 'Maharashtra', 8.50, '987123456001', 'SBIN0001234', 'mr'),
(2, 3, 'b2c3d4e5f6a17890123456789abcdef0123456789abcdef0123456789abcdef1', 'KCC-HR-2024-1102', 'Taraori', 'Karnal', 'Haryana', 12.00, '987123456002', 'PUNB0005678', 'hi'),
(3, 4, 'c3d4e5f6a1b27890123456789abcdef0123456789abcdef0123456789abcdef2', 'KCC-MP-2024-4493', 'Shyampur', 'Sehore', 'Madhya Pradesh', 6.00, '987123456003', 'BKID0009101', 'en')
ON DUPLICATE KEY UPDATE `village` = VALUES(`village`);

-- 3. Insert Procurement Centres
INSERT INTO `procurement_centres` (`id`, `centre_code`, `name`, `location`, `district`, `state`, `operating_days`, `opening_time`, `closing_time`, `slot_duration_minutes`, `max_farmers_per_day`, `max_produce_kg_per_day`, `max_farmers_per_slot`, `max_produce_kg_per_slot`, `emergency_farmer_quota`, `emergency_produce_kg_quota`, `active_counters`, `avg_processing_mins`, `status`) VALUES
(1, 'MH-PUN-01', 'Pune APMC Agri Procurement Hub', 'Gat No. 142, Baramati Bypass Road', 'Pune', 'Maharashtra', 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday', '08:00:00', '18:00:00', 30, 80, 20000.00, 8, 2000.00, 10, 2500.00, 3, 15.00, 'ACTIVE'),
(2, 'HR-KAR-01', 'Karnal Central Grain Mandi', 'National Highway 44, Grain Market', 'Karnal', 'Haryana', 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday', '08:00:00', '18:00:00', 30, 100, 30000.00, 10, 3000.00, 15, 3500.00, 4, 12.00, 'ACTIVE'),
(3, 'MP-SEH-01', 'Bhopal-Sehore Krishi Upaj Mandi', 'Indore-Bhopal Highway, Shyampur Circle', 'Sehore', 'Madhya Pradesh', 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday', '08:30:00', '17:30:00', 30, 70, 18000.00, 7, 1800.00, 10, 2000.00, 3, 16.00, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 4. Insert Admin Profile
INSERT INTO `admins` (`id`, `user_id`, `employee_id`, `designation`, `assigned_centre_id`) VALUES
(1, 1, 'EMP-KS-101', 'Senior Procurement Officer', 1)
ON DUPLICATE KEY UPDATE `designation` = VALUES(`designation`);

-- 5. Insert Centre Slots for Pune Centre (ID: 1)
INSERT INTO `centre_slots` (`centre_id`, `slot_start`, `slot_end`, `display_time`, `max_farmers`, `max_produce_kg`, `is_active`) VALUES
(1, '08:00:00', '08:30:00', '08:00 AM – 08:30 AM', 8, 2000.00, 1),
(1, '08:30:00', '09:00:00', '08:30 AM – 09:00 AM', 8, 2000.00, 1),
(1, '09:00:00', '09:30:00', '09:00 AM – 09:30 AM', 8, 2000.00, 1),
(1, '09:30:00', '10:00:00', '09:30 AM – 10:00 AM', 8, 2000.00, 1),
(1, '10:00:00', '10:30:00', '10:00 AM – 10:30 AM', 8, 2000.00, 1),
(1, '10:30:00', '11:00:00', '10:30 AM – 11:00 AM', 8, 2000.00, 1),
(1, '11:00:00', '11:30:00', '11:00 AM – 11:30 AM', 8, 2000.00, 1),
(1, '11:30:00', '12:00:00', '11:30 AM – 12:00 PM', 8, 2000.00, 1),
(1, '12:00:00', '12:30:00', '12:00 PM – 12:30 PM', 8, 2000.00, 1),
(1, '12:30:00', '13:00:00', '12:30 PM – 01:00 PM', 8, 2000.00, 1),
(1, '14:00:00', '14:30:00', '02:00 PM – 02:30 PM', 8, 2000.00, 1),
(1, '14:30:00', '15:00:00', '02:30 PM – 03:00 PM', 8, 2000.00, 1),
(1, '15:00:00', '15:30:00', '03:00 PM – 03:30 PM', 8, 2000.00, 1),
(1, '15:30:00', '16:00:00', '03:30 PM – 04:00 PM', 8, 2000.00, 1),
(1, '16:00:00', '16:30:00', '04:00 PM – 04:30 PM', 8, 2000.00, 1),
(1, '16:30:00', '17:00:00', '04:30 PM – 05:00 PM', 8, 2000.00, 1)
ON DUPLICATE KEY UPDATE `display_time` = VALUES(`display_time`);

-- Insert Centre Slots for Karnal Centre (ID: 2)
INSERT INTO `centre_slots` (`centre_id`, `slot_start`, `slot_end`, `display_time`, `max_farmers`, `max_produce_kg`, `is_active`) VALUES
(2, '08:00:00', '08:30:00', '08:00 AM – 08:30 AM', 10, 3000.00, 1),
(2, '08:30:00', '09:00:00', '08:30 AM – 09:00 AM', 10, 3000.00, 1),
(2, '09:00:00', '09:30:00', '09:00 AM – 09:30 AM', 10, 3000.00, 1),
(2, '09:30:00', '10:00:00', '09:30 AM – 10:00 AM', 10, 3000.00, 1),
(2, '10:00:00', '10:30:00', '10:00 AM – 10:30 AM', 10, 3000.00, 1),
(2, '10:30:00', '11:00:00', '10:30 AM – 11:00 AM', 10, 3000.00, 1),
(2, '11:00:00', '11:30:00', '11:00 AM – 11:30 AM', 10, 3000.00, 1),
(2, '11:30:00', '12:00:00', '11:30 AM – 12:00 PM', 10, 3000.00, 1),
(2, '14:00:00', '14:30:00', '02:00 PM – 02:30 PM', 10, 3000.00, 1),
(2, '14:30:00', '15:00:00', '02:30 PM – 03:00 PM', 10, 3000.00, 1),
(2, '15:00:00', '15:30:00', '03:00 PM – 03:30 PM', 10, 3000.00, 1),
(2, '15:30:00', '16:00:00', '03:30 PM – 04:00 PM', 10, 3000.00, 1)
ON DUPLICATE KEY UPDATE `display_time` = VALUES(`display_time`);

-- Insert Centre Slots for Bhopal-Sehore Centre (ID: 3)
INSERT INTO `centre_slots` (`centre_id`, `slot_start`, `slot_end`, `display_time`, `max_farmers`, `max_produce_kg`, `is_active`) VALUES
(3, '08:30:00', '09:00:00', '08:30 AM – 09:00 AM', 7, 1800.00, 1),
(3, '09:00:00', '09:30:00', '09:00 AM – 09:30 AM', 7, 1800.00, 1),
(3, '09:30:00', '10:00:00', '09:30 AM – 10:00 AM', 7, 1800.00, 1),
(3, '10:00:00', '10:30:00', '10:00 AM – 10:30 AM', 7, 1800.00, 1),
(3, '10:30:00', '11:00:00', '10:30 AM – 11:00 AM', 7, 1800.00, 1),
(3, '11:00:00', '11:30:00', '11:00 AM – 11:30 AM', 7, 1800.00, 1),
(3, '14:00:00', '14:30:00', '02:00 PM – 02:30 PM', 7, 1800.00, 1),
(3, '14:30:00', '15:00:00', '02:30 PM – 03:00 PM', 7, 1800.00, 1)
ON DUPLICATE KEY UPDATE `display_time` = VALUES(`display_time`);

-- 6. Insert Farmer Produce
INSERT INTO `farmer_produce` (`id`, `farmer_id`, `crop_name`, `quantity_input`, `unit`, `quantity_kg`, `harvest_date`, `perishability`, `urgency`, `description`, `status`) VALUES
(1, 1, 'Soybean (JS 335)', 25.00, 'quintal', 2500.00, CURDATE() - INTERVAL 4 DAY, 'MEDIUM', 'NORMAL', 'High grade yellow soybean, properly dried to 11% moisture.', 'BOOKED'),
(2, 1, 'Tomato (Abhinav)', 12.00, 'quintal', 1200.00, CURDATE() - INTERVAL 1 DAY, 'HIGH', 'EMERGENCY', 'Fresh harvest tomatoes, ripe and prone to spoilage if delayed.', 'AVAILABLE'),
(3, 2, 'Basmati Paddy (Pusa 1121)', 45.00, 'quintal', 4500.00, CURDATE() - INTERVAL 7 DAY, 'LOW', 'NORMAL', 'Premium quality long grain aromatic basmati paddy.', 'BOOKED'),
(4, 2, 'Wheat (Sharbati)', 800.00, 'kg', 800.00, CURDATE() - INTERVAL 10 DAY, 'LOW', 'NORMAL', 'High lustre Sharbati wheat grains.', 'AVAILABLE'),
(5, 3, 'Gram / Chana (Kabuli)', 18.00, 'quintal', 1800.00, CURDATE() - INTERVAL 3 DAY, 'LOW', 'NORMAL', 'Sun dried organic Kabuli chana produce.', 'BOOKED')
ON DUPLICATE KEY UPDATE `crop_name` = VALUES(`crop_name`);

-- 7. Insert Today Sample Bookings (ID 1: In Progress, ID 2: Checked In / Waiting, ID 3: Booked)
INSERT INTO `bookings` (`id`, `booking_reference`, `farmer_id`, `produce_id`, `centre_id`, `slot_id`, `booking_date`, `allocated_quantity_kg`, `booking_type`, `status`) VALUES
(1, 'KS-2026-PUN-001', 1, 1, 1, 3, CURDATE(), 2500.00, 'REGULAR', 'IN_QUEUE'),
(2, 'KS-2026-KAR-002', 2, 3, 2, 19, CURDATE(), 4500.00, 'REGULAR', 'CHECKED_IN'),
(3, 'KS-2026-SEH-003', 3, 5, 3, 30, CURDATE(), 1800.00, 'REGULAR', 'BOOKED')
ON DUPLICATE KEY UPDATE `booking_reference` = VALUES(`booking_reference`);

-- 8. Insert Digital Tokens
INSERT INTO `tokens` (`id`, `booking_id`, `centre_id`, `procurement_date`, `token_number`, `sequence_number`, `priority_score`) VALUES
(1, 1, 1, CURDATE(), 'T001', 1, 100),
(2, 2, 2, CURDATE(), 'T001', 1, 100),
(3, 3, 3, CURDATE(), 'T001', 1, 100)
ON DUPLICATE KEY UPDATE `token_number` = VALUES(`token_number`);

-- 9. Insert Queue Entries
INSERT INTO `queue_entries` (`id`, `booking_id`, `centre_id`, `token_id`, `procurement_date`, `status`, `check_in_time`, `stage_start_time`, `counter_assigned`, `estimated_wait_minutes`) VALUES
(1, 1, 1, 1, CURDATE(), 'WAITING', NOW() - INTERVAL 25 MINUTE, NOW() - INTERVAL 10 MINUTE, 1, 15),
(2, 2, 2, 2, CURDATE(), 'CHECKED_IN', NOW() - INTERVAL 10 MINUTE, NULL, NULL, 25),
(3, 3, 3, 3, CURDATE(), 'BOOKED', NULL, NULL, NULL, 40)
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- 10. Insert Quality Tests
INSERT INTO `quality_tests` (`id`, `booking_id`, `inspected_by_admin_id`, `status`, `grade`, `moisture_percentage`, `foreign_matter_percentage`, `test_timestamp`, `remarks`) VALUES
(1, 1, 1, 'TESTING', 'GRADE_A', 10.50, 0.40, NOW(), 'Quality test in progress at Counter 1. Grain moisture is within permissible norms.')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- 11. Insert Sample Procurements
INSERT INTO `procurements` (`id`, `booking_id`, `processed_by_admin_id`, `gross_weight_kg`, `tare_weight_kg`, `net_procured_kg`, `rate_per_kg`, `total_procurement_value`, `status`, `notes`) VALUES
(1, 1, 1, 4850.00, 2350.00, 2500.00, 48.92, 122300.00, 'IN_PROGRESS', 'Weighment at Bridge Scale 1')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- 12. Insert Sample Payments
INSERT INTO `payments` (`id`, `booking_id`, `procurement_id`, `farmer_id`, `amount`, `status`, `payment_mode`, `reference_number`, `remarks`) VALUES
(1, 1, 1, 1, 122300.00, 'PROCESSING', 'DIRECT_BANK_TRANSFER', 'DBT-2026-MH-778899', 'Direct DBT transfer initiated to SBI Account ending in 6001')
ON DUPLICATE KEY UPDATE `amount` = VALUES(`amount`);

-- 13. Insert Notifications
INSERT INTO `notifications` (`user_id`, `title`, `message`, `type`, `is_read`, `created_at`) VALUES
(2, 'Booking Confirmed!', 'Your booking KS-2026-PUN-001 has been confirmed. Digital Token: T001.', 'BOOKING_SUCCESS', 0, NOW() - INTERVAL 2 HOUR),
(2, 'Checked In Successfully', 'You have been checked in at Pune APMC Centre. Your token T001 is now in live queue.', 'CHECK_IN', 0, NOW() - INTERVAL 25 MINUTE),
(3, 'Booking Confirmed!', 'Your booking KS-2026-KAR-002 has been confirmed. Digital Token: T001.', 'BOOKING_SUCCESS', 1, NOW() - INTERVAL 3 HOUR),
(4, 'Booking Confirmed!', 'Your booking KS-2026-SEH-003 has been confirmed. Digital Token: T001.', 'BOOKING_SUCCESS', 0, NOW() - INTERVAL 1 HOUR);

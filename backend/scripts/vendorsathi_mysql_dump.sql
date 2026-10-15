-- ============================================================
-- VendorSaathi — MySQL Workbench import file
-- Generated: 2026-09-26 22:40:32
-- Source: vendorsathi.db (demo database, 968 rows)
-- Import: Server > Data Import > Import from Self-Contained File
-- Requires MySQL 5.7+ / 8.x (JSON type, utf8mb4).
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

CREATE DATABASE IF NOT EXISTS `vendorsathi`
  DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci;
USE `vendorsathi`;

-- ----------------------------
-- Table structure for categories
-- ----------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE categories (
	id VARCHAR(36) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	name_kn VARCHAR(100), 
	icon_name VARCHAR(50), 
	description VARCHAR(255), 
	PRIMARY KEY (id), 
	UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for otp_challenges
-- ----------------------------
DROP TABLE IF EXISTS `otp_challenges`;
CREATE TABLE otp_challenges (
	id VARCHAR(36) NOT NULL, 
	phone VARCHAR(15) NOT NULL, 
	code_hash VARCHAR(255) NOT NULL, 
	purpose ENUM('LOGIN') NOT NULL, 
	attempts INTEGER NOT NULL, 
	max_attempts INTEGER NOT NULL, 
	is_consumed BOOL NOT NULL, 
	is_verified BOOL NOT NULL, 
	expires_at DATETIME NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_otp_challenges_phone ON otp_challenges (phone);
CREATE INDEX ix_otp_phone_active ON otp_challenges (phone, is_consumed);

-- ----------------------------
-- Table structure for push_subscriptions
-- ----------------------------
DROP TABLE IF EXISTS `push_subscriptions`;
CREATE TABLE push_subscriptions (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	endpoint TEXT NOT NULL, 
	p256dh TEXT NOT NULL, 
	auth TEXT NOT NULL, 
	user_agent VARCHAR(255), 
	created_at DATETIME, 
	last_used_at DATETIME, 
	failure_count INTEGER NOT NULL, 
	is_active BOOL NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (endpoint)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_push_subscriptions_user_id ON push_subscriptions (user_id);

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE users (
	id VARCHAR(36) NOT NULL, 
	phone VARCHAR(15) NOT NULL, 
	hashed_password VARCHAR(255) NOT NULL, 
	`role` ENUM('VENDOR','CUSTOMER','ADMIN') NOT NULL, 
	language_pref ENUM('KN','EN','HI','TE','TA','MR','BN','GU','PA','ML','OR','AS','UR','SD','NE','MAI','SA','KS','DOI','KOK','MNI','BHO') NOT NULL, 
	is_active BOOL NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_users_role ON users (`role`);
CREATE UNIQUE INDEX ix_users_phone ON users (phone);

-- ----------------------------
-- Table structure for customers
-- ----------------------------
DROP TABLE IF EXISTS `customers`;
CREATE TABLE customers (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	full_name VARCHAR(100) NOT NULL, 
	delivery_address VARCHAR(255), 
	default_lat FLOAT, 
	default_lon FLOAT, 
	loyalty_points INTEGER NOT NULL, 
	tier ENUM('BRONZE','SILVER','GOLD') NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE UNIQUE INDEX ix_customers_user_id ON customers (user_id);

-- ----------------------------
-- Table structure for vendors
-- ----------------------------
DROP TABLE IF EXISTS `vendors`;
CREATE TABLE vendors (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	business_name VARCHAR(150) NOT NULL, 
	business_name_kn VARCHAR(150), 
	business_category VARCHAR(100) NOT NULL, 
	operating_location VARCHAR(200) NOT NULL, 
	current_lat FLOAT, 
	current_lon FLOAT, 
	operating_radius_km FLOAT NOT NULL, 
	is_active BOOL NOT NULL, 
	is_accepting_orders BOOL NOT NULL, 
	rating_avg FLOAT NOT NULL, 
	rating_count FLOAT NOT NULL, 
	working_hours VARCHAR(100), 
	upi_id VARCHAR(100), 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_vendors_current_lat ON vendors (current_lat);
CREATE INDEX ix_vendors_business_category ON vendors (business_category);
CREATE UNIQUE INDEX ix_vendors_user_id ON vendors (user_id);
CREATE INDEX ix_vendors_current_lon ON vendors (current_lon);
CREATE INDEX ix_vendors_business_name ON vendors (business_name);

-- ----------------------------
-- Table structure for orders
-- ----------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE orders (
	id VARCHAR(36) NOT NULL, 
	order_number VARCHAR(20) NOT NULL, 
	customer_id VARCHAR(36) NOT NULL, 
	vendor_id VARCHAR(36) NOT NULL, 
	status ENUM('PENDING','ACCEPTED','PACKED','OUT_FOR_DELIVERY','COMPLETED','CANCELLED') NOT NULL, 
	payment_status ENUM('PENDING','COMPLETED','FAILED','REFUNDED') NOT NULL, 
	payment_mode VARCHAR(30) NOT NULL, 
	total_amount FLOAT NOT NULL, 
	delivery_address VARCHAR(255), 
	delivery_lat FLOAT, 
	delivery_lon FLOAT, 
	special_instructions TEXT, 
	estimated_delivery_time DATETIME, 
	completed_at DATETIME, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(customer_id) REFERENCES customers (id) ON DELETE CASCADE, 
	FOREIGN KEY(vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_orders_customer_id ON orders (customer_id);
CREATE INDEX ix_orders_created_at ON orders (created_at);
CREATE UNIQUE INDEX ix_orders_order_number ON orders (order_number);
CREATE INDEX ix_orders_vendor_id ON orders (vendor_id);
CREATE INDEX ix_orders_status ON orders (status);

-- ----------------------------
-- Table structure for products
-- ----------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE products (
	id VARCHAR(36) NOT NULL, 
	vendor_id VARCHAR(36) NOT NULL, 
	category_id VARCHAR(36), 
	name_en VARCHAR(150) NOT NULL, 
	name_kn VARCHAR(150) NOT NULL, 
	description TEXT, 
	unit ENUM('KG','GRAM','PIECE','DOZEN','PACKET','LITER','BUNCH') NOT NULL, 
	cost_price FLOAT NOT NULL, 
	selling_price FLOAT NOT NULL, 
	current_stock FLOAT NOT NULL, 
	low_stock_threshold FLOAT NOT NULL, 
	image_url VARCHAR(500), 
	is_available BOOL NOT NULL, 
	is_perishable BOOL NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(vendor_id) REFERENCES vendors (id) ON DELETE CASCADE, 
	FOREIGN KEY(category_id) REFERENCES categories (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_products_category_id ON products (category_id);
CREATE INDEX ix_products_name_kn ON products (name_kn);
CREATE INDEX ix_products_vendor_id ON products (vendor_id);
CREATE INDEX ix_products_name_en ON products (name_en);

-- ----------------------------
-- Table structure for sales
-- ----------------------------
DROP TABLE IF EXISTS `sales`;
CREATE TABLE sales (
	id VARCHAR(36) NOT NULL, 
	vendor_id VARCHAR(36) NOT NULL, 
	customer_name VARCHAR(100), 
	customer_phone VARCHAR(15), 
	total_amount FLOAT NOT NULL, 
	total_cost FLOAT NOT NULL, 
	discount_amount FLOAT NOT NULL, 
	net_amount FLOAT NOT NULL, 
	net_profit FLOAT NOT NULL, 
	payment_mode ENUM('CASH','UPI','UDHAAR','HYBRID') NOT NULL, 
	cash_paid FLOAT, 
	upi_paid FLOAT, 
	udhaar_amount FLOAT, 
	is_synced BOOL NOT NULL, 
	client_mutation_id VARCHAR(36), 
	client_timestamp DATETIME, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE UNIQUE INDEX ix_sales_client_mutation_id ON sales (client_mutation_id);
CREATE INDEX ix_sales_customer_phone ON sales (customer_phone);
CREATE INDEX ix_sales_created_at ON sales (created_at);
CREATE INDEX ix_sales_vendor_id ON sales (vendor_id);

-- ----------------------------
-- Table structure for sync_queue
-- ----------------------------
DROP TABLE IF EXISTS `sync_queue`;
CREATE TABLE sync_queue (
	id VARCHAR(36) NOT NULL, 
	vendor_id VARCHAR(36) NOT NULL, 
	client_mutation_id VARCHAR(36) NOT NULL, 
	entity_type ENUM('SALE','INVENTORY','UDHAAR','PRODUCT','ORDER_STATUS','ORDER_CREATE') NOT NULL, 
	payload JSON NOT NULL, 
	status ENUM('PENDING','PROCESSED','CONFLICT','FAILED') NOT NULL, 
	error_message TEXT, 
	processed_at DATETIME, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_sync_queue_status ON sync_queue (status);
CREATE UNIQUE INDEX ix_sync_queue_client_mutation_id ON sync_queue (client_mutation_id);
CREATE INDEX ix_sync_queue_vendor_id ON sync_queue (vendor_id);

-- ----------------------------
-- Table structure for udhaar_ledger
-- ----------------------------
DROP TABLE IF EXISTS `udhaar_ledger`;
CREATE TABLE udhaar_ledger (
	id VARCHAR(36) NOT NULL, 
	vendor_id VARCHAR(36) NOT NULL, 
	customer_name VARCHAR(100) NOT NULL, 
	customer_phone VARCHAR(15), 
	amount_due FLOAT NOT NULL, 
	amount_paid FLOAT NOT NULL, 
	remaining_balance FLOAT NOT NULL, 
	status ENUM('UNPAID','PARTIAL','SETTLED') NOT NULL, 
	notes TEXT, 
	due_date DATETIME, 
	last_reminder_sent_at DATETIME, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_udhaar_ledger_customer_name ON udhaar_ledger (customer_name);
CREATE INDEX ix_udhaar_ledger_created_at ON udhaar_ledger (created_at);
CREATE INDEX ix_udhaar_ledger_vendor_id ON udhaar_ledger (vendor_id);
CREATE INDEX ix_udhaar_ledger_customer_phone ON udhaar_ledger (customer_phone);
CREATE INDEX ix_udhaar_ledger_status ON udhaar_ledger (status);

-- ----------------------------
-- Table structure for vendor_locations
-- ----------------------------
DROP TABLE IF EXISTS `vendor_locations`;
CREATE TABLE vendor_locations (
	id VARCHAR(36) NOT NULL, 
	vendor_id VARCHAR(36) NOT NULL, 
	latitude FLOAT NOT NULL, 
	longitude FLOAT NOT NULL, 
	speed FLOAT, 
	heading FLOAT, 
	battery_level FLOAT, 
	recorded_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_vendor_locations_recorded_at ON vendor_locations (recorded_at);
CREATE INDEX ix_vendor_locations_vendor_id ON vendor_locations (vendor_id);

-- ----------------------------
-- Table structure for demand_predictions
-- ----------------------------
DROP TABLE IF EXISTS `demand_predictions`;
CREATE TABLE demand_predictions (
	id VARCHAR(36) NOT NULL, 
	vendor_id VARCHAR(36) NOT NULL, 
	product_id VARCHAR(36) NOT NULL, 
	prediction_date DATE NOT NULL, 
	predicted_qty FLOAT NOT NULL, 
	recommended_stock FLOAT NOT NULL, 
	confidence_score FLOAT NOT NULL, 
	factors JSON, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(vendor_id) REFERENCES vendors (id) ON DELETE CASCADE, 
	FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_demand_predictions_prediction_date ON demand_predictions (prediction_date);
CREATE INDEX ix_demand_predictions_product_id ON demand_predictions (product_id);
CREATE INDEX ix_demand_predictions_vendor_id ON demand_predictions (vendor_id);

-- ----------------------------
-- Table structure for inventory_ledger
-- ----------------------------
DROP TABLE IF EXISTS `inventory_ledger`;
CREATE TABLE inventory_ledger (
	id VARCHAR(36) NOT NULL, 
	product_id VARCHAR(36) NOT NULL, 
	change_qty FLOAT NOT NULL, 
	transaction_type ENUM('INITIAL','PURCHASE_IN','SALE_OUT','WASTE_ADJUST','RETURN','CORRECTION') NOT NULL, 
	balance_after FLOAT NOT NULL, 
	notes TEXT, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_inventory_ledger_created_at ON inventory_ledger (created_at);
CREATE INDEX ix_inventory_ledger_product_id ON inventory_ledger (product_id);

-- ----------------------------
-- Table structure for loyalty_ledger
-- ----------------------------
DROP TABLE IF EXISTS `loyalty_ledger`;
CREATE TABLE loyalty_ledger (
	id VARCHAR(36) NOT NULL, 
	customer_id VARCHAR(36) NOT NULL, 
	order_id VARCHAR(36), 
	points_change INTEGER NOT NULL, 
	balance_after INTEGER NOT NULL, 
	action_type ENUM('EARNED','REDEEMED','BONUS','EXPIRED') NOT NULL, 
	description TEXT, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(customer_id) REFERENCES customers (id) ON DELETE CASCADE, 
	FOREIGN KEY(order_id) REFERENCES orders (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_loyalty_ledger_order_id ON loyalty_ledger (order_id);
CREATE INDEX ix_loyalty_ledger_customer_id ON loyalty_ledger (customer_id);

-- ----------------------------
-- Table structure for order_items
-- ----------------------------
DROP TABLE IF EXISTS `order_items`;
CREATE TABLE order_items (
	id VARCHAR(36) NOT NULL, 
	order_id VARCHAR(36) NOT NULL, 
	product_id VARCHAR(36), 
	product_name_snapshot VARCHAR(150) NOT NULL, 
	quantity FLOAT NOT NULL, 
	unit VARCHAR(20) NOT NULL, 
	unit_price FLOAT NOT NULL, 
	subtotal FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(order_id) REFERENCES orders (id) ON DELETE CASCADE, 
	FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_order_items_product_id ON order_items (product_id);
CREATE INDEX ix_order_items_order_id ON order_items (order_id);

-- ----------------------------
-- Table structure for sale_items
-- ----------------------------
DROP TABLE IF EXISTS `sale_items`;
CREATE TABLE sale_items (
	id VARCHAR(36) NOT NULL, 
	sale_id VARCHAR(36) NOT NULL, 
	product_id VARCHAR(36), 
	product_name_snapshot VARCHAR(150) NOT NULL, 
	quantity FLOAT NOT NULL, 
	unit VARCHAR(20) NOT NULL, 
	unit_cost_price FLOAT NOT NULL, 
	unit_selling_price FLOAT NOT NULL, 
	subtotal FLOAT NOT NULL, 
	profit FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(sale_id) REFERENCES sales (id) ON DELETE CASCADE, 
	FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX ix_sale_items_product_id ON sale_items (product_id);
CREATE INDEX ix_sale_items_sale_id ON sale_items (sale_id);

-- ----------------------------
-- Records of categories (8 rows)
-- ----------------------------
INSERT INTO `categories` (`id`, `name`, `name_kn`, `icon_name`, `description`) VALUES
('758e49b8-f382-4e58-bf90-488137794951', 'Vegetables', 'ತರಕಾರಿಗಳು', 'carrot', 'Fresh farm vegetables'),
('fcac8f17-4d83-47f3-9eba-637152d55c52', 'Fruits', 'ಹಣ್ಣುಗಳು', 'apple', 'Seasonal fresh fruits'),
('2c6d0c52-016d-4d80-9bbf-6f4385e84682', 'Snacks & Fast Food', 'ತಿಂಡಿ ಮತ್ತು ತಿಂಡಿಗಳು', 'utensils', 'Hot street food & snacks'),
('8927d842-5cc0-46ca-9297-ded61668208c', 'Tea & Beverages', 'ಚಹಾ ಮತ್ತು ಪಾನೀಯಗಳು', 'coffee', 'Tea, Coffee & Fresh Juices'),
('84617457-9ca8-4f62-a77f-4a1e8531d8e0', 'Groceries', 'ದಿನಸಿ ವಸ್ತುಗಳು', 'shopping-bag', 'Daily essentials'),
('93d30d57-6802-4c58-bf1b-d863a37c8ba9', 'Spices & Masala', 'ಮಸಾಲೆ ಪದಾರ್ಥಗಳು', 'sparkles', 'Ground, whole & blended spices'),
('f2b1e128-fc05-4c2d-b1b4-378a2c76c079', 'Dairy & Eggs', 'ಹಾಲು ಮತ್ತು ಮೊಟ್ಟೆ', 'milk', 'Milk, curd, ghee, paneer & eggs'),
('3a877da4-2447-44c3-a446-94e9d2e9396b', 'Rice, Dal & Atta', 'ಅಕ್ಕಿ, ಬೇಳೆ ಮತ್ತು ಹಿಟ್ಟು', 'wheat', 'Kitchen staples: rice, pulses, flour & oil');

-- ----------------------------
-- Records of otp_challenges (4 rows)
-- ----------------------------
INSERT INTO `otp_challenges` (`id`, `phone`, `code_hash`, `purpose`, `attempts`, `max_attempts`, `is_consumed`, `is_verified`, `expires_at`, `created_at`) VALUES
('3d7499d2-0584-43d7-8c63-a50c12c05ec5', '9876543213', '$2b$12$Aub.Nn/glVV2wF48gfjDfOWrxnSsSfYbv/hXxz9fAI03zDDj3bPdK', 'LOGIN', 0, 5, 1, 1, '2026-09-22 19:41:24.960612', '2026-09-22 19:36:25.227616'),
('83ad3c00-2b6b-4c43-9379-4e9af18f2063', '9874563210', '$2b$12$oIY6Uhb72jv4HcPERmPG2O1smumnGLI/2DZungJNrj0HZ04ri8aJO', 'LOGIN', 0, 5, 1, 1, '2026-09-24 09:53:01.651929', '2026-09-24 09:48:01.850326'),
('7359926d-470e-4759-ac14-2843f7d2f492', '9876543210', '$2b$12$/osJVyMPTwNRRHhqFjobs.fdxCeDPhlfzYTWDuQ3ReXtlaa8Qi6re', 'LOGIN', 0, 5, 1, 1, '2026-09-24 19:20:17.789849', '2026-09-24 19:15:17.970230'),
('08439045-f6b3-401f-b049-45298d141af4', '9876543210', '$2b$12$yJ6lMZBTaJsNUfnyVnjK2ucYpXxWehV4fiaVQ4fkP5mAmuAA2xmE6', 'LOGIN', 0, 5, 1, 1, '2026-09-25 16:54:04.575345', '2026-09-25 16:49:04.906219');

-- ----------------------------
-- Records of push_subscriptions (2 rows)
-- ----------------------------
INSERT INTO `push_subscriptions` (`id`, `user_id`, `endpoint`, `p256dh`, `auth`, `user_agent`, `created_at`, `last_used_at`, `failure_count`, `is_active`) VALUES
('95e2bbe4-7ade-4ad2-9480-34726883bd75', '0fd53284-4f4e-4509-ab36-b3c8dc211554', 'https://fcm.googleapis.com/fcm/send/test-endpoint-1', 'BAttestp256dhkey_not_really_real_value_aaaaa', 'authKeyB64==', 'pytest', '2026-09-24 17:50:13.292139', '2026-09-25 18:28:07.969645', 1, 1),
('fb53de94-c230-4928-8490-4c93be6ab321', '0fd53284-4f4e-4509-ab36-b3c8dc211554', 'https://fcm.googleapis.com/fcm/send/live-verify-1', 'BOneRealP256dhKeyPlaceholderForTransportTest0123456789', 'liveAuthTest==', 'curl/8.19.0', '2026-09-24 17:55:47.420230', NULL, 1, 0);

-- ----------------------------
-- Records of users (5 rows)
-- ----------------------------
INSERT INTO `users` (`id`, `phone`, `hashed_password`, `role`, `language_pref`, `is_active`, `created_at`, `updated_at`) VALUES
('0fd53284-4f4e-4509-ab36-b3c8dc211554', '9876543210', '$2b$12$q.hn7aH3pNpC2KNOzvY0wOuLF0AaReNDeVcQeMVpHfLMYzLMctKOa', 'VENDOR', 'KN', 1, '2026-09-22 18:11:56.342791', '2026-09-22 18:11:56.342795'),
('0484934d-6748-4eee-b0da-30b375b8ddbf', '9876543211', '$2b$12$1OZKiXxFNbezxk.gv0q7meF6FO5CTQrOOqnt2ATsImhyA5j8IpqN.', 'VENDOR', 'KN', 1, '2026-09-22 18:11:56.529117', '2026-09-22 18:11:56.529121'),
('aa74e513-d59c-401e-a7da-9ab07650839c', '9876543212', '$2b$12$23c4vh7BsDlvrI0oy/dwAe9r2FzVCLb7QpUrC.u/NcyjpockHL8Q6', 'VENDOR', 'KN', 1, '2026-09-22 18:11:56.718152', '2026-09-22 18:11:56.718155'),
('a37ba2a1-1600-4b3d-b2d9-2285febd43cf', '9876543220', '$2b$12$ctfDNTijuAwtz3k2IV5A2OxQ1Sxxtnzpv67eUVEOjPs3SWaKZVEne', 'CUSTOMER', 'EN', 1, '2026-09-22 18:11:56.917967', '2026-09-22 18:11:56.917972'),
('928a2afa-fcc2-48df-8c9f-606576f2dd2e', '9874563210', '$2b$12$yIXTDDfD.eFRpsw5m/8GbOr/SNOPYzPpcIK2x5e48rGgtaQ1wSuwK', 'CUSTOMER', 'EN', 1, '2026-09-24 09:48:10.269727', '2026-09-24 09:48:10.269737');

-- ----------------------------
-- Records of customers (2 rows)
-- ----------------------------
INSERT INTO `customers` (`id`, `user_id`, `full_name`, `delivery_address`, `default_lat`, `default_lon`, `loyalty_points`, `tier`, `created_at`, `updated_at`) VALUES
('e1b0abf3-20d6-4c12-a061-a1dccd361608', 'a37ba2a1-1600-4b3d-b2d9-2285febd43cf', 'Priya Sharma', '#42, 3rd Cross, Gandhi Nagar, Bengaluru', 12.9725, 77.596, 408, 'SILVER', '2026-09-22 18:11:56.919234', '2026-09-25 18:28:07.922395'),
('507a2252-4a7b-4509-a229-3392f3d9456f', '928a2afa-fcc2-48df-8c9f-606576f2dd2e', 'koux', 'Bengaluru', 12.9716, 77.5946, 2, 'BRONZE', '2026-09-24 09:48:10.281969', '2026-09-24 10:14:41.411142');

-- ----------------------------
-- Records of vendors (3 rows)
-- ----------------------------
INSERT INTO `vendors` (`id`, `user_id`, `business_name`, `business_name_kn`, `business_category`, `operating_location`, `current_lat`, `current_lon`, `operating_radius_km`, `is_active`, `is_accepting_orders`, `rating_avg`, `rating_count`, `working_hours`, `upi_id`, `created_at`, `updated_at`) VALUES
('23810afc-4a62-4bb5-9340-c23b40b4c7ae', '0fd53284-4f4e-4509-ab36-b3c8dc211554', 'Ramesh Fresh Vegetables', 'ರಮೇಶ್ ತಾಜಾ ತರಕಾರಿಗಳು', 'Vegetables', 'Gandhi Circle & Main Bazaar', 12.9716, 77.5946, 8.0, 1, 1, 4.9, 34.0, '06:30 AM - 07:30 PM', 'ramesh.veg@okhdfcbank', '2026-09-22 18:11:56.343989', '2026-09-22 18:11:56.343991'),
('75cbbfb6-ee91-40ea-bad0-69addd56b65a', '0484934d-6748-4eee-b0da-30b375b8ddbf', 'Manjunath Seasonal Fruits', 'ಮಂಜುನಾಥ್ ಹಣ್ಣಿನ ಅಂಗಡಿ', 'Fruits', 'Bus Stand Road', 12.978, 77.585, 10.0, 1, 1, 4.7, 21.0, '06:00 AM - 08:00 PM', 'manjunath.fruits@okaxis', '2026-09-22 18:11:56.529821', '2026-09-22 18:11:56.529823'),
('695fb276-5d02-486f-a03f-ba5fa921415b', 'aa74e513-d59c-401e-a7da-9ab07650839c', 'Lakshmi Spice & Staples Store', 'ಲಕ್ಷ್ಮಿ ಮಸಾಲೆ ಮತ್ತು ದಿನಸಿ ಅಂಗಡಿ', 'Spices & Staples', 'Market Street Corner Shop', 12.9752, 77.599, 12.0, 1, 1, 4.8, 52.0, '08:00 AM - 09:30 PM', 'lakshmi.spices@okicici', '2026-09-22 18:11:56.918187', '2026-09-22 18:11:56.918189');

-- ----------------------------
-- Records of orders (158 rows)
-- ----------------------------
INSERT INTO `orders` (`id`, `order_number`, `customer_id`, `vendor_id`, `status`, `payment_status`, `payment_mode`, `total_amount`, `delivery_address`, `delivery_lat`, `delivery_lon`, `special_instructions`, `estimated_delivery_time`, `completed_at`, `created_at`, `updated_at`) VALUES
('8dcb9631-5113-447b-aa74-868696cf57d1', 'ORD-0822-A101', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'UPI', 170.0, '#42, 3rd Cross, Gandhi Nagar, Bengaluru', 12.9725, 77.596, 'Please select fresh ripe tomatoes', NULL, NULL, '2026-09-22 18:11:56.965429', '2026-09-22 18:11:56.965431'),
('dbf2db52-6686-49d7-a475-f2e63023b081', 'ORD-0922-C260', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-22 18:41:01.298126', '2026-09-22 18:21:01.322832', '2026-09-22 18:21:01.258521', '2026-09-22 18:21:01.324517'),
('d2f16866-9ff2-450b-aa2d-a5b3320073f6', 'ORD-VOICE-FDA5', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-22 19:17:45.895809', '2026-09-22 19:17:45.895813'),
('0641f0aa-3d44-4c31-b018-db8acac3d24b', 'ORD-VOICE-C051', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-22 19:19:37.881521', '2026-09-22 19:19:37.881523'),
('59147bfe-f6df-4647-a03f-d7f0c4b9262c', 'ORD-VOICE-5F0F', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 80.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-22 19:22:03.061757', '2026-09-22 19:22:03.061760'),
('45c8a116-5ece-4ff1-93ed-47dba3f22c2c', 'ORD-VOICE-789E', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-22 19:23:40.982885', '2026-09-22 19:23:40.982889'),
('cf543ef6-d17e-4bff-b3f1-09a36c4e9715', 'ORD-VOICE-585F', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-22 19:25:24.347224', '2026-09-22 19:25:24.347227'),
('56d3408d-77fb-4220-8d64-3759b7a2b55d', 'ORD-VOICE-1596', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-22 19:30:50.547383', '2026-09-22 19:30:50.547388'),
('c0fea222-7e98-4a30-a7c7-65d8ee343981', 'ORD-VOICE-5DDE', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-22 19:32:23.807769', '2026-09-22 19:32:23.807775'),
('8ec152ca-886e-41e1-bf0b-def55ff1e73a', 'ORD-0923-6E9B', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-22 19:52:47.176515', '2026-09-22 19:32:47.202476', '2026-09-22 19:32:47.143480', '2026-09-22 19:32:47.206073'),
('35d86a93-3235-4b57-8328-c605cca916b0', 'ORD-VOICE-A0D1', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-22 19:32:50.110065', '2026-09-22 19:32:50.110068'),
('49647b07-9084-4bd8-90bc-dc404655833f', 'ORD-VOICE-2DCC', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-22 19:34:59.041579', '2026-09-22 19:34:59.041582'),
('00f292ac-1b97-487b-9e61-7f3a67233c01', 'ORD-0923-F2DE', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-22 19:58:52.181645', '2026-09-22 19:38:52.205217', '2026-09-22 19:38:52.149597', '2026-09-22 19:38:52.208233'),
('416f0a7c-7c00-44c7-b216-e8374f4f19ae', 'ORD-VOICE-29FD', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-22 19:38:54.959091', '2026-09-22 19:38:54.959095'),
('b749389e-0f71-415f-8e5d-a7a45bfa3f7d', 'ORD-0923-1523', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-22 20:04:21.312437', '2026-09-22 19:44:21.333710', '2026-09-22 19:44:21.280401', '2026-09-22 19:44:21.336056'),
('7cb3e6ec-081a-4371-94c6-eca54dd6ca38', 'ORD-VOICE-C8AC', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-22 19:44:24.069120', '2026-09-22 19:44:24.069125'),
('596c28f1-704d-4f2c-85c1-44e6526251ea', 'ORD-VOICE-2FE9', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 120.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-22 19:45:27.319285', '2026-09-22 19:45:27.319287'),
('0791aaa5-8163-434f-98f9-8b35c77988f2', 'ORD-0923-BC85', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-22 20:07:31.167504', '2026-09-22 19:47:31.192929', '2026-09-22 19:47:31.132604', '2026-09-22 19:47:31.195173'),
('d2684cc0-1b9b-4980-8a96-252c0f179068', 'ORD-0923-D183', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-22 20:08:37.924843', '2026-09-22 19:48:37.952428', '2026-09-22 19:48:37.878533', '2026-09-22 19:48:37.955280'),
('91196951-2310-4ce3-96d0-9f6b4f11bf6f', 'ORD-VOICE-288D', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-22 19:48:40.827250', '2026-09-22 19:48:40.827253'),
('e19177ee-778d-4fae-a440-87e14cb6e3b8', 'ORD-VOICE-F3F6', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 80.0, '#42, 3rd Cross, Gandhi Nagar, Bengaluru', NULL, NULL, NULL, NULL, NULL, '2026-09-22 19:50:42.804188', '2026-09-22 19:50:42.804191'),
('858e7be7-1feb-47a9-9873-4c21910fba22', 'ORD-0923-6804', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-22 20:11:27.659421', '2026-09-22 19:51:27.690187', '2026-09-22 19:51:27.619092', '2026-09-22 19:51:27.693217'),
('6b890e73-8598-4267-9831-0d477fe2d7be', 'ORD-VOICE-ACCA', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-22 19:51:30.515691', '2026-09-22 19:51:30.515694'),
('8d9de472-4266-4a4e-8e56-7ce29861f1d0', 'ORD-VOICE-1863', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 80.0, '#42, 3rd Cross, Gandhi Nagar, Bengaluru', NULL, NULL, NULL, NULL, NULL, '2026-09-22 19:51:43.344489', '2026-09-22 19:51:43.344495'),
('70e1a089-4477-46a6-bd68-81606793be62', 'ORD-VOICE-9E08', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, '#42, 3rd Cross, Gandhi Nagar, Bengaluru', NULL, NULL, NULL, NULL, NULL, '2026-09-22 19:54:29.831986', '2026-09-22 19:54:29.831993'),
('bfff5243-ad65-416f-aa65-ba6d879079de', 'ORD-0923-2416', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-22 20:15:33.586681', '2026-09-22 19:55:33.614399', '2026-09-22 19:55:33.536564', '2026-09-22 19:55:33.617290'),
('bd7b368b-bd77-4a3e-b286-274d07bc70c9', 'ORD-VOICE-4126', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-22 19:55:36.184071', '2026-09-22 19:55:36.184073'),
('7a1cbd3f-8b78-40b6-8e10-26659cdbb9fc', 'ORD-0924-41E3', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-24 10:20:13.078059', '2026-09-24 10:00:13.096111', '2026-09-24 10:00:13.040421', '2026-09-24 10:00:13.098846'),
('b9b5e862-6abf-4582-a197-407a8c4463d5', 'ORD-VOICE-6479', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 10:00:16.545819', '2026-09-24 10:00:16.545823'),
('aac5660b-cc0b-406b-a614-ac2ea7ed444a', 'ORD-0924-2B65', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-24 10:28:38.668365', '2026-09-24 10:08:38.703602', '2026-09-24 10:08:38.606140', '2026-09-24 10:08:38.706104'),
('3ecc705a-50c6-4c39-9f71-e23b4da8e048', 'ORD-VOICE-544F', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 10:08:42.135646', '2026-09-24 10:08:42.135649'),
('b43a7406-eab0-46f4-8d32-e3a6f7219b99', 'ORD-0924-9DDA', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'COMPLETED', 'UPI', 40.0, 'Doorstep · Main Road', NULL, NULL, NULL, NULL, NULL, '2026-09-24 10:14:41.408204', '2026-09-24 10:14:41.430412'),
('46421182-880e-43e2-a0d9-abdf108b9647', 'ORD-0924-F3E2', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-24 10:39:43.088508', '2026-09-24 10:19:43.117116', '2026-09-24 10:19:43.034917', '2026-09-24 10:19:43.120799'),
('16c68f9f-2e9d-4641-ad71-eaa9870c21dd', 'ORD-VOICE-4235', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 10:19:46.607134', '2026-09-24 10:19:46.607142'),
('2cedf1ce-ef0d-4837-8b96-7a96bdd2c0d9', 'ORD-0924-D0D7', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-24 10:58:36.228910', '2026-09-24 10:38:36.265645', '2026-09-24 10:38:36.150649', '2026-09-24 10:38:36.268553'),
('98b4e178-ee57-40c7-b1ce-69cfeeff7883', 'ORD-VOICE-281C', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 10:38:39.187114', '2026-09-24 10:38:39.187120'),
('725de290-d95a-4ef0-b3d0-824e6b300e60', 'ORD-VOICE-FE53', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 17:15:32.647699', '2026-09-24 17:15:32.647701'),
('d629a150-2583-4676-8762-04d9bd13085e', 'ORD-VOICE-D510', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 120.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 17:15:38.963305', '2026-09-24 17:30:28.319984'),
('4ad85e35-e5e5-49d9-b4d6-3bf95a67ea2f', 'ORD-0924-B2BF', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-24 17:36:08.091101', '2026-09-24 17:16:08.115498', '2026-09-24 17:16:08.045132', '2026-09-24 17:16:08.117859'),
('22d604ff-5716-4343-beac-358721239f0c', 'ORD-VOICE-BD83', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 17:16:10.631086', '2026-09-24 17:30:22.981140'),
('82045127-e5ab-45cd-b7bb-80250b5dba96', 'ORD-VOICE-7DFB', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 120.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 17:16:18.504486', '2026-09-24 17:30:20.415949'),
('1666bb94-5d3e-4672-b61e-aaff2b748705', 'ORD-VOICE-BA68', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 60.0, 'Bengaluru', NULL, NULL, NULL, NULL, NULL, '2026-09-24 17:26:57.928483', '2026-09-24 17:30:18.155124'),
('47794a16-76aa-43f7-874a-3f22918baaba', 'ORD-0924-1AFB', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 50.0, 'Push test lane', NULL, NULL, NULL, NULL, NULL, '2026-09-24 17:50:13.707432', '2026-09-24 17:50:13.707443'),
('74014dbe-574b-439c-84e9-af0bb86d91b9', 'ORD-0924-59CA', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-24 18:10:39.231199', '2026-09-24 17:50:39.259585', '2026-09-24 17:50:38.927151', '2026-09-24 17:50:39.261857'),
('f7636032-1ce2-4631-894a-fd2d2129cf9e', 'ORD-VOICE-789C', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 17:50:42.876126', '2026-09-24 17:50:42.876130'),
('a403d8f3-efdc-4e83-9c03-b76d152201a2', 'ORD-VOICE-8694', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 120.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 17:50:48.984310', '2026-09-24 18:07:24.497651'),
('f5f5aec5-7657-4ba9-8a22-99365f080e8e', 'ORD-0924-F23F', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 50.0, 'Push test lane', NULL, NULL, NULL, NULL, NULL, '2026-09-24 17:50:50.344713', '2026-09-24 18:06:47.035197'),
('f5cbe375-5aff-4f7f-a48b-e9ad33779706', 'ORD-0924-4F2E', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-24 18:17:22.555322', '2026-09-24 17:57:22.589557', '2026-09-24 17:57:22.464034', '2026-09-24 17:57:22.593255'),
('f3097e16-93c7-44b0-bded-ef7be81f3745', 'ORD-VOICE-419F', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 17:57:25.546903', '2026-09-24 18:06:26.166282'),
('09f5ce17-a652-42f8-9f36-c7271eadaafe', 'ORD-VOICE-3780', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 120.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 17:57:31.795946', '2026-09-24 18:06:02.600870');
INSERT INTO `orders` (`id`, `order_number`, `customer_id`, `vendor_id`, `status`, `payment_status`, `payment_mode`, `total_amount`, `delivery_address`, `delivery_lat`, `delivery_lon`, `special_instructions`, `estimated_delivery_time`, `completed_at`, `created_at`, `updated_at`) VALUES
('7d38582b-0409-4bd9-88d6-9e6322d3cf7b', 'ORD-0924-AEED', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 50.0, 'Push test lane', NULL, NULL, NULL, NULL, NULL, '2026-09-24 17:57:33.568924', '2026-09-24 18:05:47.507324'),
('d655a880-fc8d-47c8-ab56-b37bacea3491', 'ORD-0924-F723', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-24 18:30:27.553005', '2026-09-24 18:10:27.579078', '2026-09-24 18:10:27.242086', '2026-09-24 18:10:27.581849'),
('be549bc8-ba94-4cc7-810d-8d9db8ddd6de', 'ORD-VOICE-BA5E', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:10:30.317243', '2026-09-24 18:18:39.512884'),
('fc9acbc4-072d-4419-8789-12eb9d57d72d', 'ORD-VOICE-1D13', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 120.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:10:36.410855', '2026-09-24 18:14:26.995176'),
('8abbec2e-a0d7-458a-9fe0-e2a6f0feef30', 'ORD-0924-1FD0', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 50.0, 'Push test lane', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:10:37.691601', '2026-09-24 18:10:38.062632'),
('7b922d02-69e6-42a7-bf1c-79bc9d0b8d94', 'ORD-0924-6F94', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-24 18:42:07.125868', '2026-09-24 18:22:07.146138', '2026-09-24 18:22:06.902467', '2026-09-24 18:22:07.148015'),
('6d9484ef-02f7-4121-9322-927fdeb0b55a', 'ORD-VOICE-650D', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:22:09.450727', '2026-09-24 18:37:31.136448'),
('1ff72f09-e79c-4557-9c5b-be248e6e3ea2', 'ORD-VOICE-8605', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 120.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:22:15.580243', '2026-09-24 18:35:13.874208'),
('5b865fdb-f26c-4ebd-b02a-9f612c412223', 'ORD-0924-CCEE', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 50.0, 'Push test lane', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:22:16.652825', '2026-09-24 18:22:16.921692'),
('a131c6c2-298d-4ec1-980d-99eb19729cb6', 'ORD-OFF-TEST01', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:37:32.375795', '2026-09-24 18:37:32.375798'),
('0007c097-d741-465c-9dc2-b799b4ee3a0a', 'ORD-0925-FF5F', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-24 18:57:47.890290', '2026-09-24 18:37:47.918911', '2026-09-24 18:37:47.564966', '2026-09-24 18:37:47.921830'),
('dbbb26e8-1c13-423d-9ebf-1df567d8bed6', 'ORD-VOICE-C740', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:37:50.720319', '2026-09-24 18:37:50.720323'),
('08d5463d-2b42-4e36-9947-e6716b47c2b2', 'ORD-VOICE-AFD2', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 120.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:37:57.193794', '2026-09-24 18:37:57.193798'),
('ac90fc59-3e7b-406e-8bd3-2f8a29ab3809', 'ORD-0925-CE52', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 50.0, 'Push test lane', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:37:58.818926', '2026-09-24 18:37:59.295903'),
('bbbca712-d412-4807-86d8-f4a8ba4f517e', 'ORD-0925-1156', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-24 18:59:03.498056', '2026-09-24 18:39:03.518967', '2026-09-24 18:39:03.312518', '2026-09-24 18:39:03.520765'),
('64c5b466-c35f-471b-82c2-84962e1b4762', 'ORD-VOICE-6336', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:39:05.822712', '2026-09-24 18:39:05.822716'),
('e9ef4053-d934-4bc1-9200-10019621edeb', 'ORD-VOICE-EE4A', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 120.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:39:11.736131', '2026-09-24 18:41:00.044426'),
('9bd6663c-664c-4686-b46e-1cb9478ed88d', 'ORD-0925-9FEF', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 50.0, 'Push test lane', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:39:12.996223', '2026-09-24 18:39:13.263838'),
('9a679fd3-b1bc-4417-bb82-a43d08463748', 'ORD-OFF-45627B', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:41:00.229086', '2026-09-24 18:41:00.229089'),
('eaedd879-4d06-4163-be62-f26737110535', 'ORD-0925-5422', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-24 19:01:12.197337', '2026-09-24 18:41:12.216901', '2026-09-24 18:41:11.965237', '2026-09-24 18:41:12.218661'),
('757d937e-65ee-42d9-ab3c-0723098f72ec', 'ORD-VOICE-5D0C', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:41:14.891957', '2026-09-24 18:41:14.891959'),
('bdb05c88-1cad-421e-a09f-a55ed25ca57c', 'ORD-VOICE-CBE7', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 120.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:41:20.700004', '2026-09-24 18:41:20.700006'),
('a1832ea2-1716-409c-8ab9-bb42e4d068b3', 'ORD-0925-C98E', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 50.0, 'Push test lane', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:41:21.733777', '2026-09-24 18:41:22.004597'),
('15059227-ed84-4914-ad8e-dafc3226127b', 'ORD-OFF-543458', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:41:22.266757', '2026-09-24 18:41:22.266759'),
('eee0c68d-329f-4000-9455-1e518b09da5e', 'ORD-0925-EDE2', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-24 19:08:12.226340', '2026-09-24 18:48:12.264939', '2026-09-24 18:48:11.907376', '2026-09-24 18:48:12.268766'),
('9bf79b6b-cd7d-4e0a-ab00-e2dc5249a9c0', 'ORD-VOICE-153E', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:48:15.490870', '2026-09-24 18:48:15.490876'),
('794ac649-7b83-42f6-99f1-5633292f1616', 'ORD-VOICE-0A28', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 120.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:48:22.146398', '2026-09-24 18:48:22.146401'),
('944093e0-9757-4f3a-ae96-5b9a8641c7d6', 'ORD-0925-4165', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 50.0, 'Push test lane', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:48:23.508392', '2026-09-24 18:48:23.780858'),
('9881ef5f-1e45-4d1f-9596-aa5583e3d2e9', 'ORD-OFF-DAEE4A', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:48:24.053887', '2026-09-24 18:48:24.053890'),
('71087031-c384-4aa6-b049-81ffb8c0ae5a', 'ORD-OFF-ORDER_', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 0.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:51:01.709608', '2026-09-24 18:52:29.397883'),
('7ddab5cc-b28f-4ef1-9096-41b9f60bcac6', 'ORD-OFF-C23F3F', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:52:29.574222', '2026-09-24 18:52:29.574225'),
('4c0157c4-0e33-4065-bc5a-127ce84f2057', 'ORD-0925-6F2C', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-24 19:12:41.241694', '2026-09-24 18:52:41.267989', '2026-09-24 18:52:41.052082', '2026-09-24 18:52:41.269865'),
('1523333c-34c1-4416-98c1-ba147c6339f8', 'ORD-VOICE-41F3', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:52:44.082696', '2026-09-24 18:52:44.082698'),
('a294ef02-1520-41cf-8916-1456cbe9df1c', 'ORD-VOICE-79CA', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 120.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:52:51.902999', '2026-09-24 18:52:51.903001'),
('95b37590-be75-4385-b6e9-a734312dfc34', 'ORD-0925-03B2', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 50.0, 'Push test lane', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:52:53.113417', '2026-09-24 18:52:53.387056'),
('9efb586f-6d8e-42fc-aa04-2e8cf188b910', 'ORD-OFF-640A2B', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:52:53.655176', '2026-09-24 18:52:53.655179'),
('3b0d85b3-b699-47cb-a49f-eab8a4ad5acb', 'ORD-OFF-6C7C33', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 0.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:53:16.537628', '2026-09-24 18:53:16.537632'),
('a1f0ed83-c246-400a-acc1-4ae573de4cbc', 'ORD-OFF-432B21', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 0.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:55:00.355318', '2026-09-24 18:55:00.355321'),
('884983aa-14d7-4260-a5c2-764bd489ff0a', 'ORD-OFF-8064F0', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 0.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 18:55:00.364936', '2026-09-24 18:55:00.364939'),
('77bbd436-800b-4c08-8bca-cb0951abe4dd', 'ORD-OFF-732503', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 0.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 19:01:01.189961', '2026-09-24 19:01:01.189963'),
('e9fb2ca6-26c1-4593-8b4f-ea21bd1d6eb8', 'ORD-0925-1942', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-24 19:22:45.052551', '2026-09-24 19:02:45.078902', '2026-09-24 19:02:44.860494', '2026-09-24 19:02:45.081767'),
('ebc5992b-5572-4004-81e2-66ff7d6d998a', 'ORD-VOICE-F4FB', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 19:02:47.633052', '2026-09-24 19:02:47.633055'),
('714f1965-fc8b-4374-8048-39547324e0a7', 'ORD-VOICE-7E75', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 120.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 19:02:53.544039', '2026-09-24 19:02:53.544041'),
('344d67a6-83be-46c7-8c1c-7a85a2bbdd9a', 'ORD-0925-8A3C', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 50.0, 'Push test lane', NULL, NULL, NULL, NULL, NULL, '2026-09-24 19:02:54.630609', '2026-09-24 19:02:55.008151'),
('11bee3e4-625f-41d5-a8c6-77caca03a14e', 'ORD-OFF-6A1E78', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 19:02:55.182190', '2026-09-24 19:02:55.182193'),
('d8ffbc7d-1fd5-4a30-96de-e75b8e464374', 'ORD-OFF-2F3BBC', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 19:02:55.275344', '2026-09-24 19:02:55.286730'),
('c58db05d-6221-4fe8-b0dd-d0aae972fed2', 'ORD-OFF-95835E', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 120.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 19:05:07.554248', '2026-09-24 19:05:07.560641'),
('4b31f84c-b428-4d6b-a7fe-0d36006135ed', 'ORD-OFF-3138AF', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 120.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 19:05:40.658980', '2026-09-24 19:05:40.661158'),
('c528a90e-17bd-4616-9eb2-0e4503c8fa01', 'ORD-0925-AFFF', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-24 19:28:41.595640', '2026-09-24 19:08:41.620992', '2026-09-24 19:08:41.377890', '2026-09-24 19:08:41.622644'),
('681b4a77-33f7-4ad5-b6b1-08e176e52290', 'ORD-VOICE-5DC6', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 19:08:44.089580', '2026-09-24 19:08:44.089583');
INSERT INTO `orders` (`id`, `order_number`, `customer_id`, `vendor_id`, `status`, `payment_status`, `payment_mode`, `total_amount`, `delivery_address`, `delivery_lat`, `delivery_lon`, `special_instructions`, `estimated_delivery_time`, `completed_at`, `created_at`, `updated_at`) VALUES
('1c20fb38-1b82-47ed-95ec-06e6a5edfccd', 'ORD-VOICE-717F', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 120.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 19:08:49.727010', '2026-09-24 19:08:49.727012'),
('af4895e2-c13a-4f59-84d7-ca12a5737178', 'ORD-0925-2790', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 50.0, 'Push test lane', NULL, NULL, NULL, NULL, NULL, '2026-09-24 19:08:50.947827', '2026-09-24 19:08:51.223108'),
('b15f7744-5ee1-4dfc-b31c-6255a8d7c4b1', 'ORD-OFF-6F1A1D', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 19:08:51.519835', '2026-09-24 19:08:51.519837'),
('09333e72-33cf-49fd-83ad-baa944504f24', 'ORD-OFF-E46384', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 19:08:51.617106', '2026-09-24 19:08:51.620429'),
('e536e6af-615c-4413-85d2-bb73e7bb4ac1', 'ORD-VOICE-EB38', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 100.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 19:18:48.135014', '2026-09-24 19:18:48.135019'),
('35dcc06a-ca8c-409b-8a9c-88721719fbe1', 'ORD-OFF-544D96', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 35.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-24 19:34:09.170440', '2026-09-24 19:34:09.173869'),
('051c03e7-b26f-4dab-a102-b1d4ef38109e', 'ORD-0925-CF93', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-25 16:30:51.948588', '2026-09-25 16:10:51.980189', '2026-09-25 16:10:51.416549', '2026-09-25 16:10:51.983281'),
('04eb8912-95ad-4ce8-a05d-4bf183d7fdfd', 'ORD-VOICE-52DE', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 16:10:55.229539', '2026-09-25 16:10:55.229542'),
('ab031d61-d982-478b-bb7c-531d4df510d2', 'ORD-VOICE-12DA', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 120.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 16:11:01.354372', '2026-09-25 16:11:01.354377'),
('a5bc56f7-e77f-4b28-a33c-71af91c1a01c', 'ORD-0925-04A1', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 50.0, 'Push test lane', NULL, NULL, NULL, NULL, NULL, '2026-09-25 16:11:03.387108', '2026-09-25 16:11:03.790772'),
('bb283442-43a0-455e-8cfa-6c368657fe3e', 'ORD-OFF-54D8E5', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 16:11:04.054270', '2026-09-25 16:11:04.054275'),
('292d72c4-ac30-4c8c-b794-246839639346', 'ORD-OFF-F4C777', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 16:11:04.214839', '2026-09-25 16:11:04.219042'),
('2feb82b0-1b56-453a-83fa-0e2357757a10', 'ORD-OFF-8D1D9F', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 70.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 16:29:41.702664', '2026-09-25 16:29:41.710020'),
('9c431b30-2ac3-4848-a7c5-6bc2f9e36e37', 'ORD-OFF-592989', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 120.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 16:37:12.309731', '2026-09-25 16:37:12.316791'),
('cc72087f-847d-4b4e-9a4d-f4540eabe8e8', 'ORD-0925-47D8', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-25 17:04:21.134226', '2026-09-25 16:44:21.166203', '2026-09-25 16:44:20.772554', '2026-09-25 16:44:21.170092'),
('f0826c5c-26f3-4757-a722-dcd83c7a3f14', 'ORD-VOICE-E29E', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 16:44:24.590440', '2026-09-25 16:44:24.590445'),
('849e6866-24cf-4dc1-9a33-f4ce3921ddf5', 'ORD-VOICE-18D5', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 120.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 16:44:31.182607', '2026-09-25 16:44:31.182612'),
('98ea76e1-1d33-4e2f-bc57-e32beee6aa00', 'ORD-0925-6CF1', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 50.0, 'Push test lane', NULL, NULL, NULL, NULL, NULL, '2026-09-25 16:44:33.113575', '2026-09-25 16:44:33.851700'),
('c3ca46f1-846e-406b-af4b-c1d1be872a0e', 'ORD-OFF-5E06E6', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 16:44:34.223036', '2026-09-25 16:44:34.223041'),
('8208bd16-42f8-47d3-ba67-3b51ce85dcfa', 'ORD-OFF-A02D63', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 16:44:34.478193', '2026-09-25 16:44:34.484365'),
('82066e6b-e8c6-487e-9e9b-43b5619f2f85', 'ORD-OFF-6ED085', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 50.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 16:58:50.406569', '2026-09-25 16:58:50.414783'),
('0aac0e66-f927-4e2d-9389-2352cf62b8c8', 'ORD-0925-1412', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-25 17:28:28.096956', '2026-09-25 17:08:28.121955', '2026-09-25 17:08:27.768336', '2026-09-25 17:08:28.126163'),
('527ec776-e199-499b-bdb5-e3fa171f4e65', 'ORD-VOICE-A5E0', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 17:08:30.946074', '2026-09-25 17:08:30.946077'),
('4f1e824d-bd66-4eae-857a-74bef5cdfe05', 'ORD-VOICE-E4A7', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 120.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 17:08:37.345577', '2026-09-25 17:08:37.345582'),
('dd78376d-620a-4aa9-aad8-f96517a85f01', 'ORD-0925-5C0F', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 50.0, 'Push test lane', NULL, NULL, NULL, NULL, NULL, '2026-09-25 17:08:39.172214', '2026-09-25 17:08:39.172217'),
('a7adaaeb-e4d0-4094-95d6-0e8fdfb5e512', 'ORD-OFF-1BD7CA', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 30.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 17:08:39.222873', '2026-09-25 17:08:39.229676'),
('46acebd6-680e-49f7-8439-122abb983ed0', 'ORD-OFF-5FFD31', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 30.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 17:08:39.262808', '2026-09-25 17:08:39.822693'),
('193189c1-abcd-4146-b112-9c69b44e5777', 'ORD-OFF-BEA419', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 17:08:40.197027', '2026-09-25 17:08:40.197031'),
('f52eb4cd-3cf5-4e4d-93b3-8540c49c3504', 'ORD-OFF-756BF9', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 17:08:40.435081', '2026-09-25 17:08:40.439484'),
('3930a06c-2caa-4372-b0be-b947ac72981d', 'ORD-OFF-DC2D59', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 35.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 17:09:35.610583', '2026-09-25 17:09:35.620199'),
('47d3530b-913c-48bd-8eb6-6ef89a562d18', 'ORD-0925-B81F', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'COMPLETED', 'COMPLETED', 'CASH', 30.0, 'Flat 302, Green Glen Layout, Bellandur, Bengaluru', 12.9279, 77.6711, NULL, '2026-09-25 17:39:22.073789', '2026-09-25 17:19:22.102534', '2026-09-25 17:19:21.795776', '2026-09-25 17:19:22.105475'),
('a6b0d826-3ca7-46f4-b74c-3a3159407932', 'ORD-VOICE-20EA', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 40.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 17:19:24.892839', '2026-09-25 17:19:24.892844'),
('89514c05-a837-4b30-b99f-c42d59cadae4', 'ORD-VOICE-5FD0', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 120.0, 'Voice order — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 17:19:31.089451', '2026-09-25 17:19:31.089454'),
('631888f0-e538-4f48-9a5f-b98092f96f5c', 'ORD-0925-DFE1', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 50.0, 'Push test lane', NULL, NULL, NULL, NULL, NULL, '2026-09-25 17:19:32.719822', '2026-09-25 17:19:32.719825'),
('22c71116-bbcd-4e53-b58b-ccbd64019a3b', 'ORD-OFF-89B9E0', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 30.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 17:19:32.762072', '2026-09-25 17:19:32.765995'),
('0c9ae1d7-1975-430c-8fe1-3db2a590921f', 'ORD-OFF-DBB33D', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 30.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 17:19:32.791288', '2026-09-25 17:19:33.383429'),
('9a51d3e8-d594-43c5-ab70-99ee03ff3cc4', 'ORD-OFF-095873', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 17:19:33.658791', '2026-09-25 17:19:33.658795'),
('1aa1da2a-4cc5-4fad-abc4-7da4fe2443f2', 'ORD-OFF-3E3035', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 17:19:33.832511', '2026-09-25 17:19:33.835671'),
('5eff56a6-5b44-4afb-a3dc-3d3b5b64c263', 'ORD-0925-AC9E', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 50.0, 'Push test lane', NULL, NULL, NULL, NULL, NULL, '2026-09-25 17:33:58.223187', '2026-09-25 17:33:58.223191'),
('6d7064d8-7d8c-4577-86cc-6349976b8ec5', 'ORD-OFF-E62EF4', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 30.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 17:33:58.286001', '2026-09-25 17:33:58.289965'),
('45b0bb87-0ca0-452a-bf64-d2c0cd06cc74', 'ORD-OFF-8E3FA4', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 30.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 17:33:58.314669', '2026-09-25 17:33:58.724270'),
('b8e1ade7-a543-4661-9412-0fc9afc8e725', 'ORD-OFF-EFF538', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 17:33:59.022071', '2026-09-25 17:33:59.022073'),
('55d20d4e-6427-46a5-8002-7879a08dbe33', 'ORD-OFF-03363A', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 17:33:59.183039', '2026-09-25 17:33:59.187881'),
('8c5a0b59-d580-4aea-bd02-2ae0d743178c', 'ORD-0925-657A', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 50.0, 'Push test lane', NULL, NULL, NULL, NULL, NULL, '2026-09-25 18:25:27.052576', '2026-09-25 18:25:27.052578'),
('d837b09d-0d44-4f35-bacb-9a227a320d2a', 'ORD-OFF-9F6105', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 30.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 18:25:27.098989', '2026-09-25 18:25:27.103245'),
('fb7f1347-2b24-4234-b7c9-b5f00fb52c57', 'ORD-OFF-1E4832', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 30.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 18:25:27.123000', '2026-09-25 18:25:27.124657'),
('bc0f8c05-365e-4e7c-8f66-177fc3f20d38', 'ORD-0925-A848', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 50.0, 'Push test lane', NULL, NULL, NULL, NULL, NULL, '2026-09-25 18:25:53.173093', '2026-09-25 18:25:53.173095'),
('10c3671d-9189-467f-8523-814855f8063d', 'ORD-OFF-73890C', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 30.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 18:25:53.205787', '2026-09-25 18:25:53.209413'),
('b4c0a567-983e-4e10-8b62-631926c76b5d', 'ORD-OFF-AEF20A', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 30.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 18:25:53.505003', '2026-09-25 18:25:53.507146'),
('dd298b53-d117-4b38-931e-667860ae68d5', 'ORD-OFF-567861', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 30.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 18:26:07.774960', '2026-09-25 18:26:07.788916');
INSERT INTO `orders` (`id`, `order_number`, `customer_id`, `vendor_id`, `status`, `payment_status`, `payment_mode`, `total_amount`, `delivery_address`, `delivery_lat`, `delivery_lon`, `special_instructions`, `estimated_delivery_time`, `completed_at`, `created_at`, `updated_at`) VALUES
('f30e84dd-0e6c-4c1a-b2ff-d4a51773db9f', 'ORD-OFF-7F4787', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 30.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 18:26:24.283214', '2026-09-25 18:26:24.287792'),
('794dabf3-4bb4-46c2-8b28-453e4cb1923a', 'ORD-0925-032F', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 50.0, 'Push test lane', NULL, NULL, NULL, NULL, NULL, '2026-09-25 18:28:07.919687', '2026-09-25 18:28:07.919689'),
('63903884-abd3-48fd-9570-72f1d52c5485', 'ORD-OFF-1E6DAB', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 30.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 18:28:07.957037', '2026-09-25 18:28:07.963343'),
('a6173930-9d73-4919-8aa1-a926e98fa68b', 'ORD-OFF-D0E7C4', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ACCEPTED', 'PENDING', 'CASH', 30.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 18:28:07.982655', '2026-09-25 18:28:08.267076'),
('3a469e15-9e7b-4145-b071-8acae2eb9d5c', 'ORD-OFF-4D0171', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 18:28:08.484766', '2026-09-25 18:28:08.484768'),
('e67d9219-861e-45ab-b9b1-22ab4dd580f7', 'ORD-OFF-14BA59', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 60.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 18:28:08.617420', '2026-09-25 18:28:08.620202'),
('21f05a3b-bc04-4d30-8fde-276863ea1ab4', 'ORD-OFF-D4CC1A', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 50.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-25 18:28:53.377947', '2026-09-25 18:28:53.391938'),
('ad0258cf-09ca-46e7-bb49-6442bd3dbc30', 'ORD-OFF-A22447', '507a2252-4a7b-4509-a229-3392f3d9456f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'PENDING', 'PENDING', 'CASH', 50.0, 'Voice order (offline) — collect at cart', NULL, NULL, NULL, NULL, NULL, '2026-09-26 16:36:37.729795', '2026-09-26 16:36:37.741689');

-- ----------------------------
-- Records of products (42 rows)
-- ----------------------------
INSERT INTO `products` (`id`, `vendor_id`, `category_id`, `name_en`, `name_kn`, `description`, `unit`, `cost_price`, `selling_price`, `current_stock`, `low_stock_threshold`, `image_url`, `is_available`, `is_perishable`, `created_at`, `updated_at`) VALUES
('d8b22e41-eb54-4fcf-9d7f-a742ca515579', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '758e49b8-f382-4e58-bf90-488137794951', 'Tomato (Local Farm)', 'ಟೊಮೇಟೊ', NULL, 'KG', 18.0, 30.0, 0.0, 5.0, 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400', 1, 1, '2026-09-22 18:11:56.925654', '2026-09-24 19:08:41.623654'),
('d3419f97-f1d7-4876-8f98-bafbcb24499c', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '758e49b8-f382-4e58-bf90-488137794951', 'Red Onion', 'ಈರುಳ್ಳಿ', NULL, 'KG', 25.0, 40.0, 45.0, 10.0, 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400', 1, 1, '2026-09-22 18:11:56.926599', '2026-09-22 19:23:40.018064'),
('916cf9b7-b54a-4f6b-8bb8-e475196097cf', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '758e49b8-f382-4e58-bf90-488137794951', 'Potato', 'ಆಲೂಗಡ್ಡೆ', NULL, 'KG', 22.0, 35.0, 37.0, 8.0, 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400', 1, 1, '2026-09-22 18:11:56.928057', '2026-09-22 19:25:23.524102'),
('ca15485a-7115-467d-b5dd-268cde17cd20', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '758e49b8-f382-4e58-bf90-488137794951', 'Fresh Green Chilli', 'ಹಸಿ ಮೆಣಸಿನಕಾಯಿ', NULL, 'KG', 40.0, 70.0, 6.0, 2.0, 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=400', 1, 1, '2026-09-22 18:11:56.928706', '2026-09-22 18:11:56.928708'),
('48abdbe0-5325-4e91-be32-7d13919a477f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '758e49b8-f382-4e58-bf90-488137794951', 'Coriander Bunch', 'ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪು', NULL, 'BUNCH', 8.0, 15.0, 18.0, 5.0, 'https://images.unsplash.com/photo-1506484381205-f7945653044d?w=400', 1, 1, '2026-09-22 18:11:56.929250', '2026-09-22 18:11:56.929252'),
('331dc094-09c7-4b31-ae15-5bcda867fc35', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '758e49b8-f382-4e58-bf90-488137794951', 'Carrot', 'ಕ್ಯಾರೆಟ್', NULL, 'KG', 30.0, 50.0, 194.0, 4.0, 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400', 1, 1, '2026-09-22 18:11:56.929990', '2026-09-25 18:28:08.454046'),
('d9ead4ba-5825-4e3e-95d4-89f0bae672ff', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '758e49b8-f382-4e58-bf90-488137794951', 'Cucumber', 'ಸೌತೆಕಾಯಿ', NULL, 'KG', 20.0, 35.0, 15.0, 3.0, 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=400', 1, 1, '2026-09-22 18:11:56.930779', '2026-09-22 18:11:56.930781'),
('23800616-5f1f-4b6f-a5b5-8d7f5b2ebb4d', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '758e49b8-f382-4e58-bf90-488137794951', 'Ladies Finger (Bhindi)', 'ಬೆಂಡೆಕಾಯಿ', NULL, 'KG', 28.0, 45.0, 3.5, 5.0, 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=400', 1, 1, '2026-09-22 18:11:56.931508', '2026-09-22 18:11:56.931511'),
('d8fc5b6f-757f-4b5f-98a0-63fee4de901a', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '93d30d57-6802-4c58-bf1b-d863a37c8ba9', 'Turmeric Powder (100g Pack)', 'ಅರಿಶಿನ ಪುಡಿ 100ಗ್ರಾಂ', NULL, 'PACKET', 11.0, 16.0, 65.0, 15.0, 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400', 1, 1, '2026-09-22 18:11:56.932103', '2026-09-22 19:25:25.248918'),
('c67ea236-99dc-4456-928a-04d39f91225c', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '93d30d57-6802-4c58-bf1b-d863a37c8ba9', 'Red Chilli Powder (100g Pack)', 'ಮೆಣಸಿನ ಪುಡಿ 100ಗ್ರಾಂ', NULL, 'PACKET', 14.0, 20.0, 55.0, 15.0, 'https://loremflickr.com/400/300/red,chilli,powder', 1, 1, '2026-09-22 18:11:56.932701', '2026-09-22 18:11:56.932703'),
('c6ea047d-2427-423e-a1a9-4b093efe8b39', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '93d30d57-6802-4c58-bf1b-d863a37c8ba9', 'Coriander Seeds (100g Pack)', 'ಕೊತ್ತಂಬರಿ ಬೀಜ 100ಗ್ರಾಂ', NULL, 'PACKET', 9.0, 13.0, 45.0, 12.0, 'https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=400', 1, 1, '2026-09-22 18:11:56.933311', '2026-09-22 18:11:56.933312'),
('041824cb-bc5d-49f3-b236-64f69dd8d409', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '93d30d57-6802-4c58-bf1b-d863a37c8ba9', 'Cumin Seeds (100g Pack)', 'ಜೀರಿಗೆ 100ಗ್ರಾಂ', NULL, 'PACKET', 24.0, 32.0, 40.0, 10.0, 'https://loremflickr.com/400/300/cumin,seeds', 1, 1, '2026-09-22 18:11:56.933872', '2026-09-22 18:11:56.933874'),
('7282af09-8f16-4576-9237-ac00c7f84c7b', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '93d30d57-6802-4c58-bf1b-d863a37c8ba9', 'Sambar Masala (100g Pack)', 'ಸಾಂಬಾರ್ ಪುಡಿ', NULL, 'PACKET', 28.0, 40.0, 40.0, 10.0, 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400', 1, 1, '2026-09-22 18:11:56.934438', '2026-09-22 18:11:56.934440'),
('e7eb1735-31cd-4478-80ce-31eb022e8d0d', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '93d30d57-6802-4c58-bf1b-d863a37c8ba9', 'Rasam Masala (100g Pack)', 'ರಸಂ ಪುಡಿ', NULL, 'PACKET', 26.0, 38.0, 37.0, 10.0, 'https://images.unsplash.com/photo-1583119912267-cc97c911e416?w=400', 1, 1, '2026-09-22 18:11:56.934939', '2026-09-25 16:21:42.389481'),
('1d99df36-5e1c-4f69-8bc6-f4e07f2878ac', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '3a877da4-2447-44c3-a446-94e9d2e9396b', 'Sona Masoori Rice', 'ಸೋನಾ ಮಸೂರಿ ಅಕ್ಕಿ', NULL, 'KG', 52.0, 68.0, 120.0, 25.0, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', 1, 1, '2026-09-22 18:11:56.935398', '2026-09-22 18:11:56.935399'),
('0b32e22a-48a6-49b5-818b-8c0236c397f7', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '3a877da4-2447-44c3-a446-94e9d2e9396b', 'Toor Dal', 'ತೊಗರಿ ಬೇಳೆ', NULL, 'KG', 110.0, 145.0, 80.0, 15.0, 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=400', 1, 1, '2026-09-22 18:11:56.935804', '2026-09-22 18:11:56.935805'),
('f7fcb483-dbb4-444e-904b-0c97c62fdffb', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '3a877da4-2447-44c3-a446-94e9d2e9396b', 'Whole Wheat Atta', 'ಗೋಧಿ ಹಿಟ್ಟು', NULL, 'KG', 38.0, 52.0, 90.0, 20.0, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400', 1, 1, '2026-09-22 18:11:56.936212', '2026-09-22 18:11:56.936213'),
('210eedbf-ebd5-4d5f-b2ac-4429fe20c0e3', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '3a877da4-2447-44c3-a446-94e9d2e9396b', 'Sunflower Cooking Oil (1L)', 'ಸೂರ್ಯಕಾಂತಿ ಎಣ್ಣೆ', NULL, 'LITER', 120.0, 150.0, 60.0, 12.0, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', 1, 1, '2026-09-22 18:11:56.936687', '2026-09-22 18:11:56.936689'),
('b1d2bcfb-b24d-4e2e-8325-f5adf589b1d8', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '3a877da4-2447-44c3-a446-94e9d2e9396b', 'Tamarind Block', 'ಹುಣಸೆ ಹಣ್ಣು', NULL, 'KG', 90.0, 130.0, 30.0, 8.0, NULL, 1, 1, '2026-09-22 18:11:56.937104', '2026-09-22 18:11:56.937106'),
('1a4ee999-5ebf-4b1a-996a-564b719e0200', '695fb276-5d02-486f-a03f-ba5fa921415b', '93d30d57-6802-4c58-bf1b-d863a37c8ba9', 'Turmeric Powder (100g Pack)', 'ಅರಿಶಿನ ಪುಡಿ 100ಗ್ರಾಂ', NULL, 'PACKET', 10.0, 15.0, 120.0, 25.0, 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400', 1, 0, '2026-09-22 18:11:56.952869', '2026-09-22 18:11:56.952870'),
('3dda8902-a2e7-4967-9798-c382aaf7e36d', '695fb276-5d02-486f-a03f-ba5fa921415b', '93d30d57-6802-4c58-bf1b-d863a37c8ba9', 'Red Chilli Powder (100g Pack)', 'ಮೆಣಸಿನ ಪುಡಿ 100ಗ್ರಾಂ', NULL, 'PACKET', 13.0, 19.0, 110.0, 25.0, 'https://loremflickr.com/400/300/red,chilli,powder', 1, 0, '2026-09-22 18:11:56.955517', '2026-09-22 18:11:56.955519'),
('a42dff95-f1b4-4afb-a82f-54732750adc0', '695fb276-5d02-486f-a03f-ba5fa921415b', '93d30d57-6802-4c58-bf1b-d863a37c8ba9', 'Black Pepper (50g Pack)', 'ಕರಿ ಮೆಣಸು 50ಗ್ರಾಂ', NULL, 'PACKET', 28.0, 38.0, 70.0, 15.0, 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=400', 1, 0, '2026-09-22 18:11:56.956060', '2026-09-22 18:11:56.956061'),
('04969bc5-a4fd-44f9-bbb6-2cdafb5d7aa2', '695fb276-5d02-486f-a03f-ba5fa921415b', '93d30d57-6802-4c58-bf1b-d863a37c8ba9', 'Cardamom (10g Pack)', 'ಏಲಕ್ಕಿ 10ಗ್ರಾಂ', NULL, 'PACKET', 24.0, 30.0, 60.0, 12.0, NULL, 1, 0, '2026-09-22 18:11:56.956540', '2026-09-22 18:11:56.956541'),
('d6d1ab55-9187-42cf-bc12-f2e959fda5fe', '695fb276-5d02-486f-a03f-ba5fa921415b', '93d30d57-6802-4c58-bf1b-d863a37c8ba9', 'Cumin Seeds (100g Pack)', 'ಜೀರಿಗೆ 100ಗ್ರಾಂ', NULL, 'PACKET', 23.0, 31.0, 80.0, 18.0, 'https://loremflickr.com/400/300/cumin,seeds', 1, 0, '2026-09-22 18:11:56.957030', '2026-09-22 18:11:56.957032'),
('09ac074d-08b6-4a6f-a434-39d6fc09cbbd', '695fb276-5d02-486f-a03f-ba5fa921415b', '93d30d57-6802-4c58-bf1b-d863a37c8ba9', 'Mustard Seeds (100g Pack)', 'ಸಾಸಿವೆ 100ಗ್ರಾಂ', NULL, 'PACKET', 8.0, 12.0, 90.0, 20.0, 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400', 1, 0, '2026-09-22 18:11:56.957520', '2026-09-22 18:11:56.957521'),
('950145b8-f3f7-4c47-a05e-5c239f359f58', '695fb276-5d02-486f-a03f-ba5fa921415b', '93d30d57-6802-4c58-bf1b-d863a37c8ba9', 'Garam Masala (100g Pack)', 'ಗರಂ ಮಸಾಲಾ', NULL, 'PACKET', 32.0, 48.0, 50.0, 12.0, 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400', 1, 0, '2026-09-22 18:11:56.957980', '2026-09-22 18:11:56.957981'),
('4f7a9985-a68b-4fee-b6ba-6a10924c3735', '695fb276-5d02-486f-a03f-ba5fa921415b', '93d30d57-6802-4c58-bf1b-d863a37c8ba9', 'Bisi Bele Bath Masala (100g)', 'ಬಿಸಿ ಬೇಳೆ ಬಾತ್ ಪುಡಿ', NULL, 'PACKET', 30.0, 45.0, 45.0, 10.0, NULL, 1, 0, '2026-09-22 18:11:56.958465', '2026-09-22 18:11:56.958466'),
('ffb59284-48de-47d6-98c5-b6033c897002', '695fb276-5d02-486f-a03f-ba5fa921415b', '3a877da4-2447-44c3-a446-94e9d2e9396b', 'Sona Masoori Rice', 'ಸೋನಾ ಮಸೂರಿ ಅಕ್ಕಿ', NULL, 'KG', 50.0, 65.0, 300.0, 50.0, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', 1, 0, '2026-09-22 18:11:56.958955', '2026-09-22 18:11:56.958957'),
('0e45cac9-587b-4e76-80e4-6cba223d73b2', '695fb276-5d02-486f-a03f-ba5fa921415b', '3a877da4-2447-44c3-a446-94e9d2e9396b', 'Basmati Rice', 'ಬಾಸ್ಮತಿ ಅಕ್ಕಿ', NULL, 'KG', 95.0, 130.0, 150.0, 25.0, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', 1, 0, '2026-09-22 18:11:56.959437', '2026-09-22 18:11:56.959437'),
('e2182bf7-63f7-41a9-b94f-8e8bb321b61e', '695fb276-5d02-486f-a03f-ba5fa921415b', '3a877da4-2447-44c3-a446-94e9d2e9396b', 'Toor Dal', 'ತೊಗರಿ ಬೇಳೆ', NULL, 'KG', 108.0, 140.0, 200.0, 30.0, 'https://loremflickr.com/400/300/dal,pulses', 1, 0, '2026-09-22 18:11:56.959833', '2026-09-22 18:11:56.959834'),
('ae0921dc-6530-4be3-91aa-a8c06c6b820f', '695fb276-5d02-486f-a03f-ba5fa921415b', '3a877da4-2447-44c3-a446-94e9d2e9396b', 'Urad Dal', 'ಉದ್ದಿನ ಬೇಳೆ', NULL, 'KG', 105.0, 138.0, 150.0, 25.0, 'https://loremflickr.com/400/300/dal,pulses', 1, 0, '2026-09-22 18:11:56.960171', '2026-09-22 18:11:56.960171'),
('7bf2a945-9177-4098-a167-785878025e0f', '695fb276-5d02-486f-a03f-ba5fa921415b', '3a877da4-2447-44c3-a446-94e9d2e9396b', 'Chana Dal', 'ಕಡಲೆ ಬೇಳೆ', NULL, 'KG', 75.0, 98.0, 180.0, 25.0, 'https://loremflickr.com/400/300/dal,pulses', 1, 0, '2026-09-22 18:11:56.960489', '2026-09-22 18:11:56.960489'),
('c1c1dc38-8824-460b-9f93-a5900841d353', '695fb276-5d02-486f-a03f-ba5fa921415b', '3a877da4-2447-44c3-a446-94e9d2e9396b', 'Whole Wheat Atta', 'ಗೋಧಿ ಹಿಟ್ಟು', NULL, 'KG', 36.0, 50.0, 250.0, 40.0, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400', 1, 0, '2026-09-22 18:11:56.960802', '2026-09-22 18:11:56.960803'),
('5e818dfe-b17b-403c-abfe-8508a75c9b5c', '695fb276-5d02-486f-a03f-ba5fa921415b', '3a877da4-2447-44c3-a446-94e9d2e9396b', 'Maida (Refined Flour)', 'ಮೈದಾ ಹಿಟ್ಟು', NULL, 'KG', 34.0, 46.0, 120.0, 20.0, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400', 1, 0, '2026-09-22 18:11:56.961137', '2026-09-22 18:11:56.961138'),
('a93392c1-df4a-494d-9047-f58b671cc70e', '695fb276-5d02-486f-a03f-ba5fa921415b', '3a877da4-2447-44c3-a446-94e9d2e9396b', 'Sunflower Cooking Oil (1L)', 'ಸೂರ್ಯಕಾಂತಿ ಎಣ್ಣೆ', NULL, 'LITER', 118.0, 148.0, 150.0, 25.0, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', 1, 0, '2026-09-22 18:11:56.961459', '2026-09-22 18:11:56.961460'),
('982baf8b-8f3e-4493-a6be-294fe4def97f', '695fb276-5d02-486f-a03f-ba5fa921415b', '3a877da4-2447-44c3-a446-94e9d2e9396b', 'Coconut Oil (500ml)', 'ಕೊಬ್ಬರಿ ಎಣ್ಣೆ', NULL, 'LITER', 145.0, 185.0, 80.0, 15.0, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', 1, 0, '2026-09-22 18:11:56.961785', '2026-09-22 18:11:56.961786'),
('31cc6573-7b35-425d-8f81-e208bb50e7a6', '695fb276-5d02-486f-a03f-ba5fa921415b', '3a877da4-2447-44c3-a446-94e9d2e9396b', 'Sugar', 'ಸಕ್ಕರೆ', NULL, 'KG', 40.0, 48.0, 200.0, 30.0, 'https://loremflickr.com/400/300/sugarcube', 1, 0, '2026-09-22 18:11:56.962105', '2026-09-22 18:11:56.962106'),
('94b72f09-e4fe-4109-9462-561c04c6d4ad', '695fb276-5d02-486f-a03f-ba5fa921415b', 'f2b1e128-fc05-4c2d-b1b4-378a2c76c079', 'Nandini Toned Milk (500ml)', 'ನಂದಿನಿ ಹಾಲು', NULL, 'PACKET', 22.0, 25.0, 60.0, 10.0, 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400', 1, 1, '2026-09-22 18:11:56.962412', '2026-09-22 18:11:56.962413'),
('f59b1005-1579-4712-8512-1dd400b8eb65', '695fb276-5d02-486f-a03f-ba5fa921415b', 'f2b1e128-fc05-4c2d-b1b4-378a2c76c079', 'Curd (500g)', 'ಮೊಸರು', NULL, 'PACKET', 20.0, 28.0, 40.0, 8.0, 'https://loremflickr.com/400/300/yogurt', 1, 1, '2026-09-22 18:11:56.962717', '2026-09-22 18:11:56.962718'),
('3ce67952-37ea-4866-8afe-c4faa2d53ee1', '695fb276-5d02-486f-a03f-ba5fa921415b', 'f2b1e128-fc05-4c2d-b1b4-378a2c76c079', 'Ghee (Dabbi, 500ml)', 'ತುಪ್ಪ', NULL, 'LITER', 320.0, 395.0, 40.0, 8.0, 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400', 1, 1, '2026-09-22 18:11:56.963173', '2026-09-22 18:11:56.963175'),
('c0d76689-0e0e-456e-aa55-6d58608fb110', '695fb276-5d02-486f-a03f-ba5fa921415b', 'f2b1e128-fc05-4c2d-b1b4-378a2c76c079', 'Farm Eggs (Dozen)', 'ಮೊಟ್ಟೆಗಳು', NULL, 'DOZEN', 72.0, 90.0, 25.0, 6.0, 'https://loremflickr.com/400/300/eggs,basket', 1, 1, '2026-09-22 18:11:56.963814', '2026-09-22 18:11:56.963816'),
('2fa40027-c166-4fa3-b23b-741017547622', '695fb276-5d02-486f-a03f-ba5fa921415b', 'f2b1e128-fc05-4c2d-b1b4-378a2c76c079', 'Paneer (200g)', 'ಪನೀರ್', NULL, 'PACKET', 75.0, 95.0, 30.0, 6.0, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400', 1, 1, '2026-09-22 18:11:56.964381', '2026-09-22 18:11:56.964382');

-- ----------------------------
-- Records of sales (68 rows)
-- ----------------------------
INSERT INTO `sales` (`id`, `vendor_id`, `customer_name`, `customer_phone`, `total_amount`, `total_cost`, `discount_amount`, `net_amount`, `net_profit`, `payment_mode`, `cash_paid`, `upi_paid`, `udhaar_amount`, `is_synced`, `client_mutation_id`, `client_timestamp`, `created_at`) VALUES
('b32f3784-aebb-4ae8-aea7-7c533cbd0bad', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Customer #1', NULL, 225.0, 138.0, 0.0, 225.0, 87.0, 'CASH', 225.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-17 16:11:56.937309'),
('36aa3ff0-fe4c-41aa-bc27-bc1a3d710c00', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Customer #2', NULL, 295.0, 181.0, 0.0, 295.0, 114.0, 'UPI', 0.0, 295.0, 0.0, 1, NULL, NULL, '2026-09-17 16:11:56.937309'),
('36b1a91b-1ecc-4478-87c0-cf6c1f4fa3f5', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Customer #3', NULL, 365.0, 224.0, 0.0, 365.0, 141.0, 'CASH', 365.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-17 16:11:56.937309'),
('98789c44-3803-4e24-8ad2-fa1c13104005', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Customer #1', NULL, 225.0, 138.0, 0.0, 225.0, 87.0, 'CASH', 225.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-18 16:11:56.937309'),
('83b1a660-0c2d-4565-bdbc-8bc8bb0e56ec', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Customer #2', NULL, 295.0, 181.0, 0.0, 295.0, 114.0, 'UPI', 0.0, 295.0, 0.0, 1, NULL, NULL, '2026-09-18 16:11:56.937309'),
('a4a6fe3e-55c9-40a6-b333-6af845dcb85d', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Customer #3', NULL, 365.0, 224.0, 0.0, 365.0, 141.0, 'CASH', 365.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-18 16:11:56.937309'),
('0a87a9ec-a704-492d-ab6f-e68e1e680ab0', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Customer #1', NULL, 225.0, 138.0, 0.0, 225.0, 87.0, 'CASH', 225.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-19 16:11:56.937309'),
('c5ba0f39-70da-4b84-beee-14fe352d9b97', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Customer #2', NULL, 295.0, 181.0, 0.0, 295.0, 114.0, 'UPI', 0.0, 295.0, 0.0, 1, NULL, NULL, '2026-09-19 16:11:56.937309'),
('3f2bfe68-0d33-472a-b72a-1f77f6534af9', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Customer #3', NULL, 365.0, 224.0, 0.0, 365.0, 141.0, 'CASH', 365.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-19 16:11:56.937309'),
('bb169ea8-72af-4173-939f-482d52325240', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Customer #1', NULL, 225.0, 138.0, 0.0, 225.0, 87.0, 'CASH', 225.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-20 16:11:56.937309'),
('ba8cdc02-703a-4379-a31f-3ca7621a6e8e', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Customer #2', NULL, 295.0, 181.0, 0.0, 295.0, 114.0, 'UPI', 0.0, 295.0, 0.0, 1, NULL, NULL, '2026-09-20 16:11:56.937309'),
('cfb19e06-439f-4e5b-8fd2-c9e679c1de14', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Customer #3', NULL, 365.0, 224.0, 0.0, 365.0, 141.0, 'CASH', 365.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-20 16:11:56.937309'),
('8cd1ab2e-c3b4-4afb-8ab7-f6e1c5da99c0', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Customer #1', NULL, 225.0, 138.0, 0.0, 225.0, 87.0, 'CASH', 225.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-21 16:11:56.937309'),
('9e191728-baf1-44e5-a0ef-7840975eced8', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Customer #2', NULL, 295.0, 181.0, 0.0, 295.0, 114.0, 'UPI', 0.0, 295.0, 0.0, 1, NULL, NULL, '2026-09-21 16:11:56.937309'),
('f236cc6e-6fc3-448e-96bb-e16f6b153e0e', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Customer #3', NULL, 365.0, 224.0, 0.0, 365.0, 141.0, 'CASH', 365.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-21 16:11:56.937309'),
('b45e6b7b-414f-4564-9f1c-0c0f021ff444', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-22 18:20:54.326980'),
('d434417f-4e97-48cb-9165-6ac9ef5459a0', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Offline Synced Buyer', NULL, 60.0, 60.0, 0.0, 60.0, 0.0, 'CASH', 60.0, 0.0, 0.0, 1, 'test-uuid-sync-mutation-101', '2026-08-22 10:00:00.000000', '2026-09-22 18:20:57.998865'),
('5abdcc25-6050-411a-832f-5490d2c8999c', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-22 19:32:40.096947'),
('ea061105-6947-4338-92fb-6e79aca2cc0d', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-22 19:38:44.698567'),
('159a03b0-4495-47f6-bab3-2925eab14e4f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-22 19:44:14.527052'),
('073c502e-3efd-4ab6-b034-288b68c2b700', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-22 19:47:24.464451'),
('e216d8fd-ba93-4fcd-8c99-76d85d7fd5dd', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-22 19:48:31.290637'),
('0792daa3-2b47-4c07-8d20-991b7443bbbc', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-22 19:51:20.800425'),
('98326e5f-7963-40cf-a86d-59a6cfe30143', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-22 19:55:26.799102'),
('fd27fe70-d0e4-4cad-b337-24fe1fa62910', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-24 10:00:05.062391'),
('3210f2a9-0d90-48ca-966e-66cef04fc3d7', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-24 10:08:30.705053'),
('4f1f82c3-5a51-42d1-9063-00bbe1ed1429', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-24 10:19:34.118336'),
('94971496-d9d3-412d-8ebc-5ab7532aa598', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-24 10:38:27.064692'),
('aa1445af-eec1-4328-8e2d-635715ca22b6', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-24 17:16:01.214913'),
('6141664c-564d-4c57-838b-881ddeeb3e7d', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-24 17:50:31.978980'),
('4d224b69-0ad7-40d3-a0e1-baff7d41616b', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-24 17:57:14.409773'),
('bfaaa66c-0440-40c6-a0c9-43929010ab23', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Offline Kumara', NULL, 60.0, 60.0, 0.0, 60.0, 0.0, 'CASH', 0.0, 0.0, 0.0, 1, '54c25f98e623a9511e9815459bc1e6a0', NULL, '2026-09-24 18:05:46.699004'),
('34b22fc9-d3f2-4ddf-acb2-110d7b9f7c0b', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-24 18:10:20.333819'),
('093b4995-47b9-4b01-ae12-ab7584f790b8', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Offline Test Customer', NULL, 90.0, 90.0, 0.0, 90.0, 0.0, 'CASH', 0.0, 0.0, 0.0, 1, 'sale-mufupaqp-0mvfaq', '2026-09-24 18:14:01.633000', '2026-09-24 18:14:26.951855'),
('7ce4a5c0-45ce-449e-a764-c4e4f28f13b5', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-24 18:22:01.185021'),
('c3b0f24d-f366-40d9-a477-ddda465a2cd3', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Audit Demo', NULL, 45.0, 0.0, 0.0, 45.0, 45.0, 'CASH', 0.0, 0.0, 0.0, 1, 'audit-demo-1', '2026-09-24 18:23:34.519000', '2026-09-24 18:23:46.158236'),
('40fb9135-f95b-42ad-af84-e93f5087866d', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Audit Demo', NULL, 45.0, 0.0, 0.0, 45.0, 45.0, 'CASH', 0.0, 0.0, 0.0, 1, 'audit-demo-2', '2026-09-24 18:26:10.337000', '2026-09-24 18:26:29.944411'),
('0fa01f76-c104-415b-bffc-972032aef480', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Offline', NULL, 120.0, 0.0, 0.0, 120.0, 120.0, 'CASH', 0.0, 0.0, 0.0, 1, 'audit-stuck-2', '2026-09-24 18:27:16.986000', '2026-09-24 18:27:30.353263'),
('06dda9b7-bd8e-4a67-a01a-53907a86a48a', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync Ravi', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'UDHAAR', 0.0, 0.0, 100.0, 1, '9bebc7f578e4d5f7709bb206fadc1210', '2026-09-24 18:35:14.001217', '2026-09-24 18:35:14.007598'),
('772049c9-f7b5-4492-b5af-c8926d4548bc', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync Ravi', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'UDHAAR', 0.0, 0.0, 100.0, 1, 'b56f6339111a65557af5a97097f518d7', '2026-09-24 18:37:31.360280', '2026-09-24 18:37:31.369945'),
('b0e62c66-287a-4c19-a057-94c4aff765e1', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-24 18:37:39.315018'),
('c9532cc5-4a30-49f7-90fe-cb6a0afa0157', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync Ravi', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'UDHAAR', 0.0, 0.0, 100.0, 1, '32f6eb5eaeee2205f6fbd457d3a41a35', '2026-09-24 18:37:59.466048', '2026-09-24 18:37:59.474282'),
('c0cea384-5d00-41d6-a177-1210bf8fa593', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync Ravi', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'UDHAAR', 0.0, 0.0, 100.0, 1, 'b0c290144cb44bd1a04cc4997e7d8ed8', '2026-09-24 18:38:51.065873', '2026-09-24 18:38:51.096899'),
('a0dfbc06-677f-4a8c-a9d6-bf9413e45fcf', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-24 18:38:57.408655'),
('52070714-e187-4a3a-8f04-e82659f081e9', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync Ravi', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'UDHAAR', 0.0, 0.0, 100.0, 1, 'a82819bb7b36ddeb18073eea65fd68ba', '2026-09-24 18:39:13.386627', '2026-09-24 18:39:13.393617'),
('7b201c05-7582-4d1f-8732-d0c1e4e83179', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync df14a6', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'UDHAAR', 0.0, 0.0, 100.0, 1, '94c601d5aeb0f9035f96d84588197ab5', '2026-09-24 18:41:00.187509', '2026-09-24 18:41:00.193858'),
('d1ce4717-7933-406b-bfa3-58743173cd17', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-24 18:41:06.267324'),
('debf948e-4924-4a92-9e49-f5d2da4b7c6f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync cc4c72', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'UDHAAR', 0.0, 0.0, 100.0, 1, 'c729f2a7468427559f6b87f3a3356365', '2026-09-24 18:41:22.129511', '2026-09-24 18:41:22.136062'),
('72d1e5ad-85c4-4ef3-878d-5dfef0ae8d3a', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-24 18:48:05.337084'),
('40be596d-ca84-4954-966f-5c9a79468528', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync 7d8d74', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'UDHAAR', 0.0, 0.0, 100.0, 1, '2d1eb17bc621318a9eb4acff9637e316', '2026-09-24 18:48:23.915764', '2026-09-24 18:48:23.921175');
INSERT INTO `sales` (`id`, `vendor_id`, `customer_name`, `customer_phone`, `total_amount`, `total_cost`, `discount_amount`, `net_amount`, `net_profit`, `payment_mode`, `cash_paid`, `upi_paid`, `udhaar_amount`, `is_synced`, `client_mutation_id`, `client_timestamp`, `created_at`) VALUES
('1b1bcc69-97c4-403d-9f9d-dc3092b77913', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync b58c91', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'UDHAAR', 0.0, 0.0, 100.0, 1, '585896a421733fc942b3234fbde9f0ba', '2026-09-24 18:52:29.532464', '2026-09-24 18:52:29.538805'),
('893de7c5-8528-4c40-a799-ea6ba5cc5ec8', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-24 18:52:35.396530'),
('bbc163e4-1bbb-400f-b4ed-479d7163dc01', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync 1ab541', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'UDHAAR', 0.0, 0.0, 100.0, 1, 'cbe2cd60e112dcf7e77ae88f27841b99', '2026-09-24 18:52:53.516604', '2026-09-24 18:52:53.522920'),
('c9991d22-3585-4e28-8415-9209f429295a', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-24 19:02:38.830761'),
('29d12c28-2687-4ff5-b1fa-7faa1d7865c1', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync e104f4', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'UDHAAR', 0.0, 0.0, 100.0, 1, '09604ff289cc4b66b9c88c4dde8d40c3', '2026-09-24 19:02:55.146254', '2026-09-24 19:02:55.151955'),
('23755b5e-7503-458e-a0e5-6009579accce', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-24 19:08:35.778191'),
('3fd8cd89-3698-4d32-9ebe-237f991052cd', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync 4e94c9', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'UDHAAR', 0.0, 0.0, 100.0, 1, '5fc4ae4f93477ed7d6729cf300896800', '2026-09-24 19:08:51.488065', '2026-09-24 19:08:51.494556'),
('49881910-b93d-4193-ad69-75310aeb4215', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Walk-in Cash Customer', NULL, 50.0, 30.0, 0.0, 50.0, 20.0, 'CASH', 50.0, 0.0, 0.0, 1, 'sale-mufxehru-7g5wnm', '2026-09-24 19:29:36.378002', '2026-09-24 19:34:09.155743'),
('d1e6efa4-30c9-4cd2-b1b6-18eeb9bcebee', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-25 16:10:44.315821'),
('81060e0b-33d7-48a3-8e84-740feebf2cae', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync 9b398e', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'UDHAAR', 0.0, 0.0, 100.0, 1, '7cd71c120d0fb19fde3dc653b1052902', '2026-09-25 16:11:04.006646', '2026-09-25 16:11:04.014462'),
('9a6d187a-8a72-4423-9342-3771d8e6defc', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-25 16:44:12.928551'),
('23514b6e-8429-4e83-b4f2-b14bc969b18a', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync 4c791e', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'UDHAAR', 0.0, 0.0, 100.0, 1, '23701d14270d229813d91ea755253928', '2026-09-25 16:44:34.163973', '2026-09-25 16:44:34.175377'),
('1dd79c90-d52c-4a2c-80fd-59bec0b63894', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-25 17:08:20.516098'),
('802ba227-4616-4d5c-b6ee-4e06b62cd967', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync faa703', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'UDHAAR', 0.0, 0.0, 100.0, 1, '60599642c5ac3cd326e227167df8b060', '2026-09-25 17:08:40.137752', '2026-09-25 17:08:40.150918'),
('bb270fe5-5540-4ee1-a819-5462c0b7e3fc', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Test POS Customer', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'CASH', 100.0, 0.0, 0.0, 1, NULL, NULL, '2026-09-25 17:19:14.236057'),
('15489585-2c6e-463e-961c-bcc84c39eda9', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync 2206af', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'UDHAAR', 0.0, 0.0, 100.0, 1, 'be70bcd6856e90a5a50d9f7202235d10', '2026-09-25 17:19:33.612717', '2026-09-25 17:19:33.621099'),
('60d2f8c0-9534-432c-ba85-202f8de47745', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync f5e531', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'UDHAAR', 0.0, 0.0, 100.0, 1, '2ca968694bd6b314e8e506a34301d7ba', '2026-09-25 17:33:58.963155', '2026-09-25 17:33:58.972736'),
('9ff54311-c0c7-461f-95d7-0b19bddab981', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync 65e2b8', NULL, 100.0, 60.0, 0.0, 100.0, 40.0, 'UDHAAR', 0.0, 0.0, 100.0, 1, 'e66c5fdc8cc01bdeec913536a94e171c', '2026-09-25 18:28:08.443616', '2026-09-25 18:28:08.450519');

-- ----------------------------
-- Records of sync_queue (179 rows)
-- ----------------------------
INSERT INTO `sync_queue` (`id`, `vendor_id`, `client_mutation_id`, `entity_type`, `payload`, `status`, `error_message`, `processed_at`, `created_at`) VALUES
('4974cfee-0b50-4e5b-aecc-36982bfd610f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'test-uuid-sync-mutation-101', 'SALE', '{"customer_name": "Offline Synced Buyer", "total_amount": 60.0, "discount_amount": 0.0, "payment_mode": "CASH", "cash_paid": 60.0, "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 2.0, "unit_price": 50.0}]}', 'PROCESSED', NULL, '2026-09-22 18:20:58.003520', '2026-09-22 18:20:58.001498'),
('2fb59deb-72c3-4ab9-b0fa-cc3f52b42d2d', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '54c25f98e623a9511e9815459bc1e6a0', 'SALE', '{"customer_name": "Offline Kumara", "total_amount": 60.0, "payment_mode": "CASH", "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 2, "unit_price": 30}]}', 'PROCESSED', NULL, '2026-09-24 18:05:46.703341', '2026-09-24 18:05:46.701399'),
('c0b76d5c-c879-4cc4-a308-a79070215a67', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '52f4341807a3fe449fdd28e50a66dd38', 'ORDER_STATUS', '{"order_id": "7d38582b-0409-4bd9-88d6-9e6322d3cf7b", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-24 18:05:47.506321', '2026-09-24 18:05:47.508844'),
('2914dda3-55b5-426b-93d7-f12cbc90fad5', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'b49319eb642d148f38be61b15285c49b', 'ORDER_STATUS', '{"order_id": "7d38582b-0409-4bd9-88d6-9e6322d3cf7b", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-24 18:05:47.539957', '2026-09-24 18:05:47.540191'),
('c168055b-5bf1-41cc-aa4b-c0af1726ce3c', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '7c20769a381e4e8b59a8deddda646af1', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 18:05:47.590254'),
('5475b916-b4fe-452c-9a9a-019aa390941e', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'fd5c25d24019ed1c03081bbe4aa2c86c', 'ORDER_STATUS', '{"order_id": "00000000-0000-0000-0000-000000000000", "status": "WARP_SPEED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 18:05:47.603845'),
('8f41533a-6a51-4496-9fc7-b6ab422e8520', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'c5d4fcca3b4092ff488a9f843feda2fe', 'ORDER_STATUS', '{"order_id": "09f5ce17-a652-42f8-9f36-c7271eadaafe", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-24 18:06:02.596775', '2026-09-24 18:06:02.605798'),
('ecf3ae09-4b2d-4448-bffc-cdfbb00c5b58', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '9fd3ca43f451a7614fb2d35d5a16fe20', 'ORDER_STATUS', '{"order_id": "09f5ce17-a652-42f8-9f36-c7271eadaafe", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-24 18:06:02.637988', '2026-09-24 18:06:02.638407'),
('4c058a20-8c03-48c9-830c-58ab5f52eb52', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '63b1e6571d41f94fa019e376dcd20e4b', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 18:06:02.710418'),
('ccce9f3d-8595-4ed7-a53a-4f87887ec985', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'e1b6eda86d390759e26adb3e20b75ebd', 'ORDER_STATUS', '{"order_id": "00000000-0000-0000-0000-000000000000", "status": "WARP_SPEED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 18:06:02.728280'),
('c39f83d0-ad8f-44d5-aefa-6520c6dd6074', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '4f48fd6a049f538aecf2c884bac37b97', 'ORDER_STATUS', '{"order_id": "f3097e16-93c7-44b0-bded-ef7be81f3745", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-24 18:06:26.164556', '2026-09-24 18:06:26.169624'),
('e4890a99-6ba7-43d3-8409-5030695bd8b2', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '6baee056af3e9d73b4104fc240bd20ac', 'ORDER_STATUS', '{"order_id": "f3097e16-93c7-44b0-bded-ef7be81f3745", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-24 18:06:26.197724', '2026-09-24 18:06:26.198064'),
('74a29d51-b47a-47e2-8959-15d7de32da6d', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '072f589a91c8b82ce7be8b9ef896b6b5', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 18:06:26.253798'),
('0a69d2aa-0843-4f46-bed9-0b9962ccb39b', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'e5edbe90d7cff99a971c4d95c49101f5', 'ORDER_STATUS', '{"order_id": "f5f5aec5-7657-4ba9-8a22-99365f080e8e", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-24 18:06:47.033906', '2026-09-24 18:06:47.037924'),
('f1acc347-44ee-48b4-a160-e7f01fcb7ee4', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '8976cc1fcbf0d6775f4459f6472cc5f5', 'ORDER_STATUS', '{"order_id": "f5f5aec5-7657-4ba9-8a22-99365f080e8e", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-24 18:06:47.063227', '2026-09-24 18:06:47.063524'),
('2285ada8-f489-40f3-bd11-bee3bcdc9b3a', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'a8c88ee7954499bac1964c3fc9f02c4a', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 18:06:47.115021'),
('46087cf6-2d49-4867-a531-9a47e0d89e0a', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '1a0a1888b3813c5aa514660e0d4e8a19', 'ORDER_STATUS', '{"order_id": "a403d8f3-efdc-4e83-9c03-b76d152201a2", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-24 18:07:24.496274', '2026-09-24 18:07:24.502365'),
('cb5440fe-39b5-4e25-b188-ba0feb84c410', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '501a43d5bb7b954a9b1e71344926b969', 'ORDER_STATUS', '{"order_id": "a403d8f3-efdc-4e83-9c03-b76d152201a2", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-24 18:07:24.529275', '2026-09-24 18:07:24.529612'),
('da3c720c-7c46-44af-b5b5-d4cccf8a2446', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '100829aa11cb341d0b06ae7ba640bd78', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 18:07:24.584340'),
('8a5e35cb-412e-4d0f-b0b9-8e0535f63e2b', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '2296d8a224aa668322bb250f0db665ca', 'ORDER_STATUS', '{"order_id": "7d38582b-0409-4bd9-88d6-9e6322d3cf7b", "status": "WARP_SPEED"}', 'FAILED', 'Unknown status WARP_SPEED', NULL, '2026-09-24 18:07:24.637533'),
('0c221c50-684c-4cff-997a-0df5ce93a632', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '3200923c19b89cd82f8c1088522a510b', 'ORDER_STATUS', '{"order_id": "8abbec2e-a0d7-458a-9fe0-e2a6f0feef30", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-24 18:10:38.062037', '2026-09-24 18:10:38.064191'),
('e44626d9-b0ee-4df5-b749-ee43e03fb686', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'f04f3d3d3e7591121790a3671947036a', 'ORDER_STATUS', '{"order_id": "8abbec2e-a0d7-458a-9fe0-e2a6f0feef30", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-24 18:10:38.090103', '2026-09-24 18:10:38.090426'),
('30d343c5-3460-453a-b466-6d627f351874', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '3feb308b754c5b965d9a4102f2c0e705', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 18:10:38.143764'),
('c33683fd-8e81-4097-8130-cffdf7fdcb1b', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '1bf82f104a7a7e1f00b8fab4727334e2', 'ORDER_STATUS', '{"order_id": "8abbec2e-a0d7-458a-9fe0-e2a6f0feef30", "status": "WARP_SPEED"}', 'FAILED', 'Unknown status WARP_SPEED', NULL, '2026-09-24 18:10:38.197940'),
('1833517f-e646-4721-8a97-c0ff99b50199', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'sale-mufupaqp-0mvfaq', 'SALE', '{"customer_name": "Offline Test Customer", "total_amount": 90, "payment_mode": "CASH", "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 3, "unit_price": 30}]}', 'PROCESSED', NULL, '2026-09-24 18:14:26.974272', '2026-09-24 18:14:26.956639'),
('3c18731f-d86c-47bd-af6e-76eb1d067b77', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'order_status-mufupaqr-huuv2n', 'ORDER_STATUS', '{"order_id": "fc9acbc4-072d-4419-8789-12eb9d57d72d", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-24 18:14:26.994419', '2026-09-24 18:14:26.996815'),
('59648123-b097-4913-93c5-7e0ae1d66558', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '9b7e403df396c8a77c964d08f972bf67', 'ORDER_STATUS', '{"order_id": "be549bc8-ba94-4cc7-810d-8d9db8ddd6de", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-24 18:18:39.511925', '2026-09-24 18:18:39.522292'),
('ae9bbb64-b794-4ec1-a2c0-2f6b6c2f705a', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '5142de80c6068f57b25a91b31c13980c', 'ORDER_STATUS', '{"order_id": "be549bc8-ba94-4cc7-810d-8d9db8ddd6de", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-24 18:18:39.540629', '2026-09-24 18:18:39.540830'),
('ab6ec190-55b0-4ffe-93f6-093dd01aaa37', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'f89911d917fe2b8e6556f2f0e415e3ab', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 18:18:39.577906'),
('d987b5cc-f104-4b45-8d4a-d9c54b950ec7', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'dcdee8485c87149997224efc792f666a', 'ORDER_STATUS', '{"order_id": "8abbec2e-a0d7-458a-9fe0-e2a6f0feef30", "status": "WARP_SPEED"}', 'FAILED', 'Unknown status WARP_SPEED', NULL, '2026-09-24 18:18:39.613618'),
('692299a0-6404-4642-8736-987ac75e629f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '84c560ed998d0ee415e993b86e0f9ac2', 'ORDER_STATUS', '{"order_id": "5b865fdb-f26c-4ebd-b02a-9f612c412223", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-24 18:22:16.921243', '2026-09-24 18:22:16.927456'),
('163fe85f-2fb1-4e5a-8834-e42ab73c24c4', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '2a54d53e483da419962195ce666a4f86', 'ORDER_STATUS', '{"order_id": "5b865fdb-f26c-4ebd-b02a-9f612c412223", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-24 18:22:16.944243', '2026-09-24 18:22:16.944415'),
('47ccedfb-29ed-4bc6-a77c-91e86e9b09b3', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'f0f7d0076a4edbcaee1de4459e99d517', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 18:22:16.984580'),
('b9da53a4-3020-42fd-b29e-57ee8843add5', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'abddabbfb19a344a7e317b73914b6bbe', 'ORDER_STATUS', '{"order_id": "5b865fdb-f26c-4ebd-b02a-9f612c412223", "status": "WARP_SPEED"}', 'FAILED', 'Unknown status WARP_SPEED', NULL, '2026-09-24 18:22:17.024794'),
('fa90add7-85cd-493c-9f0e-3158e492275d', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'audit-demo-1', 'SALE', '{"customer_name": "Audit Demo", "total_amount": 45, "payment_mode": "CASH", "items": [{"product_id": "x", "quantity": 1}]}', 'PROCESSED', NULL, '2026-09-24 18:23:46.173616', '2026-09-24 18:23:46.170757'),
('a6f977a6-7d7f-4dd3-9610-5a829a39dca9', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'audit-demo-2', 'SALE', '{"customer_name": "Audit Demo", "total_amount": 45, "payment_mode": "CASH", "items": [{"product_id": "x", "quantity": 1}]}', 'PROCESSED', NULL, '2026-09-24 18:26:29.946618', '2026-09-24 18:26:29.945674'),
('20aa6a18-39d5-404a-b919-d1a9fe9251be', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'audit-stuck-1', 'ORDER_STATUS', '{"order_id": "no-such-order", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 18:27:30.336650'),
('95f7179e-6999-414e-990d-f8db7ed60d92', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'audit-stuck-2', 'SALE', '{"customer_name": "Ravi Offline", "total_amount": 120, "payment_mode": "CASH", "items": [{"product_id": "p1", "quantity": 4, "unit_price": 30}]}', 'PROCESSED', NULL, '2026-09-24 18:27:30.356437', '2026-09-24 18:27:30.354919'),
('272a7b26-a40f-4494-b1a9-461aa9b53334', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '7869152a9d8280afb1777e72c447ef77', 'ORDER_STATUS', '{"order_id": "1ff72f09-e79c-4557-9c5b-be248e6e3ea2", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-24 18:35:13.873253', '2026-09-24 18:35:13.884688'),
('281535da-13b6-492e-8afa-07654178d74a', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '36398ac042bd981ae4aa1a626a9b3b8a', 'ORDER_STATUS', '{"order_id": "1ff72f09-e79c-4557-9c5b-be248e6e3ea2", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-24 18:35:13.904228', '2026-09-24 18:35:13.904421'),
('7e9b42be-9f09-419b-af61-04eba208b90e', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '5f0e2bf8131ca4013e7841ea657ff20e', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 18:35:13.943698'),
('3e6894b1-87a6-4fa2-871b-9a719542d068', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '872e9dcb2fc5849f3349f107a95134ec', 'ORDER_STATUS', '{"order_id": "5b865fdb-f26c-4ebd-b02a-9f612c412223", "status": "WARP_SPEED"}', 'FAILED', 'Unknown status WARP_SPEED', NULL, '2026-09-24 18:35:13.983123'),
('e7b2acf8-bc2f-4c59-a84c-173e2654350f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '9bebc7f578e4d5f7709bb206fadc1210', 'SALE', '{"customer_name": "Udhaar Sync Ravi", "total_amount": 100.0, "payment_mode": "UDHAAR", "udhaar_amount": 100.0, "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 2, "unit_price": 50}]}', 'PROCESSED', NULL, '2026-09-24 18:35:14.010088', '2026-09-24 18:35:14.008710'),
('3c514050-4cf3-4512-9b86-0b842adaaa60', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ede7da1c2230b0f134b298d7addd8c7b', 'ORDER_STATUS', '{"order_id": "6d9484ef-02f7-4121-9322-927fdeb0b55a", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-24 18:37:31.134493', '2026-09-24 18:37:31.147868'),
('42cf86d0-3159-4fe8-a36c-01494a3e63bf', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '86c3efc82e9f0568360e443fb43c4ab4', 'ORDER_STATUS', '{"order_id": "6d9484ef-02f7-4121-9322-927fdeb0b55a", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-24 18:37:31.174826', '2026-09-24 18:37:31.175064'),
('79eaa73a-7bd8-43a6-96bb-93e4fb42100c', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '6b4adf3ca4eae9c2c2c46dc06b300065', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 18:37:31.241580'),
('bfbf6b8f-d826-4428-9755-943a1bf61d0c', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'a3845a04027757d8aea293c11208fdb2', 'ORDER_STATUS', '{"order_id": "5b865fdb-f26c-4ebd-b02a-9f612c412223", "status": "WARP_SPEED"}', 'FAILED', 'Unknown status WARP_SPEED', NULL, '2026-09-24 18:37:31.320828'),
('81be8496-ed50-48df-b41a-6f68fad90959', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'b56f6339111a65557af5a97097f518d7', 'SALE', '{"customer_name": "Udhaar Sync Ravi", "total_amount": 100.0, "payment_mode": "UDHAAR", "udhaar_amount": 100.0, "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 2, "unit_price": 50}]}', 'PROCESSED', NULL, '2026-09-24 18:37:31.375114', '2026-09-24 18:37:31.371993'),
('3a576cef-fee3-4798-b22e-d5e2ead5ccd2', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '6f0affd8708286c257b7feb4159084d5', 'ORDER_CREATE', '{"order_number": "ORD-OFF-TEST01", "total_amount": 60.0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg", "unit_price": 30.0, "subtotal": 60.0}]}', 'PROCESSED', NULL, '2026-09-24 18:37:32.388324', '2026-09-24 18:37:32.385485'),
('b80c1428-b66a-4559-bbd2-f5c5023d6e20', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'daa93060342565b6c9489b8cbcd0d693', 'ORDER_STATUS', '{"order_id": "ac90fc59-3e7b-406e-8bd3-2f8a29ab3809", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-24 18:37:59.295143', '2026-09-24 18:37:59.297722');
INSERT INTO `sync_queue` (`id`, `vendor_id`, `client_mutation_id`, `entity_type`, `payload`, `status`, `error_message`, `processed_at`, `created_at`) VALUES
('5c4f9539-2463-4e3c-abd3-0f9276703907', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '1ce6244b4edb9860d2dec487e6292bb3', 'ORDER_STATUS', '{"order_id": "ac90fc59-3e7b-406e-8bd3-2f8a29ab3809", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-24 18:37:59.321409', '2026-09-24 18:37:59.321650'),
('8f1a5f46-05fb-48b5-a47a-9d83041aff45', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'a8edc2456baf233e385d30b814be80ba', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 18:37:59.375434'),
('36c522a0-9c6d-4b3f-aecf-6d3fc00cbe16', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'd825871f059c56d8fb50d519f2bb2f11', 'ORDER_STATUS', '{"order_id": "ac90fc59-3e7b-406e-8bd3-2f8a29ab3809", "status": "WARP_SPEED"}', 'FAILED', 'Unknown status WARP_SPEED', NULL, '2026-09-24 18:37:59.441957'),
('01f9f3a0-907f-46eb-8838-eefc98d87393', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '32f6eb5eaeee2205f6fbd457d3a41a35', 'SALE', '{"customer_name": "Udhaar Sync Ravi", "total_amount": 100.0, "payment_mode": "UDHAAR", "udhaar_amount": 100.0, "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 2, "unit_price": 50}]}', 'PROCESSED', NULL, '2026-09-24 18:37:59.477648', '2026-09-24 18:37:59.476175'),
('c3fe44e0-beec-4536-8ee2-ac89997e7cb3', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'b0c290144cb44bd1a04cc4997e7d8ed8', 'SALE', '{"customer_name": "Udhaar Sync Ravi", "total_amount": 100.0, "payment_mode": "UDHAAR", "udhaar_amount": 100.0, "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 2, "unit_price": 50}]}', 'PROCESSED', NULL, '2026-09-24 18:38:51.109582', '2026-09-24 18:38:51.107793'),
('c8f15ffe-e16d-466c-9f25-cfb3e125b9c2', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '1118d3092e0cef3bbd50c7ffea91ab6e', 'ORDER_STATUS', '{"order_id": "9bd6663c-664c-4686-b46e-1cb9478ed88d", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-24 18:39:13.263292', '2026-09-24 18:39:13.265093'),
('5d02ec2c-71ce-4e52-9738-c70fde77ebfa', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '6433d7f4d519e80ebcf13deaec87d5d5', 'ORDER_STATUS', '{"order_id": "9bd6663c-664c-4686-b46e-1cb9478ed88d", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-24 18:39:13.284625', '2026-09-24 18:39:13.284829'),
('97fafc55-4fe8-4224-991e-da50feb68f5c', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '973747c5255ca42551c867553f770f1c', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 18:39:13.329630'),
('ae3e9687-d3a3-445e-9f30-f29594172951', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '3a5c6802360ba7d5133568d07ea6ee62', 'ORDER_STATUS', '{"order_id": "9bd6663c-664c-4686-b46e-1cb9478ed88d", "status": "WARP_SPEED"}', 'FAILED', 'Unknown status WARP_SPEED', NULL, '2026-09-24 18:39:13.367757'),
('e82e6a23-0bc0-4a78-9163-87fdfe79661b', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'a82819bb7b36ddeb18073eea65fd68ba', 'SALE', '{"customer_name": "Udhaar Sync Ravi", "total_amount": 100.0, "payment_mode": "UDHAAR", "udhaar_amount": 100.0, "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 2, "unit_price": 50}]}', 'PROCESSED', NULL, '2026-09-24 18:39:13.396117', '2026-09-24 18:39:13.395008'),
('0092c4df-ccf0-4091-894b-4eb908764d66', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'c50e4d1952654a45d2e0edbc82e7b50e', 'ORDER_STATUS', '{"order_id": "e9ef4053-d934-4bc1-9200-10019621edeb", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-24 18:41:00.043270', '2026-09-24 18:41:00.056310'),
('1f161b4d-6a42-4d8c-bebc-5fad7c15d2c7', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '4b953c31582c31dc15aad80e0d374559', 'ORDER_STATUS', '{"order_id": "e9ef4053-d934-4bc1-9200-10019621edeb", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-24 18:41:00.079776', '2026-09-24 18:41:00.080021'),
('558d5c61-ed01-4494-a63f-49968868da61', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '63be6edd6cadf62181fe9f6e6ae90e1f', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 18:41:00.128005'),
('15319c4e-3e64-43eb-aafe-29b21fc3df0a', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '8e541e59ae59fbd70fcf90d87f124be0', 'ORDER_STATUS', '{"order_id": "9bd6663c-664c-4686-b46e-1cb9478ed88d", "status": "WARP_SPEED"}', 'FAILED', 'Unknown status WARP_SPEED', NULL, '2026-09-24 18:41:00.168268'),
('588c9377-e042-405a-9176-acfdfbfb28d6', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '94c601d5aeb0f9035f96d84588197ab5', 'SALE', '{"customer_name": "Udhaar Sync df14a6", "total_amount": 100.0, "payment_mode": "UDHAAR", "udhaar_amount": 100.0, "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 2, "unit_price": 50}]}', 'PROCESSED', NULL, '2026-09-24 18:41:00.197585', '2026-09-24 18:41:00.195732'),
('6f9369f4-4bb8-4a8f-a803-8603f68d5e70', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '5feca575da71fc0cf5880273ca60141c', 'ORDER_CREATE', '{"order_number": "ORD-OFF-45627B", "total_amount": 60.0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg", "unit_price": 30.0, "subtotal": 60.0}]}', 'PROCESSED', NULL, '2026-09-24 18:41:00.232444', '2026-09-24 18:41:00.230418'),
('774b6d76-712f-4a6e-bb52-cfeaaf08ad84', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'c6cf2d804127f2e76209a1deeb5470a2', 'ORDER_STATUS', '{"order_id": "a1832ea2-1716-409c-8ab9-bb42e4d068b3", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-24 18:41:22.004158', '2026-09-24 18:41:22.006153'),
('b05100af-648e-4c11-aaa3-f63d7470ae15', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '0fa5d6cca55d9078f20bc33cea553bf4', 'ORDER_STATUS', '{"order_id": "a1832ea2-1716-409c-8ab9-bb42e4d068b3", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-24 18:41:22.024122', '2026-09-24 18:41:22.024457'),
('5e8a5e80-f2eb-41e5-91c9-6c9997c792fc', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '74b9c90dac550c0aea8a7b11105f600e', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 18:41:22.065863'),
('3a9ce2a2-4065-47b5-b9bf-76dff8a976ec', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '1154bbf00e8647638c750f54bccc3dca', 'ORDER_STATUS', '{"order_id": "a1832ea2-1716-409c-8ab9-bb42e4d068b3", "status": "WARP_SPEED"}', 'FAILED', 'Unknown status WARP_SPEED', NULL, '2026-09-24 18:41:22.110671'),
('4c599f8e-cf33-44b3-861d-02e18ea13bca', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'c729f2a7468427559f6b87f3a3356365', 'SALE', '{"customer_name": "Udhaar Sync cc4c72", "total_amount": 100.0, "payment_mode": "UDHAAR", "udhaar_amount": 100.0, "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 2, "unit_price": 50}]}', 'PROCESSED', NULL, '2026-09-24 18:41:22.137669', '2026-09-24 18:41:22.136922'),
('33acf26f-e6e5-4443-962c-cb81eaa01c27', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '69f8f475d40b05e9d0c238d947d9921a', 'ORDER_CREATE', '{"order_number": "ORD-OFF-543458", "total_amount": 60.0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg", "unit_price": 30.0, "subtotal": 60.0}]}', 'PROCESSED', NULL, '2026-09-24 18:41:22.268293', '2026-09-24 18:41:22.267560'),
('25214745-c5d2-42ba-b90a-76c12b0a0fdf', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'e6f99bbdfee030ed6f066cfd68a3cfa7', 'ORDER_STATUS', '{"order_id": "944093e0-9757-4f3a-ae96-5b9a8641c7d6", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-24 18:48:23.780399', '2026-09-24 18:48:23.782007'),
('6f601cc2-be76-4d87-ac55-fdf0d3b7e26f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'c2de140623554763c0fbaacdec6cbb51', 'ORDER_STATUS', '{"order_id": "944093e0-9757-4f3a-ae96-5b9a8641c7d6", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-24 18:48:23.799592', '2026-09-24 18:48:23.799774'),
('3891000e-cd73-4300-853f-9f9bec196736', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '790c25b211428ec4defd08f2e6f80625', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 18:48:23.842426'),
('a08bcd0f-ffd8-4a87-afda-ef711ba899ea', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '9c3f77c154ed5aa0074cd748a5830461', 'ORDER_STATUS', '{"order_id": "944093e0-9757-4f3a-ae96-5b9a8641c7d6", "status": "WARP_SPEED"}', 'FAILED', 'Unknown status WARP_SPEED', NULL, '2026-09-24 18:48:23.897440'),
('6b59af28-cbe3-4836-bcf0-78d91b0b13cc', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '2d1eb17bc621318a9eb4acff9637e316', 'SALE', '{"customer_name": "Udhaar Sync 7d8d74", "total_amount": 100.0, "payment_mode": "UDHAAR", "udhaar_amount": 100.0, "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 2, "unit_price": 50}]}', 'PROCESSED', NULL, '2026-09-24 18:48:23.922684', '2026-09-24 18:48:23.922033'),
('73418338-82e8-4112-baed-4fa8518430cc', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'd3a9d23886b935823225ad839940e956', 'ORDER_CREATE', '{"order_number": "ORD-OFF-DAEE4A", "total_amount": 60.0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg", "unit_price": 30.0, "subtotal": 60.0}]}', 'PROCESSED', NULL, '2026-09-24 18:48:24.055657', '2026-09-24 18:48:24.054877'),
('e520b1b4-e78f-4513-a5b8-c20802af45fc', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'order_create-mufw0g7m-flersj', 'ORDER_CREATE', '{"items": [{"product_name": "tomato", "quantity": 2, "unit": "kg"}], "total_amount": 0, "payment_mode": "CASH"}', 'PROCESSED', NULL, '2026-09-24 18:51:01.715589', '2026-09-24 18:51:01.712582'),
('d2e4e4e2-a533-4739-ba97-e9caea5c56f8', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'udhaar-mufw0g7n-2rojus', 'UDHAAR', '{"customer_name": "Mahesh", "amount_due": 200, "customer_phone": null, "notes": "Voice udhaar (offline)"}', 'PROCESSED', NULL, '2026-09-24 18:51:01.727722', '2026-09-24 18:51:01.728219'),
('e8266c34-0a72-44f3-8c79-d5dd6242102d', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '58968ba4780f2cbf5664c83f1f463722', 'ORDER_STATUS', '{"order_id": "71087031-c384-4aa6-b049-81ffb8c0ae5a", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-24 18:52:29.396962', '2026-09-24 18:52:29.408033'),
('c18b95a7-a381-4e09-9175-97ee6aa86cef', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'cea619abd3ffdce9126b6d212959474b', 'ORDER_STATUS', '{"order_id": "71087031-c384-4aa6-b049-81ffb8c0ae5a", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-24 18:52:29.426096', '2026-09-24 18:52:29.426360'),
('68df7dc1-a80f-4051-aa90-a66ebf9f6f7e', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '57748a36c1f47bc646f77868b0c6d7c2', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 18:52:29.471326'),
('3c4cc72c-e90c-4014-b907-55535a7388f4', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'f67223fff293512bb0c8c6a725a1075e', 'ORDER_STATUS', '{"order_id": "71087031-c384-4aa6-b049-81ffb8c0ae5a", "status": "WARP_SPEED"}', 'FAILED', 'Unknown status WARP_SPEED', NULL, '2026-09-24 18:52:29.513691'),
('2c491ef6-f0b4-4b3b-8312-ef203d96b212', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '585896a421733fc942b3234fbde9f0ba', 'SALE', '{"customer_name": "Udhaar Sync b58c91", "total_amount": 100.0, "payment_mode": "UDHAAR", "udhaar_amount": 100.0, "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 2, "unit_price": 50}]}', 'PROCESSED', NULL, '2026-09-24 18:52:29.542514', '2026-09-24 18:52:29.540793'),
('f2dd1b0f-59d1-4c40-967f-429fc2a20f83', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'c0f74fa48acf63f222bb5d019372882e', 'ORDER_CREATE', '{"order_number": "ORD-OFF-C23F3F", "total_amount": 60.0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg", "unit_price": 30.0, "subtotal": 60.0}]}', 'PROCESSED', NULL, '2026-09-24 18:52:29.576933', '2026-09-24 18:52:29.575411'),
('62051fd1-17da-4536-9663-55b03b2f7192', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'bd48f7a6a571b46746d3f079531ee934', 'ORDER_STATUS', '{"order_id": "95b37590-be75-4385-b6e9-a734312dfc34", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-24 18:52:53.386064', '2026-09-24 18:52:53.388508'),
('457a72e7-3d0b-448b-9c73-4a02a01917b6', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '0af4f982d738e0d0621fbce302875998', 'ORDER_STATUS', '{"order_id": "95b37590-be75-4385-b6e9-a734312dfc34", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-24 18:52:53.407814', '2026-09-24 18:52:53.408017'),
('9098a023-4fc9-4113-8fa2-180f8097f8f8', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'c4e71d40bfa605570cc6523d4adf0840', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 18:52:53.454926'),
('bcc3eaa1-2af4-4e43-bf11-91842f3c09f3', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '017154d1dd381ce573ec5e1c21f0252f', 'ORDER_STATUS', '{"order_id": "95b37590-be75-4385-b6e9-a734312dfc34", "status": "WARP_SPEED"}', 'FAILED', 'Unknown status WARP_SPEED', NULL, '2026-09-24 18:52:53.498225'),
('6754c455-8a88-4e0d-a433-a8a3e92eb84c', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'cbe2cd60e112dcf7e77ae88f27841b99', 'SALE', '{"customer_name": "Udhaar Sync 1ab541", "total_amount": 100.0, "payment_mode": "UDHAAR", "udhaar_amount": 100.0, "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 2, "unit_price": 50}]}', 'PROCESSED', NULL, '2026-09-24 18:52:53.524766', '2026-09-24 18:52:53.523860'),
('b55c73ef-5f51-44f6-aefe-c0cf2c6ffb55', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '68c869fd17cd73691508b5e6f6796176', 'ORDER_CREATE', '{"order_number": "ORD-OFF-640A2B", "total_amount": 60.0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg", "unit_price": 30.0, "subtotal": 60.0}]}', 'PROCESSED', NULL, '2026-09-24 18:52:53.657476', '2026-09-24 18:52:53.656124'),
('6b17b546-4ddc-4284-8f57-5ec3449dd6e7', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'order_create-mufw0g7o-uouzqj', 'ORDER_CREATE', '{"items": [{"product_name": "tomato", "quantity": 3, "unit": "kg"}], "total_amount": 0, "payment_mode": "CASH"}', 'PROCESSED', NULL, '2026-09-24 18:53:16.541542', '2026-09-24 18:53:16.539484'),
('c0e5c694-05cd-45f3-a1ce-18883c7521d1', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'order_create-mufw5p7t-fqqjk3', 'ORDER_CREATE', '{"items": [{"product_name": "tomato", "quantity": 2, "unit": "kg"}], "total_amount": 0, "payment_mode": "CASH"}', 'PROCESSED', NULL, '2026-09-24 18:55:00.358102', '2026-09-24 18:55:00.356811'),
('43119ae3-6d5c-48fc-a273-6096bc969def', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'order_create-mufw5p7u-kfigck', 'ORDER_CREATE', '{"items": [{"product_name": "onion", "quantity": 5, "unit": "kg"}], "total_amount": 0, "payment_mode": "CASH"}', 'PROCESSED', NULL, '2026-09-24 18:55:00.366848', '2026-09-24 18:55:00.365812'),
('b6d01bb4-b44e-4757-acc2-cfee23e573b8', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'order_create-mufwdemn-08lwo3', 'ORDER_CREATE', '{"items": [{"product_name": "potato", "quantity": 4, "unit": "kg"}], "total_amount": 0, "payment_mode": "CASH"}', 'PROCESSED', NULL, '2026-09-24 19:01:01.193278', '2026-09-24 19:01:01.191779'),
('025841e1-c8ea-46fb-9a75-663a6ee521a1', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'udhaar-mufwdemn-jj3cnu', 'UDHAAR', '{"customer_name": "Suresh", "amount_due": 150, "customer_phone": null, "notes": "Voice udhaar (offline)"}', 'PROCESSED', NULL, '2026-09-24 19:01:01.201754', '2026-09-24 19:01:01.202117'),
('c752bcaf-1ca4-4390-b15b-98e40bf0de31', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '5e82c14f0bae85e92ffe8412b828619e', 'ORDER_STATUS', '{"order_id": "344d67a6-83be-46c7-8c1c-7a85a2bbdd9a", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-24 19:02:55.007713', '2026-09-24 19:02:55.009360'),
('379d1a22-cb2a-4d8f-8450-b95db0905fca', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '7774126275ae6433fea85bec96dd31d9', 'ORDER_STATUS', '{"order_id": "344d67a6-83be-46c7-8c1c-7a85a2bbdd9a", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-24 19:02:55.026944', '2026-09-24 19:02:55.027127'),
('8299d75e-ac21-4276-bf06-ae674c2540c3', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'de492db93ea9e0b387bbd2179be96828', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 19:02:55.074263');
INSERT INTO `sync_queue` (`id`, `vendor_id`, `client_mutation_id`, `entity_type`, `payload`, `status`, `error_message`, `processed_at`, `created_at`) VALUES
('cba9ca41-bc00-4691-bad3-411c2b60b8ac', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '70f4c014d43730456cd48d09256065af', 'ORDER_STATUS', '{"order_id": "344d67a6-83be-46c7-8c1c-7a85a2bbdd9a", "status": "WARP_SPEED"}', 'FAILED', 'Unknown status WARP_SPEED', NULL, '2026-09-24 19:02:55.126712'),
('5b3e28ed-d504-4220-9c15-dbf36d064f57', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '09604ff289cc4b66b9c88c4dde8d40c3', 'SALE', '{"customer_name": "Udhaar Sync e104f4", "total_amount": 100.0, "payment_mode": "UDHAAR", "udhaar_amount": 100.0, "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 2, "unit_price": 50}]}', 'PROCESSED', NULL, '2026-09-24 19:02:55.153467', '2026-09-24 19:02:55.152796'),
('1d98578d-02c9-41ae-b75b-501bbb2bab01', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '9be3e35aed181d8d499daefe6024cf40', 'ORDER_CREATE', '{"order_number": "ORD-OFF-6A1E78", "total_amount": 60.0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg", "unit_price": 30.0, "subtotal": 60.0}]}', 'PROCESSED', NULL, '2026-09-24 19:02:55.183823', '2026-09-24 19:02:55.183104'),
('a79d2e95-0570-4f8e-8ed4-a528927e1160', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '7d96bf123e00eaf88995bf7d0c54b026', 'ORDER_CREATE', '{"order_number": "ORD-OFF-2F3BBC", "total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-24 19:02:55.286274', '2026-09-24 19:02:55.284988'),
('14922684-b978-4128-9604-e25d1dc64df4', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'order_create-mufwizme-brebpy', 'ORDER_CREATE', '{"items": [{"product_name": "onion", "quantity": 3, "unit": "kg"}], "total_amount": 0, "payment_mode": "CASH"}', 'PROCESSED', NULL, '2026-09-24 19:05:07.558624', '2026-09-24 19:05:07.556033'),
('9fc51518-9e06-43e7-aac8-dee23b9ed727', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'order_create-mufwjih3-aw0fkb', 'ORDER_CREATE', '{"items": [{"product_name": "onion", "quantity": 3, "unit": "kg"}], "total_amount": 0, "payment_mode": "CASH"}', 'PROCESSED', NULL, '2026-09-24 19:05:40.660920', '2026-09-24 19:05:40.660062'),
('c2249184-0969-4a54-956c-3b464b08a00a', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'b40c577713e4b27739ea2e27dd911401', 'ORDER_STATUS', '{"order_id": "af4895e2-c13a-4f59-84d7-ca12a5737178", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-24 19:08:51.222557', '2026-09-24 19:08:51.233177'),
('f0ba9976-c649-495f-a649-5ce8bff6d6b2', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'a3eeb1c7858a8a85a2f86787af552c77', 'ORDER_STATUS', '{"order_id": "af4895e2-c13a-4f59-84d7-ca12a5737178", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-24 19:08:51.252617', '2026-09-24 19:08:51.252788'),
('31153d60-736c-450d-a8e0-2a717fcc24f1', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '3a24d883b1212a576c18a9c6115d7cac', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-24 19:08:51.304006'),
('a5af492f-fbbb-4526-ab38-f3253b00aa28', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'e77062d8386dc40c2a3a1ac21797265e', 'ORDER_STATUS', '{"order_id": "af4895e2-c13a-4f59-84d7-ca12a5737178", "status": "WARP_SPEED"}', 'FAILED', 'Unknown status WARP_SPEED', NULL, '2026-09-24 19:08:51.471273'),
('942aa8c2-0229-47a2-b09a-18e1e19a0212', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '5fc4ae4f93477ed7d6729cf300896800', 'SALE', '{"customer_name": "Udhaar Sync 4e94c9", "total_amount": 100.0, "payment_mode": "UDHAAR", "udhaar_amount": 100.0, "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 2, "unit_price": 50}]}', 'PROCESSED', NULL, '2026-09-24 19:08:51.496181', '2026-09-24 19:08:51.495457'),
('716edcd0-3eaf-4414-b472-fc8e3865e1eb', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'b7ebf41d617fc8f63accbe0d42a6a0f3', 'ORDER_CREATE', '{"order_number": "ORD-OFF-6F1A1D", "total_amount": 60.0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg", "unit_price": 30.0, "subtotal": 60.0}]}', 'PROCESSED', NULL, '2026-09-24 19:08:51.521558', '2026-09-24 19:08:51.520818'),
('199e62bb-976b-4e19-82db-bf8b414f6ec7', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '75724dd81b9e968860d4cd6be2e2bdb4', 'ORDER_CREATE', '{"order_number": "ORD-OFF-E46384", "total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-24 19:08:51.619977', '2026-09-24 19:08:51.619300'),
('401f560e-1373-4551-affb-8f9c8e274ce4', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'sale-mufxehru-7g5wnm', 'SALE', '{"customer_name": "Walk-in Cash Customer", "total_amount": 50, "discount_amount": 0, "payment_mode": "CASH", "cash_paid": 50, "upi_paid": 0, "udhaar_amount": 0, "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 1, "unit_price": 50}]}', 'PROCESSED', NULL, '2026-09-24 19:34:09.158876', '2026-09-24 19:34:09.157149'),
('fd5000a8-f190-4aff-b1b9-050075d09d40', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'order_create-mufxfpba-2syyj7', 'ORDER_CREATE', '{"items": [{"product_name": "potato", "quantity": 1, "unit": "kg"}], "total_amount": 0, "payment_mode": "CASH"}', 'PROCESSED', NULL, '2026-09-24 19:34:09.173181', '2026-09-24 19:34:09.171465'),
('ac39e794-d1e8-4936-80f9-12474c3146f6', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'd305f7dff7594eefa5fed44c79e147cf', 'ORDER_STATUS', '{"order_id": "a5bc56f7-e77f-4b28-a33c-71af91c1a01c", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-25 16:11:03.789926', '2026-09-25 16:11:03.792808'),
('68bd6e0c-45dd-4484-80d5-0542ebad1c8e', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '66d7dec4f09e01d0b0de97bd7de06d25', 'ORDER_STATUS', '{"order_id": "a5bc56f7-e77f-4b28-a33c-71af91c1a01c", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-25 16:11:03.816776', '2026-09-25 16:11:03.817577'),
('f4d8076f-616b-4395-be72-72bcc5b91d59', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '24b2685693e820613f914bf3fee144e5', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-25 16:11:03.898602'),
('b3d616d7-b569-42fa-8308-d51f2da25077', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '69fbf2dc59c469545ef891722278609c', 'ORDER_STATUS', '{"order_id": "a5bc56f7-e77f-4b28-a33c-71af91c1a01c", "status": "WARP_SPEED"}', 'FAILED', 'Unknown status WARP_SPEED', NULL, '2026-09-25 16:11:03.977605'),
('6fdd2bcd-afd2-418a-9aba-7d60b269fc34', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '7cd71c120d0fb19fde3dc653b1052902', 'SALE', '{"customer_name": "Udhaar Sync 9b398e", "total_amount": 100.0, "payment_mode": "UDHAAR", "udhaar_amount": 100.0, "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 2, "unit_price": 50}]}', 'PROCESSED', NULL, '2026-09-25 16:11:04.017459', '2026-09-25 16:11:04.016018'),
('e323cced-52d2-4f37-927c-16ec68d1e90f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '1e91cf8d1a79c91dd24e8370f540dde4', 'ORDER_CREATE', '{"order_number": "ORD-OFF-54D8E5", "total_amount": 60.0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg", "unit_price": 30.0, "subtotal": 60.0}]}', 'PROCESSED', NULL, '2026-09-25 16:11:04.057304', '2026-09-25 16:11:04.055641'),
('bc91df3f-2272-4aee-b70c-30274fe91918', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ad9a5ef8adf1c35a8a52d14266cd121d', 'ORDER_CREATE', '{"order_number": "ORD-OFF-F4C777", "total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 16:11:04.217942', '2026-09-25 16:11:04.216115'),
('2f3e1654-e8c7-4528-bba7-f429dde8cbcc', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'order_create-muh6cqo5-yqzsmx', 'ORDER_CREATE', '{"items": [{"product_name": "potato", "quantity": 2, "unit": "kg"}], "total_amount": 0, "payment_mode": "CASH"}', 'PROCESSED', NULL, '2026-09-25 16:29:41.708547', '2026-09-25 16:29:41.705323'),
('09519f44-f57f-4d60-afd0-41f0c48d879c', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'order_create-muh6ned2-4xrznu', 'ORDER_CREATE', '{"items": [{"product_name": "onion", "quantity": 3, "unit": "kg"}], "total_amount": 0, "payment_mode": "CASH"}', 'PROCESSED', NULL, '2026-09-25 16:37:12.315589', '2026-09-25 16:37:12.312300'),
('ae3375d2-1b66-44ff-a157-4334e538268b', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '9be5f4e61d9c4e40c68168e73294f34f', 'ORDER_STATUS', '{"order_id": "98ea76e1-1d33-4e2f-bc57-e32beee6aa00", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-25 16:44:33.850690', '2026-09-25 16:44:33.854578'),
('8ae70c35-76fa-4c8f-bd5a-8f99be39fd7c', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '7ce5b13378813c9dcd8a9fa0d74c5a7d', 'ORDER_STATUS', '{"order_id": "98ea76e1-1d33-4e2f-bc57-e32beee6aa00", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-25 16:44:33.889113', '2026-09-25 16:44:33.889482'),
('992007e3-9ec4-4dce-b720-4ad10e29134f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '1804f4e0483a393a6f4f4e86cfbaa010', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-25 16:44:34.019795'),
('ef0abe7b-12f7-4ed2-9922-c87962155da8', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'e97a8fb0ceba2862e79cebb97a4baf08', 'ORDER_STATUS', '{"order_id": "98ea76e1-1d33-4e2f-bc57-e32beee6aa00", "status": "WARP_SPEED"}', 'FAILED', 'Unknown status WARP_SPEED', NULL, '2026-09-25 16:44:34.132043'),
('f49b4af2-5fb9-475f-9aec-83c483fa2239', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '23701d14270d229813d91ea755253928', 'SALE', '{"customer_name": "Udhaar Sync 4c791e", "total_amount": 100.0, "payment_mode": "UDHAAR", "udhaar_amount": 100.0, "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 2, "unit_price": 50}]}', 'PROCESSED', NULL, '2026-09-25 16:44:34.178871', '2026-09-25 16:44:34.177656'),
('f3eb514c-aade-48e7-8f95-8098abc94303', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'e38f204bfbebb3856fa1deaeb32835e9', 'ORDER_CREATE', '{"order_number": "ORD-OFF-5E06E6", "total_amount": 60.0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg", "unit_price": 30.0, "subtotal": 60.0}]}', 'PROCESSED', NULL, '2026-09-25 16:44:34.227723', '2026-09-25 16:44:34.225246'),
('710ea2e4-58bd-44f9-9337-abe38616aaa8', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '5f19420f1723ead90b60b9518ee17c92', 'ORDER_CREATE', '{"order_number": "ORD-OFF-A02D63", "total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 16:44:34.483290', '2026-09-25 16:44:34.479928'),
('e6c2dc94-2992-4acf-ab10-4d12f2989145', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'order_create-muh7fncy-fsmphp', 'ORDER_CREATE', '{"items": [{"product_name": "carrot", "quantity": 1, "unit": "kg"}], "total_amount": 0, "payment_mode": "CASH"}', 'PROCESSED', NULL, '2026-09-25 16:58:50.412965', '2026-09-25 16:58:50.408929'),
('cea2438d-2050-46c7-9a85-27f089472d85', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '840700f3a085bd4f83218c0e2d2c6b9c', 'ORDER_CREATE', '{"total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 1, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 17:08:39.228580', '2026-09-25 17:08:39.225953'),
('273772b0-c6f3-4bc9-ba19-3db25c1ce4a4', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'bc18f4c53bcb07dc2b1ddce1d84e36bd', 'ORDER_CREATE', '{"total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 1, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 17:08:39.265541', '2026-09-25 17:08:39.264078'),
('c1e8c14a-5f1c-40be-9652-2771f20ce254', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '9bb3d4a5c54dbc43a5bae3f567584b2f', 'ORDER_STATUS', '{"order_id": "46acebd6-680e-49f7-8439-122abb983ed0", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-25 17:08:39.821226', '2026-09-25 17:08:39.824513'),
('d12cc747-2468-4cae-8b9f-4902e0d38f88', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'c6835840a73c1e58caa1c49b5f3408d5', 'ORDER_STATUS', '{"order_id": "46acebd6-680e-49f7-8439-122abb983ed0", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-25 17:08:39.857526', '2026-09-25 17:08:39.857971'),
('4291d88d-326b-4934-a695-7589e765e390', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'ed10144caed53b6fb6521389b2a040c0', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-25 17:08:39.980330'),
('28b1fe6a-6486-41b4-b2a6-573160f4ca96', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '8f0acd9f8edede5bde896e66da96dde0', 'ORDER_STATUS', '{"order_id": "46acebd6-680e-49f7-8439-122abb983ed0", "status": "WARP_SPEED"}', 'FAILED', 'Unknown status WARP_SPEED', NULL, '2026-09-25 17:08:40.101319'),
('042d67ef-6738-4070-9cb2-c88aa5c1d4e7', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '60599642c5ac3cd326e227167df8b060', 'SALE', '{"customer_name": "Udhaar Sync faa703", "total_amount": 100.0, "payment_mode": "UDHAAR", "udhaar_amount": 100.0, "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 2, "unit_price": 50}]}', 'PROCESSED', NULL, '2026-09-25 17:08:40.154738', '2026-09-25 17:08:40.152945'),
('4bea51c6-dcc4-41a6-adaf-86ac358aac41', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '0d7efbe8883c743c7ba924cfa468f844', 'ORDER_CREATE', '{"order_number": "ORD-OFF-BEA419", "total_amount": 60.0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg", "unit_price": 30.0, "subtotal": 60.0}]}', 'PROCESSED', NULL, '2026-09-25 17:08:40.200465', '2026-09-25 17:08:40.198728'),
('fe9de5a9-15c8-4f93-a4c6-2d77fc8228e6', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'a2cbe4603e7447d934e66d4f73f77bc3', 'ORDER_CREATE', '{"order_number": "ORD-OFF-756BF9", "total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 17:08:40.438880', '2026-09-25 17:08:40.437114'),
('7b64302f-e50b-4644-ae18-cf52f2538ebf', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'live-sw-push-1', 'ORDER_CREATE', '{"total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "potato", "quantity": 1, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 17:09:35.618585', '2026-09-25 17:09:35.614018'),
('22dfcd6f-f7b6-4564-af9b-180b77bdc093', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'f3ed4b019e02d52d2d08c11fbe353528', 'ORDER_CREATE', '{"total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 1, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 17:19:32.765315', '2026-09-25 17:19:32.764045'),
('3c8a72e8-4d77-402e-a352-0003475a2e99', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'b7d2b3aea3bece3b755842f09d19839d', 'ORDER_CREATE', '{"total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 1, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 17:19:32.795441', '2026-09-25 17:19:32.792961'),
('b26dd85b-030c-4eca-a86f-72d522d7f12c', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '8ea3f9ccbcec472e56c9dbb2929ac1c2', 'ORDER_STATUS', '{"order_id": "0c9ae1d7-1975-430c-8fe1-3db2a590921f", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-25 17:19:33.382644', '2026-09-25 17:19:33.384965'),
('8dd49041-7e52-4335-8f5d-2d3ec7d5ecd8', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '8462c3b3cf552db2fbcd3cdaa03f390a', 'ORDER_STATUS', '{"order_id": "0c9ae1d7-1975-430c-8fe1-3db2a590921f", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-25 17:19:33.407608', '2026-09-25 17:19:33.407832'),
('019ff8b1-1b1f-4825-ac0c-f071206b3ba9', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '967e814e13f923add4e7c613408fa7d0', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-25 17:19:33.501282'),
('78bd0f9e-9b87-49b3-ab7c-10fcd9ede647', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '8d0698bae64096e33f2185b773a91699', 'ORDER_STATUS', '{"order_id": "0c9ae1d7-1975-430c-8fe1-3db2a590921f", "status": "WARP_SPEED"}', 'FAILED', 'Unknown status WARP_SPEED', NULL, '2026-09-25 17:19:33.587418'),
('6dae3820-1d20-4a3a-86f5-2eb369a2284a', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'be70bcd6856e90a5a50d9f7202235d10', 'SALE', '{"customer_name": "Udhaar Sync 2206af", "total_amount": 100.0, "payment_mode": "UDHAAR", "udhaar_amount": 100.0, "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 2, "unit_price": 50}]}', 'PROCESSED', NULL, '2026-09-25 17:19:33.624083', '2026-09-25 17:19:33.622827'),
('31bd9744-275b-48db-8119-415c1b41b592', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '807ea035207d7e92b01aab9187426c93', 'ORDER_CREATE', '{"order_number": "ORD-OFF-095873", "total_amount": 60.0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg", "unit_price": 30.0, "subtotal": 60.0}]}', 'PROCESSED', NULL, '2026-09-25 17:19:33.663445', '2026-09-25 17:19:33.660619');
INSERT INTO `sync_queue` (`id`, `vendor_id`, `client_mutation_id`, `entity_type`, `payload`, `status`, `error_message`, `processed_at`, `created_at`) VALUES
('a8e5f3a8-4d4f-4fa1-9473-56501a7ca8fb', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'c1afc3070f21acf717a7dd3ee0493584', 'ORDER_CREATE', '{"order_number": "ORD-OFF-3E3035", "total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 17:19:33.835230', '2026-09-25 17:19:33.833934'),
('d9a65b03-9fce-4ed1-aa3e-25fccee5c91b', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '64ed35a75413735734689a7d80e8bbb7', 'ORDER_CREATE', '{"total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 1, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 17:33:58.289434', '2026-09-25 17:33:58.287668'),
('e25031c2-ed00-47d4-ab4c-c60a5d1074a8', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '048dc160a789f2bb94e4f6b6bbaa4d1b', 'ORDER_CREATE', '{"total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 1, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 17:33:58.318767', '2026-09-25 17:33:58.316979'),
('f1e42ce4-6ea7-43d9-b675-4dbc80e0ea26', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '6a26fad402b5304b8ebb5b4c90a4cc8d', 'ORDER_STATUS', '{"order_id": "45b0bb87-0ca0-452a-bf64-d2c0cd06cc74", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-25 17:33:58.723405', '2026-09-25 17:33:58.734319'),
('33a3659a-66f2-487c-b60b-c603ae903b87', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '9179a2f17fba991aa59b776e7d903e72', 'ORDER_STATUS', '{"order_id": "45b0bb87-0ca0-452a-bf64-d2c0cd06cc74", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-25 17:33:58.755489', '2026-09-25 17:33:58.755715'),
('248c595b-28ea-488f-a53a-ec8fdc8f4b0f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '4897fbd9fd99fb369f6510847f53c374', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-25 17:33:58.848490'),
('a72f0800-f6a3-4c31-9872-76e5acb46fb9', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'b6210ed226e3d111a72b31bfec69cfd3', 'ORDER_STATUS', '{"order_id": "45b0bb87-0ca0-452a-bf64-d2c0cd06cc74", "status": "WARP_SPEED"}', 'FAILED', 'Unknown status WARP_SPEED', NULL, '2026-09-25 17:33:58.938681'),
('8d7752cb-46eb-4ae7-ac45-1bf9c32e2aa7', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '2ca968694bd6b314e8e506a34301d7ba', 'SALE', '{"customer_name": "Udhaar Sync f5e531", "total_amount": 100.0, "payment_mode": "UDHAAR", "udhaar_amount": 100.0, "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 2, "unit_price": 50}]}', 'PROCESSED', NULL, '2026-09-25 17:33:58.977381', '2026-09-25 17:33:58.974487'),
('03013ab3-972b-44b8-8696-f2fb7539ae56', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '18f2925740db98e365bfd8d9612a5540', 'ORDER_CREATE', '{"order_number": "ORD-OFF-EFF538", "total_amount": 60.0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg", "unit_price": 30.0, "subtotal": 60.0}]}', 'PROCESSED', NULL, '2026-09-25 17:33:59.025098', '2026-09-25 17:33:59.023459'),
('074b6d47-b6cc-480e-ac28-ed13c0c95f10', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'e9172d5bd5b6dcceaa0ae34a93d0c8be', 'ORDER_CREATE', '{"order_number": "ORD-OFF-03363A", "total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 17:33:59.187474', '2026-09-25 17:33:59.185546'),
('09c739eb-95b1-4d66-ad0f-298bd2433343', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'badge-test-1', 'INVENTORY', '{"product_id": "test-product", "change_qty": 2, "transaction_type": "PURCHASE_IN", "notes": "badge test"}', 'FAILED', 'Product not found on server', NULL, '2026-09-25 18:06:26.765277'),
('3a798c8b-1fd0-4acd-bad1-263a7a7a2dca', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'badge-test-2-muha4p6x', 'INVENTORY', '{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "change_qty": 2, "transaction_type": "PURCHASE_IN", "notes": "badge live test"}', 'PROCESSED', NULL, '2026-09-25 18:13:40.686677', '2026-09-25 18:13:40.690840'),
('7a2c9d9e-57f3-421a-af18-74423d0bffd1', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '81736c05e5d850b8c986c4c3048ea137', 'ORDER_CREATE', '{"total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 1, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 18:25:27.102782', '2026-09-25 18:25:27.100987'),
('d8fbf527-6c47-41aa-9862-043601c46a84', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'a9e8e1584b171f42399331c7c346367a', 'ORDER_CREATE', '{"total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 1, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 18:25:27.124446', '2026-09-25 18:25:27.123824'),
('fca674ad-ecc1-44f9-b78c-7e4eff2cb403', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '7fb1a86286e5a53a7bbc503d59e196d6', 'ORDER_CREATE', '{"total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 1, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 18:25:53.208543', '2026-09-25 18:25:53.207143'),
('74411319-648a-41a7-9c4e-ed6e4dd3dbf8', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '3aa1bf6bdb92704550e55e5a80a240f7', 'ORDER_CREATE', '{"total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 1, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 18:25:53.506882', '2026-09-25 18:25:53.506180'),
('d8b8b8b6-e26b-4b24-a0e8-7a187b435c7b', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '11db1ff345ab24bd13708fa4d68ca47a', 'ORDER_CREATE', '{"total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 1, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 18:26:07.788131', '2026-09-25 18:26:07.786179'),
('910121ef-f778-48e5-ba2a-47335b8caf8a', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '223890811793fd4a05f112db7ab0dcf2', 'ORDER_CREATE', '{"total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 1, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 18:26:24.287032', '2026-09-25 18:26:24.285220'),
('f9677588-fde6-4fd5-89a5-edd39114730c', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '69c5c9c83d677042a1ffb9e8f259286d', 'ORDER_CREATE', '{"total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 1, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 18:28:07.960966', '2026-09-25 18:28:07.959053'),
('a581ce94-cc8a-40b8-b91d-9953d7d22737', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'df2a274c84af1075aa632b761ddda6d0', 'ORDER_CREATE', '{"total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 1, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 18:28:07.984274', '2026-09-25 18:28:07.983564'),
('9c9221c3-8d93-448b-ba93-5d470261e4a4', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'c7e500c2012c38d220de09a70c1d03e6', 'ORDER_STATUS', '{"order_id": "a6173930-9d73-4919-8aa1-a926e98fa68b", "status": "ACCEPTED"}', 'PROCESSED', NULL, '2026-09-25 18:28:08.266713', '2026-09-25 18:28:08.271080'),
('732cc70b-11a4-4d61-8962-fc1fd3cfefb3', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '52b45316f45560b341adf6a3d2849f3f', 'ORDER_STATUS', '{"order_id": "a6173930-9d73-4919-8aa1-a926e98fa68b", "status": "PENDING"}', 'PROCESSED', NULL, '2026-09-25 18:28:08.286729', '2026-09-25 18:28:08.286897'),
('fb1b1f23-df28-4fd0-807a-6732e0666df6', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '1145a508e134a35f72e0626bd7ab10df', 'ORDER_STATUS', '{"order_id": "nope-does-not-exist", "status": "ACCEPTED"}', 'FAILED', 'Order not found on server', NULL, '2026-09-25 18:28:08.350606'),
('f920e6ba-ca2b-4b98-bac5-def2df855283', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', '872421fb308284bbca856eef06be878e', 'ORDER_STATUS', '{"order_id": "a6173930-9d73-4919-8aa1-a926e98fa68b", "status": "WARP_SPEED"}', 'FAILED', 'Unknown status WARP_SPEED', NULL, '2026-09-25 18:28:08.424189'),
('0b993e91-7259-4414-b558-d4018b98046d', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'e66c5fdc8cc01bdeec913536a94e171c', 'SALE', '{"customer_name": "Udhaar Sync 65e2b8", "total_amount": 100.0, "payment_mode": "UDHAAR", "udhaar_amount": 100.0, "items": [{"product_id": "331dc094-09c7-4b31-ae15-5bcda867fc35", "quantity": 2, "unit_price": 50}]}', 'PROCESSED', NULL, '2026-09-25 18:28:08.452814', '2026-09-25 18:28:08.451468'),
('2a30b292-ca31-46cd-9e85-ad76b6953eb5', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'dafeb536fb5107443f3121519f7ac5b8', 'ORDER_CREATE', '{"order_number": "ORD-OFF-4D0171", "total_amount": 60.0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg", "unit_price": 30.0, "subtotal": 60.0}]}', 'PROCESSED', NULL, '2026-09-25 18:28:08.486247', '2026-09-25 18:28:08.485591'),
('173a7e1e-b661-4683-a1c5-72e450f71a6b', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'beece045808c28782fadca9b65d3ee3d', 'ORDER_CREATE', '{"order_number": "ORD-OFF-14BA59", "total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 18:28:08.619972', '2026-09-25 18:28:08.618677'),
('c9f76119-5f5f-4700-9d5d-a2e52c20697b', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'hl-1f794fd88c46', 'ORDER_CREATE', '{"total_amount": 0, "payment_mode": "CASH", "items": [{"product_name": "carrot", "quantity": 1, "unit": "kg"}]}', 'PROCESSED', NULL, '2026-09-25 18:28:53.391062', '2026-09-25 18:28:53.389040'),
('03581a8c-0849-4919-b72e-a80d89ebb3a1', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'hl-muim3jj4', 'ORDER_CREATE', '{"client_mutation_id": "hl-muim3jj4", "items": [{"product_id": "1", "product_name": "Carrot", "quantity": 1, "unit": "kg"}], "source": "voice"}', 'PROCESSED', NULL, '2026-09-26 16:36:37.738630', '2026-09-26 16:36:37.734210');

-- ----------------------------
-- Records of udhaar_ledger (53 rows)
-- ----------------------------
INSERT INTO `udhaar_ledger` (`id`, `vendor_id`, `customer_name`, `customer_phone`, `amount_due`, `amount_paid`, `remaining_balance`, `status`, `notes`, `due_date`, `last_reminder_sent_at`, `created_at`, `updated_at`) VALUES
('9ddcfa2a-5b69-4ed8-95da-a5af71430197', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Kumar (Tea Shop)', '9845011223', 450.0, 150.0, 300.0, 'PARTIAL', 'Weekly vegetable supply for tea stall', '2026-09-25 18:11:56.952329', NULL, '2026-09-22 18:11:56.954068', '2026-09-22 18:11:56.954071'),
('8aaa2627-7b22-47d0-980d-84eed6afb9ea', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Sunil Auto Driver', '9845044556', 220.0, 0.0, 220.0, 'UNPAID', 'Daily home groceries', '2026-09-25 18:11:56.952395', NULL, '2026-09-22 18:11:56.954076', '2026-09-22 18:11:56.954077'),
('38a2cbae-5441-47b0-ab1a-d6051ba86157', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Govindraj (Tailor)', '9845077889', 680.0, 300.0, 380.0, 'PARTIAL', 'Monthly credit arrangement', '2026-09-25 18:11:56.952423', NULL, '2026-09-22 18:11:56.954081', '2026-09-22 18:11:56.954082'),
('010a6519-47a8-4108-abb2-4dbd7edbd90f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Lakshmamma', '9845099001', 140.0, 140.0, 0.0, 'SETTLED', 'Cleared on Monday via UPI', '2026-09-25 18:11:56.952447', NULL, '2026-09-22 18:11:56.954084', '2026-09-22 18:11:56.954085'),
('3dded39e-2974-4db0-8e48-007177cdd3f0', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-22 18:20:54.564985', '2026-09-22 18:20:54.578831'),
('8a29e7b5-a9a3-4320-af82-6480f111e603', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-22 19:32:40.408351', '2026-09-22 19:32:40.432045'),
('e1fe9791-48af-4725-8fd8-8f2cbf3480c2', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-22 19:38:45.004023', '2026-09-22 19:38:45.023362'),
('10f05cfa-5c6a-4ef0-8727-85d653464c3d', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-22 19:44:14.827854', '2026-09-22 19:44:14.856852'),
('ce63da57-cc40-46a1-a9ad-06c49fe368cb', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-22 19:47:24.770990', '2026-09-22 19:47:24.792129'),
('1ada6bf2-73a8-4065-a9ad-9741a3c2670b', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-22 19:48:31.597562', '2026-09-22 19:48:31.627601'),
('8bfd1b12-d152-478e-858b-20b322ca4edf', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-22 19:51:21.105143', '2026-09-22 19:51:21.123732'),
('3ee40e68-364c-44a8-875e-d162a9065273', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-22 19:55:27.104466', '2026-09-22 19:55:27.120525'),
('b138794e-7809-4289-bd10-5ca23754e5a5', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-24 10:00:05.278116', '2026-09-24 10:00:05.299408'),
('fb7877d5-ae5a-4178-a5c8-7138d2f6a528', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Voice Customer', '0000000000', 250.0, 0.0, 250.0, 'UNPAID', 'Added via voice assistant', NULL, NULL, '2026-09-24 10:03:27.988026', '2026-09-24 10:03:27.988028'),
('352a83aa-1806-435a-b907-db1ed51dfa3b', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-24 10:08:30.940308', '2026-09-24 10:08:30.957821'),
('18af0b0f-a1f7-4ced-a0dd-44beea42a0c7', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-24 10:19:34.553992', '2026-09-24 10:19:34.598628'),
('2abd58e3-e4eb-47f9-aa43-d040cb8f5360', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-24 10:38:27.341421', '2026-09-24 10:38:27.375237'),
('eb19d281-c733-4a56-94cf-04d9dd66c205', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-24 17:16:01.446198', '2026-09-24 17:16:01.465029'),
('0d86f0f6-ef80-4564-bc9c-29d65910e6c1', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-24 17:50:32.307745', '2026-09-24 17:50:32.331729'),
('ab47c49d-5782-4293-ad74-2da291e4244a', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-24 17:57:14.817825', '2026-09-24 17:57:14.843505'),
('1125e1e2-a43f-4a26-bb2b-e93e7575e345', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-24 18:10:20.639036', '2026-09-24 18:10:20.657518'),
('8cf56855-7ca8-4d81-8d35-cf217ea040ed', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-24 18:22:01.402532', '2026-09-24 18:22:01.427337'),
('184d108b-7ee0-4104-88f5-71b7ed1faf37', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync Ravi', NULL, 100.0, 0.0, 100.0, 'UNPAID', 'Offline sale sync #06dda9b7', NULL, NULL, '2026-09-24 18:35:14.012109', '2026-09-24 18:35:14.012111'),
('3a976c7b-1505-44ae-a05c-85b7e7776fb4', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync Ravi', NULL, 100.0, 0.0, 100.0, 'UNPAID', 'Offline sale sync #772049c9', NULL, NULL, '2026-09-24 18:37:31.379570', '2026-09-24 18:37:31.379573'),
('85c231a3-533b-4755-ba0e-d8ee170da576', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-24 18:37:39.727377', '2026-09-24 18:37:39.753950'),
('27e744f8-f232-4c19-bbd8-2e194ccd60d6', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync Ravi', NULL, 100.0, 0.0, 100.0, 'UNPAID', 'Offline sale sync #c9532cc5', NULL, NULL, '2026-09-24 18:37:59.479563', '2026-09-24 18:37:59.479565'),
('9808ad5f-de1d-42de-b6dc-62939a6274e0', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync Ravi', NULL, 100.0, 0.0, 100.0, 'UNPAID', 'Offline sale sync #c0cea384', NULL, NULL, '2026-09-24 18:38:51.111798', '2026-09-24 18:38:51.111799'),
('1ae026b7-0e8f-4968-88d1-b5fb81d95b47', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-24 18:38:57.621343', '2026-09-24 18:38:57.643431'),
('65ff8cef-9366-47bf-8584-86c2d75e0f25', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync Ravi', NULL, 100.0, 0.0, 100.0, 'UNPAID', 'Offline sale sync #52070714', NULL, NULL, '2026-09-24 18:39:13.397386', '2026-09-24 18:39:13.397388'),
('1d2c8d2e-350c-4b1d-b0bb-71e538f58cdd', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync df14a6', NULL, 100.0, 0.0, 100.0, 'UNPAID', 'Offline sale sync #7b201c05', NULL, NULL, '2026-09-24 18:41:00.200026', '2026-09-24 18:41:00.200028'),
('f3dd266b-05ff-4d62-8550-599b1deca800', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-24 18:41:06.479239', '2026-09-24 18:41:06.501076'),
('d714dcc7-7eb6-4f99-9f21-aea4f55e7809', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync cc4c72', NULL, 100.0, 0.0, 100.0, 'UNPAID', 'Offline sale sync #debf948e', NULL, NULL, '2026-09-24 18:41:22.138877', '2026-09-24 18:41:22.138879'),
('a1508489-e3e0-42c1-ae4d-04d8e5d9aeb2', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-24 18:48:05.551066', '2026-09-24 18:48:05.575007'),
('dd8213a6-6125-4ebe-a0dd-8d19b75927e4', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync 7d8d74', NULL, 100.0, 0.0, 100.0, 'UNPAID', 'Offline sale sync #40be596d', NULL, NULL, '2026-09-24 18:48:23.923744', '2026-09-24 18:48:23.923746'),
('5290edea-4031-425b-b7d7-53e6bc1a87ec', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Mahesh', NULL, 200.0, 0.0, 200.0, 'UNPAID', 'Voice udhaar (offline)', NULL, NULL, '2026-09-24 18:51:01.731019', '2026-09-24 18:51:01.731022'),
('72317bd9-bc9e-4642-877d-97ae24d7716e', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync b58c91', NULL, 100.0, 0.0, 100.0, 'UNPAID', 'Offline sale sync #1b1bcc69', NULL, NULL, '2026-09-24 18:52:29.544668', '2026-09-24 18:52:29.544669'),
('6d852904-1ee1-4dc0-8655-0fb978907016', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-24 18:52:35.611254', '2026-09-24 18:52:35.633869'),
('1f7cd3b7-c7b5-4b67-99d2-d4d6c64bce6a', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync 1ab541', NULL, 100.0, 0.0, 100.0, 'UNPAID', 'Offline sale sync #bbc163e4', NULL, NULL, '2026-09-24 18:52:53.526011', '2026-09-24 18:52:53.526013'),
('595a5f32-322a-4f17-97e6-d3bb0da543d1', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Suresh', NULL, 150.0, 0.0, 150.0, 'UNPAID', 'Voice udhaar (offline)', NULL, NULL, '2026-09-24 19:01:01.204326', '2026-09-24 19:01:01.204329'),
('1ca9d328-3f4e-476e-ab92-6ca9b794e2d7', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-24 19:02:39.044814', '2026-09-24 19:02:39.069364'),
('bb27b512-72d3-4f66-82ce-27cfe8d6061c', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync e104f4', NULL, 100.0, 0.0, 100.0, 'UNPAID', 'Offline sale sync #29d12c28', NULL, NULL, '2026-09-24 19:02:55.154553', '2026-09-24 19:02:55.154555'),
('8d92720e-7aa0-42be-b8ce-894614d2e70f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-24 19:08:35.991717', '2026-09-24 19:08:36.014889'),
('a9d11866-31ed-4522-a803-244aad3d16ed', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync 4e94c9', NULL, 100.0, 0.0, 100.0, 'UNPAID', 'Offline sale sync #3fd8cd89', NULL, NULL, '2026-09-24 19:08:51.497316', '2026-09-24 19:08:51.497318'),
('32832a7f-90e2-41b8-8d79-5c9fc665a794', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-25 16:10:44.647684', '2026-09-25 16:10:44.668310'),
('53a5b178-b2e8-4988-b7bb-68df7f0a3876', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync 9b398e', NULL, 100.0, 0.0, 100.0, 'UNPAID', 'Offline sale sync #81060e0b', NULL, NULL, '2026-09-25 16:11:04.019827', '2026-09-25 16:11:04.019831'),
('4bbc2171-1553-4b7e-8263-2f81e5ae6caf', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-25 16:44:13.340675', '2026-09-25 16:44:13.367924'),
('65cb201c-0f97-4503-b2c2-8a4b56be272f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync 4c791e', NULL, 100.0, 0.0, 100.0, 'UNPAID', 'Offline sale sync #23514b6e', NULL, NULL, '2026-09-25 16:44:34.181503', '2026-09-25 16:44:34.181508'),
('b2ce12c0-7f7c-4520-8507-a075734c2b6f', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-25 17:08:20.828671', '2026-09-25 17:08:20.851342'),
('d39e7464-92bf-4d44-bf06-27a670887032', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync faa703', NULL, 100.0, 0.0, 100.0, 'UNPAID', 'Offline sale sync #802ba227', NULL, NULL, '2026-09-25 17:08:40.156577', '2026-09-25 17:08:40.156580'),
('d9a6ef1d-6017-4eb0-a89c-0d3c2d6ab474', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Ravi Shastri', '9845012345', 500.0, 200.0, 300.0, 'PARTIAL', 'Fresh vegetables credit', NULL, NULL, '2026-09-25 17:19:14.550198', '2026-09-25 17:19:14.580654');
INSERT INTO `udhaar_ledger` (`id`, `vendor_id`, `customer_name`, `customer_phone`, `amount_due`, `amount_paid`, `remaining_balance`, `status`, `notes`, `due_date`, `last_reminder_sent_at`, `created_at`, `updated_at`) VALUES
('ef59aea7-4d96-47ad-ac70-99ff1403ba45', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync 2206af', NULL, 100.0, 0.0, 100.0, 'UNPAID', 'Offline sale sync #15489585', NULL, NULL, '2026-09-25 17:19:33.625642', '2026-09-25 17:19:33.625645'),
('958a6293-134b-4827-8302-975a4fcb7845', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync f5e531', NULL, 100.0, 0.0, 100.0, 'UNPAID', 'Offline sale sync #60d2f8c0', NULL, NULL, '2026-09-25 17:33:58.980565', '2026-09-25 17:33:58.980567'),
('8afb1a5b-d0e7-46e0-be4c-19fdd47c6ee4', '23810afc-4a62-4bb5-9340-c23b40b4c7ae', 'Udhaar Sync 65e2b8', NULL, 100.0, 0.0, 100.0, 'UNPAID', 'Offline sale sync #9ff54311', NULL, NULL, '2026-09-25 18:28:08.455047', '2026-09-25 18:28:08.455049');

-- ----------------------------
-- Records of inventory_ledger (153 rows)
-- ----------------------------
INSERT INTO `inventory_ledger` (`id`, `product_id`, `change_qty`, `transaction_type`, `balance_after`, `notes`, `created_at`) VALUES
('65475e32-f6a3-4df0-aa98-987427eeadb5', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 24.0, 'INITIAL', 24.0, 'Initial inventory setup', '2026-09-22 18:11:56.927223'),
('90e9ee35-4e83-4465-86d6-613947d86f51', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 35.0, 'INITIAL', 35.0, 'Initial inventory setup', '2026-09-22 18:11:56.928244'),
('65d20b5a-ed4f-4c67-9671-ed25313ee014', '916cf9b7-b54a-4f6b-8bb8-e475196097cf', 40.0, 'INITIAL', 40.0, 'Initial inventory setup', '2026-09-22 18:11:56.928825'),
('2aede866-5782-431d-953c-03d467ba63f5', 'ca15485a-7115-467d-b5dd-268cde17cd20', 6.0, 'INITIAL', 6.0, 'Initial inventory setup', '2026-09-22 18:11:56.929412'),
('76d4fc9d-e391-4edd-bc5b-aa9693158412', '48abdbe0-5325-4e91-be32-7d13919a477f', 18.0, 'INITIAL', 18.0, 'Initial inventory setup', '2026-09-22 18:11:56.930216'),
('90c87c89-979e-426d-8336-6a6fb92a8cc5', '331dc094-09c7-4b31-ae15-5bcda867fc35', 12.0, 'INITIAL', 12.0, 'Initial inventory setup', '2026-09-22 18:11:56.930955'),
('1f325a46-5075-47a3-aff7-4fdc8bd235ef', 'd9ead4ba-5825-4e3e-95d4-89f0bae672ff', 15.0, 'INITIAL', 15.0, 'Initial inventory setup', '2026-09-22 18:11:56.931681'),
('e352b082-76be-46f5-9a6c-d5e98f1088ab', '23800616-5f1f-4b6f-a5b5-8d7f5b2ebb4d', 3.5, 'INITIAL', 3.5, 'Initial inventory setup', '2026-09-22 18:11:56.932245'),
('8b92902a-a582-4991-a937-5b8e08831084', 'd8fc5b6f-757f-4b5f-98a0-63fee4de901a', 60.0, 'INITIAL', 60.0, 'Initial inventory setup', '2026-09-22 18:11:56.932861'),
('805cfd24-ebfd-44c9-8796-1b2740c33f1b', 'c67ea236-99dc-4456-928a-04d39f91225c', 55.0, 'INITIAL', 55.0, 'Initial inventory setup', '2026-09-22 18:11:56.933453'),
('a8005798-f4ba-42bb-ad4a-4f4345abb75c', 'c6ea047d-2427-423e-a1a9-4b093efe8b39', 45.0, 'INITIAL', 45.0, 'Initial inventory setup', '2026-09-22 18:11:56.934048'),
('3d6deecb-b8f6-4604-adcf-1ccab8f3ce64', '041824cb-bc5d-49f3-b236-64f69dd8d409', 40.0, 'INITIAL', 40.0, 'Initial inventory setup', '2026-09-22 18:11:56.934560'),
('e2f73254-f3a3-48c3-8278-3408ddc5a96c', '7282af09-8f16-4576-9237-ac00c7f84c7b', 40.0, 'INITIAL', 40.0, 'Initial inventory setup', '2026-09-22 18:11:56.935089'),
('4deff3c9-a2c5-487e-91f8-f822e3b28cb8', 'e7eb1735-31cd-4478-80ce-31eb022e8d0d', 35.0, 'INITIAL', 35.0, 'Initial inventory setup', '2026-09-22 18:11:56.935493'),
('2769b5d4-4f67-4053-a0ca-daa8bd7d3b1f', '1d99df36-5e1c-4f69-8bc6-f4e07f2878ac', 120.0, 'INITIAL', 120.0, 'Initial inventory setup', '2026-09-22 18:11:56.935903'),
('336d100c-27f5-47bb-ac61-854ff613c388', '0b32e22a-48a6-49b5-818b-8c0236c397f7', 80.0, 'INITIAL', 80.0, 'Initial inventory setup', '2026-09-22 18:11:56.936320'),
('21ce985d-abec-4b69-8708-ed13d48e5c52', 'f7fcb483-dbb4-444e-904b-0c97c62fdffb', 90.0, 'INITIAL', 90.0, 'Initial inventory setup', '2026-09-22 18:11:56.936803'),
('06c921bb-cd2e-476a-978f-cffc602a82fa', '210eedbf-ebd5-4d5f-b2ac-4429fe20c0e3', 60.0, 'INITIAL', 60.0, 'Initial inventory setup', '2026-09-22 18:11:56.937200'),
('de940a17-7da1-458d-a62f-4d4cd4a32a1b', 'b1d2bcfb-b24d-4e2e-8325-f5adf589b1d8', 30.0, 'INITIAL', 30.0, 'Initial inventory setup', '2026-09-22 18:11:56.937509'),
('b0d082b8-58b0-40ff-a8da-0176dfdc518a', '1a4ee999-5ebf-4b1a-996a-564b719e0200', 120.0, 'INITIAL', 120.0, 'Initial inventory setup', '2026-09-22 18:11:56.955667'),
('065cae8d-8018-41e8-bf67-c843dcca132e', '3dda8902-a2e7-4967-9798-c382aaf7e36d', 110.0, 'INITIAL', 110.0, 'Initial inventory setup', '2026-09-22 18:11:56.956169'),
('401a4393-0f2d-4f4a-b45f-dcd9f34d920f', 'a42dff95-f1b4-4afb-a82f-54732750adc0', 70.0, 'INITIAL', 70.0, 'Initial inventory setup', '2026-09-22 18:11:56.956654'),
('6abf4616-9210-45dc-8f1d-c1d850007fed', '04969bc5-a4fd-44f9-bbb6-2cdafb5d7aa2', 60.0, 'INITIAL', 60.0, 'Initial inventory setup', '2026-09-22 18:11:56.957150'),
('39388390-9423-4ba9-b6b1-c84ddd92de52', 'd6d1ab55-9187-42cf-bc12-f2e959fda5fe', 80.0, 'INITIAL', 80.0, 'Initial inventory setup', '2026-09-22 18:11:56.957624'),
('930561c0-534b-4823-af3f-885b34c769fc', '09ac074d-08b6-4a6f-a434-39d6fc09cbbd', 90.0, 'INITIAL', 90.0, 'Initial inventory setup', '2026-09-22 18:11:56.958106'),
('5554b94c-f503-44cf-b33d-79dfc39ceab8', '950145b8-f3f7-4c47-a05e-5c239f359f58', 50.0, 'INITIAL', 50.0, 'Initial inventory setup', '2026-09-22 18:11:56.958580'),
('317d2ef9-7e88-46c7-bec8-92f9e044b3f8', '4f7a9985-a68b-4fee-b6ba-6a10924c3735', 45.0, 'INITIAL', 45.0, 'Initial inventory setup', '2026-09-22 18:11:56.959083'),
('0ea942aa-0625-46b9-afe0-5522209407e6', 'ffb59284-48de-47d6-98c5-b6033c897002', 300.0, 'INITIAL', 300.0, 'Initial inventory setup', '2026-09-22 18:11:56.959544'),
('9ba508cd-1b0d-4f5b-b739-c615b268d018', '0e45cac9-587b-4e76-80e4-6cba223d73b2', 150.0, 'INITIAL', 150.0, 'Initial inventory setup', '2026-09-22 18:11:56.959913'),
('18640492-e8a9-4663-8e0f-1211238a020b', 'e2182bf7-63f7-41a9-b94f-8e8bb321b61e', 200.0, 'INITIAL', 200.0, 'Initial inventory setup', '2026-09-22 18:11:56.960246'),
('4c53f433-131b-4ada-bfed-71b2d5e00bf1', 'ae0921dc-6530-4be3-91aa-a8c06c6b820f', 150.0, 'INITIAL', 150.0, 'Initial inventory setup', '2026-09-22 18:11:56.960561'),
('f86101b1-f325-4e26-ac5c-7ff4627f67fd', '7bf2a945-9177-4098-a167-785878025e0f', 180.0, 'INITIAL', 180.0, 'Initial inventory setup', '2026-09-22 18:11:56.960876'),
('3245bbd6-bf95-4a8d-b575-648549371327', 'c1c1dc38-8824-460b-9f93-a5900841d353', 250.0, 'INITIAL', 250.0, 'Initial inventory setup', '2026-09-22 18:11:56.961211'),
('9c167aee-3425-439b-8dcd-6af91f1c82f7', '5e818dfe-b17b-403c-abfe-8508a75c9b5c', 120.0, 'INITIAL', 120.0, 'Initial inventory setup', '2026-09-22 18:11:56.961534'),
('543e45d9-b453-4370-9933-591f3be4fada', 'a93392c1-df4a-494d-9047-f58b671cc70e', 150.0, 'INITIAL', 150.0, 'Initial inventory setup', '2026-09-22 18:11:56.961860'),
('e30332c1-46de-4505-9002-86aee9ea66cf', '982baf8b-8f3e-4493-a6be-294fe4def97f', 80.0, 'INITIAL', 80.0, 'Initial inventory setup', '2026-09-22 18:11:56.962179'),
('b302c9b7-fa35-4be5-9b41-673ec4e6f993', '31cc6573-7b35-425d-8f81-e208bb50e7a6', 200.0, 'INITIAL', 200.0, 'Initial inventory setup', '2026-09-22 18:11:56.962482'),
('9646e052-e7d8-4d55-8d34-56182267a1a0', '94b72f09-e4fe-4109-9462-561c04c6d4ad', 60.0, 'INITIAL', 60.0, 'Initial inventory setup', '2026-09-22 18:11:56.962791'),
('9cb7f0e9-cd56-48a9-8199-a8175479d7ec', 'f59b1005-1579-4712-8512-1dd400b8eb65', 40.0, 'INITIAL', 40.0, 'Initial inventory setup', '2026-09-22 18:11:56.963350'),
('dfcaffd0-b89e-483d-a331-2af3ceacc699', '3ce67952-37ea-4866-8afe-c4faa2d53ee1', 40.0, 'INITIAL', 40.0, 'Initial inventory setup', '2026-09-22 18:11:56.964002'),
('c7fde5fd-f24d-4a9c-951f-edb159090f10', 'c0d76689-0e0e-456e-aa55-6d58608fb110', 25.0, 'INITIAL', 25.0, 'Initial inventory setup', '2026-09-22 18:11:56.964476'),
('643b4625-dc1d-4ad5-a48b-002de220351b', '2fa40027-c166-4fa3-b23b-741017547622', 30.0, 'INITIAL', 30.0, 'Initial inventory setup', '2026-09-22 18:11:56.964741'),
('fa272f0b-e2ec-4f56-9eb0-d2df1cc3e371', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 22.0, 'Test restock batch', '2026-09-22 18:20:54.094563'),
('761286b6-6115-425c-8659-edeba232e1b9', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 20.0, 'POS Sale', '2026-09-22 18:20:54.327522'),
('054c3fd8-9d35-4c23-9af3-706dc6adfc0b', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 18.0, 'Offline Sale Sync #d434417f', '2026-09-22 18:20:58.004774'),
('d7406ad6-6a45-421c-9be3-78406cb81ef1', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 23.0, 'Order ORD-0922-C260 Completed', '2026-09-22 18:21:01.325736'),
('c5dd70d2-fea5-418d-8caa-e9a941b93528', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 5.0, 'PURCHASE_IN', 40.0, 'Voice assistant update', '2026-09-22 19:22:01.972728'),
('e70f4316-0d6e-4fe5-959d-b83247936682', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 5.0, 'PURCHASE_IN', 45.0, 'Voice assistant update', '2026-09-22 19:23:40.029381'),
('ad459465-8f92-4829-8e60-971389c5ec34', '916cf9b7-b54a-4f6b-8bb8-e475196097cf', -3.0, 'SALE_OUT', 37.0, 'Voice assistant update', '2026-09-22 19:25:23.535662'),
('b8e9957c-0b6b-41f1-bd86-1c20ca601cfa', 'd8fc5b6f-757f-4b5f-98a0-63fee4de901a', 5.0, 'PURCHASE_IN', 65.0, 'Voice assistant update', '2026-09-22 19:25:25.250872');
INSERT INTO `inventory_ledger` (`id`, `product_id`, `change_qty`, `transaction_type`, `balance_after`, `notes`, `created_at`) VALUES
('1f5b1807-5986-430d-b3ab-31a4a2e3b589', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 28.0, 'Test restock batch', '2026-09-22 19:32:39.793425'),
('4e25eab4-850d-4d00-9bc6-66b289f26dcd', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 26.0, 'POS Sale', '2026-09-22 19:32:40.097620'),
('3ca7e711-b269-48a0-8f92-5f619fdbd16d', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 22.0, 'Order ORD-0923-6E9B Completed', '2026-09-22 19:32:47.207786'),
('b49a6f66-2f17-44b7-905d-a5c3ed8c6dfe', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 36.0, 'Test restock batch', '2026-09-22 19:38:44.391283'),
('c1e6d2ee-7fbc-49b1-a778-c65a9fee06c6', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 34.0, 'POS Sale', '2026-09-22 19:38:44.699368'),
('3d7a55a2-b6c0-416e-bddd-64d86930919a', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 21.0, 'Order ORD-0923-F2DE Completed', '2026-09-22 19:38:52.209566'),
('56d9c831-e541-4d28-bf20-663571f76aab', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 44.0, 'Test restock batch', '2026-09-22 19:44:14.212227'),
('3a9c4e97-f75a-4fd0-ad0c-f49ad14b904a', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 42.0, 'POS Sale', '2026-09-22 19:44:14.527724'),
('58c0b958-6087-47a7-9fdb-5c6da2049b69', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 20.0, 'Order ORD-0923-1523 Completed', '2026-09-22 19:44:21.337219'),
('ccb0e897-22d2-4ae8-885e-85dc341cdcd3', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 52.0, 'Test restock batch', '2026-09-22 19:47:24.159694'),
('83295e19-409b-432d-9382-9a3bcbbdbc2d', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 50.0, 'POS Sale', '2026-09-22 19:47:24.465421'),
('feb368f8-9b29-481e-8d75-5fd39d025973', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 19.0, 'Order ORD-0923-BC85 Completed', '2026-09-22 19:47:31.196329'),
('59291965-4fd6-4b48-8aba-73aca48a25b5', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 60.0, 'Test restock batch', '2026-09-22 19:48:30.986976'),
('bea7114e-fbed-4f9d-adcc-0a76ce324df2', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 58.0, 'POS Sale', '2026-09-22 19:48:31.291361'),
('baf45427-dfe9-4132-8810-b75bca11e784', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 18.0, 'Order ORD-0923-D183 Completed', '2026-09-22 19:48:37.956702'),
('38fa01c4-d64e-4e5f-b47b-afd47c1c3172', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 68.0, 'Test restock batch', '2026-09-22 19:51:20.477124'),
('920c38fa-b590-4570-8144-c06f9b86a874', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 66.0, 'POS Sale', '2026-09-22 19:51:20.801448'),
('cafbcf2d-f235-4626-818f-78230f36ba19', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 17.0, 'Order ORD-0923-6804 Completed', '2026-09-22 19:51:27.695820'),
('2c42d4da-3ffa-4754-834b-77d50c4bd710', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 76.0, 'Test restock batch', '2026-09-22 19:55:26.497735'),
('43497efe-c6c0-4c80-a972-9c64ced0a1eb', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 74.0, 'POS Sale', '2026-09-22 19:55:26.799949'),
('de47ebec-362f-463d-9025-5002888ee976', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 16.0, 'Order ORD-0923-2416 Completed', '2026-09-22 19:55:33.618688'),
('e6ea9f31-7cfc-4c80-be54-0b3c4df22593', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 84.0, 'Test restock batch', '2026-09-24 10:00:04.851355'),
('6df9558c-c5df-48e7-a0e7-a4842ac2a2eb', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 82.0, 'POS Sale', '2026-09-24 10:00:05.062851'),
('38efa5f8-a2ef-4869-bb04-a04334fd44f9', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 15.0, 'Order ORD-0924-41E3 Completed', '2026-09-24 10:00:13.100341'),
('569dd51e-2b70-4fdf-b7d5-c4f0b085d016', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 92.0, 'Test restock batch', '2026-09-24 10:08:30.462215'),
('b49b8b51-1e6f-434a-aaf0-70c3fec52519', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 90.0, 'POS Sale', '2026-09-24 10:08:30.706219'),
('2ec58199-e1b8-4c50-ba7a-551fa2b1c103', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 14.0, 'Order ORD-0924-2B65 Completed', '2026-09-24 10:08:38.707729'),
('081d67e1-342b-477b-8748-cdfcc050b6a4', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 100.0, 'Test restock batch', '2026-09-24 10:19:33.701093'),
('7ec1a275-49d0-47ab-a67a-18d56c9737c8', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 98.0, 'POS Sale', '2026-09-24 10:19:34.119170'),
('ae68e606-d5be-47ed-b83d-0e12cee66bbe', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 13.0, 'Order ORD-0924-F3E2 Completed', '2026-09-24 10:19:43.122638'),
('bc19c2b3-d5be-44db-b637-83a38b820cf2', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 108.0, 'Test restock batch', '2026-09-24 10:38:26.785289'),
('e6624333-288a-42c7-9479-7ff993a0b70e', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 106.0, 'POS Sale', '2026-09-24 10:38:27.065441'),
('b00d0655-4e7d-4f05-b4db-f8e30be4ad19', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 12.0, 'Order ORD-0924-D0D7 Completed', '2026-09-24 10:38:36.270864'),
('417da6c4-39b8-46b2-9d05-69d8547872b6', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 116.0, 'Test restock batch', '2026-09-24 17:16:00.978423'),
('8795f01f-49cc-4713-b075-9fecc595af85', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 114.0, 'POS Sale', '2026-09-24 17:16:01.215465'),
('eed36fcc-1e47-4e37-8a59-60a37688136a', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 11.0, 'Order ORD-0924-B2BF Completed', '2026-09-24 17:16:08.120122'),
('2bce0bb6-8883-4956-b41c-958e2e52dd27', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 124.0, 'Test restock batch', '2026-09-24 17:50:31.636503'),
('5970d39e-6aae-4f82-b653-d57139a1f07e', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 122.0, 'POS Sale', '2026-09-24 17:50:31.979811'),
('9837527a-669c-461c-801a-304654713436', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 10.0, 'Order ORD-0924-59CA Completed', '2026-09-24 17:50:39.263029'),
('e0ee9e0b-84b3-47b4-948d-98880311f72a', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 132.0, 'Test restock batch', '2026-09-24 17:57:13.998230'),
('f4f88dcc-e164-45f4-898e-cfec78c16548', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 130.0, 'POS Sale', '2026-09-24 17:57:14.410770'),
('f73fb6d5-e4b9-4521-837a-ce560d17e453', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 9.0, 'Order ORD-0924-4F2E Completed', '2026-09-24 17:57:22.596039'),
('690f6c71-3544-483c-8ee9-49f41cdcce43', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 128.0, 'Offline Sale Sync #bfaaa66c', '2026-09-24 18:05:46.706702'),
('f4e97283-334f-4076-bfbf-bb2a75f33ba7', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 138.0, 'Test restock batch', '2026-09-24 18:10:20.020778'),
('f134c83b-3777-4a21-92a7-3bafe23b1129', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 136.0, 'POS Sale', '2026-09-24 18:10:20.334743'),
('b047d265-f8e6-4aac-91a9-264d31a60613', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 8.0, 'Order ORD-0924-F723 Completed', '2026-09-24 18:10:27.583500'),
('b8ce5fd6-aad2-40bd-9aab-99f10448598b', '331dc094-09c7-4b31-ae15-5bcda867fc35', -3.0, 'SALE_OUT', 133.0, 'Offline Sale Sync #093b4995', '2026-09-24 18:14:26.978667'),
('59eb6339-8514-4198-a7e8-f9bf9221fc19', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 143.0, 'Test restock batch', '2026-09-24 18:22:00.957054'),
('1ef99d8d-c3fa-4d3b-a187-97a1f42d483c', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 141.0, 'POS Sale', '2026-09-24 18:22:01.186215'),
('a2cecaca-1a53-4ffc-92de-5e1aaa538788', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 7.0, 'Order ORD-0924-6F94 Completed', '2026-09-24 18:22:07.149333');
INSERT INTO `inventory_ledger` (`id`, `product_id`, `change_qty`, `transaction_type`, `balance_after`, `notes`, `created_at`) VALUES
('89d33bc0-41ee-4022-8bea-2487bf66f89e', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 139.0, 'Offline Sale Sync #06dda9b7', '2026-09-24 18:35:14.012709'),
('edb93e54-728e-4259-8170-d437a056ea5d', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 137.0, 'Offline Sale Sync #772049c9', '2026-09-24 18:37:31.380694'),
('359c2e71-1c79-462e-b146-b367a9dc9b77', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 147.0, 'Test restock batch', '2026-09-24 18:37:38.895121'),
('e26f6e24-4463-42db-8f70-6c989b877ca7', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 145.0, 'POS Sale', '2026-09-24 18:37:39.316131'),
('89c4e795-0afa-4e0c-9c9d-abe3db4e5269', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 6.0, 'Order ORD-0925-FF5F Completed', '2026-09-24 18:37:47.923656'),
('e815a3e4-aa9c-421a-97d3-006d80134a20', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 143.0, 'Offline Sale Sync #c9532cc5', '2026-09-24 18:37:59.479965'),
('dfd6c512-5edd-4b86-8fa1-37e7cff933ea', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 141.0, 'Offline Sale Sync #c0cea384', '2026-09-24 18:38:51.112454'),
('ab99c627-28ce-43e7-8dc6-9167456fa77f', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 151.0, 'Test restock batch', '2026-09-24 18:38:57.181437'),
('8cf7255c-be37-46f8-ae4b-78771b98283a', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 149.0, 'POS Sale', '2026-09-24 18:38:57.409511'),
('d3ba2fd1-ab90-499f-8dc4-3025b8932255', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 5.0, 'Order ORD-0925-1156 Completed', '2026-09-24 18:39:03.521677'),
('ed9c98ea-c6a7-4fa4-94b9-48b6ac0e2e58', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 147.0, 'Offline Sale Sync #52070714', '2026-09-24 18:39:13.397636'),
('a0f455e0-fe22-4952-91aa-2bfe8b462750', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 145.0, 'Offline Sale Sync #7b201c05', '2026-09-24 18:41:00.200757'),
('4c33b644-72e8-4b29-9785-8d18b7dc9eef', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 155.0, 'Test restock batch', '2026-09-24 18:41:06.041932'),
('27012b09-f8fe-4a18-a6b6-82144779e0aa', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 153.0, 'POS Sale', '2026-09-24 18:41:06.267807'),
('9b13bff0-0716-4868-9a98-2c34dfc209cf', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 4.0, 'Order ORD-0925-5422 Completed', '2026-09-24 18:41:12.220168'),
('2a9fbdd6-0e94-440f-a755-d2c962ce27ef', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 151.0, 'Offline Sale Sync #debf948e', '2026-09-24 18:41:22.139178'),
('8d8e2f24-815f-4310-aa32-51cfd0ebd1a0', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 161.0, 'Test restock batch', '2026-09-24 18:48:05.114442'),
('591be94e-433a-4e45-9367-fcec12f015c1', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 159.0, 'POS Sale', '2026-09-24 18:48:05.337532'),
('eb008c10-e1f6-4574-881b-7cc4c47bdf0d', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 3.0, 'Order ORD-0925-EDE2 Completed', '2026-09-24 18:48:12.270709'),
('a8a1fd72-5932-4642-b699-e6f72fbc783a', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 157.0, 'Offline Sale Sync #40be596d', '2026-09-24 18:48:23.924139'),
('36aff4cd-847c-483e-af00-8e8b7e99d1a7', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 155.0, 'Offline Sale Sync #1b1bcc69', '2026-09-24 18:52:29.545343'),
('c19ec3ff-4663-4acc-81cf-b1b46242565f', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 165.0, 'Test restock batch', '2026-09-24 18:52:35.175093'),
('71c1cef6-7ccf-4167-b69e-f884324c1d62', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 163.0, 'POS Sale', '2026-09-24 18:52:35.397039'),
('c559debe-0c78-4a7c-934f-6cdafa2223ab', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 2.0, 'Order ORD-0925-6F2C Completed', '2026-09-24 18:52:41.271204'),
('bbccb837-45fe-429d-8a7f-24c39da8962c', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 161.0, 'Offline Sale Sync #bbc163e4', '2026-09-24 18:52:53.526254'),
('25a37153-b4b4-4ae5-917b-d3d8a775a3cc', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 171.0, 'Test restock batch', '2026-09-24 19:02:38.608443'),
('668a8d01-1954-4df0-90dd-feec4dea3548', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 169.0, 'POS Sale', '2026-09-24 19:02:38.831432'),
('e24c8c1f-8068-4c28-8520-c3c84292b25e', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 1.0, 'Order ORD-0925-1942 Completed', '2026-09-24 19:02:45.082842'),
('ec8ff194-d754-4104-b84b-b06a7a043676', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 167.0, 'Offline Sale Sync #29d12c28', '2026-09-24 19:02:55.154777'),
('d4514f42-3bc6-4817-857a-6d55310c032c', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 177.0, 'Test restock batch', '2026-09-24 19:08:35.552233'),
('9fe4fbda-7786-4014-872e-66002783a129', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 175.0, 'POS Sale', '2026-09-24 19:08:35.778726'),
('8e361d7c-688a-4d40-a11b-1658f4025da3', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 0.0, 'Order ORD-0925-AFFF Completed', '2026-09-24 19:08:41.624022'),
('fb548cbb-8d20-4837-b05b-18056c471cc3', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 173.0, 'Offline Sale Sync #3fd8cd89', '2026-09-24 19:08:51.497534'),
('96bfb91f-fa51-458b-acc4-53d42a524d5a', '331dc094-09c7-4b31-ae15-5bcda867fc35', -1.0, 'SALE_OUT', 172.0, 'Offline Sale Sync #49881910', '2026-09-24 19:34:09.161019'),
('dd377f84-6109-4001-a3fd-a48aa4c6ee12', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 182.0, 'Test restock batch', '2026-09-25 16:10:43.987232'),
('530ff922-a17c-4615-bd2b-2283daa5de69', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 180.0, 'POS Sale', '2026-09-25 16:10:44.316778'),
('57c6c112-861a-4598-a50b-04e4558d39df', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 0.0, 'Order ORD-0925-CF93 Completed', '2026-09-25 16:10:51.984722'),
('ed6bbd0b-efff-469a-b43f-80b92d8eb24d', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 178.0, 'Offline Sale Sync #81060e0b', '2026-09-25 16:11:04.020262'),
('c11a6ec6-47f5-4b53-8c05-c44def006be1', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 188.0, 'Test restock batch', '2026-09-25 16:44:12.516589'),
('3220dbb7-cbc6-4d41-bb4e-49cc429f1dff', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 186.0, 'POS Sale', '2026-09-25 16:44:12.929622'),
('734374e1-edac-490e-adf1-6151b34c0d8d', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 0.0, 'Order ORD-0925-47D8 Completed', '2026-09-25 16:44:21.172784'),
('eae0b405-faca-47f1-b624-a37497998976', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 184.0, 'Offline Sale Sync #23514b6e', '2026-09-25 16:44:34.182216'),
('51552325-ffff-403b-b898-181ea2b49870', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 194.0, 'Test restock batch', '2026-09-25 17:08:20.197433'),
('da2e6d5b-e11d-497a-ae05-e6bb3a45c77a', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 192.0, 'POS Sale', '2026-09-25 17:08:20.516819'),
('3a46048b-6c1c-4d92-82b8-65e617c0c8e3', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 0.0, 'Order ORD-0925-1412 Completed', '2026-09-25 17:08:28.127736'),
('31508299-d811-4a93-bc66-dfc18cd58d0b', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 190.0, 'Offline Sale Sync #802ba227', '2026-09-25 17:08:40.157079'),
('f7d6f0fb-efbb-48da-85fc-083b4a019b9b', '331dc094-09c7-4b31-ae15-5bcda867fc35', 10.0, 'PURCHASE_IN', 200.0, 'Test restock batch', '2026-09-25 17:19:13.933294'),
('687cd4cd-4740-41bf-90b2-11c126cf1ec2', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 198.0, 'POS Sale', '2026-09-25 17:19:14.236881'),
('2b9d271c-9675-4f12-baa0-9c571281ff92', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', -1.0, 'SALE_OUT', 0.0, 'Order ORD-0925-B81F Completed', '2026-09-25 17:19:22.106976'),
('dae4628e-223a-42d1-a34d-7ce44e33a68a', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 196.0, 'Offline Sale Sync #15489585', '2026-09-25 17:19:33.626007');
INSERT INTO `inventory_ledger` (`id`, `product_id`, `change_qty`, `transaction_type`, `balance_after`, `notes`, `created_at`) VALUES
('7350ec8f-1262-4bf3-abb7-86f14997e5b4', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 194.0, 'Offline Sale Sync #60d2f8c0', '2026-09-25 17:33:58.981713'),
('3706534a-7ada-4260-80af-1bdead58e8a1', '331dc094-09c7-4b31-ae15-5bcda867fc35', 2.0, 'PURCHASE_IN', 196.0, 'badge live test', '2026-09-25 18:13:40.692327'),
('ee43c343-5182-42ac-9da4-0d192a24484e', '331dc094-09c7-4b31-ae15-5bcda867fc35', -2.0, 'SALE_OUT', 194.0, 'Offline Sale Sync #9ff54311', '2026-09-25 18:28:08.455749');

-- ----------------------------
-- Records of loyalty_ledger (49 rows)
-- ----------------------------
INSERT INTO `loyalty_ledger` (`id`, `customer_id`, `order_id`, `points_change`, `balance_after`, `action_type`, `description`, `created_at`) VALUES
('1cd17507-fccd-43db-8bf4-200cfdf776c1', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', 'dbf2db52-6686-49d7-a475-f2e63023b081', 1, 341, 'EARNED', 'Points earned on Order ORD-0922-C260', '2026-09-22 18:21:01.273386'),
('daa8c13f-f068-4cde-9b34-9ac15d3c6969', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '8ec152ca-886e-41e1-bf0b-def55ff1e73a', 1, 342, 'EARNED', 'Points earned on Order ORD-0923-6E9B', '2026-09-22 19:32:47.148640'),
('2fcb8dc0-4235-483e-b38d-06fc9275bb69', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '00f292ac-1b97-487b-9e61-7f3a67233c01', 1, 343, 'EARNED', 'Points earned on Order ORD-0923-F2DE', '2026-09-22 19:38:52.154439'),
('472548eb-e02b-430b-9d73-1bda2f955f1d', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', 'b749389e-0f71-415f-8e5d-a7a45bfa3f7d', 1, 344, 'EARNED', 'Points earned on Order ORD-0923-1523', '2026-09-22 19:44:21.286299'),
('f6ee4ef6-af3c-4dfe-92dd-5c5c35d16eeb', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '0791aaa5-8163-434f-98f9-8b35c77988f2', 1, 345, 'EARNED', 'Points earned on Order ORD-0923-BC85', '2026-09-22 19:47:31.136867'),
('ac2a4fa7-f4bd-453b-84cd-58f56813896a', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', 'd2684cc0-1b9b-4980-8a96-252c0f179068', 1, 346, 'EARNED', 'Points earned on Order ORD-0923-D183', '2026-09-22 19:48:37.892100'),
('aa9f2eab-4a9a-4bb9-9437-4e180a1a5b60', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '858e7be7-1feb-47a9-9873-4c21910fba22', 1, 347, 'EARNED', 'Points earned on Order ORD-0923-6804', '2026-09-22 19:51:27.624561'),
('531c390c-44b7-476e-b9db-2b017c6f0747', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', 'bfff5243-ad65-416f-aa65-ba6d879079de', 1, 348, 'EARNED', 'Points earned on Order ORD-0923-2416', '2026-09-22 19:55:33.551001'),
('7d928abc-9b8b-4f4e-87b9-d0ebd8d900f0', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '7a1cbd3f-8b78-40b6-8e10-26659cdbb9fc', 1, 349, 'EARNED', 'Points earned on Order ORD-0924-41E3', '2026-09-24 10:00:13.044781'),
('334796c8-106b-40c8-9dd4-9ef898061117', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', 'aac5660b-cc0b-406b-a614-ac2ea7ed444a', 1, 350, 'EARNED', 'Points earned on Order ORD-0924-2B65', '2026-09-24 10:08:38.620717'),
('bae1e9b7-437c-4a4e-9662-dbbc7c067565', '507a2252-4a7b-4509-a229-3392f3d9456f', 'b43a7406-eab0-46f4-8d32-e3a6f7219b99', 2, 2, 'EARNED', 'Points earned on Order ORD-0924-9DDA', '2026-09-24 10:14:41.412354'),
('b9f1216d-38d8-483b-a2d1-73fa697aac0b', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '46421182-880e-43e2-a0d9-abdf108b9647', 1, 351, 'EARNED', 'Points earned on Order ORD-0924-F3E2', '2026-09-24 10:19:43.041330'),
('4cf9f699-e3fc-49dc-8828-f062dcff8f37', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '2cedf1ce-ef0d-4837-8b96-7a96bdd2c0d9', 1, 352, 'EARNED', 'Points earned on Order ORD-0924-D0D7', '2026-09-24 10:38:36.167473'),
('7e2f9721-1cca-4f0c-94a6-e8e81cfe3b26', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '4ad85e35-e5e5-49d9-b4d6-3bf95a67ea2f', 1, 353, 'EARNED', 'Points earned on Order ORD-0924-B2BF', '2026-09-24 17:16:08.048798'),
('4df2d5ac-dfab-4325-86e4-c999875d872b', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '47794a16-76aa-43f7-874a-3f22918baaba', 2, 355, 'EARNED', 'Points earned on Order ORD-0924-1AFB', '2026-09-24 17:50:13.714423'),
('50998e56-ca80-468a-8177-5c22c2f89d96', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '74014dbe-574b-439c-84e9-af0bb86d91b9', 1, 356, 'EARNED', 'Points earned on Order ORD-0924-59CA', '2026-09-24 17:50:38.931458'),
('f4162a85-2fe6-4284-ba93-145a627d12d4', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', 'f5f5aec5-7657-4ba9-8a22-99365f080e8e', 2, 358, 'EARNED', 'Points earned on Order ORD-0924-F23F', '2026-09-24 17:50:50.347106'),
('0f42131a-a896-4ada-97fc-076f1ffa1188', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', 'f5cbe375-5aff-4f7f-a48b-e9ad33779706', 1, 359, 'EARNED', 'Points earned on Order ORD-0924-4F2E', '2026-09-24 17:57:22.472838'),
('d0ed6bf3-a11d-4af1-a65c-430208271994', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '7d38582b-0409-4bd9-88d6-9e6322d3cf7b', 2, 361, 'EARNED', 'Points earned on Order ORD-0924-AEED', '2026-09-24 17:57:33.571913'),
('c82c937e-284b-4136-bc7f-13323dc2eb4a', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', 'd655a880-fc8d-47c8-ab56-b37bacea3491', 1, 362, 'EARNED', 'Points earned on Order ORD-0924-F723', '2026-09-24 18:10:27.246405'),
('392eab96-c1a2-4eaa-b996-b27851faf404', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '8abbec2e-a0d7-458a-9fe0-e2a6f0feef30', 2, 364, 'EARNED', 'Points earned on Order ORD-0924-1FD0', '2026-09-24 18:10:37.694196'),
('6b53c34e-19fb-41bd-9866-3066c85e9c48', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '7b922d02-69e6-42a7-bf1c-79bc9d0b8d94', 1, 365, 'EARNED', 'Points earned on Order ORD-0924-6F94', '2026-09-24 18:22:06.915058'),
('958df969-808a-425e-81ba-0845c20eebcc', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '5b865fdb-f26c-4ebd-b02a-9f612c412223', 2, 367, 'EARNED', 'Points earned on Order ORD-0924-CCEE', '2026-09-24 18:22:16.654535'),
('a4baaf15-eab9-431f-8d4b-cc2f91865a8c', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '0007c097-d741-465c-9dc2-b799b4ee3a0a', 1, 368, 'EARNED', 'Points earned on Order ORD-0925-FF5F', '2026-09-24 18:37:47.578470'),
('6cb5baae-d4a9-47e6-86a3-958fd5629bce', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', 'ac90fc59-3e7b-406e-8bd3-2f8a29ab3809', 2, 370, 'EARNED', 'Points earned on Order ORD-0925-CE52', '2026-09-24 18:37:58.822277'),
('912c905d-a62f-4359-bbca-b6de9780bd26', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', 'bbbca712-d412-4807-86d8-f4a8ba4f517e', 1, 371, 'EARNED', 'Points earned on Order ORD-0925-1156', '2026-09-24 18:39:03.316404'),
('beef3145-0625-4713-ab89-474eec275f68', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '9bd6663c-664c-4686-b46e-1cb9478ed88d', 2, 373, 'EARNED', 'Points earned on Order ORD-0925-9FEF', '2026-09-24 18:39:12.997683'),
('f5455bb4-055f-4640-a846-cbcd15a0953f', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', 'eaedd879-4d06-4163-be62-f26737110535', 1, 374, 'EARNED', 'Points earned on Order ORD-0925-5422', '2026-09-24 18:41:11.968545'),
('f8cd95a5-da10-4ad7-9bd5-750fcace5bcf', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', 'a1832ea2-1716-409c-8ab9-bb42e4d068b3', 2, 376, 'EARNED', 'Points earned on Order ORD-0925-C98E', '2026-09-24 18:41:21.735652'),
('68b33cf4-ffb2-45c8-a53b-252e6c8cf777', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', 'eee0c68d-329f-4000-9455-1e518b09da5e', 1, 377, 'EARNED', 'Points earned on Order ORD-0925-EDE2', '2026-09-24 18:48:11.914388'),
('ff243d42-406c-454d-be9e-2120b6104640', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '944093e0-9757-4f3a-ae96-5b9a8641c7d6', 2, 379, 'EARNED', 'Points earned on Order ORD-0925-4165', '2026-09-24 18:48:23.520092'),
('4be08ffd-48a2-4505-8c46-d6aff0f5fd65', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '4c0157c4-0e33-4065-bc5a-127ce84f2057', 1, 380, 'EARNED', 'Points earned on Order ORD-0925-6F2C', '2026-09-24 18:52:41.064101'),
('d27e8412-ecd4-47fc-9ef7-55b25823884a', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '95b37590-be75-4385-b6e9-a734312dfc34', 2, 382, 'EARNED', 'Points earned on Order ORD-0925-03B2', '2026-09-24 18:52:53.115349'),
('d0786747-b839-450a-9f65-daa4bae56fea', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', 'e9fb2ca6-26c1-4593-8b4f-ea21bd1d6eb8', 1, 383, 'EARNED', 'Points earned on Order ORD-0925-1942', '2026-09-24 19:02:44.871697'),
('a4256c89-0e1a-4330-856f-a1109a309303', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '344d67a6-83be-46c7-8c1c-7a85a2bbdd9a', 2, 385, 'EARNED', 'Points earned on Order ORD-0925-8A3C', '2026-09-24 19:02:54.632378'),
('3a64fe3c-01ae-45a7-9d19-abcafb44bec2', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', 'c528a90e-17bd-4616-9eb2-0e4503c8fa01', 1, 386, 'EARNED', 'Points earned on Order ORD-0925-AFFF', '2026-09-24 19:08:41.390535'),
('8514a42a-beef-4936-a46e-e59a882b0033', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', 'af4895e2-c13a-4f59-84d7-ca12a5737178', 2, 388, 'EARNED', 'Points earned on Order ORD-0925-2790', '2026-09-24 19:08:50.949643'),
('b1eb37f6-38cd-4004-b41d-88485b457908', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '051c03e7-b26f-4dab-a102-b1d4ef38109e', 1, 389, 'EARNED', 'Points earned on Order ORD-0925-CF93', '2026-09-25 16:10:51.421678'),
('25f44149-d7a3-468f-b294-6f0e97ae70d8', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', 'a5bc56f7-e77f-4b28-a33c-71af91c1a01c', 2, 391, 'EARNED', 'Points earned on Order ORD-0925-04A1', '2026-09-25 16:11:03.389346'),
('b7c90257-c520-4e13-98e7-1824cf87cb62', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', 'cc72087f-847d-4b4e-9a4d-f4540eabe8e8', 1, 392, 'EARNED', 'Points earned on Order ORD-0925-47D8', '2026-09-25 16:44:20.779658'),
('99b9d0c7-3b52-4716-b4fd-38d9f4be54c6', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '98ea76e1-1d33-4e2f-bc57-e32beee6aa00', 2, 394, 'EARNED', 'Points earned on Order ORD-0925-6CF1', '2026-09-25 16:44:33.117381'),
('0bb0fc85-c545-42a2-a52b-9c38021e0b88', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '0aac0e66-f927-4e2d-9389-2352cf62b8c8', 1, 395, 'EARNED', 'Points earned on Order ORD-0925-1412', '2026-09-25 17:08:27.772901'),
('0404462a-396f-46fa-bef2-5428a0135ef9', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', 'dd78376d-620a-4aa9-aad8-f96517a85f01', 2, 397, 'EARNED', 'Points earned on Order ORD-0925-5C0F', '2026-09-25 17:08:39.176109'),
('6d1796c6-8b91-4437-84c9-c476f784c8ac', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '47d3530b-913c-48bd-8eb6-6ef89a562d18', 1, 398, 'EARNED', 'Points earned on Order ORD-0925-B81F', '2026-09-25 17:19:21.801887'),
('959ee12d-8967-4613-b571-b4dfd9d15fd2', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '631888f0-e538-4f48-9a5f-b98092f96f5c', 2, 400, 'EARNED', 'Points earned on Order ORD-0925-DFE1', '2026-09-25 17:19:32.722186'),
('eb27fa78-199e-4a50-b11f-089de891a1e3', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '5eff56a6-5b44-4afb-a3dc-3d3b5b64c263', 2, 402, 'EARNED', 'Points earned on Order ORD-0925-AC9E', '2026-09-25 17:33:58.239165'),
('9ba2e5c8-5b20-4b5c-9d84-aeef506512f2', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '8c5a0b59-d580-4aea-bd02-2ae0d743178c', 2, 404, 'EARNED', 'Points earned on Order ORD-0925-657A', '2026-09-25 18:25:27.065410'),
('8ab45ef6-8027-480b-a8a2-ab4540cd1b1e', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', 'bc0f8c05-365e-4e7c-8f66-177fc3f20d38', 2, 406, 'EARNED', 'Points earned on Order ORD-0925-A848', '2026-09-25 18:25:53.176817'),
('8e3f767d-1524-4f3f-aec5-2442989952a9', 'e1b0abf3-20d6-4c12-a061-a1dccd361608', '794dabf3-4bb4-46c2-8b28-453e4cb1923a', 2, 408, 'EARNED', 'Points earned on Order ORD-0925-032F', '2026-09-25 18:28:07.923555');

-- ----------------------------
-- Records of order_items (159 rows)
-- ----------------------------
INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `product_name_snapshot`, `quantity`, `unit`, `unit_price`, `subtotal`) VALUES
('655e99fb-7e62-4dfd-b3ac-6c2b3cd5bfff', '8dcb9631-5113-447b-aa74-868696cf57d1', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 3.0, 'kg', 30.0, 90.0),
('001458c6-7852-4063-957f-a5c3f1e34734', '8dcb9631-5113-447b-aa74-868696cf57d1', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 2.0, 'kg', 40.0, 80.0),
('dd8b531f-1225-455f-a025-a1726876b3ca', 'dbf2db52-6686-49d7-a475-f2e63023b081', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('35314915-a712-490c-8079-30be9d77629b', 'd2f16866-9ff2-450b-aa2d-a5b3320073f6', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 2.0, 'kg', 30.0, 60.0),
('e5849e3a-7b16-4b8b-96fc-8ecd36efee69', '0641f0aa-3d44-4c31-b018-db8acac3d24b', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 2.0, 'kg', 30.0, 60.0),
('799b711c-9843-4e53-92f4-b022fd72adf4', '59147bfe-f6df-4647-a03f-d7f0c4b9262c', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 2.0, 'kg', 40.0, 80.0),
('c0274d34-5317-432d-8062-135c59d0214d', '45c8a116-5ece-4ff1-93ed-47dba3f22c2c', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 2.0, 'kg', 30.0, 60.0),
('38830648-e148-4f11-b8c7-34adb67283b1', 'cf543ef6-d17e-4bff-b3f1-09a36c4e9715', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 2.0, 'kg', 30.0, 60.0),
('8c1c5ea6-17f2-417d-a5d6-ac7a9e7b9254', '56d3408d-77fb-4220-8d64-3759b7a2b55d', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('2acb0c6b-52b8-4ec5-896a-f633d75778c7', 'c0fea222-7e98-4a30-a7c7-65d8ee343981', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('01883ebd-e1bd-42c9-a2ef-34e31f1db22e', '8ec152ca-886e-41e1-bf0b-def55ff1e73a', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('44f1a22c-9356-4f4d-9bd1-2c583c6b0e4f', '35d86a93-3235-4b57-8328-c605cca916b0', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('a093c4ba-6897-4a4b-b1c5-f44b53585169', '49647b07-9084-4bd8-90bc-dc404655833f', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 2.0, 'kg', 30.0, 60.0),
('dc837716-3ada-4faf-b35e-f37d609b38f6', '00f292ac-1b97-487b-9e61-7f3a67233c01', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('96c89169-9a2f-4f71-8a3f-a239bc9a0c7d', '416f0a7c-7c00-44c7-b216-e8374f4f19ae', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('f249104a-b337-4f37-bd4f-464ecae03c9e', 'b749389e-0f71-415f-8e5d-a7a45bfa3f7d', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('43f1d7ef-da5f-4aac-ba78-4b4700328b8e', '7cb3e6ec-081a-4371-94c6-eca54dd6ca38', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('2d442e94-2bcf-4793-bda8-c956f2a94818', '596c28f1-704d-4f2c-85c1-44e6526251ea', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 40.0, 120.0),
('c4bb576d-ff17-4713-8d5c-ced481d71466', '0791aaa5-8163-434f-98f9-8b35c77988f2', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('23b3b646-3866-40a8-9d33-98d6242eb20e', 'd2684cc0-1b9b-4980-8a96-252c0f179068', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('0f2d4346-0176-4246-adf9-79af76f7bfb2', '91196951-2310-4ce3-96d0-9f6b4f11bf6f', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('ecf11c02-f841-491d-a4d5-35e8169aba4e', 'e19177ee-778d-4fae-a440-87e14cb6e3b8', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 2.0, 'kg', 40.0, 80.0),
('50b29886-7ef6-4e2f-b0d3-2bf3a71f0375', '858e7be7-1feb-47a9-9873-4c21910fba22', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('caa68e7f-2c9a-4460-b6c7-9fc032f9c680', '6b890e73-8598-4267-9831-0d477fe2d7be', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('eb1ae48b-64d0-46d5-8251-686bd5c7d2e1', '8d9de472-4266-4a4e-8e56-7ce29861f1d0', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 2.0, 'kg', 40.0, 80.0),
('d3d49cb9-16c4-40a0-8af2-61eb6cb25ed8', '70e1a089-4477-46a6-bd68-81606793be62', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 2.0, 'kg', 30.0, 60.0),
('1fa2108d-596b-4a2d-8d73-5771b257c2aa', 'bfff5243-ad65-416f-aa65-ba6d879079de', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('ee4de3d6-cded-4ada-b983-1c9ddc4e4535', 'bd7b368b-bd77-4a3e-b286-274d07bc70c9', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('cbf137fa-0d7a-4c59-81e8-5235de441c43', '7a1cbd3f-8b78-40b6-8e10-26659cdbb9fc', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('1e2690c9-7f44-42dd-8d0d-4bd2d3fee3b8', 'b9b5e862-6abf-4582-a197-407a8c4463d5', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('01031a4a-9e21-444a-bb03-851d60d50ed9', 'aac5660b-cc0b-406b-a614-ac2ea7ed444a', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('5b7d6de8-5c67-4a4b-9a14-437b059164e7', '3ecc705a-50c6-4c39-9f71-e23b4da8e048', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('b9aa09d1-346d-4c93-b552-61cd736feb5a', 'b43a7406-eab0-46f4-8d32-e3a6f7219b99', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('8dbd2c0d-ab2d-440c-8715-534a8fd978c4', '46421182-880e-43e2-a0d9-abdf108b9647', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('4bbeaef4-ccc1-4cd6-92c6-06364babeb95', '16c68f9f-2e9d-4641-ad71-eaa9870c21dd', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('ee9f33d6-ca99-4d53-a01d-336c50dca4cd', '2cedf1ce-ef0d-4837-8b96-7a96bdd2c0d9', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('272925d0-11a1-4a35-a040-d0e27c4d9327', '98b4e178-ee57-40c7-b1ce-69cfeeff7883', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('da024ab8-81bf-4c57-b972-8d581b14412c', '725de290-d95a-4ef0-b3d0-824e6b300e60', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('0cb22441-3a88-40bb-8818-94ed1aa95821', 'd629a150-2583-4676-8762-04d9bd13085e', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 40.0, 120.0),
('74d342c2-fad2-4f08-8fba-449b4e19f239', '4ad85e35-e5e5-49d9-b4d6-3bf95a67ea2f', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('86b11666-4b6e-4f1d-a54a-59d0fd0528d2', '22d604ff-5716-4343-beac-358721239f0c', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('2f5b0cf1-a4e2-4b6e-ad3b-cf1669dd431f', '82045127-e5ab-45cd-b7bb-80250b5dba96', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 40.0, 120.0),
('9f0727e3-bf74-45d2-8b40-c311225a8c2d', '1666bb94-5d3e-4672-b61e-aaff2b748705', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 2.0, 'kg', 30.0, 60.0),
('b04c0329-ff3b-46c1-a565-333da7a32b9d', '47794a16-76aa-43f7-874a-3f22918baaba', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 50.0, 50.0),
('4b011b08-f505-403d-b7e9-4d1863a3b090', '74014dbe-574b-439c-84e9-af0bb86d91b9', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('43369596-9ef1-49c3-b31b-59c1ac377317', 'f7636032-1ce2-4631-894a-fd2d2129cf9e', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('8db2d11b-9fb0-4275-a363-146f2e86b59f', 'a403d8f3-efdc-4e83-9c03-b76d152201a2', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 40.0, 120.0),
('7ae4ab59-7821-42d4-9612-bb6f1ba78837', 'f5f5aec5-7657-4ba9-8a22-99365f080e8e', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 50.0, 50.0),
('96a15335-fc1e-4305-8c2f-48e6001c52c6', 'f5cbe375-5aff-4f7f-a48b-e9ad33779706', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('07fc52e9-0f15-46b8-8f52-898081dff309', 'f3097e16-93c7-44b0-bded-ef7be81f3745', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0);
INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `product_name_snapshot`, `quantity`, `unit`, `unit_price`, `subtotal`) VALUES
('54df5b53-4e72-4a85-b06c-f039e217a5f5', '09f5ce17-a652-42f8-9f36-c7271eadaafe', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 40.0, 120.0),
('b2d1393f-f3e5-44f0-bf5d-765724233266', '7d38582b-0409-4bd9-88d6-9e6322d3cf7b', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 50.0, 50.0),
('61d93f1c-cd76-4c4b-9897-ac95e0764d16', 'd655a880-fc8d-47c8-ab56-b37bacea3491', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('fec24fae-b027-408c-ad7b-e1fd704b9226', 'be549bc8-ba94-4cc7-810d-8d9db8ddd6de', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('2b8b84cd-acf7-4951-a50e-820eeb3eb071', 'fc9acbc4-072d-4419-8789-12eb9d57d72d', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 40.0, 120.0),
('23280fb4-3add-40e2-a184-926f8eb75858', '8abbec2e-a0d7-458a-9fe0-e2a6f0feef30', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 50.0, 50.0),
('645b7738-7f38-4f75-b0ea-4a3496a7ed19', '7b922d02-69e6-42a7-bf1c-79bc9d0b8d94', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('3ad69d1c-d635-4275-8aed-da46fe7c0afb', '6d9484ef-02f7-4121-9322-927fdeb0b55a', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('9229caf4-2e99-4dd1-ace5-577dd7498177', '1ff72f09-e79c-4557-9c5b-be248e6e3ea2', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 40.0, 120.0),
('c8fecd88-a011-4b88-a5d7-12a9ec3792f1', '5b865fdb-f26c-4ebd-b02a-9f612c412223', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 50.0, 50.0),
('c88e5a62-821c-4b0b-a0f8-ca5f924d6438', 'a131c6c2-298d-4ec1-980d-99eb19729cb6', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('ecfae513-dce8-4714-848a-7f7b729011ec', '0007c097-d741-465c-9dc2-b799b4ee3a0a', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('d53f9fff-d889-4f71-8ed6-184c705e51d5', 'dbbb26e8-1c13-423d-9ebf-1df567d8bed6', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('b90e163d-529b-4812-9637-9b914b2258e6', '08d5463d-2b42-4e36-9947-e6716b47c2b2', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 40.0, 120.0),
('a259e873-3253-4d07-bd7f-5397c7b32447', 'ac90fc59-3e7b-406e-8bd3-2f8a29ab3809', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 50.0, 50.0),
('a42a4001-9a54-4f5a-ab7f-9c0985a48c41', 'bbbca712-d412-4807-86d8-f4a8ba4f517e', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('132babe2-0ee2-4baa-8ffe-ba30855f8498', '64c5b466-c35f-471b-82c2-84962e1b4762', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('a7971e70-a745-46f4-b983-883cc7cbe9a7', 'e9ef4053-d934-4bc1-9200-10019621edeb', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 40.0, 120.0),
('2bba433c-141b-4907-854a-8bffde316929', '9bd6663c-664c-4686-b46e-1cb9478ed88d', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 50.0, 50.0),
('b0f20f39-9872-4243-9e0c-c2f3ca3666e8', '9a679fd3-b1bc-4417-bb82-a43d08463748', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('d6645448-d248-4e16-9ab1-6c5fe7b56804', 'eaedd879-4d06-4163-be62-f26737110535', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('7c5d7b50-9bd2-4cb9-bbec-f0fe0594b4cb', '757d937e-65ee-42d9-ab3c-0723098f72ec', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('902b984b-8b1a-49c6-b62c-99f7489c3a03', 'bdb05c88-1cad-421e-a09f-a55ed25ca57c', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 40.0, 120.0),
('02bfa1a8-7ecd-4117-b281-09f6198b9124', 'a1832ea2-1716-409c-8ab9-bb42e4d068b3', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 50.0, 50.0),
('26070a20-0b1b-4523-b764-15af77eda446', '15059227-ed84-4914-ad8e-dafc3226127b', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('04c6aafb-3196-4206-931f-fea168f7023e', 'eee0c68d-329f-4000-9455-1e518b09da5e', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('245768eb-33c7-4c45-ab0c-edcadca2833f', '9bf79b6b-cd7d-4e0a-ab00-e2dc5249a9c0', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('5dae9812-0e40-4e0f-8df5-2b744b5b3f92', '794ac649-7b83-42f6-99f1-5633292f1616', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 40.0, 120.0),
('89b4ab10-c7ce-4f0b-95ae-18e32541380a', '944093e0-9757-4f3a-ae96-5b9a8641c7d6', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 50.0, 50.0),
('f41ea6c6-f52c-405e-beff-04f4ecd23ce3', '9881ef5f-1e45-4d1f-9596-aa5583e3d2e9', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('64cfc09a-41d2-463f-b77a-28d5758fd9a6', '71087031-c384-4aa6-b049-81ffb8c0ae5a', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 0.0),
('06dacf35-26c3-42d8-a8e5-905976e48e75', '7ddab5cc-b28f-4ef1-9096-41b9f60bcac6', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('feacdb49-063a-4dda-b481-58e8d5ee036c', '4c0157c4-0e33-4065-bc5a-127ce84f2057', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('d27509b3-7719-46d2-8944-385592a74d1f', '1523333c-34c1-4416-98c1-ba147c6339f8', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('49fdb020-c85f-45e7-bbe5-3f30ea798b08', 'a294ef02-1520-41cf-8916-1456cbe9df1c', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 40.0, 120.0),
('8e91603d-0645-483d-9cca-e70116733225', '95b37590-be75-4385-b6e9-a734312dfc34', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 50.0, 50.0),
('9895dfbc-adfd-4c60-8bea-3a580d346274', '9efb586f-6d8e-42fc-aa04-2e8cf188b910', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('cb563b83-6036-4a46-bb2f-d318923d390b', '3b0d85b3-b699-47cb-a49f-eab8a4ad5acb', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 3.0, 'kg', 30.0, 0.0),
('05b17afd-8c1a-4459-974b-e875d1b8b6db', 'a1f0ed83-c246-400a-acc1-4ae573de4cbc', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 0.0),
('9a8af769-8d02-4ddb-8b5b-20bf02223dd0', '884983aa-14d7-4260-a5c2-764bd489ff0a', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'onion', 5.0, 'kg', 40.0, 0.0),
('ae19f064-803b-4c16-b48f-3fa35ef70e5e', '77bbd436-800b-4c08-8bca-cb0951abe4dd', '916cf9b7-b54a-4f6b-8bb8-e475196097cf', 'potato', 4.0, 'kg', 35.0, 0.0),
('24c37b4c-41c3-499d-ad14-13af1a056fda', 'e9fb2ca6-26c1-4593-8b4f-ea21bd1d6eb8', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('e5443df5-1633-456f-be78-73cb5d18e70b', 'ebc5992b-5572-4004-81e2-66ff7d6d998a', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('7be8e680-5baa-43d5-a516-8bdf13a978bf', '714f1965-fc8b-4374-8048-39547324e0a7', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 40.0, 120.0),
('0657fce4-aa8d-4cda-8403-47ef99ce7a5e', '344d67a6-83be-46c7-8c1c-7a85a2bbdd9a', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 50.0, 50.0),
('4b41df3e-b128-4921-bbd7-5a896336b346', '11bee3e4-625f-41d5-a8c6-77caca03a14e', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('9f5a247b-c5f9-4d39-87dd-5efeea68239e', 'd8ffbc7d-1fd5-4a30-96de-e75b8e464374', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('bb47bd4d-0de6-48e5-8975-be7fd709b53b', 'c58db05d-6221-4fe8-b0dd-d0aae972fed2', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'onion', 3.0, 'kg', 40.0, 120.0),
('e0ddb739-ce7a-42d7-9e9a-631b78b46c8f', '4b31f84c-b428-4d6b-a7fe-0d36006135ed', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'onion', 3.0, 'kg', 40.0, 120.0),
('8b9969e5-0075-4b61-90a8-472c96268cba', 'c528a90e-17bd-4616-9eb2-0e4503c8fa01', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0);
INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `product_name_snapshot`, `quantity`, `unit`, `unit_price`, `subtotal`) VALUES
('7059a2d5-4b16-4762-a4c1-574d6f16c653', '681b4a77-33f7-4ad5-b6b1-08e176e52290', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('d040703a-cbe8-4c7f-a615-7d1dc8af9243', '1c20fb38-1b82-47ed-95ec-06e6a5edfccd', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 40.0, 120.0),
('086318fa-6a89-4b02-9270-a08f29924436', 'af4895e2-c13a-4f59-84d7-ca12a5737178', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 50.0, 50.0),
('650cd84f-0975-4cca-b306-7966aecea33a', 'b15f7744-5ee1-4dfc-b31c-6255a8d7c4b1', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('4352f8c0-ce3f-47e4-b814-6d3e0c2b7dea', '09333e72-33cf-49fd-83ad-baa944504f24', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('b1482af7-754e-4c89-a6f9-29be3e7807e1', 'e536e6af-615c-4413-85d2-bb73e7bb4ac1', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 50.0, 100.0),
('837f791d-b18f-47eb-9f30-439f37084b6e', '35dcc06a-ca8c-409b-8a9c-88721719fbe1', '916cf9b7-b54a-4f6b-8bb8-e475196097cf', 'potato', 1.0, 'kg', 35.0, 35.0),
('22c2e7f2-6d8b-4f49-8195-d51f04247e42', '051c03e7-b26f-4dab-a102-b1d4ef38109e', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('5ca8644b-4352-43bc-88a8-a09dd4a39955', '04eb8912-95ad-4ce8-a05d-4bf183d7fdfd', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('e0104f82-5eb2-4542-b068-97252a11d7c1', 'ab031d61-d982-478b-bb7c-531d4df510d2', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 40.0, 120.0),
('768edba7-6e75-4064-9f0e-5c5268e042f4', 'a5bc56f7-e77f-4b28-a33c-71af91c1a01c', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 50.0, 50.0),
('504d8505-2f7e-4d8c-bdd5-199e522e31b2', 'bb283442-43a0-455e-8cfa-6c368657fe3e', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('7371c5b2-ec6d-4678-a0da-c4988e629474', '292d72c4-ac30-4c8c-b794-246839639346', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('0126de8a-828b-44df-929e-594f4c03cc92', '2feb82b0-1b56-453a-83fa-0e2357757a10', '916cf9b7-b54a-4f6b-8bb8-e475196097cf', 'potato', 2.0, 'kg', 35.0, 70.0),
('880db83c-8f1f-427b-a71e-f58de8c49766', '9c431b30-2ac3-4848-a7c5-6bc2f9e36e37', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'onion', 3.0, 'kg', 40.0, 120.0),
('a4fa77b7-648f-4f3e-80cc-a165a0ee6229', 'cc72087f-847d-4b4e-9a4d-f4540eabe8e8', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('9be98ab2-ee36-48b4-a137-ad382e2c8e45', 'f0826c5c-26f3-4757-a722-dcd83c7a3f14', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('5932f8ba-9407-4442-bf2c-9a8e28d71808', '849e6866-24cf-4dc1-9a33-f4ce3921ddf5', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 40.0, 120.0),
('5c0af975-40fd-44bb-8de9-05d355ccdc64', '98ea76e1-1d33-4e2f-bc57-e32beee6aa00', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 50.0, 50.0),
('2dd842ac-a9bb-40d9-8399-9a839728e618', 'c3ca46f1-846e-406b-af4b-c1d1be872a0e', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('9e4d2c12-cdc6-46d0-a79e-e22bd7f29972', '8208bd16-42f8-47d3-ba67-3b51ce85dcfa', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('a26575c8-7448-4bf8-bbcc-362be3446ac9', '82066e6b-e8c6-487e-9e9b-43b5619f2f85', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'carrot', 1.0, 'kg', 50.0, 50.0),
('beb43d04-a4d5-457c-8ffe-848b42a9f3e9', '0aac0e66-f927-4e2d-9389-2352cf62b8c8', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('b239e2d6-1709-4e4d-ab77-3fdf77574a3e', '527ec776-e199-499b-bdb5-e3fa171f4e65', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('b8dd4094-d703-46e2-a340-16f1587e5b2f', '4f1e824d-bd66-4eae-857a-74bef5cdfe05', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 40.0, 120.0),
('1d418847-3fe3-4b9b-80ee-e5675359a3f4', 'dd78376d-620a-4aa9-aad8-f96517a85f01', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 50.0, 50.0),
('17473a44-bf8a-4b28-9a7b-ee29a91c9668', 'a7adaaeb-e4d0-4094-95d6-0e8fdfb5e512', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 1.0, 'kg', 30.0, 30.0),
('cc015568-2256-4203-908f-8fd275f75609', '46acebd6-680e-49f7-8439-122abb983ed0', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 1.0, 'kg', 30.0, 30.0),
('f70fec47-be27-4818-968d-07f0397bff8a', '193189c1-abcd-4146-b112-9c69b44e5777', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('d8c6268e-c82a-44e7-8a09-3e8a5288d823', 'f52eb4cd-3cf5-4e4d-93b3-8540c49c3504', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('e589c2ee-17e7-453a-8ae4-a69af5ed7433', '3930a06c-2caa-4372-b0be-b947ac72981d', '916cf9b7-b54a-4f6b-8bb8-e475196097cf', 'potato', 1.0, 'kg', 35.0, 35.0),
('91e67067-ef66-41b2-ad46-4fc5ff3ee9cc', '47d3530b-913c-48bd-8eb6-6ef89a562d18', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 1.0, 'kg', 30.0, 30.0),
('cb9e02cd-bbea-4000-9d32-667c6927c439', 'a6b0d826-3ca7-46f4-b74c-3a3159407932', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 1.0, 'kg', 40.0, 40.0),
('6e653b38-b11c-4ac0-9f8b-cb8712344dab', '89514c05-a837-4b30-b99f-c42d59cadae4', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 40.0, 120.0),
('7501ec39-2075-4a34-b647-5e00fcbda9ae', '631888f0-e538-4f48-9a5f-b98092f96f5c', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 50.0, 50.0),
('8d7c9ee3-1305-44bd-a9be-a244df3ebec7', '22c71116-bbcd-4e53-b58b-ccbd64019a3b', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 1.0, 'kg', 30.0, 30.0),
('c00f4175-b280-4cc0-9b4d-460dd499c344', '0c9ae1d7-1975-430c-8fe1-3db2a590921f', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 1.0, 'kg', 30.0, 30.0),
('81b5cdfb-8d49-4374-8b46-b1c82b718748', '9a51d3e8-d594-43c5-ab70-99ee03ff3cc4', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('ac69f6eb-d101-49d1-92a4-6965151d9329', '1aa1da2a-4cc5-4fad-abc4-7da4fe2443f2', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('c4908f9c-efa2-4f22-bbbd-312c754ea9f9', '5eff56a6-5b44-4afb-a3dc-3d3b5b64c263', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 50.0, 50.0),
('00e3abe3-d8c0-41df-ad62-31bda4e4d975', '6d7064d8-7d8c-4577-86cc-6349976b8ec5', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 1.0, 'kg', 30.0, 30.0),
('4691d4c8-8417-45d5-b92a-e4a5b7ed141a', '45b0bb87-0ca0-452a-bf64-d2c0cd06cc74', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 1.0, 'kg', 30.0, 30.0),
('1b313f6b-966f-4152-9d6f-f765c3239d38', 'b8e1ade7-a543-4661-9412-0fc9afc8e725', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('611ef754-e2c0-4186-ab2f-a44b2bba9284', '55d20d4e-6427-46a5-8002-7879a08dbe33', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('9532e2a5-5d12-436b-950a-70e3e7965c55', '8c5a0b59-d580-4aea-bd02-2ae0d743178c', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 50.0, 50.0),
('1fddc254-9b45-4597-b917-11721296af7b', 'd837b09d-0d44-4f35-bacb-9a227a320d2a', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 1.0, 'kg', 30.0, 30.0),
('db1ba3ac-462b-403c-a6f1-70ef34cf80da', 'fb7f1347-2b24-4234-b7c9-b5f00fb52c57', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 1.0, 'kg', 30.0, 30.0),
('2bce573e-0ad3-4916-8bc6-f5f8578a545a', 'bc0f8c05-365e-4e7c-8f66-177fc3f20d38', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 50.0, 50.0),
('96f7d7ae-e35c-4acd-b9ad-1177164c65fd', '10c3671d-9189-467f-8523-814855f8063d', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 1.0, 'kg', 30.0, 30.0),
('c1451f00-24be-4bfa-a754-cadadff4f342', 'b4c0a567-983e-4e10-8b62-631926c76b5d', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 1.0, 'kg', 30.0, 30.0);
INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `product_name_snapshot`, `quantity`, `unit`, `unit_price`, `subtotal`) VALUES
('a7fe550f-62fb-47d5-b6d6-ce008cfc5459', 'dd298b53-d117-4b38-931e-667860ae68d5', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 1.0, 'kg', 30.0, 30.0),
('52f50cfb-50bb-43d9-b789-359b35019947', 'f30e84dd-0e6c-4c1a-b2ff-d4a51773db9f', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 1.0, 'kg', 30.0, 30.0),
('315e3a29-46f2-46f0-8543-64651cf1edfd', '794dabf3-4bb4-46c2-8b28-453e4cb1923a', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 50.0, 50.0),
('cd4b10a2-2c70-4ef9-b73d-ad03c4fdc520', '63903884-abd3-48fd-9570-72f1d52c5485', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 1.0, 'kg', 30.0, 30.0),
('3472d786-6775-40c5-bb22-8f93a735d775', 'a6173930-9d73-4919-8aa1-a926e98fa68b', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 1.0, 'kg', 30.0, 30.0),
('b1e2a1c8-f3ea-423d-83de-86b628e9606f', '3a469e15-9e7b-4145-b071-8acae2eb9d5c', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('aee303ff-b416-4b70-bcf7-537cfc164ce5', 'e67d9219-861e-45ab-b9b1-22ab4dd580f7', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'tomato', 2.0, 'kg', 30.0, 60.0),
('9f972f3f-1957-4961-96d3-b44b93cffa2e', '21f05a3b-bc04-4d30-8fde-276863ea1ab4', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'carrot', 1.0, 'kg', 50.0, 50.0),
('5956f456-493b-42ab-81aa-ffcbfdfbc7cd', 'ad0258cf-09ca-46e7-bb49-6442bd3dbc30', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 50.0, 50.0);

-- ----------------------------
-- Records of sale_items (83 rows)
-- ----------------------------
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `product_name_snapshot`, `quantity`, `unit`, `unit_cost_price`, `unit_selling_price`, `subtotal`, `profit`) VALUES
('69155265-8c6a-4393-91f1-9d00d12a5500', 'b32f3784-aebb-4ae8-aea7-7c533cbd0bad', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 3.5, 'kg', 18.0, 30.0, 105.0, 42.0),
('fc907f74-8014-43b8-9404-9bf45f9a1610', 'b32f3784-aebb-4ae8-aea7-7c533cbd0bad', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 25.0, 40.0, 120.0, 45.0),
('8881e6ce-6d79-4005-8275-d6e4e8a1a80a', '36aa3ff0-fe4c-41aa-bc27-bc1a3d710c00', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 4.5, 'kg', 18.0, 30.0, 135.0, 54.0),
('f1afef3b-c3a3-4593-b975-ba03fc32fe86', '36aa3ff0-fe4c-41aa-bc27-bc1a3d710c00', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 4.0, 'kg', 25.0, 40.0, 160.0, 60.0),
('295d97c3-b35b-4bad-aa5b-fc2fc31e655d', '36b1a91b-1ecc-4478-87c0-cf6c1f4fa3f5', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 5.5, 'kg', 18.0, 30.0, 165.0, 66.0),
('3ad1c3ac-681c-40c0-bdfe-156c933c56b4', '36b1a91b-1ecc-4478-87c0-cf6c1f4fa3f5', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 5.0, 'kg', 25.0, 40.0, 200.0, 75.0),
('2b44aefd-4b59-441f-848f-27a12170404d', '98789c44-3803-4e24-8ad2-fa1c13104005', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 3.5, 'kg', 18.0, 30.0, 105.0, 42.0),
('01a31394-9ac1-4302-b7f5-7157e46aeb7e', '98789c44-3803-4e24-8ad2-fa1c13104005', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 25.0, 40.0, 120.0, 45.0),
('f25de64d-8ff1-49e1-87bf-d594cd0236d1', '83b1a660-0c2d-4565-bdbc-8bc8bb0e56ec', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 4.5, 'kg', 18.0, 30.0, 135.0, 54.0),
('8c90e147-0415-4088-8b65-810f5adf5540', '83b1a660-0c2d-4565-bdbc-8bc8bb0e56ec', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 4.0, 'kg', 25.0, 40.0, 160.0, 60.0),
('a61fefc6-e8b8-45e3-8ab3-2a6bc9694589', 'a4a6fe3e-55c9-40a6-b333-6af845dcb85d', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 5.5, 'kg', 18.0, 30.0, 165.0, 66.0),
('49ffcc66-bdaa-4ab6-99e5-1a1c64df6f8c', 'a4a6fe3e-55c9-40a6-b333-6af845dcb85d', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 5.0, 'kg', 25.0, 40.0, 200.0, 75.0),
('8551de6a-eda5-4755-9c34-644a0de43d6c', '0a87a9ec-a704-492d-ab6f-e68e1e680ab0', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 3.5, 'kg', 18.0, 30.0, 105.0, 42.0),
('fa9b1341-f79e-4082-a0ed-1d54958edc1c', '0a87a9ec-a704-492d-ab6f-e68e1e680ab0', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 25.0, 40.0, 120.0, 45.0),
('1bcb53eb-80a4-4c9e-9f71-503dfbd6f9af', 'c5ba0f39-70da-4b84-beee-14fe352d9b97', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 4.5, 'kg', 18.0, 30.0, 135.0, 54.0),
('d1da22cd-61af-4c42-bca7-88a3e814263f', 'c5ba0f39-70da-4b84-beee-14fe352d9b97', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 4.0, 'kg', 25.0, 40.0, 160.0, 60.0),
('e1824e23-7eec-4261-9de6-b38d9fdd27b9', '3f2bfe68-0d33-472a-b72a-1f77f6534af9', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 5.5, 'kg', 18.0, 30.0, 165.0, 66.0),
('c49883f0-6978-4576-8988-3053cde8ea26', '3f2bfe68-0d33-472a-b72a-1f77f6534af9', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 5.0, 'kg', 25.0, 40.0, 200.0, 75.0),
('14f4aa42-e59e-4272-bbce-8085f08282bd', 'bb169ea8-72af-4173-939f-482d52325240', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 3.5, 'kg', 18.0, 30.0, 105.0, 42.0),
('859e8cf1-4f8a-4356-b46e-064f070fefcb', 'bb169ea8-72af-4173-939f-482d52325240', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 25.0, 40.0, 120.0, 45.0),
('5202bf38-277c-44d1-958d-5e19080b5bec', 'ba8cdc02-703a-4379-a31f-3ca7621a6e8e', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 4.5, 'kg', 18.0, 30.0, 135.0, 54.0),
('a0d84429-af23-4d53-8ec7-a7c469ed056c', 'ba8cdc02-703a-4379-a31f-3ca7621a6e8e', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 4.0, 'kg', 25.0, 40.0, 160.0, 60.0),
('87fd1485-d524-4499-a5c0-4a505126280c', 'cfb19e06-439f-4e5b-8fd2-c9e679c1de14', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 5.5, 'kg', 18.0, 30.0, 165.0, 66.0),
('f6c1f5ff-e25d-4045-adca-c899767b83d8', 'cfb19e06-439f-4e5b-8fd2-c9e679c1de14', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 5.0, 'kg', 25.0, 40.0, 200.0, 75.0),
('f6449f44-0fbe-4ef5-8f58-4bf772c789d5', '8cd1ab2e-c3b4-4afb-8ab7-f6e1c5da99c0', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 3.5, 'kg', 18.0, 30.0, 105.0, 42.0),
('3e16226b-febe-43b5-a297-d30aa2f4f82a', '8cd1ab2e-c3b4-4afb-8ab7-f6e1c5da99c0', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 3.0, 'kg', 25.0, 40.0, 120.0, 45.0),
('0ed10222-5640-4ea8-b918-0992db8042aa', '9e191728-baf1-44e5-a0ef-7840975eced8', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 4.5, 'kg', 18.0, 30.0, 135.0, 54.0),
('9e6d04a6-1fe0-4a49-99b6-7cd225d15b91', '9e191728-baf1-44e5-a0ef-7840975eced8', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 4.0, 'kg', 25.0, 40.0, 160.0, 60.0),
('95a041e4-6c0f-4662-93c5-b377257d8528', 'f236cc6e-6fc3-448e-96bb-e16f6b153e0e', 'd8b22e41-eb54-4fcf-9d7f-a742ca515579', 'Tomato (Local Farm)', 5.5, 'kg', 18.0, 30.0, 165.0, 66.0),
('b8e4e88d-81e5-4f5c-a9c2-269571ee66f8', 'f236cc6e-6fc3-448e-96bb-e16f6b153e0e', 'd3419f97-f1d7-4876-8f98-bafbcb24499c', 'Red Onion', 5.0, 'kg', 25.0, 40.0, 200.0, 75.0),
('a5586581-f9f2-4994-9fb5-85b392efa118', 'b45e6b7b-414f-4564-9f1c-0c0f021ff444', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('d267499a-aee1-4e78-9a4a-2ae245250edf', 'd434417f-4e97-48cb-9165-6ac9ef5459a0', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('518f674a-8118-4bf3-8ee9-ca1a98949d71', '5abdcc25-6050-411a-832f-5490d2c8999c', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('e7d45ea5-9453-475b-a140-539fa721d51b', 'ea061105-6947-4338-92fb-6e79aca2cc0d', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('9bbabe6b-f996-47b4-8968-c9296731e01b', '159a03b0-4495-47f6-bab3-2925eab14e4f', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('36721a43-8e20-4f45-b747-47d3a7d1504f', '073c502e-3efd-4ab6-b034-288b68c2b700', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('da74a983-c089-48f8-ae02-59c927542049', 'e216d8fd-ba93-4fcd-8c99-76d85d7fd5dd', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('612514bd-e762-40bd-987b-0c74c839c668', '0792daa3-2b47-4c07-8d20-991b7443bbbc', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('38940c17-e840-47cd-bdf6-05ab8048334b', '98326e5f-7963-40cf-a86d-59a6cfe30143', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('9fcc5403-f0ce-49c4-8356-5902514b527a', 'fd27fe70-d0e4-4cad-b337-24fe1fa62910', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('c4e5eb46-5461-4a97-a679-5e6d99079f24', '3210f2a9-0d90-48ca-966e-66cef04fc3d7', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('d90a1d83-70f0-425d-aa8b-a9c01c89321f', '4f1f82c3-5a51-42d1-9063-00bbe1ed1429', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('7baf959b-2fbc-493b-b975-666ee54f9fe0', '94971496-d9d3-412d-8ebc-5ab7532aa598', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('fb236980-ef72-4a85-9fc1-dc70da33430e', 'aa1445af-eec1-4328-8e2d-635715ca22b6', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('52f1b7b3-83f6-431e-b86e-dca0a3d1afe4', '6141664c-564d-4c57-838b-881ddeeb3e7d', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('eeebf2e3-ddec-418b-b489-0226e44eebf5', '4d224b69-0ad7-40d3-a0e1-baff7d41616b', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('ba415fd4-eb46-4ef3-9b6f-c22865de12b2', 'bfaaa66c-0440-40c6-a0c9-43929010ab23', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 30.0, 60.0, 0.0),
('d8a660e7-3238-4125-bd28-71920e581a35', '34b22fc9-d3f2-4ddf-acb2-110d7b9f7c0b', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('d4a19375-aafd-43c2-8ecc-885a186f0910', '093b4995-47b9-4b01-ae12-ab7584f790b8', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 3.0, 'kg', 30.0, 30.0, 90.0, 0.0),
('4771689a-a652-4916-8ab6-4bfe6814baf7', '7ce4a5c0-45ce-449e-a764-c4e4f28f13b5', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0);
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `product_name_snapshot`, `quantity`, `unit`, `unit_cost_price`, `unit_selling_price`, `subtotal`, `profit`) VALUES
('881563fe-e17e-499c-9833-0332ceb77452', 'c3b0f24d-f366-40d9-a477-ddda465a2cd3', NULL, 'Item', 1.0, 'kg', 0.0, 0.0, 0.0, 0.0),
('07913042-b74e-4bd4-8ad8-0a9d6398cfbf', '40fb9135-f95b-42ad-af84-e93f5087866d', NULL, 'Item', 1.0, 'kg', 0.0, 0.0, 0.0, 0.0),
('8a9c6d22-901a-47d2-81f0-f958ab880fd9', '0fa01f76-c104-415b-bffc-972032aef480', NULL, 'Item', 4.0, 'kg', 0.0, 30.0, 120.0, 120.0),
('106ccf66-ea93-417d-b4ea-90956adb407b', '06dda9b7-bd8e-4a67-a01a-53907a86a48a', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('4e1bb630-23ee-4dda-bcaa-5ed049c28d27', '772049c9-f7b5-4492-b5af-c8926d4548bc', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('c6ec2d7b-6060-46c6-9e67-9e3dbece4f1c', 'b0e62c66-287a-4c19-a057-94c4aff765e1', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('159ea10e-b921-49e1-9edf-76cdff234d2d', 'c9532cc5-4a30-49f7-90fe-cb6a0afa0157', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('233b1949-e650-4822-9b38-cf956e9de684', 'c0cea384-5d00-41d6-a177-1210bf8fa593', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('b82a99c5-f067-4925-96a2-b228a8ec4bf1', 'a0dfbc06-677f-4a8c-a9d6-bf9413e45fcf', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('b078727a-2d2d-4dc8-8ab6-2e9abcb22eb1', '52070714-e187-4a3a-8f04-e82659f081e9', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('0dedf96b-5ee4-4eee-ab4e-f6527d6292fb', '7b201c05-7582-4d1f-8732-d0c1e4e83179', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('2126ba64-cc3d-406c-aadf-11d867ae7bc9', 'd1ce4717-7933-406b-bfa3-58743173cd17', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('ba069b05-b8b6-4b99-8e9c-ca02a1777e66', 'debf948e-4924-4a92-9e49-f5d2da4b7c6f', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('1ab3f55c-34e9-47b8-a521-1363d579a7b9', '72d1e5ad-85c4-4ef3-878d-5dfef0ae8d3a', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('32734ca3-210d-4cc3-85cf-4c8dfdff0c68', '40be596d-ca84-4954-966f-5c9a79468528', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('f352b0f7-a750-4e3f-9fac-4edd0affa00a', '1b1bcc69-97c4-403d-9f9d-dc3092b77913', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('24413600-a087-448e-b90b-304bc1bb8318', '893de7c5-8528-4c40-a799-ea6ba5cc5ec8', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('01a89eb4-3b2c-4118-90a1-d7b60c577071', 'bbc163e4-1bbb-400f-b4ed-479d7163dc01', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('26ffbab7-6f0e-4ead-b683-653492afe079', 'c9991d22-3585-4e28-8415-9209f429295a', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('e105428c-a807-416b-a255-b798a4d6f950', '29d12c28-2687-4ff5-b1fa-7faa1d7865c1', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('b1e2e72f-294d-4260-9877-5c4e1f98f17d', '23755b5e-7503-458e-a0e5-6009579accce', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('e0130a7e-075f-4fe8-a47f-7025040d9077', '3fd8cd89-3698-4d32-9ebe-237f991052cd', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('7c9b54f1-05cc-4fbf-b6e9-c799be8f6e8d', '49881910-b93d-4193-ad69-75310aeb4215', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 1.0, 'kg', 30.0, 50.0, 50.0, 20.0),
('67bf06ea-415f-467f-a90d-33c44c5a4ecc', 'd1e6efa4-30c9-4cd2-b1b6-18eeb9bcebee', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('13c822a9-7dc7-4b87-8bb3-f0f01b647721', '81060e0b-33d7-48a3-8e84-740feebf2cae', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('56b703c6-7113-48c9-b6cc-03fe9e383699', '9a6d187a-8a72-4423-9342-3771d8e6defc', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('943f5d44-1445-453e-834a-189c9b8938b3', '23514b6e-8429-4e83-b4f2-b14bc969b18a', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('c3d697db-6342-4420-8207-7e128a5dfd27', '1dd79c90-d52c-4a2c-80fd-59bec0b63894', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('5236ec1a-8aad-4220-8f57-55481a393e2c', '802ba227-4616-4d5c-b6ee-4e06b62cd967', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('aa8acc06-eb64-4080-a1b6-2d323acb4b73', 'bb270fe5-5540-4ee1-a819-5462c0b7e3fc', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('dfeec506-9ed8-452f-bfa9-49c4a514fe3b', '15489585-2c6e-463e-961c-bcc84c39eda9', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('b9023ba6-a5ea-41dc-97d9-30162e095fa6', '60d2f8c0-9534-432c-ba85-202f8de47745', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0),
('48af70bd-226f-438c-8d41-b81e14aa6042', '9ff54311-c0c7-461f-95d7-0b19bddab981', '331dc094-09c7-4b31-ae15-5bcda867fc35', 'Carrot', 2.0, 'kg', 30.0, 50.0, 100.0, 40.0);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Demo logins (password 1234 for all)
--   Vendor   : 9876543210   (Ramesh Fresh Vegetables)
--   Vendor   : 9876543211   (Manjunath Seasonal Fruits)
--   Vendor   : 9876543212   (Lakshmi Spice & Staples)
--   Customer : 9876543220   (Priya Sharma)
--
-- Point the backend at this MySQL server via backend/.env:
--   DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/vendorsathi?charset=utf8mb4
-- ============================================================

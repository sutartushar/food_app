CREATE DATABASE IF NOT EXISTS food_orders;
USE food_orders;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_name VARCHAR(120) NOT NULL,
  items_json JSON NOT NULL,
  status ENUM('Preparing', 'Ready', 'Completed') NOT NULL DEFAULT 'Preparing',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_status_created_at (status, created_at)
);


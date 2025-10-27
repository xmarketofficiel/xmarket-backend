-- Complete reset and fix for featured_products table
-- This script will drop and recreate everything properly

BEGIN;

-- Step 1: Drop the existing table completely
DROP TABLE IF EXISTS featured_products CASCADE;

-- Step 2: Create the table with the correct simplified schema
CREATE TABLE featured_products (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  category VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_featured_products_item_id ON featured_products(item_id);
CREATE INDEX idx_featured_products_created_at ON featured_products(created_at);

-- Step 4: Insert sample data with proper image URLs
INSERT INTO featured_products (item_id, title, price, image_url, category, created_at, updated_at) VALUES
(999001, 'iPhone 13 Pro - Like New', 899.99, 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=800', 'Electronics', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(999002, 'MacBook Pro 2021 - 16 inch', 1999.99, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800', 'Electronics', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(999003, 'Engineering Textbook Bundle', 149.99, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800', 'Books', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(999004, 'Gaming Chair - Ergonomic', 299.99, 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800', 'Furniture', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(999005, 'Mountain Bike - Excellent Condition', 450.00, 'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=800', 'Sports', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(999006, 'Mini Fridge for Dorm', 89.99, 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800', 'Appliances', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

COMMIT;

-- Verify the data was inserted correctly
SELECT id, item_id, title, price, image_url, category FROM featured_products ORDER BY created_at;

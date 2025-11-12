-- Complete Railway PostgreSQL Setup Script
-- Run this script directly in your Railway PostgreSQL database
-- This script is idempotent - safe to run multiple times

-- ==================================================
-- STEP 1: Create featured_products table if not exists
-- ==================================================

CREATE TABLE IF NOT EXISTS featured_products (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================
-- STEP 2: Drop old columns if they exist
-- ==================================================

-- Drop display_order column if exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'featured_products' 
        AND column_name = 'display_order'
    ) THEN
        ALTER TABLE featured_products DROP COLUMN display_order;
    END IF;
END $$;

-- Drop is_active column if exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'featured_products' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE featured_products DROP COLUMN is_active;
    END IF;
END $$;

-- Drop description column if exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'featured_products' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE featured_products DROP COLUMN description;
    END IF;
END $$;

-- ==================================================
-- STEP 3: Ensure all required columns exist
-- ==================================================

-- Add columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'featured_products' 
        AND column_name = 'item_id'
    ) THEN
        ALTER TABLE featured_products ADD COLUMN item_id INTEGER NOT NULL;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'featured_products' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE featured_products ADD COLUMN title VARCHAR(255) NOT NULL;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'featured_products' 
        AND column_name = 'price'
    ) THEN
        ALTER TABLE featured_products ADD COLUMN price DECIMAL(10, 2) NOT NULL;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'featured_products' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE featured_products ADD COLUMN image_url TEXT NOT NULL;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'featured_products' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE featured_products ADD COLUMN category VARCHAR(100);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'featured_products' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE featured_products ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'featured_products' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE featured_products ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- ==================================================
-- STEP 4: Clear existing data and insert seed data
-- ==================================================

-- Clear existing featured products
TRUNCATE TABLE featured_products RESTART IDENTITY CASCADE;

-- Insert 6 sample featured products
INSERT INTO featured_products (item_id, title, price, image_url, category, created_at, updated_at) VALUES
(1, 'Wireless Headphones', 89.99, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop', 'Electronics', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'Smart Watch', 199.99, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop', 'Electronics', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'Designer Backpack', 79.99, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', 'Fashion', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'Running Shoes', 129.99, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', 'Sports', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 'Coffee Maker', 149.99, 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=400&h=400&fit=crop', 'Home', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'Yoga Mat', 34.99, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop', 'Sports', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ==================================================
-- STEP 5: Create indexes for better performance
-- ==================================================

-- Create index on item_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'featured_products'
        AND indexname = 'idx_featured_products_item_id'
    ) THEN
        CREATE INDEX idx_featured_products_item_id ON featured_products(item_id);
    END IF;
END $$;

-- Create index on category if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'featured_products'
        AND indexname = 'idx_featured_products_category'
    ) THEN
        CREATE INDEX idx_featured_products_category ON featured_products(category);
    END IF;
END $$;

-- ==================================================
-- VERIFICATION: Display current table structure and data
-- ==================================================

-- Show table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'featured_products'
ORDER BY ordinal_position;

-- Show all featured products
SELECT * FROM featured_products ORDER BY id;

-- Show row count
SELECT COUNT(*) as total_featured_products FROM featured_products;

-- ==================================================
-- SUCCESS MESSAGE
-- ==================================================

DO $$ 
BEGIN
    RAISE NOTICE '✅ Featured products table setup complete!';
    RAISE NOTICE '✅ 6 sample products inserted';
    RAISE NOTICE '✅ Indexes created for performance';
    RAISE NOTICE '✅ Schema matches backend entity';
END $$;

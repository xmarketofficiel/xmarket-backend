-- Update item price and quantity constraints
-- This migration adds proper constraints to prevent too large prices and ensures quantity management

-- Update price column constraints to limit to 8 digits with 2 decimal places (max 99999.99)
ALTER TABLE items 
ALTER COLUMN price TYPE DECIMAL(8,2);

-- Update max_price column constraints if it exists
ALTER TABLE items 
ALTER COLUMN max_price TYPE DECIMAL(8,2);

-- Ensure quantity column has proper constraints and default value
UPDATE items SET quantity = 1 WHERE quantity IS NULL OR quantity < 1;

-- Add check constraint to ensure quantity is always positive
ALTER TABLE items 
ADD CONSTRAINT chk_quantity_positive CHECK (quantity > 0);

-- Add check constraint to ensure price is reasonable (between 0.01 and 99999.99)
ALTER TABLE items 
ADD CONSTRAINT chk_price_range CHECK (price >= 0.01 AND price <= 99999.99);

-- Add check constraint for max_price if it's not null
ALTER TABLE items 
ADD CONSTRAINT chk_max_price_range CHECK (max_price IS NULL OR (max_price >= 0.01 AND max_price <= 99999.99));

-- Add index on quantity for better performance when filtering available items
CREATE INDEX IF NOT EXISTS idx_items_quantity ON items(quantity);

-- Add composite index for active, sold status, and quantity for marketplace queries
CREATE INDEX IF NOT EXISTS idx_items_availability ON items(is_active, is_sold, quantity) WHERE is_active = true AND is_sold = false AND quantity > 0;

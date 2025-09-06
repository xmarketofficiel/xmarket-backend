-- Add privacy settings columns to users table
ALTER TABLE users 
ADD COLUMN show_sold_items BOOLEAN DEFAULT TRUE,
ADD COLUMN show_purchases BOOLEAN DEFAULT TRUE,
ADD COLUMN show_phone BOOLEAN DEFAULT FALSE;

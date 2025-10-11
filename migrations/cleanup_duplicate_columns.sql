-- Cleanup Migration: Remove duplicate firstName/lastName columns
-- This migration removes the old camelCase columns and keeps the snake_case ones

-- First, copy any data from the old columns to the new ones (if any exists)
UPDATE users 
SET 
    first_name = COALESCE(first_name, "firstName"),
    last_name = COALESCE(last_name, "lastName")
WHERE "firstName" IS NOT NULL OR "lastName" IS NOT NULL;

UPDATE join_requests 
SET 
    first_name = COALESCE(first_name, "firstName"),
    last_name = COALESCE(last_name, "lastName")
WHERE "firstName" IS NOT NULL OR "lastName" IS NOT NULL;

-- Now drop the old camelCase columns from users table
ALTER TABLE users 
DROP COLUMN IF EXISTS "firstName",
DROP COLUMN IF EXISTS "lastName";

-- Drop the old camelCase columns from join_requests table
ALTER TABLE join_requests 
DROP COLUMN IF EXISTS "firstName",
DROP COLUMN IF EXISTS "lastName";

-- Verify the cleanup by listing remaining columns
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name LIKE '%name%';
-- Migration: Add new user profile fields
-- This migration adds firstName, lastName, department, role, and address fields to both users and join_requests tables

-- Add new fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name varchar(100),
ADD COLUMN IF NOT EXISTS last_name varchar(100),
ADD COLUMN IF NOT EXISTS department varchar(200),
ADD COLUMN IF NOT EXISTS userRole varchar(50) DEFAULT 'student',
ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL;

-- Add new fields to join_requests table  
ALTER TABLE join_requests
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS department VARCHAR(200) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS userRole varchar(50) DEFAULT 'seller',
ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL;

-- Update existing records to split fullName into firstName and lastName
-- This handles existing data gracefully
UPDATE users 
SET 
    first_name = SPLIT_PART(full_name, ' ', 1),
    last_name = CASE 
        WHEN POSITION(' ' IN full_name) > 0 
        THEN TRIM(SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1))
        ELSE ''
    END
WHERE full_name IS NOT NULL AND full_name != '';

UPDATE join_requests 
SET 
    first_name = SPLIT_PART("fullName", ' ', 1),
    last_name = CASE 
        WHEN POSITION(' ' IN "fullName") > 0 
        THEN TRIM(SUBSTRING("fullName" FROM POSITION(' ' IN "fullName") + 1))
        ELSE ''
    END
WHERE "fullName" IS NOT NULL AND "fullName" != '';

-- Add indexes for better query performance (with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_users_userRole ON users(userRole);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_join_requests_userRole ON join_requests(userRole);
CREATE INDEX IF NOT EXISTS idx_join_requests_department ON join_requests(department);

-- Migration: Add new user profile fields
-- This migration adds firstName, lastName, department, role, and address fields to both users and join_requests tables

-- Add new fields to users table
ALTER TABLE users 
ADD COLUMN firstName VARCHAR(100) DEFAULT NULL,
ADD COLUMN lastName VARCHAR(100) DEFAULT NULL,
ADD COLUMN department VARCHAR(200) DEFAULT NULL,
ADD COLUMN role ENUM('student', 'staff') DEFAULT NULL,
ADD COLUMN address TEXT DEFAULT NULL;

-- Add new fields to join_requests table  
ALTER TABLE join_requests
ADD COLUMN firstName VARCHAR(100) DEFAULT NULL,
ADD COLUMN lastName VARCHAR(100) DEFAULT NULL,
ADD COLUMN department VARCHAR(200) DEFAULT NULL,
ADD COLUMN role ENUM('student', 'staff') DEFAULT NULL,
ADD COLUMN address TEXT DEFAULT NULL;

-- Update existing records to split fullName into firstName and lastName
-- This handles existing data gracefully
UPDATE users 
SET 
    firstName = SUBSTRING_INDEX(fullName, ' ', 1),
    lastName = CASE 
        WHEN LOCATE(' ', fullName) > 0 
        THEN TRIM(SUBSTRING(fullName, LOCATE(' ', fullName) + 1))
        ELSE ''
    END
WHERE fullName IS NOT NULL AND fullName != '';

UPDATE join_requests 
SET 
    firstName = SUBSTRING_INDEX(fullName, ' ', 1),
    lastName = CASE 
        WHEN LOCATE(' ', fullName) > 0 
        THEN TRIM(SUBSTRING(fullName, LOCATE(' ', fullName) + 1))
        ELSE ''
    END
WHERE fullName IS NOT NULL AND fullName != '';

-- Add indexes for better query performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_join_requests_role ON join_requests(role);
CREATE INDEX idx_join_requests_department ON join_requests(department);

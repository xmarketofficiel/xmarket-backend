-- Migration: Add detailed user fields
-- Description: Add firstName, lastName, department, role, and address fields to users and join_requests tables

-- Add new fields to users table
ALTER TABLE users 
ADD COLUMN first_name VARCHAR(100) NOT NULL DEFAULT '',
ADD COLUMN last_name VARCHAR(100) NOT NULL DEFAULT '',
ADD COLUMN department VARCHAR(200) NOT NULL DEFAULT '',
ADD COLUMN user_role ENUM('student', 'staff') NOT NULL DEFAULT 'student',
ADD COLUMN address TEXT NOT NULL DEFAULT '';

-- Make full_name nullable for backward compatibility
ALTER TABLE users 
MODIFY COLUMN full_name VARCHAR(255) NULL;

-- Add new fields to join_requests table
ALTER TABLE join_requests
ADD COLUMN first_name VARCHAR(100) NOT NULL DEFAULT '',
ADD COLUMN last_name VARCHAR(100) NOT NULL DEFAULT '',
ADD COLUMN department VARCHAR(200) NOT NULL DEFAULT '',
ADD COLUMN role ENUM('student', 'staff') NOT NULL DEFAULT 'student',
ADD COLUMN address TEXT NOT NULL DEFAULT '';

-- Make full_name nullable for backward compatibility in join_requests
ALTER TABLE join_requests
MODIFY COLUMN fullName VARCHAR(255) NULL;

-- Optional: Update existing records to split full_name into first_name and last_name
-- Note: This is a basic split - you may want to handle this more carefully in production
UPDATE users 
SET 
  first_name = SUBSTRING_INDEX(full_name, ' ', 1),
  last_name = TRIM(SUBSTRING(full_name, LOCATE(' ', full_name) + 1))
WHERE full_name IS NOT NULL AND full_name != '';

UPDATE join_requests
SET 
  first_name = SUBSTRING_INDEX(fullName, ' ', 1),
  last_name = TRIM(SUBSTRING(fullName, LOCATE(' ', fullName) + 1))
WHERE fullName IS NOT NULL AND fullName != '';

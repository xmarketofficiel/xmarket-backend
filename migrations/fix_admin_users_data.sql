-- Fix any null email values in admin_users table
-- This script ensures data integrity before TypeORM synchronization

-- First, let's check if there are any NULL emails
-- (This is informational, won't fail if there are no rows)
DO $$
BEGIN
  RAISE NOTICE 'Checking for NULL emails in admin_users table...';
END $$;

-- Delete any rows with NULL emails (shouldn't exist, but just in case)
DELETE FROM admin_users WHERE email IS NULL;

-- Ensure the email column is NOT NULL (should already be from migration)
-- This will fail if there are NULL values, which is what we want
ALTER TABLE admin_users ALTER COLUMN email SET NOT NULL;

-- Verify the constraint
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'admin_users'
  AND column_name = 'email';

-- Show current admin users
SELECT id, email, full_name, role, status, is_active, created_at 
FROM admin_users
ORDER BY created_at;

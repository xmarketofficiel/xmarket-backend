-- Cleanup Migration: Remove ENUM columns and type to fix TypeORM sync issues

-- First, drop the columns that use the ENUM type
ALTER TABLE users DROP COLUMN IF EXISTS userRole;
ALTER TABLE join_requests DROP COLUMN IF EXISTS userRole;

-- Now we can safely drop the ENUM type
DROP TYPE IF EXISTS user_role_enum CASCADE;

-- Recreate the columns as varchar (TypeORM compatible)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS userRole varchar(50) DEFAULT 'student';

ALTER TABLE join_requests 
ADD COLUMN IF NOT EXISTS userRole varchar(50) DEFAULT 'seller';

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_users_userRole ON users(userRole);
CREATE INDEX IF NOT EXISTS idx_join_requests_userRole ON join_requests(userRole);
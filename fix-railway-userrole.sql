-- Fix ALL missing columns in Railway PostgreSQL database
-- Run this script directly in your Railway PostgreSQL database

-- ==================================================
-- STEP 1: Create enum types if they don't exist
-- ==================================================

DO $$ 
BEGIN
    -- Create user_role_enum type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM ('student', 'staff', 'seller');
        RAISE NOTICE '✅ Created user_role_enum type';
    END IF;
    
    -- Create UserRole enum type (for role column)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
        CREATE TYPE users_role_enum AS ENUM ('user', 'admin', 'super_admin');
        RAISE NOTICE '✅ Created users_role_enum type';
    END IF;
    
    -- Create UserStatus enum type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_status_enum') THEN
        CREATE TYPE users_status_enum AS ENUM ('active', 'suspended', 'banned');
        RAISE NOTICE '✅ Created users_status_enum type';
    END IF;
END $$;

-- ==================================================
-- STEP 2: Add userRole column to users table
-- ==================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'userRole'
    ) THEN
        ALTER TABLE users ADD COLUMN "userRole" user_role_enum DEFAULT 'student';
        RAISE NOTICE '✅ Added userRole column to users table';
    ELSE
        RAISE NOTICE '✅ userRole column already exists';
    END IF;
END $$;

-- ==================================================
-- STEP 3: Add averageRating column to users table
-- ==================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'averageRating'
    ) THEN
        ALTER TABLE users ADD COLUMN "averageRating" DECIMAL(3, 2) DEFAULT 0;
        RAISE NOTICE '✅ Added averageRating column to users table';
    ELSE
        RAISE NOTICE '✅ averageRating column already exists';
    END IF;
END $$;

-- ==================================================
-- STEP 4: Add totalRatings column to users table
-- ==================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'totalRatings'
    ) THEN
        ALTER TABLE users ADD COLUMN "totalRatings" INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added totalRatings column to users table';
    ELSE
        RAISE NOTICE '✅ totalRatings column already exists';
    END IF;
END $$;

-- ==================================================
-- STEP 5: Add role column (admin role) to users table
-- ==================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN "role" users_role_enum DEFAULT 'user';
        RAISE NOTICE '✅ Added role column to users table';
    ELSE
        RAISE NOTICE '✅ role column already exists';
    END IF;
END $$;

-- ==================================================
-- STEP 6: Add status column to users table
-- ==================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE users ADD COLUMN "status" users_status_enum DEFAULT 'active';
        RAISE NOTICE '✅ Added status column to users table';
    ELSE
        RAISE NOTICE '✅ status column already exists';
    END IF;
END $$;

-- ==================================================
-- STEP 7: Add last_login column to users table
-- ==================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'last_login'
    ) THEN
        ALTER TABLE users ADD COLUMN "last_login" TIMESTAMP;
        RAISE NOTICE '✅ Added last_login column to users table';
    ELSE
        RAISE NOTICE '✅ last_login column already exists';
    END IF;
END $$;

-- ==================================================
-- STEP 8: Ensure all existing users have valid values
-- ==================================================

UPDATE users 
SET "userRole" = 'student' 
WHERE "userRole" IS NULL;

UPDATE users 
SET "averageRating" = 0 
WHERE "averageRating" IS NULL;

UPDATE users 
SET "totalRatings" = 0 
WHERE "totalRatings" IS NULL;

UPDATE users 
SET "role" = 'user' 
WHERE "role" IS NULL;

UPDATE users 
SET "status" = 'active' 
WHERE "status" IS NULL;

-- ==================================================
-- STEP 9: Check if userRole column exists in join_requests table
-- ==================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'join_requests' 
        AND column_name = 'userRole'
    ) THEN
        ALTER TABLE join_requests ADD COLUMN "userRole" user_role_enum DEFAULT 'seller';
        RAISE NOTICE '✅ Added userRole column to join_requests table';
    ELSE
        RAISE NOTICE '✅ userRole column already exists in join_requests';
    END IF;
END $$;

-- ==================================================
-- STEP 10: Update NULL values in join_requests
-- ==================================================

UPDATE join_requests 
SET "userRole" = 'seller' 
WHERE "userRole" IS NULL;

-- ==================================================
-- VERIFICATION: Check the results
-- ==================================================

-- Show users table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users'
AND column_name IN ('userRole', 'role', 'status', 'averageRating', 'totalRatings', 'last_login')
ORDER BY ordinal_position;

-- Check for NULL userRole values in users
SELECT 
    'users' as table_name, 
    COUNT(*) as total_rows,
    COUNT("userRole") as non_null_userRole,
    COUNT(*) - COUNT("userRole") as null_userRole
FROM users;

-- Check for NULL userRole values in join_requests
SELECT 
    'join_requests' as table_name, 
    COUNT(*) as total_rows,
    COUNT("userRole") as non_null_userRole,
    COUNT(*) - COUNT("userRole") as null_userRole
FROM join_requests;

-- ==================================================
-- SUCCESS MESSAGE
-- ==================================================

DO $$ 
BEGIN
    RAISE NOTICE '✅ All missing columns added successfully!';
    RAISE NOTICE '✅ userRole column: student/staff/seller';
    RAISE NOTICE '✅ role column: user/admin/super_admin';
    RAISE NOTICE '✅ status column: active/suspended/banned';
    RAISE NOTICE '✅ averageRating column: DECIMAL(3,2) default 0';
    RAISE NOTICE '✅ totalRatings column: INTEGER default 0';
    RAISE NOTICE '✅ last_login column: TIMESTAMP';
    RAISE NOTICE '✅ Ready for signup and all user operations!';
END $$;

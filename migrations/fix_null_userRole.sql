-- Fix NULL values in userRole columns before TypeORM sync

-- Update NULL values in users table
UPDATE users 
SET userRole = 'student' 
WHERE userRole IS NULL;

-- Update NULL values in join_requests table  
UPDATE join_requests 
SET userRole = 'seller' 
WHERE userRole IS NULL;

-- Verify the fix
SELECT 'users' as table_name, COUNT(*) as null_count 
FROM users WHERE userRole IS NULL
UNION ALL
SELECT 'join_requests' as table_name, COUNT(*) as null_count 
FROM join_requests WHERE userRole IS NULL;
-- Create Admin User Script
-- Run this in your PostgreSQL database to create an admin user

-- First, let's check if an admin user already exists
SELECT id, email, role, status FROM users WHERE role = 'admin' OR role = 'super_admin';

-- Create an admin user directly (adjust the values as needed)
INSERT INTO users (
    "fullName", 
    email, 
    password, 
    role, 
    status, 
    "isVerified", 
    "whatsappNumber",
    "createdAt", 
    "updatedAt"
) VALUES (
    'Super Admin',
    'admin@example.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBMY/6F7pHWJ7q', -- bcrypt hash for 'admin123'
    'super_admin',
    'active',
    true,
    '+1234567890',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    role = 'super_admin',
    status = 'active',
    "isVerified" = true;

-- Verify the admin user was created
SELECT id, email, role, status, "isVerified" FROM users WHERE email = 'admin@example.com';

-- If you want to create additional admin users, you can run:
/*
INSERT INTO users (
    "fullName", 
    email, 
    password, 
    role, 
    status, 
    "isVerified", 
    "whatsappNumber",
    "createdAt", 
    "updatedAt"
) VALUES (
    'Admin User 2',
    'admin2@example.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBMY/6F7pHWJ7q', -- bcrypt hash for 'admin123'
    'admin',
    'active',
    true,
    '+1987654321',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;
*/

-- Migration to add role, status, and lastLogin fields to users table

-- Add role column with enum type
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Add status column with enum type
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';
UPDATE users SET status = 'active' WHERE status IS NULL;

-- Add last_login column
ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL;

-- Create indexes for better performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_last_login ON users(last_login);

-- Create a super admin user (change email and password as needed)
-- First delete any existing admin user to avoid conflicts
DELETE FROM users WHERE email = 'admin@xmarket.com';

INSERT INTO users (full_name, email, whatsapp_number, password_hash, role, status, is_verified, created_at, updated_at)
VALUES (
    'Super Admin',
    'admin@xmarket.com',
    '+1234567890',
    '$2a$10$httGlDAU/kPG90XW8xUHvuwxirP1XZDgDslSTchVndmTVC0Ew6QNa', -- password: admin123 (verified working hash)
    'super_admin',
    'active',
    true,
    NOW(),
    NOW()
);

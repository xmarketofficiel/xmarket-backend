-- Create Super Admin User
INSERT INTO users (full_name, email, whatsapp_number, password_hash, role, status, is_verified, created_at, updated_at)
VALUES (
    'Super Admin',
    'admin@xmarket.com',
    '+1234567890',
    '$2a$10$httGlDAU/kPG90XW8xUHvuwxirP1XZDgDslSTchVndmTVC0Ew6QNa',
    'super_admin',
    'active',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = NOW();

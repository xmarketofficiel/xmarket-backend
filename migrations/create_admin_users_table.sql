-- Create admin_users table for separate admin authentication
-- This separates admin users from regular users for better security

CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin' NOT NULL,
    status VARCHAR(50) DEFAULT 'active' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT admin_users_email_unique UNIQUE (email),
    CONSTRAINT admin_users_role_check CHECK (role IN ('admin', 'super_admin')),
    CONSTRAINT admin_users_status_check CHECK (status IN ('active', 'suspended', 'inactive'))
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users(status);

-- Insert default super admin
-- Password: admin123 (hashed with bcrypt)
INSERT INTO admin_users (email, password_hash, full_name, role, status, is_active, created_at, updated_at)
VALUES (
    'admin@xmarket.com',
    '$2a$10$kCovjANtU3dfGzV1TUCNFOWye.AxPk6JVnaC2Nl4u0NHR0V.Rigwi',
    'Super Admin',
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

-- Add comment to table
COMMENT ON TABLE admin_users IS 'Separate table for admin users who have access to the admin panel';
COMMENT ON COLUMN admin_users.role IS 'Admin role: admin or super_admin';
COMMENT ON COLUMN admin_users.status IS 'Admin status: active, suspended, or inactive';
COMMENT ON COLUMN admin_users.is_active IS 'Quick active/inactive flag';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_admin_users_updated_at_trigger ON admin_users;
CREATE TRIGGER update_admin_users_updated_at_trigger
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_users_updated_at();

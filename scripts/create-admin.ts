import * as bcrypt from 'bcryptjs';

// Simple script to generate admin user SQL
async function generateAdminSQL() {
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const sql = `
-- Create Super Admin User
INSERT INTO users (full_name, email, whatsapp_number, password_hash, role, status, is_verified, created_at, updated_at)
VALUES (
    'Super Admin',
    'admin@xmarket.com',
    '+1234567890',
    '${hashedPassword}',
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
`;

  console.log('✅ Admin SQL generated successfully!');
  console.log('Run this SQL in your database:');
  console.log(sql);
  console.log('\n📧 Admin Login Credentials:');
  console.log('Email: admin@xmarket.com');
  console.log('Password: admin123');
  console.log('⚠️  Please change this password after first login!');
}

generateAdminSQL().catch(console.error);

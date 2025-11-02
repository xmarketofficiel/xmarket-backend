import * as bcrypt from 'bcryptjs';

/**
 * Script to create admin user in the new admin_users table
 * Run with: npm run create:admin-user
 */
async function generateAdminUserSQL() {
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const sql = `
-- ========================================
-- Create Admin User in admin_users table
-- ========================================

-- Insert Super Admin
INSERT INTO admin_users (email, password_hash, full_name, role, status, is_active, created_at, updated_at)
VALUES (
    'admin@xmarket.com',
    '${hashedPassword}',
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
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Verify the admin was created
SELECT id, email, full_name, role, status, is_active, created_at 
FROM admin_users 
WHERE email = 'admin@xmarket.com';
`;

  console.log('✅ Admin User SQL Generated!\n');
  console.log('='.repeat(60));
  console.log('COPY AND RUN THIS SQL IN YOUR DATABASE:');
  console.log('='.repeat(60));
  console.log(sql);
  console.log('='.repeat(60));
  console.log('\n📧 Admin Login Credentials:');
  console.log('   Email: admin@xmarket.com');
  console.log('   Password: admin123');
  console.log('\n⚠️  IMPORTANT:');
  console.log('   1. Run the migration first: migrations/create_admin_users_table.sql');
  console.log('   2. Then run the SQL above to create the admin user');
  console.log('   3. Change the password after first login!');
  console.log('\n🚀 Where to run this SQL:');
  console.log('   Railway: Go to PostgreSQL → Data → Query');
  console.log('   Local: psql -d your_database -f create_admin_user.sql');
  console.log('='.repeat(60));
}

generateAdminUserSQL().catch(console.error);

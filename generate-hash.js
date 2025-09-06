const bcrypt = require('bcrypt');

const password = process.argv[2] || 'admin123';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }
  
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
  
  console.log('\nSQL to create admin user:');
  console.log(`
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
  '${hash}',
  'super_admin',
  'active',
  true,
  '+1234567890',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  "updatedAt" = NOW();
  `);
});

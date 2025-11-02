#!/usr/bin/env node

/**
 * Migration Runner for admin_users Table
 * 
 * This script automatically runs the create_admin_users_table.sql migration
 * on your Railway PostgreSQL database.
 * 
 * Usage:
 *   npm run migrate:admin-users
 * 
 * Or directly:
 *   node scripts/run-migration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runMigration() {
  log('\n🚀 Starting Admin Users Table Migration\n', 'bright');

  // Check DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log('❌ ERROR: DATABASE_URL not found in environment variables', 'red');
    log('Please ensure .env file exists and contains DATABASE_URL', 'yellow');
    process.exit(1);
  }

  log(`📊 Database: ${databaseUrl.split('@')[1]}`, 'cyan');

  // Read migration file
  const migrationPath = path.join(__dirname, '../migrations/create_admin_users_table.sql');
  
  if (!fs.existsSync(migrationPath)) {
    log(`❌ ERROR: Migration file not found at: ${migrationPath}`, 'red');
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  log('✅ Migration file loaded', 'green');

  // Create database client
  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false, // Railway requires SSL
    },
  });

  try {
    // Connect to database
    log('\n🔌 Connecting to database...', 'cyan');
    await client.connect();
    log('✅ Connected successfully', 'green');

    // Check if table already exists
    log('\n🔍 Checking if admin_users table exists...', 'cyan');
    const checkTableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'admin_users'
    `;
    const tableExists = await client.query(checkTableQuery);

    if (tableExists.rows.length > 0) {
      log('⚠️  Table admin_users already exists', 'yellow');
      log('Migration will update existing table...', 'yellow');
    }

    // Run migration
    log('\n📝 Running migration SQL...', 'cyan');
    await client.query(migrationSQL);
    log('✅ Migration executed successfully', 'green');

    // Verify admin user exists
    log('\n🔍 Verifying admin user...', 'cyan');
    const verifyQuery = `
      SELECT id, email, full_name, role, status, created_at 
      FROM admin_users 
      WHERE email = 'admin@xmarket.com'
    `;
    const result = await client.query(verifyQuery);

    if (result.rows.length > 0) {
      const admin = result.rows[0];
      log('\n✅ Admin user verified:', 'green');
      log(`   ID: ${admin.id}`, 'cyan');
      log(`   Email: ${admin.email}`, 'cyan');
      log(`   Name: ${admin.full_name}`, 'cyan');
      log(`   Role: ${admin.role}`, 'cyan');
      log(`   Status: ${admin.status}`, 'cyan');
      log(`   Created: ${admin.created_at}`, 'cyan');
    } else {
      log('⚠️  Warning: Admin user not found after migration', 'yellow');
    }

    // Success summary
    log('\n' + '='.repeat(60), 'green');
    log('🎉 MIGRATION COMPLETED SUCCESSFULLY!', 'green');
    log('='.repeat(60), 'green');
    log('\n📋 What was created:', 'bright');
    log('   ✅ admin_users table', 'cyan');
    log('   ✅ Email and status indexes', 'cyan');
    log('   ✅ Role and status constraints', 'cyan');
    log('   ✅ Auto-update trigger for updated_at', 'cyan');
    log('   ✅ Default super admin user', 'cyan');
    
    log('\n🔐 Default Admin Credentials:', 'bright');
    log('   Email: admin@xmarket.com', 'yellow');
    log('   Password: admin123', 'yellow');
    log('   ⚠️  CHANGE THIS PASSWORD AFTER FIRST LOGIN!', 'red');
    
    log('\n🚀 Next Steps:', 'bright');
    log('   1. Deploy your backend to Railway', 'cyan');
    log('   2. Test login: POST /auth/admin/login', 'cyan');
    log('   3. Open admin panel and login', 'cyan');
    log('   4. Change the default password', 'cyan');
    
  } catch (error) {
    log('\n❌ MIGRATION FAILED', 'red');
    log(`Error: ${error.message}`, 'red');
    
    if (error.code === 'ENOTFOUND') {
      log('\n💡 Possible solutions:', 'yellow');
      log('   - Check your DATABASE_URL is correct', 'yellow');
      log('   - Verify Railway database is running', 'yellow');
      log('   - Check your internet connection', 'yellow');
    } else if (error.code === '28P01') {
      log('\n💡 Possible solutions:', 'yellow');
      log('   - Verify database password is correct', 'yellow');
      log('   - Check DATABASE_URL format', 'yellow');
    } else if (error.code === '42P07') {
      log('\n💡 This might not be an error:', 'yellow');
      log('   - Table might already exist', 'yellow');
      log('   - Check the table manually in Railway dashboard', 'yellow');
    }
    
    process.exit(1);
  } finally {
    // Close connection
    await client.end();
    log('\n🔌 Database connection closed\n', 'cyan');
  }
}

// Run migration
runMigration().catch(error => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});

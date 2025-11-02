#!/usr/bin/env node

/**
 * Verify admin_users Table
 * 
 * This script checks if the admin_users table exists and is properly configured
 * 
 * Usage:
 *   npm run verify:admin-users
 */

const { Client } = require('pg');
require('dotenv').config();

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

async function verifyTable() {
  log('\n🔍 Verifying admin_users Table\n', 'bright');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log('❌ ERROR: DATABASE_URL not found', 'red');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    log('✅ Connected to database', 'green');

    // Check table exists
    log('\n📋 Checking table existence...', 'cyan');
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'admin_users'
    `);

    if (tableCheck.rows.length === 0) {
      log('❌ Table admin_users does NOT exist', 'red');
      log('\n💡 Run migration first:', 'yellow');
      log('   npm run migrate:admin-users', 'cyan');
      process.exit(1);
    }
    log('✅ Table exists', 'green');

    // Check columns
    log('\n📋 Checking table structure...', 'cyan');
    const columnsCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'admin_users'
      ORDER BY ordinal_position
    `);

    log(`✅ Found ${columnsCheck.rows.length} columns:`, 'green');
    columnsCheck.rows.forEach(col => {
      log(`   - ${col.column_name} (${col.data_type})`, 'cyan');
    });

    // Check indexes
    log('\n📋 Checking indexes...', 'cyan');
    const indexCheck = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'admin_users'
    `);

    log(`✅ Found ${indexCheck.rows.length} indexes:`, 'green');
    indexCheck.rows.forEach(idx => {
      log(`   - ${idx.indexname}`, 'cyan');
    });

    // Check constraints
    log('\n📋 Checking constraints...', 'cyan');
    const constraintCheck = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'admin_users'
    `);

    log(`✅ Found ${constraintCheck.rows.length} constraints:`, 'green');
    constraintCheck.rows.forEach(con => {
      log(`   - ${con.constraint_name} (${con.constraint_type})`, 'cyan');
    });

    // Check admin users
    log('\n👥 Checking admin users...', 'cyan');
    const adminsCheck = await client.query(`
      SELECT id, email, full_name, role, status, is_active, created_at
      FROM admin_users
      ORDER BY id
    `);

    if (adminsCheck.rows.length === 0) {
      log('⚠️  No admin users found!', 'yellow');
      log('\n💡 Default admin should exist. Run migration again:', 'yellow');
      log('   npm run migrate:admin-users', 'cyan');
    } else {
      log(`✅ Found ${adminsCheck.rows.length} admin user(s):`, 'green');
      adminsCheck.rows.forEach(admin => {
        log(`\n   Admin #${admin.id}:`, 'bright');
        log(`   - Email: ${admin.email}`, 'cyan');
        log(`   - Name: ${admin.full_name}`, 'cyan');
        log(`   - Role: ${admin.role}`, 'cyan');
        log(`   - Status: ${admin.status}`, 'cyan');
        log(`   - Active: ${admin.is_active}`, 'cyan');
        log(`   - Created: ${admin.created_at}`, 'cyan');
      });
    }

    // Check default admin specifically
    log('\n🔐 Checking default admin...', 'cyan');
    const defaultAdmin = await client.query(`
      SELECT * FROM admin_users WHERE email = 'admin@xmarket.com'
    `);

    if (defaultAdmin.rows.length > 0) {
      log('✅ Default admin exists (admin@xmarket.com)', 'green');
      const admin = defaultAdmin.rows[0];
      if (admin.role === 'super_admin') {
        log('✅ Role is super_admin', 'green');
      } else {
        log(`⚠️  Role is ${admin.role} (expected: super_admin)`, 'yellow');
      }
      if (admin.status === 'active') {
        log('✅ Status is active', 'green');
      } else {
        log(`⚠️  Status is ${admin.status} (expected: active)`, 'yellow');
      }
    } else {
      log('❌ Default admin NOT found', 'red');
      log('\n💡 Run migration to create default admin:', 'yellow');
      log('   npm run migrate:admin-users', 'cyan');
    }

    // Summary
    log('\n' + '='.repeat(60), 'green');
    log('✅ VERIFICATION COMPLETE', 'green');
    log('='.repeat(60), 'green');

    const hasTable = tableCheck.rows.length > 0;
    const hasColumns = columnsCheck.rows.length >= 10;
    const hasIndexes = indexCheck.rows.length >= 2;
    const hasAdmins = adminsCheck.rows.length > 0;
    const hasDefaultAdmin = defaultAdmin.rows.length > 0;

    log('\n📊 Status Summary:', 'bright');
    log(`   Table exists: ${hasTable ? '✅' : '❌'}`, hasTable ? 'green' : 'red');
    log(`   Columns configured: ${hasColumns ? '✅' : '❌'}`, hasColumns ? 'green' : 'red');
    log(`   Indexes created: ${hasIndexes ? '✅' : '❌'}`, hasIndexes ? 'green' : 'red');
    log(`   Admin users exist: ${hasAdmins ? '✅' : '❌'}`, hasAdmins ? 'green' : 'red');
    log(`   Default admin exists: ${hasDefaultAdmin ? '✅' : '❌'}`, hasDefaultAdmin ? 'green' : 'red');

    if (hasTable && hasColumns && hasIndexes && hasDefaultAdmin) {
      log('\n🎉 Everything looks good! Ready to use.', 'green');
      log('\n🚀 Next steps:', 'bright');
      log('   1. Deploy backend to Railway', 'cyan');
      log('   2. Test login API endpoint', 'cyan');
      log('   3. Login to admin panel', 'cyan');
    } else {
      log('\n⚠️  Some issues found. Run migration:', 'yellow');
      log('   npm run migrate:admin-users', 'cyan');
    }

  } catch (error) {
    log('\n❌ VERIFICATION FAILED', 'red');
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    await client.end();
    log('\n🔌 Connection closed\n', 'cyan');
  }
}

verifyTable().catch(error => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});

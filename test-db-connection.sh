#!/bin/bash

# Database Connection Test Script for EC2
# Run this script on your EC2 instance to test the database connection

echo "🔍 Testing database connection from EC2 instance..."

# Test with Node.js (if Node.js is installed)
if command -v node &> /dev/null; then
    echo "📱 Testing with Node.js..."
    node -e "
const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://root:Molunix3ndosuperapp@172.31.22.74:5432/xmarketdb?sslmode=require',
  ssl: {
    rejectUnauthorized: false,
    ca: undefined
  }
});

console.log('🔗 Connecting to database...');

client.connect()
  .then(() => {
    console.log('✅ Database connection successful!');
    return client.query('SELECT version()');
  })
  .then(result => {
    console.log('📊 Database version:', result.rows[0].version);
    return client.query('SELECT current_database(), current_user');
  })
  .then(result => {
    console.log('📋 Database:', result.rows[0].current_database);
    console.log('👤 User:', result.rows[0].current_user);
    client.end();
    console.log('🎉 Database connection test completed successfully!');
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    console.error('🔧 SSL Error Fix: Update app.module.ts with rejectUnauthorized: false');
    process.exit(1);
  });
"
else
    echo "⚠️ Node.js not found. Installing Node.js first..."
fi

# Test with psql (if available)
if command -v psql &> /dev/null; then
    echo "📱 Testing with psql..."
    PGPASSWORD=Molunix3ndosuperapp psql -h 172.31.22.74 -U root -d xmarketdb -c "SELECT version();"
else
    echo "⚠️ psql not found. You can install it with: sudo apt-get install postgresql-client"
fi

echo "✅ Database connection test script completed!"

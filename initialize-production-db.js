#!/usr/bin/env node

// Load environment variables from .env file
require('dotenv').config();

const { DataSource } = require('typeorm');

// This script runs ONCE to create tables in production database
// Parse DATABASE_URL to extract components
const databaseUrl = process.env.DATABASE_URL;
console.log('🔗 Database URL:', databaseUrl);

const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  },
  entities: [
    './dist/src/entities/*.js'
  ],
  synchronize: true, // ONLY for initialization
  logging: true // Enable logging to see what's happening
});

async function initializeDatabase() {
  try {
    console.log('🔄 Connecting to production database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully!');
    
    console.log('🔄 Creating database tables...');
    await AppDataSource.synchronize();
    console.log('✅ All tables created successfully!');
    
    await AppDataSource.destroy();
    console.log('✅ Database initialization complete!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();

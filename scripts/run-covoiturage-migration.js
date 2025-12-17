const { DataSource } = require('typeorm');
require('dotenv').config();

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  try {
    await dataSource.initialize();
    console.log('✅ Database connected');
    
    console.log('📦 Adding from_location and to_location columns to services table...');
    
    await dataSource.query(`
      ALTER TABLE "services" 
      ADD COLUMN IF NOT EXISTS "from_location" varchar,
      ADD COLUMN IF NOT EXISTS "to_location" varchar
    `);
    
    console.log('✅ Migration completed successfully!');
    
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

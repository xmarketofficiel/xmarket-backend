import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
});

async function runMigrations() {
  try {
    await dataSource.initialize();
    console.log('✅ Database connected');
    
    console.log('📦 Running migrations...');
    const migrations = await dataSource.runMigrations();
    
    if (migrations.length === 0) {
      console.log('✅ No pending migrations');
    } else {
      console.log(`✅ Ran ${migrations.length} migration(s):`);
      migrations.forEach(migration => {
        console.log(`  - ${migration.name}`);
      });
    }
    
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();

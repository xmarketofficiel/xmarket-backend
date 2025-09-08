import { DataSource } from 'typeorm';

async function testConnection() {
  console.log('🔧 Testing database connection...');
  
  const dataSource = new DataSource({
    type: 'postgres',
    host: '172.31.22.74',
    port: 5432,
    username: 'xmarket_admin',
    password: 'XMarket2024!SecurePassword',
    database: 'xmarket_db',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection successful');
    
    // Check if tables exist
    const queryRunner = dataSource.createQueryRunner();
    const tables = await queryRunner.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('📋 Tables found:', tables.map(t => t.table_name));
    
    // Test a simple query
    const userCount = await queryRunner.query('SELECT COUNT(*) FROM users');
    console.log('👥 Users in database:', userCount[0].count);
    
    await queryRunner.release();
    await dataSource.destroy();
    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Full error:', error);
  }
}

testConnection();

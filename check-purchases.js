const { DataSource } = require('typeorm');

async function checkPurchases() {
  // Load environment variables
  require('dotenv').config();
  
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'xmarket',
    entities: ['dist/**/*.entity.js'],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✓ Connected to database');
    
    // Check if we can query purchases
    const result = await dataSource.query(`
      SELECT 
        ip.id,
        ip.status,
        ip.quantity,
        ip.item_id,
        i.title,
        i.quantity as item_quantity,
        u.username as buyer_username
      FROM item_purchase ip
      LEFT JOIN items i ON ip.item_id = i.id
      LEFT JOIN users u ON ip.buyer_id = u.id
      ORDER BY ip.created_at DESC
      LIMIT 10
    `);
    
    console.log(`\nFound ${result.length} recent purchases:`);
    
    const statusCounts = {};
    result.forEach(p => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      console.log(`- Item "${p.title}" (ID: ${p.item_id}): ${p.status} - quantity: ${p.quantity}, item has: ${p.item_quantity}`);
    });
    
    console.log('\nPurchase status summary:', statusCounts);
    
    // Check for any PENDING purchases specifically
    const pendingResult = await dataSource.query(`
      SELECT 
        ip.id,
        ip.status,
        ip.quantity,
        ip.item_id,
        i.title,
        i.quantity as item_quantity
      FROM item_purchase ip
      LEFT JOIN items i ON ip.item_id = i.id
      WHERE ip.status = 'PENDING'
      ORDER BY ip.created_at DESC
    `);
    
    console.log(`\n🔍 PENDING purchases specifically: ${pendingResult.length}`);
    pendingResult.forEach(p => {
      console.log(`- PENDING: Item "${p.title}" (ID: ${p.item_id}) - quantity: ${p.quantity}`);
    });
    
    await dataSource.destroy();
    console.log('\n✓ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

checkPurchases();

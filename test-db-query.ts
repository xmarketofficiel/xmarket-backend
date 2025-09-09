import { DataSource } from 'typeorm';

// Simple test to check database users and items
async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Create a connection (you'll need to adjust these settings to match your app)
    const dataSource = new DataSource({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'xmarket',
      username: 'postgres', // adjust as needed
      password: 'password', // adjust as needed
      synchronize: false,
      logging: true,
    });

    await dataSource.initialize();
    console.log('Database connected successfully');

    // Test users query
    const users = await dataSource.query(`
      SELECT id, full_name, email, role, 
             (SELECT COUNT(*) FROM items WHERE seller_id = users.id) as item_count
      FROM users 
      WHERE role = 'user' 
      ORDER BY id
      LIMIT 5
    `);
    
    console.log('Users with items:');
    console.log(users);

    // Test the actual seller analytics query
    const sellers = await dataSource.query(`
      SELECT 
        seller.id,
        seller.full_name as fullName,
        seller.email,
        COUNT(items.id) as totalItems,
        COALESCE(SUM(CASE WHEN items.is_sold = true THEN 1 ELSE 0 END), 0) as soldItems,
        COALESCE(SUM(CASE WHEN items.is_sold = true THEN items.price ELSE 0 END), 0) as totalProfit,
        COALESCE(AVG(CASE WHEN items.is_sold = true THEN items.price ELSE NULL END), 0) as avgSalePrice,
        COALESCE(SUM(items.view_count), 0) as totalViews
      FROM users seller
      LEFT JOIN items ON seller.id = items.seller_id
      WHERE seller.role = 'user'
      GROUP BY seller.id, seller.full_name, seller.email
      HAVING COUNT(items.id) > 0
      ORDER BY COALESCE(SUM(CASE WHEN items.is_sold = true THEN items.price ELSE 0 END), 0) DESC,
               COUNT(items.id) DESC,
               seller.full_name ASC
      LIMIT 10
    `);

    console.log('Seller analytics result:');
    console.log(sellers);

    await dataSource.destroy();

  } catch (error) {
    console.error('Database test failed:', error);
  }
}

testDatabase();

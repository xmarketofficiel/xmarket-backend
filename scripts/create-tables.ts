import { DataSource } from 'typeorm';
import { User } from '../src/users/entities/user.entity';
import { Item } from '../src/items/entities/item.entity';
import { ItemImage } from '../src/items/entities/item-image.entity';
import { Interest } from '../src/interests/entities/interest.entity';
import { Otp } from '../src/otp/entities/otp.entity';
import { Rating } from '../src/services/entities/rating.entity';
import { Service } from '../src/services/entities/service.entity';
import { Conversation } from '../src/messages/entities/conversation.entity';
import { Message } from '../src/messages/entities/message.entity';
import { SearchHistory } from '../src/search/entities/search-history.entity';
import { Category } from '../src/categories/entities/category.entity';
import { Notification } from '../src/notifications/entities/notification.entity';
import { ItemFavorite } from '../src/items/entities/item-favorite.entity';
import { ItemReport } from '../src/items/entities/item-report.entity';
import { ItemPurchase } from '../src/items/entities/item-purchase.entity';
import { UserFollow } from '../src/users/entities/user-follow.entity';
import { UserBlock } from '../src/users/entities/user-block.entity';
import { UserReport } from '../src/users/entities/user-report.entity';
import { WaitlistEmail } from '../src/entities/waitlist-email.entity';
import { JoinRequest } from '../src/join-requests/entities/join-request.entity';
import { FeaturedProduct } from '../src/featured-products/entities/featured-product.entity';
import { AdminUser } from '../src/admin/entities/admin-user.entity';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  });
}

async function createTables() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    console.error('💡 Make sure your .env file contains DATABASE_URL from Railway');
    process.exit(1);
  }

  console.log('🔍 Parsing DATABASE_URL...');
  const url = new URL(databaseUrl);

  console.log('📊 Database configuration:');
  console.log(`   Host: ${url.hostname}`);
  console.log(`   Port: ${url.port || 5432}`);
  console.log(`   Database: ${url.pathname.slice(1)}`);
  console.log(`   User: ${url.username}`);

  // Create DataSource with synchronize enabled temporarily
  const dataSource = new DataSource({
    type: 'postgres',
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    username: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    entities: [
      User,
      Item,
      ItemImage,
      Interest,
      Otp,
      Rating,
      Service,
      Conversation,
      Message,
      SearchHistory,
      Category,
      Notification,
      ItemFavorite,
      ItemReport,
      ItemPurchase,
      UserFollow,
      UserBlock,
      UserReport,
      WaitlistEmail,
      JoinRequest,
      FeaturedProduct,
      AdminUser,
    ],
    synchronize: true, // ⚠️ This will create tables
    logging: true, // Show SQL queries being executed
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('\n📡 Connecting to Railway database...');
    await dataSource.initialize();
    console.log('✅ Connected successfully!');

    console.log('\n🔨 Synchronizing database schema...');
    console.log('⚠️  This will create all tables based on your entities');
    
    // The synchronize: true option already created the tables during initialization
    console.log('✅ All tables created successfully!');

    // Query to list all tables
    const tables = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\n📋 Created tables:');
    tables.forEach((table: any) => {
      console.log(`   ✓ ${table.table_name}`);
    });

    console.log('\n🎉 Database setup complete!');
    console.log('💡 You can now start your backend application');

    await dataSource.destroy();
  } catch (error: any) {
    console.error('\n❌ Error creating tables:', error);
    
    if (error.code === 'ENOTFOUND') {
      console.error('💡 Could not connect to database. Check your DATABASE_URL');
    } else if (error.code === '3D000') {
      console.error('💡 Database does not exist. Create it in Railway first');
    } else if (error.code === '28P01') {
      console.error('💡 Authentication failed. Check your database credentials');
    }
    
    await dataSource.destroy();
    process.exit(1);
  }
}

console.log('🚀 Starting database table creation...\n');
createTables();

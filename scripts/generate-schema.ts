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
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function generateSchema() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  console.log('🔍 Parsing DATABASE_URL...');
  const url = new URL(databaseUrl);

  // Create a temporary DataSource with synchronize enabled
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
    synchronize: false,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('📡 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Connected to database');

    console.log('🔨 Generating SQL schema...');
    
    // Get all queries that would be executed to synchronize
    const queryRunner = dataSource.createQueryRunner();
    const sqlInMemory = await dataSource.driver.createSchemaBuilder().log();
    
    await queryRunner.release();

    // Combine all queries into a single schema file
    const schemaSQL = sqlInMemory.upQueries.map(query => query.query).join(';\n\n') + ';';
    
    // Save to file
    const schemaPath = './schema.sql';
    fs.writeFileSync(schemaPath, schemaSQL);
    
    console.log('✅ Schema generated successfully!');
    console.log(`📄 Schema saved to: ${schemaPath}`);
    console.log('\n📋 Next steps:');
    console.log('1. Review the schema.sql file');
    console.log('2. Run the schema against your database:');
    console.log('   psql $DATABASE_URL -f schema.sql');
    console.log('   OR use Railway CLI or web interface to execute it');

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error generating schema:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

generateSchema();

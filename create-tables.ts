import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from './src/entities/user.entity';
import { Item } from './src/entities/item.entity';
import { Category } from './src/entities/category.entity';
import { Message } from './src/entities/message.entity';
import { Conversation } from './src/entities/conversation.entity';
import { Notification } from './src/entities/notification.entity';
import { Interest } from './src/entities/interest.entity';
import { JoinRequest } from './src/entities/join-request.entity';
import { WaitlistEmail } from './src/entities/waitlist-email.entity';

dotenv.config();

async function createTables() {
  console.log('🔧 Creating database tables...');
  
  // Parse DATABASE_URL if available, otherwise use individual env vars
  const databaseUrl = process.env.DATABASE_URL;
  
  let dbConfig: any;
  if (databaseUrl) {
    const url = new URL(databaseUrl);
    dbConfig = {
      type: 'postgres',
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      username: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      ssl: url.searchParams.get('sslmode') === 'require' ? {
        rejectUnauthorized: false
      } : false,
    };
  } else {
    dbConfig = {
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT) || 5432,
      username: process.env.DATABASE_USERNAME || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'password',
      database: process.env.DATABASE_NAME || 'xmarket_dev',
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false,
    };
  }
  
  const dataSource = new DataSource({
    ...dbConfig,
    entities: [User, Item, Category, Message, Conversation, Notification, Interest, JoinRequest, WaitlistEmail],
    synchronize: true,
    dropSchema: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');
    console.log('✅ Tables created successfully!');
    
    // List created tables
    const queryRunner = dataSource.createQueryRunner();
    const tables = await queryRunner.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('📋 Created tables:', tables.map(t => t.table_name).join(', '));
    
    await queryRunner.release();
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

createTables();

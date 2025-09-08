import { DataSource } from 'typeorm';
import { User } from './src/entities/user.entity';
import { Item } from './src/entities/item.entity';
import { Category } from './src/entities/category.entity';
import { Message } from './src/entities/message.entity';
import { Conversation } from './src/entities/conversation.entity';
import { Notification } from './src/entities/notification.entity';
import { Interest } from './src/entities/interest.entity';
import { JoinRequest } from './src/entities/join-request.entity';
import { WaitlistEmail } from './src/entities/waitlist-email.entity';

async function createTables() {
  console.log('🔧 Creating database tables...');
  
  const dataSource = new DataSource({
    type: 'postgres',
    host: '172.31.22.74',
    port: 5432,
    username: 'xmarket_admin',
    password: 'XMarket2024!SecurePassword',
    database: 'xmarket_db',
    entities: [User, Item, Category, Message, Conversation, Notification, Interest, JoinRequest, WaitlistEmail],
    synchronize: true,
    dropSchema: false,
    ssl: {
      rejectUnauthorized: false
    }
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

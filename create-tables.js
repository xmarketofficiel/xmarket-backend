const { DataSource } = require('typeorm');
require('dotenv').config();

// Import all entities
const { User } = require('./dist/entities/user.entity');
const { Item } = require('./dist/entities/item.entity');
const { Category } = require('./dist/entities/category.entity');
const { Message } = require('./dist/entities/message.entity');
const { Conversation } = require('./dist/entities/conversation.entity');
const { Notification } = require('./dist/entities/notification.entity');
const { Interest } = require('./dist/entities/interest.entity');
const { JoinRequest } = require('./dist/entities/join-request.entity');
const { WaitlistEmail } = require('./dist/entities/waitlist-email.entity');

async function createTables() {
  console.log('🔧 Creating database tables...');
  
  // Parse DATABASE_URL if available, otherwise use individual env vars
  const databaseUrl = process.env.DATABASE_URL;
  
  let dbConfig;
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
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');
    console.log('✅ Tables created successfully!');
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    process.exit(1);
  }
}

createTables();

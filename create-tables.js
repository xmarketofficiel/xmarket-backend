const { DataSource } = require('typeorm');

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
  
  const dataSource = new DataSource({
    type: 'postgres',
    host: '172.31.22.74',
    port: 5432,
    username: 'xmarket_admin',
    password: 'XMarket2024!SecurePassword',
    database: 'xmarket_db',
    entities: [User, Item, Category, Message, Conversation, Notification, Interest, JoinRequest, WaitlistEmail],
    synchronize: true,
    ssl: {
      rejectUnauthorized: false
    }
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

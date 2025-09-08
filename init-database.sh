#!/bin/bash

# Database Schema Initialization Script for Production
# This script creates all necessary tables in production

echo "🗄️  Initializing XMarket Database Schema..."

# Database connection details
DB_HOST="172.31.22.74"
DB_PORT="5432"
DB_NAME="xmarketdb"
DB_USER="root"
DB_PASS="Molunix3ndosuperapp"

# Create SQL script for schema creation
cat > /tmp/create_schema.sql << 'EOF'
-- XMarket Database Schema Creation Script

-- Create user table
CREATE TABLE IF NOT EXISTS "user" (
    "id" SERIAL PRIMARY KEY,
    "email" VARCHAR NOT NULL UNIQUE,
    "password" VARCHAR NOT NULL,
    "firstName" VARCHAR NOT NULL,
    "lastName" VARCHAR NOT NULL,
    "phone" VARCHAR,
    "avatar" VARCHAR,
    "avatarPublicId" VARCHAR,
    "isEmailVerified" BOOLEAN DEFAULT false,
    "bio" TEXT,
    "university" VARCHAR,
    "major" VARCHAR,
    "graduationYear" INTEGER,
    "location" VARCHAR,
    "isActive" BOOLEAN DEFAULT true,
    "lastLoginAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "role" VARCHAR DEFAULT 'user',
    "isAdmin" BOOLEAN DEFAULT false,
    "isSuperAdmin" BOOLEAN DEFAULT false,
    "adminNotes" TEXT,
    "isPrivate" BOOLEAN DEFAULT false,
    "showEmail" BOOLEAN DEFAULT false,
    "showPhone" BOOLEAN DEFAULT false
);

-- Create category table
CREATE TABLE IF NOT EXISTS "category" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR NOT NULL UNIQUE,
    "description" TEXT,
    "icon" VARCHAR,
    "color" VARCHAR,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create item table
CREATE TABLE IF NOT EXISTS "item" (
    "id" SERIAL PRIMARY KEY,
    "title" VARCHAR NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "condition" VARCHAR NOT NULL,
    "status" VARCHAR DEFAULT 'available',
    "location" VARCHAR,
    "isNegotiable" BOOLEAN DEFAULT false,
    "views" INTEGER DEFAULT 0,
    "isActive" BOOLEAN DEFAULT true,
    "isFeatured" BOOLEAN DEFAULT false,
    "isAnonymous" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER REFERENCES "user"("id") ON DELETE CASCADE,
    "categoryId" INTEGER REFERENCES "category"("id") ON DELETE SET NULL
);

-- Create item_image table
CREATE TABLE IF NOT EXISTS "item_image" (
    "id" SERIAL PRIMARY KEY,
    "url" VARCHAR NOT NULL,
    "publicId" VARCHAR,
    "isPrimary" BOOLEAN DEFAULT false,
    "order" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "itemId" INTEGER REFERENCES "item"("id") ON DELETE CASCADE
);

-- Create interest table
CREATE TABLE IF NOT EXISTS "interest" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR NOT NULL UNIQUE,
    "description" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create conversation table
CREATE TABLE IF NOT EXISTS "conversation" (
    "id" SERIAL PRIMARY KEY,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "user1Id" INTEGER REFERENCES "user"("id") ON DELETE CASCADE,
    "user2Id" INTEGER REFERENCES "user"("id") ON DELETE CASCADE,
    "itemId" INTEGER REFERENCES "item"("id") ON DELETE CASCADE
);

-- Create message table
CREATE TABLE IF NOT EXISTS "message" (
    "id" SERIAL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "senderId" INTEGER REFERENCES "user"("id") ON DELETE CASCADE,
    "conversationId" INTEGER REFERENCES "conversation"("id") ON DELETE CASCADE
);

-- Create otp table
CREATE TABLE IF NOT EXISTS "otp" (
    "id" SERIAL PRIMARY KEY,
    "email" VARCHAR NOT NULL,
    "code" VARCHAR NOT NULL,
    "type" VARCHAR NOT NULL,
    "expiresAt" TIMESTAMP NOT NULL,
    "isUsed" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notification table
CREATE TABLE IF NOT EXISTS "notification" (
    "id" SERIAL PRIMARY KEY,
    "title" VARCHAR NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR NOT NULL,
    "isRead" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER REFERENCES "user"("id") ON DELETE CASCADE,
    "relatedItemId" INTEGER REFERENCES "item"("id") ON DELETE SET NULL
);

-- Create join_request table
CREATE TABLE IF NOT EXISTS "join_request" (
    "id" SERIAL PRIMARY KEY,
    "email" VARCHAR NOT NULL,
    "firstName" VARCHAR NOT NULL,
    "lastName" VARCHAR NOT NULL,
    "university" VARCHAR NOT NULL,
    "studentId" VARCHAR,
    "status" VARCHAR DEFAULT 'pending',
    "reason" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" INTEGER REFERENCES "user"("id") ON DELETE SET NULL,
    "reviewedAt" TIMESTAMP
);

-- Create service table
CREATE TABLE IF NOT EXISTS "service" (
    "id" SERIAL PRIMARY KEY,
    "title" VARCHAR NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR NOT NULL,
    "price" DECIMAL(10,2),
    "priceType" VARCHAR DEFAULT 'fixed',
    "location" VARCHAR,
    "isActive" BOOLEAN DEFAULT true,
    "views" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER REFERENCES "user"("id") ON DELETE CASCADE
);

-- Create rating table
CREATE TABLE IF NOT EXISTS "rating" (
    "id" SERIAL PRIMARY KEY,
    "rating" INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    "comment" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "raterId" INTEGER REFERENCES "user"("id") ON DELETE CASCADE,
    "serviceId" INTEGER REFERENCES "service"("id") ON DELETE CASCADE
);

-- Create search_history table
CREATE TABLE IF NOT EXISTS "search_history" (
    "id" SERIAL PRIMARY KEY,
    "query" VARCHAR NOT NULL,
    "filters" TEXT,
    "resultCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER REFERENCES "user"("id") ON DELETE CASCADE
);

-- Create item_favorite table
CREATE TABLE IF NOT EXISTS "item_favorite" (
    "id" SERIAL PRIMARY KEY,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER REFERENCES "user"("id") ON DELETE CASCADE,
    "itemId" INTEGER REFERENCES "item"("id") ON DELETE CASCADE,
    UNIQUE("userId", "itemId")
);

-- Create item_report table
CREATE TABLE IF NOT EXISTS "item_report" (
    "id" SERIAL PRIMARY KEY,
    "reason" VARCHAR NOT NULL,
    "description" TEXT,
    "status" VARCHAR DEFAULT 'pending',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "reporterId" INTEGER REFERENCES "user"("id") ON DELETE CASCADE,
    "itemId" INTEGER REFERENCES "item"("id") ON DELETE CASCADE
);

-- Create item_purchase table  
CREATE TABLE IF NOT EXISTS "item_purchase" (
    "id" SERIAL PRIMARY KEY,
    "price" DECIMAL(10,2) NOT NULL,
    "status" VARCHAR DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "buyerId" INTEGER REFERENCES "user"("id") ON DELETE CASCADE,
    "itemId" INTEGER REFERENCES "item"("id") ON DELETE CASCADE
);

-- Create user_follow table
CREATE TABLE IF NOT EXISTS "user_follow" (
    "id" SERIAL PRIMARY KEY,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "followerId" INTEGER REFERENCES "user"("id") ON DELETE CASCADE,
    "followingId" INTEGER REFERENCES "user"("id") ON DELETE CASCADE,
    UNIQUE("followerId", "followingId")
);

-- Create user_block table
CREATE TABLE IF NOT EXISTS "user_block" (
    "id" SERIAL PRIMARY KEY,
    "reason" VARCHAR,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "blockerId" INTEGER REFERENCES "user"("id") ON DELETE CASCADE,
    "blockedId" INTEGER REFERENCES "user"("id") ON DELETE CASCADE,
    UNIQUE("blockerId", "blockedId")
);

-- Create user_report table
CREATE TABLE IF NOT EXISTS "user_report" (
    "id" SERIAL PRIMARY KEY,
    "reason" VARCHAR NOT NULL,
    "description" TEXT,
    "status" VARCHAR DEFAULT 'pending',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "reporterId" INTEGER REFERENCES "user"("id") ON DELETE CASCADE,
    "reportedId" INTEGER REFERENCES "user"("id") ON DELETE CASCADE
);

-- Create waitlist_email table
CREATE TABLE IF NOT EXISTS "waitlist_email" (
    "id" SERIAL PRIMARY KEY,
    "email" VARCHAR NOT NULL UNIQUE,
    "name" VARCHAR,
    "university" VARCHAR,
    "isNotified" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO "category" ("name", "description", "icon", "color") VALUES
('Electronics', 'Laptops, phones, gadgets', 'laptop', '#3B82F6'),
('Books', 'Textbooks, novels, academic materials', 'book', '#10B981'),
('Furniture', 'Dorm furniture, desk, chairs', 'chair', '#8B5CF6'),
('Clothing', 'Fashion, accessories, shoes', 'shirt', '#F59E0B'),
('Sports', 'Sports equipment, gym gear', 'dumbbell', '#EF4444'),
('Food', 'Snacks, meal plans, kitchen items', 'utensils', '#06B6D4'),
('Transportation', 'Bikes, scooters, car accessories', 'car', '#84CC16'),
('Services', 'Tutoring, cleaning, tech support', 'tools', '#EC4899')
ON CONFLICT ("name") DO NOTHING;

-- Insert sample interests
INSERT INTO "interest" ("name", "description") VALUES
('Technology', 'Programming, AI, gadgets'),
('Sports', 'Football, basketball, fitness'),
('Music', 'Instruments, concerts, bands'),
('Art', 'Painting, drawing, design'),
('Gaming', 'Video games, board games'),
('Travel', 'Exploring, adventures'),
('Cooking', 'Recipes, food culture'),
('Reading', 'Books, literature')
ON CONFLICT ("name") DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_item_user" ON "item"("userId");
CREATE INDEX IF NOT EXISTS "idx_item_category" ON "item"("categoryId");
CREATE INDEX IF NOT EXISTS "idx_item_status" ON "item"("status");
CREATE INDEX IF NOT EXISTS "idx_item_created" ON "item"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_message_conversation" ON "message"("conversationId");
CREATE INDEX IF NOT EXISTS "idx_notification_user" ON "notification"("userId");
CREATE INDEX IF NOT EXISTS "idx_otp_email" ON "otp"("email");

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO root;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO root;

EOF

echo "📋 Created schema SQL file"

# Execute the SQL script
echo "🔧 Executing schema creation..."
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /tmp/create_schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Database schema created successfully!"
    echo "🗂️  Tables created:"
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt"
    
    # Clean up
    rm /tmp/create_schema.sql
    
    echo ""
    echo "🎉 Database initialization complete!"
    echo "🔄 Restart your application: pm2 restart xmarket-backend"
else
    echo "❌ Schema creation failed!"
    exit 1
fi

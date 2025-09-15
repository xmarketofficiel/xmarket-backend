#!/bin/bash

# Dual Storage Setup Script
# This script sets up the database for dual storage (Cloudinary + DigitalOcean Spaces)

echo "🚀 Setting up Dual Storage System"
echo "================================"

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Check if .env.development exists
if [ ! -f ".env.development" ]; then
    echo "❌ Error: .env.development file not found"
    exit 1
fi

echo "📊 Checking environment variables..."

# Source environment variables
if [ -f ".env.development" ]; then
    set -a
    source .env.development
    set +a
    echo "✅ Environment variables loaded"
else
    echo "❌ Environment file not found"
    exit 1
fi

# Check required variables
required_vars=("DO_SPACES_KEY" "DO_SPACES_SECRET" "DO_SPACES_BUCKET" "DO_SPACES_REGION" "CLOUDINARY_CLOUD_NAME" "CLOUDINARY_API_KEY" "CLOUDINARY_API_SECRET")

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required environment variable: $var"
        exit 1
    else
        echo "✅ $var is configured"
    fi
done

echo ""
echo "🗄️  Running database migration..."

# Run the dual storage migration
if [ -f "migrations/add_dual_storage_fields.sql" ]; then
    # If using PostgreSQL
    if [ ! -z "$DATABASE_URL" ]; then
        echo "📡 Applying migration to PostgreSQL..."
        psql $DATABASE_URL -f migrations/add_dual_storage_fields.sql
        if [ $? -eq 0 ]; then
            echo "✅ Migration applied successfully"
        else
            echo "❌ Migration failed"
            exit 1
        fi
    else
        echo "⚠️  DATABASE_URL not found. Please run the migration manually:"
        echo "   psql <your_database_url> -f migrations/add_dual_storage_fields.sql"
    fi
else
    echo "❌ Migration file not found: migrations/add_dual_storage_fields.sql"
    exit 1
fi

echo ""
echo "🧪 Testing dual storage configuration..."

# Compile and run the test script
npx ts-node scripts/test-dual-storage.ts

echo ""
echo "🎉 Dual Storage Setup Complete!"
echo "================================"
echo ""
echo "Your system now supports:"
echo "✅ Cloudinary (Primary) - Fast CDN delivery"
echo "✅ DigitalOcean Spaces (Backup) - Redundant storage"
echo "✅ Presigned URL uploads - No server bandwidth usage"
echo "✅ Intelligent fallback - Automatic backup if primary fails"
echo ""
echo "Next steps:"
echo "1. Update your frontend to use the new upload endpoints"
echo "2. Test actual file uploads in development"
echo "3. Deploy to production with environment variables configured"

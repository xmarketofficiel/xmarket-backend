#!/bin/bash

# Script to test the database migration
# This script will apply the migration to add user profile fields

echo "🔧 Testing database migration for user profile fields..."

# Check if we're in the correct directory
if [ ! -f "migrations/add_user_profile_fields.sql" ]; then
    echo "❌ Migration file not found. Please run from xmarket-backend directory."
    exit 1
fi

echo "✅ Found migration file: migrations/add_user_profile_fields.sql"

# Show the migration content
echo ""
echo "📄 Migration content:"
echo "===================="
cat migrations/add_user_profile_fields.sql

echo ""
echo "🚀 To apply this migration, run:"
echo "   mysql -u username -p database_name < migrations/add_user_profile_fields.sql"
echo ""
echo "📝 This migration will:"
echo "   - Add firstName, lastName, department, role, and address fields to users table"
echo "   - Add firstName, lastName, department, role, and address fields to join_requests table"
echo "   - Migrate existing fullName data to firstName/lastName"
echo "   - Add database indexes for better performance"
echo ""
echo "⚠️  IMPORTANT: Please backup your database before running this migration!"

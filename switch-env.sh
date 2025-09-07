#!/bin/bash

# Backend Environment Switcher
# Usage: ./switch-env.sh [local|development|production]

ENV=${1:-development}

case $ENV in
  "local")
    echo "🔄 Switching to LOCAL environment..."
    cp .env.local .env
    echo "✅ Using local PostgreSQL database"
    echo "📍 Backend will run on: http://localhost:3001"
    echo "🔗 Connect frontend to: http://localhost:3001"
    ;;
  
  "development")
    echo "🔄 Switching to DEVELOPMENT environment..."
    cp .env.development .env
    echo "✅ Using development database"
    echo "📍 Backend will run on: http://localhost:3001"
    echo "🔗 Connect frontend to: http://localhost:3001"
    ;;
  
  "production")
    echo "🔄 Switching to PRODUCTION environment..."
    cp .env.production .env
    echo "✅ Using production AWS RDS database"
    echo "📍 Backend will run on: http://13.39.233.207"
    echo "⚠️  CAUTION: This affects production data!"
    ;;
  
  *)
    echo "❌ Invalid environment: $ENV"
    echo "Usage: $0 [local|development|production]"
    echo ""
    echo "Available environments:"
    echo "  local       - Local PostgreSQL database"
    echo "  development - Development database" 
    echo "  production  - Production AWS RDS database"
    exit 1
    ;;
esac

echo ""
echo "📄 Current environment variables:"
echo "NODE_ENV=$(grep NODE_ENV .env | cut -d'=' -f2)"
echo "DATABASE_URL=$(grep DATABASE_URL .env | cut -d'=' -f2 | cut -d'@' -f2 | cut -d'?' -f1)"

echo ""
echo "🚀 Next steps:"
echo "1. npm run build"
echo "2. npm run start:dev  # for development"
echo "   OR"
echo "   npm run start:prod # for production"

#!/bin/bash

# AWS Deployment Script for University Marketplace Backend
# This script builds and prepares the backend for AWS deployment

set -e

echo "🚀 Preparing Backend for AWS Deployment..."

# Build the application
echo "📦 Building NestJS application..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed! dist directory not found."
    exit 1
fi

echo "✅ Build successful!"

# Create deployment package
echo "📦 Creating deployment package..."
rm -rf deploy-package
mkdir -p deploy-package

# Copy essential files
cp -r dist deploy-package/
cp package*.json deploy-package/
cp .env.production deploy-package/.env
cp -r uploads deploy-package/ 2>/dev/null || mkdir -p deploy-package/uploads
cp initialize-production-db.js deploy-package/

# Create start script for production
cat > deploy-package/start.sh << 'EOF'
#!/bin/bash
export NODE_ENV=production

# Initialize database tables on first run
if [ ! -f .db-initialized ]; then
    echo "🔄 Initializing database tables..."
    node initialize-production-db.js
    if [ $? -eq 0 ]; then
        touch .db-initialized
        echo "✅ Database initialized successfully!"
    else
        echo "❌ Database initialization failed!"
        exit 1
    fi
fi

# Start the application
node dist/main.js
EOF

chmod +x deploy-package/start.sh

echo "✅ Deployment package ready in 'deploy-package' directory"
echo "📁 Package contents:"
ls -la deploy-package/

echo ""
echo "🎯 Next steps:"
echo "1. Upload the 'deploy-package' directory to your AWS EC2 instance"
echo "2. Run 'npm ci --only=production' in the deployed directory"
echo "3. Set up your RDS database and update .env file"
echo "4. Run './start.sh' to start the application"

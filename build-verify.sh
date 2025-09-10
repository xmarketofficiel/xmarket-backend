#!/bin/bash
# Build verification script for Railway

echo "🔧 Starting XMarket Backend Build Process..."
echo "==========================================="

# Check Node.js version
echo "📦 Node.js version:"
node --version

# Check npm version  
echo "📦 npm version:"
npm --version

# Install dependencies
echo ""
echo "📥 Installing dependencies..."
npm install

# Check if node_modules was created
if [ -d "node_modules" ]; then
    echo "✅ node_modules created successfully"
else
    echo "❌ node_modules creation failed"
    exit 1
fi

# Run build
echo ""
echo "🔨 Building application..."
npm run build

# Verify dist directory was created
if [ -d "dist" ]; then
    echo "✅ dist directory created successfully"
    echo "📁 Contents of dist directory:"
    ls -la dist/
    
    # Check if main.js exists
    if [ -f "dist/main.js" ]; then
        echo "✅ main.js found in dist directory"
    else
        echo "❌ main.js not found in dist directory"
        exit 1
    fi
else
    echo "❌ dist directory not created"
    echo "📁 Current directory contents:"
    ls -la
    exit 1
fi

echo ""
echo "🎉 Build verification completed successfully!"
echo "✅ Ready for Railway deployment"

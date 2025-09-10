#!/bin/bash

echo "🔍 Verifying Railway deployment readiness..."

# Clean any previous build artifacts
echo "🧹 Cleaning previous build artifacts..."
rm -rf dist/
rm -f tsconfig.tsbuildinfo

# Test build process
echo "🏗️  Testing build process..."
npm run build

# Verify build output
if [ -f "dist/main.js" ]; then
    echo "✅ Build successful - main.js created"
    echo "📁 Dist directory contents:"
    ls -la dist/ | head -10
    echo "📏 main.js size: $(stat -c%s dist/main.js) bytes"
else
    echo "❌ Build failed - main.js not found"
    exit 1
fi

# Test start command
echo "🚀 Testing start command..."
timeout 3s npm run start:prod > /dev/null 2>&1
if [ $? -eq 124 ]; then
    echo "✅ Start command works (timed out as expected)"
else
    echo "⚠️  Start command may have issues"
fi

echo "🎉 Railway deployment verification complete!"
echo ""
echo "📋 Next steps for Railway:"
echo "1. Push your changes to GitHub"
echo "2. Deploy on Railway - the build should now work"
echo "3. Set up PostgreSQL service on Railway"
echo "4. Configure environment variables using .env.railway.template"

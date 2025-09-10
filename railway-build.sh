#!/bin/bash

echo "🚂 Railway Build Script"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "TypeScript version: $(npx tsc --version)"

# Clean previous builds
echo "🧹 Cleaning previous build artifacts..."
rm -rf dist/
rm -f tsconfig.tsbuildinfo

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build with verbose output
echo "🏗️ Building application..."
npx tsc -p tsconfig.json

# Verify build output
echo "🔍 Verifying build output..."
if [ -d "dist" ]; then
    echo "✅ dist directory created"
    if [ -f "dist/main.js" ]; then
        echo "✅ main.js exists"
        echo "📏 main.js size: $(stat -c%s dist/main.js) bytes"
        echo "🎉 Build successful!"
    else
        echo "❌ main.js not found in dist directory"
        echo "📁 dist contents:"
        ls -la dist/
        exit 1
    fi
else
    echo "❌ dist directory not created"
    exit 1
fi

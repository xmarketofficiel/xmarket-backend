#!/bin/bash
# Railway Deployment Verification Script

echo "🚀 XMarket Backend - Railway Deployment Status Check"
echo "================================================="

# Check if Railway deployment URL is provided
if [ -z "$1" ]; then
    echo "❌ Please provide your Railway deployment URL"
    echo "Usage: ./verify-deployment.sh https://your-app.up.railway.app"
    exit 1
fi

RAILWAY_URL=$1

echo "🔍 Testing Railway deployment at: $RAILWAY_URL"
echo ""

# Test 1: Basic connectivity
echo "1️⃣ Testing basic connectivity..."
if curl -s --head --fail "$RAILWAY_URL" > /dev/null; then
    echo "✅ Basic connectivity: PASS"
else
    echo "❌ Basic connectivity: FAIL - Service might not be running"
fi

# Test 2: Categories endpoint (simple GET)
echo ""
echo "2️⃣ Testing categories endpoint..."
CATEGORIES_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" "$RAILWAY_URL/categories")
HTTP_CODE=$(echo "$CATEGORIES_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Categories endpoint: PASS (HTTP $HTTP_CODE)"
else
    echo "❌ Categories endpoint: FAIL (HTTP $HTTP_CODE)"
    echo "Response: $(echo "$CATEGORIES_RESPONSE" | sed 's/HTTP_CODE:[0-9]*//')"
fi

# Test 3: Swagger API documentation
echo ""
echo "3️⃣ Testing Swagger API docs..."
SWAGGER_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" "$RAILWAY_URL/api")
SWAGGER_HTTP_CODE=$(echo "$SWAGGER_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)

if [ "$SWAGGER_HTTP_CODE" = "200" ]; then
    echo "✅ Swagger docs: PASS (HTTP $SWAGGER_HTTP_CODE)"
    echo "📖 API docs available at: $RAILWAY_URL/api"
else
    echo "❌ Swagger docs: FAIL (HTTP $SWAGGER_HTTP_CODE)"
fi

# Test 4: Health check (if available)
echo ""
echo "4️⃣ Testing health check..."
HEALTH_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" "$RAILWAY_URL/health" 2>/dev/null)
HEALTH_HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)

if [ "$HEALTH_HTTP_CODE" = "200" ]; then
    echo "✅ Health check: PASS (HTTP $HEALTH_HTTP_CODE)"
elif [ "$HEALTH_HTTP_CODE" = "404" ]; then
    echo "⚠️  Health check: Not configured (using categories endpoint instead)"
else
    echo "❌ Health check: FAIL (HTTP $HEALTH_HTTP_CODE)"
fi

echo ""
echo "================================================="
echo "🎯 Deployment Summary:"
echo "- Service URL: $RAILWAY_URL"
echo "- API Documentation: $RAILWAY_URL/api"
echo "- Test Categories: $RAILWAY_URL/categories"
echo ""
echo "📝 Next Steps:"
echo "1. Update your frontend FRONTEND_URL environment variables"
echo "2. Test authentication endpoints with real credentials"
echo "3. Verify database connectivity by creating test data"

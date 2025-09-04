#!/bin/bash

echo "🚀 Starting Race-OS Demo..."

# Start backend in background
echo "📡 Starting backend server..."
cd /workspaces/Race-OS/financial-hub/backend
npm start &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 10

# Test backend health
echo "🔍 Testing backend health..."
curl -s http://localhost:5000/health | jq .

# Register a demo user
echo "👤 Creating demo user..."
RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Demo",
    "lastName": "User", 
    "email": "demo@financialhub.com",
    "password": "demo123",
    "businessName": "Demo Creator Business",
    "businessType": "sole_proprietorship"
  }')

echo $RESPONSE | jq .

# Extract token
TOKEN=$(echo $RESPONSE | jq -r '.token')

if [ "$TOKEN" != "null" ]; then
  echo "✅ User registered successfully!"
  
  # Seed demo data
  echo "📊 Seeding demo data..."
  curl -s -X POST http://localhost:5000/api/demo/seed \
    -H "Authorization: Bearer $TOKEN" | jq .
  
  # Get dashboard data
  echo "📈 Fetching dashboard data..."
  curl -s http://localhost:5000/api/dashboard \
    -H "Authorization: Bearer $TOKEN" | jq '.accounts, .monthlySummary, .taxJarStatus'
  
  echo ""
  echo "🎉 Demo complete! You can now:"
  echo "   1. Visit http://localhost:3000 (when frontend starts)"
  echo "   2. Login with: demo@financialhub.com / demo123"
  echo "   3. Explore the dashboard with realistic data"
  echo ""
  echo "💡 Backend running on: http://localhost:5000"
  echo "💡 API Documentation: http://localhost:5000/api/status"
else
  echo "❌ Failed to register user"
fi

# Keep script running
echo "Press Ctrl+C to stop the backend server"
wait $BACKEND_PID

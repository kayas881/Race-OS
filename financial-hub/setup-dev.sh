#!/bin/bash

# Financial Hub Development Setup Script

echo "🚀 Setting up Financial Hub Development Environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first."
    echo "   You can start it with: mongod"
fi

echo "📦 Installing backend dependencies..."
cd backend && npm install

echo "🗃️  Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo "⚠️  Please update .env with your API keys and configuration"
else
    echo "✅ .env file already exists"
fi

echo "🌱 Seeding database with default categories..."
node scripts/seedCategories.js

echo "📦 Installing frontend dependencies..."
cd ../frontend && npm install

echo "🎉 Setup complete!"
echo ""
echo "To start the development servers:"
echo "1. Backend:  cd backend && npm run dev"
echo "2. Frontend: cd frontend && npm start"
echo ""
echo "The application will be available at:"
echo "- Frontend: http://localhost:3000"
echo "- Backend:  http://localhost:5000"
echo ""
echo "Don't forget to:"
echo "1. Update backend/.env with your API credentials"
echo "2. Ensure MongoDB is running"
echo "3. Get Plaid API keys for bank integrations"

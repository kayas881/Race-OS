#!/bin/bash

echo "🚀 Starting Financial Hub Backend..."

cd /workspaces/Race-OS/financial-hub/backend

# Kill any existing processes
pkill -f "node server.js" 2>/dev/null || true
lsof -ti:5000 | xargs kill -9 2>/dev/null || true

sleep 2

# Start the backend server
NODE_ENV=development npm start

echo "✅ Backend started on port 5000"

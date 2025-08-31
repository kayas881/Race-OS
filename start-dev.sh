#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Financial Hub Development Environment...${NC}"

# Check if we're in the right directory
if [ ! -d "financial-hub" ]; then
    echo -e "${RED}❌ Error: financial-hub directory not found. Please run this script from the Race-OS root directory.${NC}"
    exit 1
fi

# Function to cleanup background processes on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down servers...${NC}"
    jobs -p | xargs -r kill
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Start backend
echo -e "${GREEN}🔧 Starting Backend Server...${NC}"
cd financial-hub/backend
npm start &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Go back to root and start frontend
cd ../../
echo -e "${GREEN}🎨 Starting Frontend Server...${NC}"
cd financial-hub/frontend
npm start &
FRONTEND_PID=$!

# Go back to root
cd ../../

echo -e "${GREEN}✅ Development servers started!${NC}"
echo -e "${BLUE}📊 Backend: http://localhost:5000${NC}"
echo -e "${BLUE}🌐 Frontend: http://localhost:3000${NC}"
echo -e "${YELLOW}💡 Press Ctrl+C to stop both servers${NC}"

# Wait for background processes
wait

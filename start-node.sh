#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting AI Project Services (Node.js Backend)...${NC}"

# Configure for Node.js backend
echo -e "${YELLOW}🔧 Configuring for Node.js backend...${NC}"
./scripts/port-manager.sh configure node

# Get configuration from port manager
BACKEND_TYPE="node"
BACKEND_PORT=$(./scripts/port-manager.sh port node backend)
FRONTEND_PORT=$(./scripts/port-manager.sh port node frontend)
BACKEND_FOLDER=$(./scripts/port-manager.sh folder node)

echo -e "${BLUE}📊 Node.js Backend Configuration:${NC}"
echo "   Backend: localhost:${BACKEND_PORT} (${BACKEND_FOLDER}/)"
echo "   Frontend: localhost:${FRONTEND_PORT}"

# Kill any existing processes
pkill -f "node.*server.js" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
pkill -f "uvicorn" 2>/dev/null

echo -e "${GREEN}✅ Cleaned up existing processes${NC}"

# Start Node.js backend
echo -e "\n${BLUE}🔧 Starting Node.js Backend Server...${NC}"
cd ${BACKEND_FOLDER}

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}📝 Please edit ${BACKEND_FOLDER}/.env with your API keys${NC}"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
    npm install
fi

# Start backend with specified port
PORT=${BACKEND_PORT} npm start &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"
cd ..

# Start backend server in background
node server.js &
BACKEND_PID=$!
echo "Node.js Backend started with PID: $BACKEND_PID"

# Wait for backend to start
sleep 5

# Check backend
if curl -s http://localhost:8001/ > /dev/null; then
    echo "✅ Node.js Backend is running on http://localhost:8001"
else
    echo "⚠️  Backend may need more time to start"
fi

# Start frontend
echo "🌐 Starting Frontend Server..."
cd ../frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

npm run dev &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

# Wait for frontend
sleep 3

echo ""
echo "🎉 Services Started!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Node.js Backend: http://localhost:8001"
echo "📚 API Status: http://localhost:8001/"
echo ""
echo "🔧 Backend Features:"
echo "   • OpenAI Whisper Transcription"
echo "   • Deepgram Cloud Transcription"
echo "   • AI Summaries & Analysis"
echo "   • Interactive Chat System"
echo ""
echo "📝 Configuration:"
echo "   • Backend config: backend-node/.env"
echo "   • Frontend config: frontend/.env"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'echo "🛑 Stopping services..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo "✅ All services stopped"; exit' INT
wait

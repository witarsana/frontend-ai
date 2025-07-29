#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting AI Project Services...${NC}"

# Load environment variables
if [ -f .env ]; then
    source .env
    echo -e "${GREEN}✅ Environment variables loaded${NC}"
else
    echo -e "⚠️  Warning: .env file not found"
fi

echo -e "${BLUE}📊 Project Configuration:${NC}"
echo "   Backend: ${BACKEND_HOST}:${BACKEND_PORT}"
echo "   Frontend: ${FRONTEND_HOST}:${FRONTEND_PORT}"

# Function to start backend
start_backend() {
    echo -e "\n${BLUE}🔧 Starting Backend Server...${NC}"
    cd backend
    python ffmpeg_free_main.py &
    BACKEND_PID=$!
    echo "Backend started with PID: $BACKEND_PID"
    cd ..
    
    # Wait for backend to be ready
    echo -e "${BLUE}⏳ Waiting for backend to initialize...${NC}"
    sleep 3
    
    # Check if backend is responding
    local max_attempts=10
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:${BACKEND_PORT}/api/engines > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend is ready!${NC}"
            break
        else
            echo -e "   Attempt $attempt/$max_attempts - Backend not ready yet..."
            sleep 2
            attempt=$((attempt + 1))
        fi
    done
    
    if [ $attempt -gt $max_attempts ]; then
        echo -e "${RED}❌ Backend failed to start properly${NC}"
        exit 1
    fi
}

# Function to start frontend
start_frontend() {
    echo -e "\n${BLUE}🌐 Starting Frontend Server...${NC}"
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    echo "Frontend started with PID: $FRONTEND_PID"
    cd ..
}

# Check if ports are already in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "⚠️  Port $1 is already in use"
        return 1
    else
        return 0
    fi
}

# Main execution
echo -e "\n${BLUE}🔍 Checking port availability...${NC}"

if check_port $BACKEND_PORT && check_port $FRONTEND_PORT; then
    echo -e "${GREEN}✅ Ports are available${NC}"
    
    # Start services
    start_backend
    start_frontend
    
    echo -e "\n${GREEN}🎉 Services started successfully!${NC}"
    echo -e "Backend: http://${BACKEND_HOST}:${BACKEND_PORT}"
    echo -e "Frontend: http://${FRONTEND_HOST}:${FRONTEND_PORT}"
    echo -e "\n${BLUE}Press Ctrl+C to stop all services${NC}"
    
    # Wait for Ctrl+C
    trap 'echo -e "\n${BLUE}🛑 Stopping services...${NC}"; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT
    wait
else
    echo -e "❌ Port conflict detected. Please check running services."
    exit 1
fi

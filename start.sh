#!/bin/bash

# ========================================
# 🚀 Voice Note AI - Enhanced Starter
# ========================================

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}🚀 Starting Voice Note AI Enhanced...${NC}"
echo -e "${BLUE}📍 Working directory: $(pwd)${NC}"

# Enhanced port cleanup function
cleanup_ports() {
    echo -e "${YELLOW}🧹 Cleaning up all existing services...${NC}"
    
    # Kill processes on common ports
    PORTS=(3000 3001 8000 8001 8080 5173)
    
    for port in "${PORTS[@]}"; do
        echo -e "   🔍 Checking port ${port}..."
        PIDS=$(lsof -ti:${port} 2>/dev/null || true)
        if [ ! -z "$PIDS" ]; then
            echo -e "   ❌ Killing processes on port ${port}: $PIDS"
            echo "$PIDS" | xargs kill -9 2>/dev/null || true
        else
            echo -e "   ✅ Port ${port} is free"
        fi
    done
    
    # Kill any existing backend/frontend processes
    echo -e "   🔍 Cleaning up existing PIDs..."
    if [ -f "backend.pid" ]; then
        BACKEND_PID=$(cat backend.pid)
        kill $BACKEND_PID 2>/dev/null || true
        rm backend.pid
        echo -e "   ❌ Killed backend PID: $BACKEND_PID"
    fi
    
    if [ -f "frontend.pid" ]; then
        FRONTEND_PID=$(cat frontend.pid)
        kill $FRONTEND_PID 2>/dev/null || true
        rm frontend.pid
        echo -e "   ❌ Killed frontend PID: $FRONTEND_PID"
    fi
    
    # Kill any Node.js processes that might be running dev servers
    echo -e "   🔍 Cleaning up Node.js dev servers..."
    pkill -f "vite\|npm run dev\|next dev" 2>/dev/null || true
    
    # Kill any Python processes that might be running our backend
    echo -e "   🔍 Cleaning up Python backend processes..."
    pkill -f "ffmpeg_free_main.py\|uvicorn.*8000" 2>/dev/null || true
    
    # Wait for cleanup
    sleep 3
    echo -e "${GREEN}✅ Cleanup completed!${NC}"
}

# Clean up ports first
cleanup_ports

# Clean up ports first
cleanup_ports

# Check if .env exists
if [ ! -f ".env" ]; then
    if [ -f ".env.master" ]; then
        echo -e "${YELLOW}⚠️  Copying .env from .env.master${NC}"
        cp .env.master .env
    else
        echo -e "${RED}❌ No .env file found${NC}"
        echo -e "${RED}📍 Current directory: $(pwd)${NC}"
        echo -e "${RED}📂 Files: $(ls -la | head -5)${NC}"
        exit 1
    fi
fi

# Function to start backend
start_backend() {
    echo -e "${BLUE}🔧 Starting Python Backend Server...${NC}"
    cd backend
    
    # Check if Python environment is set up
    if command -v conda &> /dev/null; then
        echo -e "   🐍 Using conda environment..."
        # Try to activate transcription-ai environment
        eval "$(conda shell.bash hook)" 2>/dev/null || true
        conda activate transcription-ai 2>/dev/null || echo -e "   ⚠️  transcription-ai env not found, using base"
    fi
    
    # Start backend
    nohup python ffmpeg_free_main.py > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid
    echo -e "   📊 Backend PID: $BACKEND_PID"
    cd ..
}

# Function to start frontend  
start_frontend() {
    echo -e "${BLUE}🌐 Starting Vite Frontend Server...${NC}"
    cd frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "   📦 Installing dependencies..."
        npm install
    fi
    
    # Start frontend
    nohup npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    echo -e "   📊 Frontend PID: $FRONTEND_PID"
    cd ..
}

# Start both services
echo -e "${PURPLE}🚀 Starting both services simultaneously...${NC}"
start_backend &
start_frontend &

# Wait for both to start
wait

# Enhanced backend health check
wait_for_backend() {
    echo -e "${YELLOW}⏳ Waiting for backend to be ready...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:8000/api/engines > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend is ready! (API responding)${NC}"
            return 0
        elif curl -s http://localhost:8001/api/engines > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend is ready on port 8001! (API responding)${NC}"
            return 0
        else
            echo -e "   ⏳ Attempt $i/30: Backend not ready yet..."
            sleep 2
        fi
    done
    echo -e "${RED}❌ Backend failed to start within 60 seconds${NC}"
    return 1
}

# Enhanced frontend health check
wait_for_frontend() {
    echo -e "${YELLOW}⏳ Waiting for frontend to be ready...${NC}"
    for i in {1..30}; do
        # Check multiple common ports for Vite
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Frontend is ready on port 3000!${NC}"
            FRONTEND_URL="http://localhost:3000"
            return 0
        elif curl -s http://localhost:3001 > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Frontend is ready on port 3001!${NC}"
            FRONTEND_URL="http://localhost:3001"
            return 0
        elif curl -s http://localhost:5173 > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Frontend is ready on port 5173!${NC}"
            FRONTEND_URL="http://localhost:5173"
            return 0
        else
            echo -e "   ⏳ Attempt $i/30: Frontend not ready yet..."
            sleep 2
        fi
    done
    echo -e "${RED}❌ Frontend failed to start within 60 seconds${NC}"
    return 1
}

# Wait for services
wait_for_backend
BACKEND_STATUS=$?

wait_for_frontend  
FRONTEND_STATUS=$?

# Show results
echo -e "${GREEN}"
echo "════════════════════════════════════════"
echo "🎉 Voice Note AI Enhanced Startup Complete!"
echo "════════════════════════════════════════"
echo -e "${NC}"

if [ $BACKEND_STATUS -eq 0 ]; then
    echo -e "${GREEN}🔧 Backend:  http://localhost:8000 ✅${NC}"
    echo -e "${GREEN}� API:      http://localhost:8000/api/engines ✅${NC}"
else
    echo -e "${RED}🔧 Backend:  FAILED TO START ❌${NC}"
fi

if [ $FRONTEND_STATUS -eq 0 ]; then
    echo -e "${GREEN}🌐 Frontend: ${FRONTEND_URL} ✅${NC}"
else
    echo -e "${RED}🌐 Frontend: FAILED TO START ❌${NC}"
fi

echo ""
echo -e "${BLUE}📊 Process IDs:${NC}"
if [ -f "backend.pid" ]; then
    echo "   Backend:  $(cat backend.pid)"
fi
if [ -f "frontend.pid" ]; then
    echo "   Frontend: $(cat frontend.pid)"
fi

echo ""
echo -e "${BLUE}📋 Log Files:${NC}"
echo "   Backend:  backend.log"
echo "   Frontend: frontend.log"

echo ""
echo -e "${YELLOW}💡 Commands:${NC}"
echo "   Stop all: ./stop.sh"
echo "   Restart:  ./start.sh"
echo "   Logs:     tail -f backend.log frontend.log"

echo -e "${BLUE}💡 Press Ctrl+C to stop all services${NC}"

# Enhanced cleanup function
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping all services...${NC}"
    
    # Kill by PID files
    if [ -f "backend.pid" ]; then
        BACKEND_PID=$(cat backend.pid)
        echo -e "   ❌ Stopping backend (PID: $BACKEND_PID)"
        kill $BACKEND_PID 2>/dev/null || true
        rm backend.pid
    fi
    
    if [ -f "frontend.pid" ]; then
        FRONTEND_PID=$(cat frontend.pid)
        echo -e "   ❌ Stopping frontend (PID: $FRONTEND_PID)"
        kill $FRONTEND_PID 2>/dev/null || true
        rm frontend.pid
    fi
    
    # Force cleanup if needed
    echo -e "   🧹 Force cleaning remaining processes..."
    pkill -f "ffmpeg_free_main.py" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    
    echo -e "${GREEN}✅ All services stopped!${NC}"
    exit 0
}

# Handle Ctrl+C and termination signals
trap cleanup SIGINT SIGTERM

# Keep running with status monitoring
echo -e "${PURPLE}🔄 Monitoring services... (Press Ctrl+C to stop)${NC}"
while true; do
    # Check if services are still running
    if [ -f "backend.pid" ] && ! kill -0 $(cat backend.pid) 2>/dev/null; then
        echo -e "${RED}⚠️  Backend process died unexpectedly${NC}"
        rm backend.pid 2>/dev/null || true
    fi
    
    if [ -f "frontend.pid" ] && ! kill -0 $(cat frontend.pid) 2>/dev/null; then
        echo -e "${RED}⚠️  Frontend process died unexpectedly${NC}"
        rm frontend.pid 2>/dev/null || true
    fi
    
    sleep 5
done

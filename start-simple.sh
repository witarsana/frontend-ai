#!/bin/bash

# ========================================
# 🚀 Voice Note AI - Simple Starter
# ========================================

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Voice Note AI...${NC}"

# Kill existing processes
echo -e "${YELLOW}🔄 Killing existing processes...${NC}"
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 2

# Check if .env exists
if [ ! -f ".env" ]; then
    if [ -f ".env.master" ]; then
        echo -e "${YELLOW}⚠️  Copying .env from .env.master${NC}"
        cp .env.master .env
    else
        echo -e "${RED}❌ No .env file found${NC}"
        exit 1
    fi
fi

# Start backend
echo -e "${BLUE}🔧 Starting backend...${NC}"
cd backend
nohup python3 ffmpeg_free_main.py > backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../backend.pid
cd ..

# Wait for backend
echo -e "${YELLOW}⏳ Waiting for backend...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend ready${NC}"
        break
    fi
    sleep 2
done

# Start frontend
echo -e "${BLUE}🌐 Starting frontend...${NC}"
cd frontend
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../frontend.pid
cd ..

# Wait for frontend
echo -e "${YELLOW}⏳ Waiting for frontend...${NC}"
for i in {1..60}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend ready${NC}"
        break
    fi
    sleep 2
done

echo -e "${GREEN}"
echo "════════════════════════════════════════"
echo "🎉 Voice Note AI is ready!"
echo "════════════════════════════════════════"
echo -e "${NC}"
echo -e "${GREEN}🌐 Frontend: http://localhost:3000${NC}"
echo -e "${GREEN}🔧 Backend:  http://localhost:8000${NC}"
echo ""
echo -e "${BLUE}📊 Process IDs:${NC}"
echo "   Backend:  $(cat backend.pid)"
echo "   Frontend: $(cat frontend.pid)"
echo ""
echo -e "${YELLOW}💡 To stop: ./stop.sh${NC}"
echo -e "${BLUE}💡 Press Ctrl+C to stop all services${NC}"

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping services...${NC}"
    
    if [ -f "backend.pid" ]; then
        kill $(cat backend.pid) 2>/dev/null || true
        rm backend.pid
    fi
    
    if [ -f "frontend.pid" ]; then
        kill $(cat frontend.pid) 2>/dev/null || true
        rm frontend.pid
    fi
    
    exit 0
}

# Handle Ctrl+C
trap cleanup SIGINT SIGTERM

# Keep running
while true; do
    sleep 1
done

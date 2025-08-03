#!/bin/bash

# ========================================
# 🛑 Voice Note AI - E# Run cleanup
cleanup_all

# Verify cleanup was successful
echo -e "${BLUE}🔍 Verifying cleanup...${NC}"
REMAINING_PORTS=(3000 3001 8000 8001)
for port in "${REMAINING_PORTS[@]}"; do
    if lsof -ti:${port} > /dev/null 2>&1; then
        echo -e "${RED}⚠️  Port ${port} still occupied${NC}"
    else
        echo -e "${GREEN}✅ Port ${port} is free${NC}"
    fi
done

# Stop Docker services if they exist
if command -v docker &> /dev/null && [ -f "docker-compose.whisper.yml" ]; then
    echo -e "${YELLOW}🐋 Stopping Docker services...${NC}"
    docker-compose -f docker-compose.whisper.yml down 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════"
echo -e "✅ All Voice Note AI services stopped!"
echo -e "════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}💡 Commands:${NC}"
echo "   Restart: ./start.sh"
echo "   Check logs: tail -f backend.log frontend.log"
echo "   Check ports: lsof -i :3000,:8000"r
# ========================================

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${BLUE}🛑 Stopping Voice Note AI Enhanced...${NC}"

# Enhanced cleanup function
cleanup_all() {
    echo -e "${PURPLE}🧹 Comprehensive cleanup starting...${NC}"
    
    # Stop by PID files first
    if [ -f "backend.pid" ]; then
        BACKEND_PID=$(cat backend.pid)
        echo -e "${YELLOW}🔧 Stopping backend (PID: $BACKEND_PID)...${NC}"
        kill $BACKEND_PID 2>/dev/null || true
        kill -9 $BACKEND_PID 2>/dev/null || true
        rm backend.pid
        echo -e "   ✅ Backend PID stopped"
    fi

    if [ -f "frontend.pid" ]; then
        FRONTEND_PID=$(cat frontend.pid)
        echo -e "${YELLOW}🌐 Stopping frontend (PID: $FRONTEND_PID)...${NC}"
        kill $FRONTEND_PID 2>/dev/null || true
        kill -9 $FRONTEND_PID 2>/dev/null || true
        rm frontend.pid
        echo -e "   ✅ Frontend PID stopped"
    fi

    # Kill by ports (comprehensive)
    echo -e "${YELLOW}🔄 Killing processes on all relevant ports...${NC}"
    PORTS=(3000 3001 8000 8001 8080 5173)
    
    for port in "${PORTS[@]}"; do
        PIDS=$(lsof -ti:${port} 2>/dev/null || true)
        if [ ! -z "$PIDS" ]; then
            echo -e "   ❌ Killing processes on port ${port}: $PIDS"
            echo "$PIDS" | xargs kill -9 2>/dev/null || true
        else
            echo -e "   ✅ Port ${port} is already free"
        fi
    done

    # Kill by process names (comprehensive)
    echo -e "${YELLOW}🎯 Killing processes by name...${NC}"
    
    # Python backend processes
    echo -e "   � Stopping Python backend processes..."
    pkill -f "ffmpeg_free_main.py" 2>/dev/null && echo -e "     ✅ Killed ffmpeg_free_main.py" || echo -e "     ✅ No ffmpeg_free_main.py found"
    pkill -f "uvicorn.*8000" 2>/dev/null && echo -e "     ✅ Killed uvicorn backend" || echo -e "     ✅ No uvicorn backend found"
    
    # Node.js frontend processes  
    echo -e "   📦 Stopping Node.js frontend processes..."
    pkill -f "npm run dev" 2>/dev/null && echo -e "     ✅ Killed npm run dev" || echo -e "     ✅ No npm run dev found"
    pkill -f "vite" 2>/dev/null && echo -e "     ✅ Killed vite" || echo -e "     ✅ No vite found"
    pkill -f "node.*vite" 2>/dev/null && echo -e "     ✅ Killed node vite" || echo -e "     ✅ No node vite found"
    
    # Any remaining related processes
    echo -e "   🔍 Cleaning up any remaining related processes..."
    pkill -f "transcription.*ai" 2>/dev/null || true
    pkill -f "voice.*note" 2>/dev/null || true
    
    # Wait a moment for cleanup
    sleep 2
    
    echo -e "${GREEN}✅ Comprehensive cleanup completed!${NC}"
}

# Run cleanup
cleanup_all
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:9000 | xargs kill -9 2>/dev/null || true

# Stop Docker services
if command -v docker &> /dev/null; then
    echo -e "${YELLOW}� Stopping Docker services...${NC}"
    docker-compose -f docker-compose.whisper.yml down 2>/dev/null || true
fi

echo -e "${GREEN}✅ All services stopped${NC}"
echo -e "${BLUE}💡 To start again: ./start.sh${NC}"

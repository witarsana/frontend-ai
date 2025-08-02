#!/bin/bash

# ========================================
# 🛑 Voice Note AI - Simple Stopper
# ========================================

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🛑 Stopping Voice Note AI...${NC}"

# Stop by PID files
if [ -f "backend.pid" ]; then
    echo -e "${YELLOW}🔧 Stopping backend...${NC}"
    kill $(cat backend.pid) 2>/dev/null || true
    rm backend.pid
fi

if [ -f "frontend.pid" ]; then
    echo -e "${YELLOW}🌐 Stopping frontend...${NC}"
    kill $(cat frontend.pid) 2>/dev/null || true
    rm frontend.pid
fi

# Kill by ports (backup)
echo -e "${YELLOW}🔄 Killing processes on ports...${NC}"
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

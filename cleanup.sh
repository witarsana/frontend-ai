#!/bin/bash

# ========================================
# 🧹 Voice Note AI - Simple Cleanup
# ========================================
# Remove all unnecessary processes and clean up

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🧹 Cleaning up Voice Note AI processes...${NC}"

# Kill all related processes
pkill -f "python3 ffmpeg_free_main.py" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "node.*vite" 2>/dev/null || true

# Kill by common ports
for port in 3000 8000 9000; do
    if lsof -i :$port &> /dev/null; then
        echo -e "${YELLOW}Killing process on port $port${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    fi
done

# Stop Docker containers
if command -v docker &> /dev/null; then
    docker-compose -f docker-compose.whisper.yml down 2>/dev/null || true
fi

# Clean up pid files
rm -f .backend.pid .frontend.pid

echo -e "${GREEN}✅ Cleanup complete!${NC}"

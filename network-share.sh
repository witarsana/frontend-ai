#!/bin/bash

# ========================================
# 🌐 Voice Note AI - Network Share
# ========================================

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get IP address
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')

echo -e "${BLUE}🌐 Starting Voice Note AI for Network Access...${NC}"
echo -e "${BLUE}📍 Your IP Address: ${IP}${NC}"

# Stop existing services
./stop.sh 2>/dev/null

# Start with network binding
echo -e "${YELLOW}🚀 Starting Backend on all interfaces...${NC}"
cd backend
python ffmpeg_free_main.py --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd ../frontend
echo -e "${YELLOW}🌐 Starting Frontend on all interfaces...${NC}"
npm run dev -- --host 0.0.0.0 --port 3000 &
FRONTEND_PID=$!

# Wait for services
sleep 5

echo -e "${GREEN}✅ Network sharing active!${NC}"
echo -e ""
echo -e "🔗 ${GREEN}Local Access:${NC}"
echo -e "   Frontend: http://localhost:3000"
echo -e "   Backend:  http://localhost:8000"
echo -e ""
echo -e "🌐 ${GREEN}Network Access:${NC}"
echo -e "   Frontend: http://${IP}:3000"
echo -e "   Backend:  http://${IP}:8000"
echo -e ""
echo -e "📱 ${YELLOW}Share these URLs with devices on your network!${NC}"
echo -e ""
echo -e "💡 Press Ctrl+C to stop"

# Save PIDs
echo $BACKEND_PID > backend.pid
echo $FRONTEND_PID > frontend.pid

# Monitor
wait
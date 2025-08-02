#!/bin/bash

# ========================================
# 🚀 Voice Note AI - Universal Starter
# ========================================
# Single command to start the entire application
# Manages all services, ports, and dependencies

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="Voice Note AI"
VERSION="1.0.0"
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default ports (can be overridden by .env)
DEFAULT_BACKEND_PORT=8000
DEFAULT_FRONTEND_PORT=3000
DEFAULT_WHISPER_PORT=9000

# Load environment variables
load_env() {
    if [ -f "$BASE_DIR/.env" ]; then
        echo -e "${BLUE}📋 Loading environment from .env${NC}"
        # Use set -a to export all variables automatically
        set -a
        source "$BASE_DIR/.env"
        set +a
    elif [ -f "$BASE_DIR/.env.master" ]; then
        echo -e "${YELLOW}⚠️  No .env found, copying from .env.master${NC}"
        cp "$BASE_DIR/.env.master" "$BASE_DIR/.env"
        echo -e "${BLUE}📋 Please edit .env with your actual API keys${NC}"
        set -a
        source "$BASE_DIR/.env"
        set +a
    else
        echo -e "${RED}❌ No environment file found${NC}"
        exit 1
    fi
    
    # Set defaults if not specified
    export BACKEND_PORT=${BACKEND_PORT:-$DEFAULT_BACKEND_PORT}
    export FRONTEND_PORT=${FRONTEND_PORT:-$DEFAULT_FRONTEND_PORT}
    export WHISPER_LOCAL_PORT=${WHISPER_LOCAL_PORT:-$DEFAULT_WHISPER_PORT}
}

# Print banner
print_banner() {
    echo -e "${PURPLE}"
    echo "════════════════════════════════════════════════════════════════"
    echo "🎯 $PROJECT_NAME v$VERSION"
    echo "🚀 Universal Application Starter"
    echo "════════════════════════════════════════════════════════════════"
    echo -e "${NC}"
}

# Check dependencies
check_dependencies() {
    echo -e "${BLUE}🔍 Checking dependencies...${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python3 not found. Please install Python 3.8+${NC}"
        exit 1
    fi
    
    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✅ Docker available${NC}"
        DOCKER_AVAILABLE=true
    else
        echo -e "${YELLOW}⚠️  Docker not found (optional for local Whisper)${NC}"
        DOCKER_AVAILABLE=false
    fi
    
    echo -e "${GREEN}✅ Dependencies check passed${NC}"
}

# Kill existing processes on ports
kill_existing_processes() {
    echo -e "${BLUE}🔄 Checking for existing processes...${NC}"
    
    ports=($BACKEND_PORT $FRONTEND_PORT $WHISPER_LOCAL_PORT)
    
    for port in "${ports[@]}"; do
        if lsof -i :$port &> /dev/null; then
            echo -e "${YELLOW}⚠️  Killing process on port $port${NC}"
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
            sleep 1
        fi
    done
    
    echo -e "${GREEN}✅ Ports cleared${NC}"
}

# Install dependencies
install_dependencies() {
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    
    # Backend dependencies
    if [ -f "$BASE_DIR/backend/requirements.txt" ]; then
        echo -e "${BLUE}🐍 Installing Python dependencies...${NC}"
        cd "$BASE_DIR/backend"
        pip install -r requirements.txt > /dev/null 2>&1
        cd "$BASE_DIR"
    fi
    
    # Frontend dependencies
    if [ -f "$BASE_DIR/frontend/package.json" ]; then
        echo -e "${BLUE}📦 Installing Node.js dependencies...${NC}"
        cd "$BASE_DIR/frontend"
        npm install > /dev/null 2>&1
        cd "$BASE_DIR"
    fi
    
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Start Whisper service (optional)
start_whisper() {
    if [ "$USE_LOCAL_WHISPER" = "true" ] && [ "$DOCKER_AVAILABLE" = "true" ]; then
        echo -e "${BLUE}🎤 Starting local Whisper service...${NC}"
        
        if [ -f "$BASE_DIR/docker-compose.whisper.yml" ]; then
            docker-compose -f docker-compose.whisper.yml up -d
            
            # Wait for service to be ready
            echo -e "${YELLOW}⏳ Waiting for Whisper service...${NC}"
            for i in {1..30}; do
                if curl -s http://localhost:$WHISPER_LOCAL_PORT/health > /dev/null 2>&1; then
                    echo -e "${GREEN}✅ Whisper service ready${NC}"
                    break
                fi
                sleep 2
            done
        fi
    else
        echo -e "${YELLOW}⚠️  Local Whisper disabled or Docker not available${NC}"
    fi
}

# Start backend service
start_backend() {
    echo -e "${BLUE}🔧 Starting backend service...${NC}"
    
    cd "$BASE_DIR/backend"
    
    # Create logs directory
    mkdir -p logs
    
    # Start Python backend
    nohup python3 ffmpeg_free_main.py > logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$BASE_DIR/.backend.pid"
    
    # Wait for backend to be ready
    echo -e "${YELLOW}⏳ Waiting for backend service...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend service ready on port $BACKEND_PORT${NC}"
            break
        fi
        sleep 2
    done
    
    cd "$BASE_DIR"
}

# Start frontend service
start_frontend() {
    echo -e "${BLUE}🌐 Starting frontend service...${NC}"
    
    cd "$BASE_DIR/frontend"
    
    # Create logs directory
    mkdir -p logs
    
    # Start React frontend
    nohup npm run dev > logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$BASE_DIR/.frontend.pid"
    
    # Wait for frontend to be ready
    echo -e "${YELLOW}⏳ Waiting for frontend service...${NC}"
    for i in {1..60}; do
        if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Frontend service ready on port $FRONTEND_PORT${NC}"
            break
        fi
        sleep 2
    done
    
    cd "$BASE_DIR"
}

# Show service status
show_status() {
    echo -e "${PURPLE}"
    echo "════════════════════════════════════════════════════════════════"
    echo "🎉 Services Started Successfully!"
    echo "════════════════════════════════════════════════════════════════"
    echo -e "${NC}"
    
    echo -e "${GREEN}🌐 Frontend:${NC} http://localhost:$FRONTEND_PORT"
    echo -e "${GREEN}🔧 Backend:${NC}  http://localhost:$BACKEND_PORT"
    
    if [ "$USE_LOCAL_WHISPER" = "true" ] && [ "$DOCKER_AVAILABLE" = "true" ]; then
        echo -e "${GREEN}🎤 Whisper:${NC}  http://localhost:$WHISPER_LOCAL_PORT"
    fi
    
    echo ""
    echo -e "${BLUE}📊 Process IDs:${NC}"
    if [ -f "$BASE_DIR/.backend.pid" ]; then
        echo -e "   Backend:  $(cat $BASE_DIR/.backend.pid)"
    fi
    if [ -f "$BASE_DIR/.frontend.pid" ]; then
        echo -e "   Frontend: $(cat $BASE_DIR/.frontend.pid)"
    fi
    
    echo ""
    echo -e "${BLUE}📋 Useful Commands:${NC}"
    echo -e "   Stop all:    ${YELLOW}./stop.sh${NC}"
    echo -e "   View logs:   ${YELLOW}tail -f backend/logs/*.log${NC}"
    echo -e "   Check ports: ${YELLOW}lsof -i :$BACKEND_PORT,:$FRONTEND_PORT${NC}"
    
    echo ""
    echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🛑 Cleaning up...${NC}"
    
    # Kill background processes
    if [ -f "$BASE_DIR/.backend.pid" ]; then
        kill $(cat "$BASE_DIR/.backend.pid") 2>/dev/null || true
        rm -f "$BASE_DIR/.backend.pid"
    fi
    
    if [ -f "$BASE_DIR/.frontend.pid" ]; then
        kill $(cat "$BASE_DIR/.frontend.pid") 2>/dev/null || true
        rm -f "$BASE_DIR/.frontend.pid"
    fi
    
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Main execution
main() {
    print_banner
    load_env
    check_dependencies
    kill_existing_processes
    
    # Optional: Install dependencies
    if [ "$1" = "--install" ] || [ "$1" = "-i" ]; then
        install_dependencies
    fi
    
    # Start services in order
    start_whisper
    start_backend
    start_frontend
    
    # Show final status
    show_status
    
    # Keep script running
    echo -e "${BLUE}💡 Press Ctrl+C to stop all services${NC}"
    while true; do
        sleep 1
    done
}

# Handle command line arguments
case "$1" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --install, -i    Install dependencies before starting"
        echo "  --help, -h       Show this help message"
        echo ""
        echo "Environment:"
        echo "  Edit .env file to configure ports and services"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac

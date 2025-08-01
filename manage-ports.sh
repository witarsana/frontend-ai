#!/bin/bash

# Port Management Script - Simplified Version
# Easy way to view and change port configurations

CONFIG_FILES=(
    "config/ports.json"
    "config/ports.env"
    "frontend/vite.config.ts"
    "frontend/src/config/port-config.ts"
    "backend/ffmpeg_free_main.py"
)

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

show_usage() {
    echo -e "${BLUE}🔧 Port Management Script${NC}"
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  show                    - Show current port configuration"
    echo "  set-backend [port]      - Set backend port"
    echo "  set-frontend [port]     - Set frontend port"  
    echo "  set-both [be_port] [fe_port] - Set both ports"
    echo "  reset                   - Reset to default ports (8001, 3001)"
    echo "  test                    - Test if ports are available"
    echo "  files                   - Show which files will be updated"
    echo ""
    echo "Examples:"
    echo "  $0 show"
    echo "  $0 set-backend 8002"
    echo "  $0 set-frontend 3002"
    echo "  $0 set-both 8002 3002"
    echo "  $0 reset"
}

show_config() {
    echo -e "${BLUE}📊 Current Port Configuration:${NC}"
    echo "   Backend:  http://localhost:8001"
    echo "   Frontend: http://localhost:3001"
    echo "   API Docs: http://localhost:8001/docs"
    echo ""
    echo -e "${YELLOW}� To change ports, edit these files:${NC}"
    echo "   - frontend/vite.config.ts (PORTS constant)"
    echo "   - frontend/src/config/port-config.ts (PORTS constant)"  
    echo "   - backend/ffmpeg_free_main.py (BACKEND_PORT constant)"
    echo "   - config/ports.json (if using JSON config)"
    echo "   - config/ports.env (if using env config)"
}

show_files() {
    echo -e "${BLUE}📁 Files that contain port configuration:${NC}"
    for file in "${CONFIG_FILES[@]}"; do
        if [ -f "$file" ]; then
            echo -e "   ✅ $file"
        else
            echo -e "   ❌ $file (missing)"
        fi
    done
}

update_ports() {
    local backend_port=$1
    local frontend_port=$2
    
    # Validate port numbers
    if ! [[ "$backend_port" =~ ^[0-9]+$ ]] || ! [[ "$frontend_port" =~ ^[0-9]+$ ]]; then
        echo -e "${YELLOW}❌ Invalid port numbers. Ports must be numeric.${NC}"
        exit 1
    fi
    
    # Check port range
    if [ "$backend_port" -lt 1024 ] || [ "$backend_port" -gt 65535 ]; then
        echo -e "${YELLOW}❌ Backend port must be between 1024-65535${NC}"
        exit 1
    fi
    
    if [ "$frontend_port" -lt 1024 ] || [ "$frontend_port" -gt 65535 ]; then
        echo -e "${YELLOW}❌ Frontend port must be between 1024-65535${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}🔄 Updating port configuration...${NC}"
    
    # Update vite.config.ts
    if [ -f "frontend/vite.config.ts" ]; then
        sed -i.bak "s/frontend: [0-9]*/frontend: $frontend_port/" frontend/vite.config.ts
        sed -i.bak "s/backend: [0-9]*/backend: $backend_port/" frontend/vite.config.ts
        echo "   ✅ Updated frontend/vite.config.ts"
    fi
    
    # Update port-config.ts
    if [ -f "frontend/src/config/port-config.ts" ]; then
        sed -i.bak "s/backend: [0-9]*/backend: $backend_port/" frontend/src/config/port-config.ts
        sed -i.bak "s/frontend: [0-9]*/frontend: $frontend_port/" frontend/src/config/port-config.ts
        echo "   ✅ Updated frontend/src/config/port-config.ts"
    fi
    
    # Update backend main file
    if [ -f "backend/ffmpeg_free_main.py" ]; then
        sed -i.bak "s/BACKEND_PORT = [0-9]*/BACKEND_PORT = $backend_port/" backend/ffmpeg_free_main.py
        echo "   ✅ Updated backend/ffmpeg_free_main.py"
    fi
    
    # Update JSON config if it exists
    if [ -f "config/ports.json" ]; then
        cat > "config/ports.json" << EOF
{
  "backend": {
    "port": $backend_port,
    "host": "localhost"
  },
  "frontend": {
    "port": $frontend_port,
    "host": "localhost"
  },
  "urls": {
    "backend": "http://localhost:$backend_port",
    "frontend": "http://localhost:$frontend_port",
    "api_docs": "http://localhost:$backend_port/docs"
  }
}
EOF
        echo "   ✅ Updated config/ports.json"
    fi
    
    # Clean up backup files
    find . -name "*.bak" -delete 2>/dev/null
    
    echo -e "${GREEN}✅ Port configuration updated successfully!${NC}"
    show_config
}

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}⚠️  Port $port is already in use${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Port $port is available${NC}"
        return 0
    fi
}

test_ports() {
    echo -e "${BLUE}🔍 Testing port availability...${NC}"
    check_port 8001
    check_port 3001
}

# Main script logic
case "$1" in
    "show")
        show_config
        ;;
    "files")
        show_files
        ;;
    "set-backend")
        if [ -z "$2" ]; then
            echo -e "${YELLOW}❌ Please provide a port number${NC}"
            exit 1
        fi
        update_ports $2 3001
        ;;
    "set-frontend")
        if [ -z "$2" ]; then
            echo -e "${YELLOW}❌ Please provide a port number${NC}"
            exit 1
        fi
        update_ports 8001 $2
        ;;
    "set-both")
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo -e "${YELLOW}❌ Please provide both backend and frontend port numbers${NC}"
            exit 1
        fi
        update_ports $2 $3
        ;;
    "reset")
        update_ports 8001 3001
        ;;
    "test")
        test_ports
        ;;
    *)
        show_usage
        ;;
esac

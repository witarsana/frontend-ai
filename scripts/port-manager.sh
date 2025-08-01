#!/bin/bash

# Port Management Script
# Provides centralized port configuration for the project

CONFIG_FILE="$(dirname "$0")/../config/ports.json"

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq is not installed. Please install jq to use this script."
    echo "   macOS: brew install jq"
    echo "   Ubuntu: sudo apt-get install jq"
    exit 1
fi

# Function to get port configuration
get_config() {
    local backend_type="$1"
    
    if [[ ! -f "$CONFIG_FILE" ]]; then
        echo "❌ Config file not found: $CONFIG_FILE"
        exit 1
    fi
    
    if [[ -z "$backend_type" ]]; then
        echo "Usage: get_config [python|node]"
        exit 1
    fi
    
    jq -r ".$backend_type" "$CONFIG_FILE"
}

# Function to get specific port
get_port() {
    local backend_type="$1"
    local port_type="$2"
    
    jq -r ".$backend_type.${port_type}_port" "$CONFIG_FILE"
}

# Function to get backend folder
get_backend_folder() {
    local backend_type="$1"
    
    jq -r ".$backend_type.backend_folder" "$CONFIG_FILE"
}

# Function to update vite config with correct port
update_vite_config() {
    local backend_type="$1"
    local backend_port=$(get_port "$backend_type" "backend")
    local frontend_port=$(get_port "$backend_type" "frontend")
    
    cat > frontend/vite.config.ts << EOF
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Auto-generated configuration for $backend_type backend
export default defineConfig({
  plugins: [react()],
  server: {
    port: $frontend_port,
    open: true,
    proxy: {
      "/api": {
        target: "http://localhost:$backend_port",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
EOF
    
    echo "✅ Updated vite.config.ts for $backend_type backend (frontend:$frontend_port -> backend:$backend_port)"
}

# Function to update frontend API config
update_api_config() {
    local backend_type="$1"
    local backend_port=$(get_port "$backend_type" "backend")
    
    # Create a backup of the original api.ts
    if [[ ! -f "frontend/src/services/api.ts.backup" ]]; then
        cp frontend/src/services/api.ts frontend/src/services/api.ts.backup
    fi
    
    # Update API config
    sed -i.tmp "s|BASE_URL:.*|BASE_URL: import.meta.env.DEV ? \"\" : \"http://localhost:$backend_port\", // Auto-configured for $backend_type backend|g" frontend/src/services/api.ts
    rm -f frontend/src/services/api.ts.tmp
    
    echo "✅ Updated API config for $backend_type backend (port: $backend_port)"
}

# Function to show current configuration
show_config() {
    echo "📋 Current Port Configuration:"
    echo ""
    jq '.' "$CONFIG_FILE"
}

# Main script logic
case "$1" in
    "get")
        get_config "$2"
        ;;
    "port")
        get_port "$2" "$3"
        ;;
    "folder")
        get_backend_folder "$2"
        ;;
    "update-vite")
        update_vite_config "$2"
        ;;
    "update-api")
        update_api_config "$2"
        ;;
    "configure")
        echo "🔧 Configuring for $2 backend..."
        update_vite_config "$2"
        update_api_config "$2"
        echo "✅ Configuration updated for $2 backend"
        ;;
    "show"|"")
        show_config
        ;;
    *)
        echo "📚 Port Management Script Usage:"
        echo ""
        echo "  $0 show                     - Show current configuration"
        echo "  $0 get [python|node]        - Get full config for backend type"
        echo "  $0 port [python|node] [backend|frontend] - Get specific port"
        echo "  $0 folder [python|node]     - Get backend folder name"
        echo "  $0 configure [python|node]  - Configure frontend for backend type"
        echo "  $0 update-vite [python|node] - Update vite config only"
        echo "  $0 update-api [python|node]  - Update API config only"
        echo ""
        echo "Examples:"
        echo "  $0 configure python         - Configure for Python backend"
        echo "  $0 configure node           - Configure for Node.js backend"
        echo "  $0 port python backend      - Get Python backend port"
        ;;
esac

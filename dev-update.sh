#!/bin/bash

# 🔄 Development Update Script
# Untuk update code antara Docker dan local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to show usage
show_usage() {
    echo "🔄 Development Update Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  frontend-update    Update frontend code dan restart container"
    echo "  backend-update     Update backend code dan restart container"
    echo "  deps-update        Update dependencies"
    echo "  full-rebuild       Rebuild semua containers"
    echo "  dev-local          Start local development mode"
    echo "  dev-docker         Start Docker development mode"
    echo "  dev-hybrid         Start hybrid mode (Docker backend + Local frontend)"
    echo "  logs               Show logs dari services"
    echo "  clean              Clean Docker resources"
    echo ""
    echo "Options:"
    echo "  --help, -h         Show this help message"
    echo "  --verbose, -v      Verbose output"
    echo ""
    echo "Examples:"
    echo "  $0 frontend-update"
    echo "  $0 backend-update --verbose"
    echo "  $0 dev-hybrid"
    echo "  $0 full-rebuild"
}

# Function to update frontend
update_frontend() {
    log_info "Updating frontend code..."
    
    # Stop frontend container
    log_info "Stopping frontend container..."
    docker-compose stop frontend 2>/dev/null || true
    
    # Install dependencies if package.json changed
    if [ frontend/package.json -nt frontend/node_modules/.package-lock.json ]; then
        log_info "Installing new dependencies..."
        cd frontend && npm install && cd ..
    fi
    
    # Rebuild and restart
    log_info "Rebuilding frontend container..."
    docker-compose up --build frontend -d
    
    log_success "Frontend updated successfully!"
    log_info "Access: http://localhost:3001"
}

# Function to update backend
update_backend() {
    log_info "Updating backend code..."
    
    # Stop backend container
    log_info "Stopping backend container..."
    docker-compose stop backend-speaker 2>/dev/null || true
    
    # Install dependencies if requirements.txt changed
    if [ backend/requirements.txt -nt backend/.requirements_installed ]; then
        log_info "Dependencies changed, rebuilding container..."
        docker-compose build backend-speaker
        touch backend/.requirements_installed
    fi
    
    # Restart container
    log_info "Restarting backend container..."
    docker-compose up backend-speaker -d
    
    # Wait for service to be ready
    log_info "Waiting for backend to be ready..."
    sleep 5
    
    # Test backend health
    if curl -s http://localhost:8003/ > /dev/null; then
        log_success "Backend updated successfully!"
        log_info "Access: http://localhost:8003"
    else
        log_error "Backend might not be ready. Check logs: docker-compose logs backend-speaker"
    fi
}

# Function to update dependencies
update_deps() {
    log_info "Updating dependencies..."
    
    # Update frontend dependencies
    log_info "Updating frontend dependencies..."
    cd frontend
    npm update
    cd ..
    
    # Update backend dependencies (if needed)
    log_info "Backend dependencies are managed via requirements.txt"
    
    # Rebuild containers to use new dependencies
    log_info "Rebuilding containers with new dependencies..."
    docker-compose build
    
    log_success "Dependencies updated!"
}

# Function to full rebuild
full_rebuild() {
    log_info "Full rebuild of all containers..."
    
    # Stop all services
    log_info "Stopping all services..."
    docker-compose down
    
    # Remove images to force rebuild
    log_warning "Removing old images..."
    docker-compose down --rmi local 2>/dev/null || true
    
    # Rebuild everything
    log_info "Rebuilding all containers..."
    docker-compose up --build -d
    
    log_success "Full rebuild completed!"
}

# Function to start local development
dev_local() {
    log_info "Starting local development mode..."
    
    # Stop Docker services
    log_info "Stopping Docker services..."
    docker-compose down 2>/dev/null || true
    
    # Instructions for manual start
    log_info "Start services manually:"
    echo ""
    echo "Terminal 1 (Backend):"
    echo "  cd backend"
    echo "  python ffmpeg_free_main.py"
    echo ""
    echo "Terminal 2 (Frontend):"
    echo "  cd frontend"
    echo "  npm run dev"
    echo ""
    log_success "Local development mode ready!"
}

# Function to start Docker development
dev_docker() {
    log_info "Starting Docker development mode..."
    
    # Start all services
    log_info "Starting all Docker services..."
    docker-compose up -d
    
    log_success "Docker development mode started!"
    log_info "Frontend: http://localhost:3001"
    log_info "Backend: http://localhost:8003"
}

# Function to start hybrid development
dev_hybrid() {
    log_info "Starting hybrid development mode..."
    
    # Start only backend in Docker
    log_info "Starting backend in Docker..."
    docker-compose up backend-speaker -d
    
    # Instructions for frontend
    log_info "Start frontend manually:"
    echo ""
    echo "  cd frontend"
    echo "  npm run dev"
    echo ""
    log_success "Hybrid mode: Docker backend + Local frontend"
    log_info "Backend: http://localhost:8003"
    log_info "Frontend: http://localhost:3001 (after manual start)"
}

# Function to show logs
show_logs() {
    log_info "Showing service logs..."
    
    if [ "$1" = "backend" ]; then
        docker-compose logs -f backend-speaker
    elif [ "$1" = "frontend" ]; then
        docker-compose logs -f frontend
    else
        docker-compose logs -f
    fi
}

# Function to clean Docker resources
clean_docker() {
    log_warning "Cleaning Docker resources..."
    
    # Stop services
    docker-compose down
    
    # Remove unused containers, networks, images
    docker system prune -f
    
    # Remove volumes (optional - ask user)
    read -p "Remove volumes (will delete all data)? [y/N]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down -v
        log_warning "Volumes removed!"
    fi
    
    log_success "Docker cleanup completed!"
}

# Main script logic
case "$1" in
    "frontend-update")
        update_frontend
        ;;
    "backend-update")
        update_backend
        ;;
    "deps-update")
        update_deps
        ;;
    "full-rebuild")
        full_rebuild
        ;;
    "dev-local")
        dev_local
        ;;
    "dev-docker")
        dev_docker
        ;;
    "dev-hybrid")
        dev_hybrid
        ;;
    "logs")
        show_logs $2
        ;;
    "clean")
        clean_docker
        ;;
    "--help"|"-h"|"help"|"")
        show_usage
        ;;
    *)
        log_error "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac

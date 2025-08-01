# 🚀 Demo Environment Setup Script

#!/bin/bash

# ==============================================
# VOICE NOTE AI - DEMO ENVIRONMENT SETUP
# ==============================================

set -e  # Exit on error

echo "🎯 Voice Note AI - Demo Setup Starting..."
echo "==============================================="

# Color codes for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# ==============================================
# ENVIRONMENT CHECKS
# ==============================================

echo -e "\n${BLUE}🔍 Checking Environment...${NC}"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "Node.js found: $NODE_VERSION"
else
    print_error "Node.js not found! Please install Node.js 16+ first."
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status "npm found: $NPM_VERSION"
else
    print_error "npm not found!"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found! Please run this script from the project root."
    exit 1
fi

print_status "Environment checks passed!"

# ==============================================
# DEPENDENCY INSTALLATION
# ==============================================

echo -e "\n${BLUE}📦 Installing Dependencies...${NC}"

print_info "Installing npm packages..."
npm install

if [ $? -eq 0 ]; then
    print_status "Dependencies installed successfully!"
else
    print_error "Failed to install dependencies!"
    exit 1
fi

# ==============================================
# DEMO DATA PREPARATION
# ==============================================

echo -e "\n${BLUE}📁 Preparing Demo Data...${NC}"

# Create demo directories if they don't exist
mkdir -p demo/sample-data/audio
mkdir -p demo/sample-data/transcripts
mkdir -p demo/presentations
mkdir -p demo/slideshow

print_status "Demo directories created!"

# Check for demo audio files
AUDIO_DIR="demo/sample-data/audio"
AUDIO_COUNT=$(find "$AUDIO_DIR" -name "*.mp3" -o -name "*.wav" -o -name "*.m4a" | wc -l)

if [ "$AUDIO_COUNT" -eq 0 ]; then
    print_warning "No demo audio files found in $AUDIO_DIR"
    print_info "Please add sample audio files for better demo experience."
    print_info "See AUDIO_FILES_GUIDE.md for instructions."
else
    print_status "Found $AUDIO_COUNT demo audio file(s)"
fi

# ==============================================
# BACKEND SERVICE CHECK
# ==============================================

echo -e "\n${BLUE}🔧 Backend Service Check...${NC}"

# Check if backend is running
if curl -s http://localhost:8000/health &> /dev/null; then
    print_status "Backend service is running on port 8000"
else
    print_warning "Backend service not detected on port 8000"
    print_info "Please ensure backend is running before starting demo"
    print_info "Backend setup: npm run backend or python app.py"
fi

# ==============================================
# ENVIRONMENT VARIABLES
# ==============================================

echo -e "\n${BLUE}🔑 Environment Configuration...${NC}"

# Check for .env file
if [ -f ".env" ]; then
    print_status "Environment file (.env) found"
else
    print_warning "No .env file found"
    print_info "Creating basic .env file..."
    
    cat > .env << EOF
# Demo Environment Configuration
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENV=demo
REACT_APP_DEMO_MODE=true
REACT_APP_MAX_FILE_SIZE=50MB
REACT_APP_SUPPORTED_FORMATS=mp3,wav,m4a,mp4
EOF
    
    print_status ".env file created with demo settings"
fi

# ==============================================
# BUILD VERIFICATION
# ==============================================

echo -e "\n${BLUE}🏗️  Build Verification...${NC}"

print_info "Running build test..."
npm run build &> /dev/null

if [ $? -eq 0 ]; then
    print_status "Build test passed!"
else
    print_warning "Build test failed - checking for issues..."
    npm run build
fi

# ==============================================
# DEMO READINESS CHECK
# ==============================================

echo -e "\n${BLUE}✅ Demo Readiness Check...${NC}"

echo "Checking demo components:"

# Check slideshow
if [ -f "demo/slideshow/demo_slideshow.html" ]; then
    print_status "Demo slideshow ready"
else
    print_warning "Demo slideshow not found"
fi

# Check documentation
if [ -f "demo/HOW_TO_DEMO.md" ]; then
    print_status "Demo guide available"
else
    print_warning "Demo guide not found"
fi

# Check presentation materials
if [ -f "demo/presentation/TECHNICAL_OVERVIEW.md" ]; then
    print_status "Technical documentation ready"
else
    print_warning "Technical documentation missing"
fi

# ==============================================
# NETWORK & PORT CHECK
# ==============================================

echo -e "\n${BLUE}🌐 Network Configuration...${NC}"

# Check if port 3000 is available
if lsof -Pi :3000 -sTCP:LISTEN -t &> /dev/null; then
    print_warning "Port 3000 is already in use"
    print_info "You may need to stop other services or use a different port"
else
    print_status "Port 3000 is available for demo"
fi

# Check if port 8000 is available for backend
if lsof -Pi :8000 -sTCP:LISTEN -t &> /dev/null; then
    print_status "Port 8000 is in use (backend service detected)"
else
    print_warning "Port 8000 is not in use (backend may not be running)"
fi

# ==============================================
# PERFORMANCE OPTIMIZATION
# ==============================================

echo -e "\n${BLUE}⚡ Performance Optimization...${NC}"

# Clear any existing build cache
print_info "Clearing build cache..."
rm -rf node_modules/.cache &> /dev/null || true
print_status "Build cache cleared"

# Optimize npm cache
print_info "Optimizing npm cache..."
npm cache verify &> /dev/null
print_status "npm cache optimized"

# ==============================================
# DEMO STARTUP COMMANDS
# ==============================================

echo -e "\n${BLUE}🚀 Demo Startup Information...${NC}"

cat << EOF

==============================================
🎯 DEMO ENVIRONMENT READY!
==============================================

Quick Start Commands:
└─ npm start              # Start frontend (port 3000)
└─ npm run backend        # Start backend (port 8000)
└─ npm run demo           # Start full demo environment

Demo URLs:
└─ Frontend: http://localhost:3000
└─ Backend:  http://localhost:8000
└─ Slideshow: file://$(pwd)/demo/slideshow/demo_slideshow.html

Demo Files:
└─ Audio Samples: demo/sample-data/audio/
└─ Slideshow: demo/slideshow/demo_slideshow.html
└─ Demo Guide: demo/HOW_TO_DEMO.md

Pre-Demo Checklist:
□ Backend service running (port 8000)
□ Frontend building successfully
□ Demo audio files prepared
□ Slideshow tested in browser
□ Network connectivity verified

==============================================

EOF

print_status "Demo environment setup completed successfully!"
print_info "Ready for stakeholder presentations! 🎉"

# ==============================================
# OPTIONAL: AUTO-START DEMO
# ==============================================

echo -e "\n${YELLOW}Would you like to start the demo now? (y/n)${NC}"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    print_info "Starting demo environment..."
    
    # Start backend in background if not running
    if ! curl -s http://localhost:8000/health &> /dev/null; then
        print_info "Starting backend service..."
        npm run backend &
        sleep 3
    fi
    
    # Start frontend
    print_info "Starting frontend..."
    print_status "Demo starting at http://localhost:3000"
    npm start
else
    print_info "Demo environment ready. Run 'npm start' when ready to begin."
fi

exit 0

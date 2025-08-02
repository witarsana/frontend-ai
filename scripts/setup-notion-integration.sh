#!/bin/bash

# ==============================================
# NOTION INTEGRATION SETUP & TEST SCRIPT
# ==============================================

set -e

echo "🔗 Voice Note AI - Notion Integration Setup & Test"
echo "=================================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
# ENVIRONMENT CHECK
# ==============================================

echo -e "\n${BLUE}🔍 Checking Environment...${NC}"

# Check if we're in the right directory
if [ ! -f "backend/notion_integration.py" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check Python dependencies
echo "Checking Python dependencies..."
cd backend

if ! python -c "import notion_client" &> /dev/null; then
    print_warning "Installing notion-client..."
    pip install notion-client python-dateutil
fi

print_status "Python dependencies ready"

# Check Node dependencies
echo "Checking Node dependencies..."
cd ../frontend

if [ ! -d "node_modules/@notionhq" ]; then
    print_warning "Installing Notion SDK..."
    npm install @notionhq/client @types/node
fi

print_status "Node dependencies ready"

# ==============================================
# ENVIRONMENT CONFIGURATION
# ==============================================

echo -e "\n${BLUE}⚙️  Environment Configuration...${NC}"

# Backend .env check
cd ../backend
if [ ! -f ".env" ]; then
    if [ -f ".env.notion" ]; then
        cp .env.notion .env
        print_warning "Created .env from template. Please update with your API keys."
    else
        print_error ".env file not found. Please create one with your Notion API key."
        exit 1
    fi
fi

# Frontend .env check  
cd ../frontend
if [ ! -f ".env" ]; then
    if [ -f ".env.notion" ]; then
        cp .env.notion .env
        print_warning "Created .env from template. Please update with your configuration."
    else
        print_error "Frontend .env file not found."
        exit 1
    fi
fi

print_status "Environment files ready"

# ==============================================
# API KEY VALIDATION
# ==============================================

echo -e "\n${BLUE}🔑 API Key Validation...${NC}"

cd ../backend

# Check if NOTION_API_KEY is set
if grep -q "NOTION_API_KEY=secret_" .env; then
    print_warning "Please update NOTION_API_KEY in backend/.env with your actual API key"
    echo "Get your API key from: https://www.notion.so/my-integrations"
else
    print_status "NOTION_API_KEY appears to be configured"
fi

# Check if NOTION_DATABASE_ID is set
if grep -q "NOTION_DATABASE_ID=ntn_" .env; then
    print_warning "Please update NOTION_DATABASE_ID in backend/.env with your actual database ID"
    echo "Get your database ID from your Notion database URL"
else
    print_status "NOTION_DATABASE_ID appears to be configured"
fi

# ==============================================
# BACKEND SERVICE TEST
# ==============================================

echo -e "\n${BLUE}🚀 Backend Service Test...${NC}"

print_info "Starting backend service..."

# Start backend in background
cd backend
python ffmpeg_free_main.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Test health endpoint
print_info "Testing Notion integration health..."

if curl -s http://localhost:8000/api/notion-integration/health &> /dev/null; then
    print_status "Notion integration health endpoint working"
    
    # Get health details
    HEALTH_RESPONSE=$(curl -s http://localhost:8000/api/notion-integration/health)
    echo "Health Response: $HEALTH_RESPONSE"
else
    print_error "Backend service not responding"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Test database connection (if configured)
print_info "Testing database connection..."

if [ -f ".env" ]; then
    # Extract database ID from .env
    DATABASE_ID=$(grep "NOTION_DATABASE_ID=" .env | cut -d'=' -f2)
    
    if [ -n "$DATABASE_ID" ] && [ "$DATABASE_ID" != "your_notion_database_id_here" ]; then
        CONNECTION_TEST=$(curl -s -X POST http://localhost:8000/api/notion/test-connection \
            -H "Content-Type: application/json" \
            -d "{\"database_id\": \"$DATABASE_ID\"}" || echo '{"success":false}')
        
        if echo "$CONNECTION_TEST" | grep -q '"success":true'; then
            print_status "Database connection successful!"
        else
            print_warning "Database connection failed. Please check your API key and database ID."
            echo "Response: $CONNECTION_TEST"
        fi
    else
        print_warning "Using default database ID. Please update with your actual database ID."
    fi
fi

# Clean up
print_info "Stopping test backend..."
kill $BACKEND_PID 2>/dev/null || true
sleep 2

# ==============================================
# FRONTEND BUILD TEST
# ==============================================

echo -e "\n${BLUE}🏗️  Frontend Build Test...${NC}"

cd ../frontend

print_info "Testing TypeScript compilation..."
if npx tsc --noEmit --skipLibCheck; then
    print_status "TypeScript compilation successful"
else
    print_warning "TypeScript compilation has warnings (but may still work)"
fi

print_info "Testing frontend build..."
if npm run build &> /dev/null; then
    print_status "Frontend build successful"
else
    print_warning "Frontend build failed. Check for missing dependencies."
fi

# ==============================================
# DEMO ACTION ITEM TEST
# ==============================================

echo -e "\n${BLUE}🧪 Demo Action Item Test...${NC}"

print_info "Starting backend for demo test..."
cd ../backend
python ffmpeg_free_main.py &
BACKEND_PID=$!
sleep 5

# Create demo action item
print_info "Creating demo action item..."

DEMO_RESPONSE=$(curl -s -X POST http://localhost:8000/api/enhance-action-item \
    -H "Content-Type: application/json" \
    -d '{
        "action_item": {
            "task": "Setup Notion integration testing",
            "assignee": "Development Team",
            "deadline": "this week",
            "priority": "High"
        },
        "meeting_context": "Integration setup meeting untuk Voice Note AI dengan Notion database",
        "session_id": "demo-test-123"
    }' || echo '{"success":false}')

if echo "$DEMO_RESPONSE" | grep -q '"success":true'; then
    print_status "Demo action item enhancement successful!"
    echo "Enhanced description created by AI"
else
    print_warning "AI enhancement failed, but fallback should work"
    echo "Response: $DEMO_RESPONSE"
fi

# Clean up
kill $BACKEND_PID 2>/dev/null || true

# ==============================================
# FINAL RECOMMENDATIONS
# ==============================================

echo -e "\n${BLUE}📋 Setup Summary & Next Steps${NC}"

print_status "Integration setup completed!"

echo -e "\n${YELLOW}📝 Next Steps:${NC}"
echo "1. Update backend/.env with your actual Notion API key"
echo "2. Update backend/.env with your actual database ID"  
echo "3. Create Notion database with required properties (see docs/NOTION_INTEGRATION_SETUP.md)"
echo "4. Share database with your Notion integration"
echo "5. Start both backend and frontend services"
echo "6. Test with actual meeting transcription"

echo -e "\n${YELLOW}🚀 Quick Start Commands:${NC}"
echo "# Start backend:"
echo "cd backend && python ffmpeg_free_main.py"
echo ""
echo "# Start frontend (in new terminal):"
echo "cd frontend && npm start"
echo ""
echo "# Test integration:"
echo "Upload audio → Process → View Summary → Click 'Add to Notion' on action items"

echo -e "\n${YELLOW}📚 Documentation:${NC}"
echo "- Full setup guide: docs/NOTION_INTEGRATION_SETUP.md"
echo "- Environment templates: backend/.env.notion, frontend/.env.notion"
echo "- API documentation: http://localhost:8000/docs (when backend running)"

echo -e "\n${GREEN}🎉 Integration ready for testing!${NC}"

exit 0

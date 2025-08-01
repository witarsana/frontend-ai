#!/bin/bash

# Quick Start Script - Frontend + Backend
echo "🚀 Quick Start: AI Meeting Transcription"
echo "======================================="

# Load port configuration
if [ -f "config/port-config.js" ]; then
    BACKEND_PORT=$(node config/port-config.js backend-port)
    FRONTEND_PORT=$(node config/port-config.js frontend-port)
    echo "✅ Loaded port configuration: Backend=$BACKEND_PORT, Frontend=$FRONTEND_PORT"
else
    # Fallback to default ports
    BACKEND_PORT=8001
    FRONTEND_PORT=3001
    echo "⚠️  Using fallback ports: Backend=$BACKEND_PORT, Frontend=$FRONTEND_PORT"
fi

# Load environment
[ -f .env ] && source .env

# Kill any existing processes on the ports
echo "🧹 Cleaning up existing processes..."
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true

# Start backend in background
echo "🔧 Starting Backend..."
cd backend && python -m uvicorn ffmpeg_free_main:app --reload --host 0.0.0.0 --port $BACKEND_PORT &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend in background
echo "🌐 Starting Frontend..."
cd frontend && npm run dev &
FRONTEND_PID=$!

# Show status
echo ""
echo "✅ Services Started!"
echo "📡 Backend:  http://localhost:$BACKEND_PORT"
echo "🌐 Frontend: http://localhost:$FRONTEND_PORT"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait and handle cleanup
trap 'echo "🛑 Stopping services..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT
wait

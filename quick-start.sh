#!/bin/bash

# Quick Start Script - Frontend + Backend
echo "🚀 Quick Start: AI Meeting Transcription"
echo "======================================="

# Load environment
source .env

# Kill any existing processes on the ports
echo "🧹 Cleaning up existing processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start backend in background
echo "🔧 Starting Backend..."
cd backend && python -m uvicorn ffmpeg_free_main:app --reload --host 0.0.0.0 --port 8000 &
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
echo "📡 Backend:  http://localhost:8000"
echo "🌐 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait and handle cleanup
trap 'echo "🛑 Stopping services..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT
wait

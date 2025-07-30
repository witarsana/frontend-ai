#!/bin/bash

echo "🚀 Starting AI Transcription Project (Node.js Backend)..."

# Kill any existing processes
pkill -f "node.*server.js" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null

echo "✅ Cleaned up existing processes"

# Start Node.js backend
echo "🔧 Starting Node.js Backend Server..."
cd backend-node

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example .env
    echo "📝 Please edit backend-node/.env with your API keys"
fi

# Start backend server in background
node server.js &
BACKEND_PID=$!
echo "Node.js Backend started with PID: $BACKEND_PID"

# Wait for backend to start
sleep 5

# Check backend
if curl -s http://localhost:8001/ > /dev/null; then
    echo "✅ Node.js Backend is running on http://localhost:8001"
else
    echo "⚠️  Backend may need more time to start"
fi

# Start frontend
echo "🌐 Starting Frontend Server..."
cd ../frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

npm run dev &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

# Wait for frontend
sleep 3

echo ""
echo "🎉 Services Started!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Node.js Backend: http://localhost:8001"
echo "📚 API Status: http://localhost:8001/"
echo ""
echo "🔧 Backend Features:"
echo "   • OpenAI Whisper Transcription"
echo "   • Deepgram Cloud Transcription"
echo "   • AI Summaries & Analysis"
echo "   • Interactive Chat System"
echo ""
echo "📝 Configuration:"
echo "   • Backend config: backend-node/.env"
echo "   • Frontend config: frontend/.env"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'echo "🛑 Stopping services..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo "✅ All services stopped"; exit' INT
wait

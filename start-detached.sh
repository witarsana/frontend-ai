#!/bin/bash

# One-liner start with tmux
echo "🚀 Starting with tmux (detached sessions)"

# Load port configuration
if [ -f "config/port-config.js" ]; then
    BACKEND_PORT=$(node config/port-config.js backend-port)
    FRONTEND_PORT=$(node config/port-config.js frontend-port)
    echo "✅ Using port configuration: Backend=$BACKEND_PORT, Frontend=$FRONTEND_PORT"
else
    BACKEND_PORT=8001
    FRONTEND_PORT=3001
    echo "⚠️  Using fallback ports: Backend=$BACKEND_PORT, Frontend=$FRONTEND_PORT"
fi

# Kill existing tmux sessions
tmux kill-session -t ai-backend 2>/dev/null || true
tmux kill-session -t ai-frontend 2>/dev/null || true

# Start backend in tmux
tmux new-session -d -s ai-backend -c "$(pwd)/backend" "python -m uvicorn ffmpeg_free_main:app --reload --host 0.0.0.0 --port $BACKEND_PORT"

# Start frontend in tmux
tmux new-session -d -s ai-frontend -c "$(pwd)/frontend" "npm run dev"

echo "✅ Services started in background"
echo "📡 Backend:  http://localhost:$BACKEND_PORT"
echo "🌐 Frontend: http://localhost:$FRONTEND_PORT"
echo ""
echo "📋 Manage sessions:"
echo "   tmux list-sessions"
echo "   tmux attach -t ai-backend"
echo "   tmux attach -t ai-frontend"
echo "   tmux kill-session -t ai-backend"
echo "   tmux kill-session -t ai-frontend"

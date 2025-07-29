#!/bin/bash

# One-liner start with tmux
echo "🚀 Starting with tmux (detached sessions)"

# Kill existing tmux sessions
tmux kill-session -t ai-backend 2>/dev/null || true
tmux kill-session -t ai-frontend 2>/dev/null || true

# Start backend in tmux
tmux new-session -d -s ai-backend -c "$(pwd)/backend" "python -m uvicorn ffmpeg_free_main:app --reload --host 0.0.0.0 --port 8000"

# Start frontend in tmux
tmux new-session -d -s ai-frontend -c "$(pwd)/frontend" "npm run dev"

echo "✅ Services started in background"
echo "📡 Backend:  http://localhost:8000"
echo "🌐 Frontend: http://localhost:3000"
echo ""
echo "📋 Manage sessions:"
echo "   tmux list-sessions"
echo "   tmux attach -t ai-backend"
echo "   tmux attach -t ai-frontend"
echo "   tmux kill-session -t ai-backend"
echo "   tmux kill-session -t ai-frontend"

# 🚀 Quick Reference Card

## Essential Commands

### 🎯 Start/Stop Services
```bash
./start.sh                    # Start semua services
./stop.sh                     # Stop semua services
./start.sh --rebuild          # Restart dengan rebuild
```

### 🔄 Development Updates
```bash
./dev-update.sh frontend-update    # Update frontend code
./dev-update.sh backend-update     # Update backend code
./dev-update.sh full-rebuild       # Rebuild semua containers
./dev-update.sh dev-hybrid         # Docker backend + Local frontend
```

### 🐳 Docker Operations
```bash
docker-compose up -d               # Start background
docker-compose down                # Stop services
docker-compose logs -f             # View logs
docker-compose restart backend-speaker  # Restart service
```

### 💻 Local Development
```bash
# Backend
cd backend && python ffmpeg_free_main.py

# Frontend  
cd frontend && npm run dev

# Hot reload backend
uvicorn ffmpeg_free_main:app --reload --host 0.0.0.0 --port 8000
```

### 🌐 Network & URLs
```bash
./configure-network.sh            # Auto-configure network IP
curl http://localhost:8003/        # Test backend
curl http://localhost:3001/        # Test frontend
```

### 🛠 Troubleshooting
```bash
docker ps                         # Check running containers
docker logs container_name        # Check specific logs
docker system prune -a            # Clean unused resources
lsof -ti:8003 | xargs kill -9     # Kill port 8003
```

### 📁 Important Files
```
.env                 # Environment variables (API keys)
docker-compose.yml   # Docker orchestration
frontend/vite.config.ts           # Frontend config
backend/ffmpeg_free_main.py       # Backend main
```

### 🎯 Access URLs
- Frontend: http://localhost:3001
- Speaker Detection API: http://localhost:8003  
- Database API: http://localhost:8000
- Network sharing: http://YOUR_IP:3001

## Development Workflows

### Workflow 1: Pure Docker (Production-like)
```bash
./start.sh                        # Start everything in Docker
# Edit code
./dev-update.sh frontend-update   # Or backend-update
```

### Workflow 2: Hybrid (Recommended for Development)
```bash
./dev-update.sh dev-hybrid        # Start backend in Docker
cd frontend && npm run dev         # Start frontend locally
# Frontend hot-reloads, backend stable
```

### Workflow 3: Pure Local (Full Development)
```bash
./dev-update.sh dev-local          # Stop Docker services
# Start backend: cd backend && python ffmpeg_free_main.py
# Start frontend: cd frontend && npm run dev
```

## Team Collaboration

### Share Access
```bash
./configure-network.sh            # Configure network
./start.sh                        # Start services
echo "Team URL: http://$(ipconfig getifaddr en0):3001"
```

### Update & Deploy
```bash
git pull origin main              # Get latest code
./dev-update.sh full-rebuild      # Rebuild with new code
./start.sh                        # Start updated services
```

## Emergency Commands

### Services Won't Start
```bash
./stop.sh && ./start.sh --rebuild
```

### Port Conflicts
```bash
lsof -ti:8003 | xargs kill -9     # Kill port 8003
lsof -ti:3001 | xargs kill -9     # Kill port 3001
```

### Clean Everything
```bash
./dev-update.sh clean             # Clean Docker resources
rm -rf frontend/node_modules && cd frontend && npm install
```

### Reset Environment
```bash
cp .env.example .env              # Reset environment
./configure-network.sh           # Reconfigure network
./dev-update.sh full-rebuild     # Rebuild everything
```

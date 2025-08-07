# 🚀 AI Meeting Transcription - Deployment Guide

## 📋 Overview

Sistem AI Meeting Transcription dengan Speaker Detection yang dapat dijalankan dalam mode:
- **Local Development**: Frontend + Backend lokal
- **Docker Production**: Containerized dengan network sharing
- **Hybrid**: Mix Docker backend + Local frontend untuk development

## 🎯 Quick Start Commands

### Mode 1: Docker Production (Recommended)
```bash
# Start semua services
./start.sh

# Stop semua services  
./stop.sh

# Restart dengan rebuild
./start.sh --rebuild
```

### Mode 2: Local Development
```bash
# Backend
cd backend && python ffmpeg_free_main.py

# Frontend (terminal baru)
cd frontend && npm run dev
```

### Mode 3: Hybrid Development
```bash
# Backend di Docker
docker-compose up backend-speaker -d

# Frontend lokal untuk development
cd frontend && npm run dev
```

## 🔧 Environment Setup

### 1. Konfigurasi `.env` File
```bash
# Copy template
cp .env.example .env

# Edit dengan API keys Anda
vim .env  # atau text editor favorit
```

Required environment variables:
```env
# AI Services
MISTRAL_API_KEY=your_mistral_api_key_here
HUGGINGFACE_TOKEN=your_huggingface_token_here

# Network Configuration
VITE_BACKEND_HOST=192.168.2.80  # Your network IP
VITE_SPEAKER_PORT=8003
VITE_DATABASE_PORT=8000
VITE_FRONTEND_PORT=3001

# API URLs
VITE_API_SPEAKER_URL=http://192.168.2.80:8003
VITE_API_DATABASE_URL=http://192.168.2.80:8000
VITE_WEBSOCKET_URL=ws://192.168.2.80:8003
```

### 2. Network IP Configuration
```bash
# Auto-detect network IP
./configure-network.sh

# Manual check IP
ipconfig getifaddr en0  # macOS
ip route get 1 | awk '{print $7}' | head -1  # Linux
```

## 🐳 Docker Commands

### Basic Operations
```bash
# Build semua images
docker-compose build

# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart backend-speaker
```

### Detailed Docker Management

#### Start Services
```bash
# Start dengan rebuild
docker-compose up --build -d

# Start hanya backend speaker detection
docker-compose up backend-speaker -d

# Start dengan port custom
SPEAKER_PORT=8005 docker-compose up -d
```

#### Stop Services
```bash
# Stop semua
docker-compose down

# Stop dan hapus volumes
docker-compose down -v

# Stop dan hapus images
docker-compose down --rmi all
```

#### Monitoring
```bash
# Check status containers
docker ps

# View resource usage
docker stats

# Check logs specific service
docker logs transcription-backend-speaker -f

# Execute command dalam container
docker exec -it transcription-backend-speaker bash
```

## 💻 Local Development

### Prerequisites
```bash
# Backend dependencies
cd backend
pip install -r requirements.txt

# Frontend dependencies  
cd frontend
npm install
```

### Development Workflow

#### 1. Start Backend Lokal
```bash
cd backend

# Dengan conda environment
conda activate transcription-ai
python ffmpeg_free_main.py

# Atau dengan venv
source venv/bin/activate
python ffmpeg_free_main.py
```

Backend akan running di: `http://localhost:8000`

#### 2. Start Frontend Lokal
```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build
npm run preview
```

Frontend akan running di: `http://localhost:3001`

### Hot Reload Development
```bash
# Terminal 1: Backend dengan auto-reload
cd backend
uvicorn ffmpeg_free_main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend dengan hot reload
cd frontend
npm run dev
```

## 🔄 Update Code Workflow

### Scenario 1: Update Frontend Code
```bash
# Stop frontend container
docker-compose stop frontend

# Edit code di frontend/src/...
# (your changes here)

# Rebuild dan restart
docker-compose up --build frontend -d

# Atau development mode
cd frontend && npm run dev
```

### Scenario 2: Update Backend Code  
```bash
# Stop backend container
docker-compose stop backend-speaker

# Edit code di backend/...
# (your changes here)

# Rebuild dan restart
docker-compose up --build backend-speaker -d

# Check logs
docker-compose logs backend-speaker -f
```

### Scenario 3: Update Dependencies
```bash
# Frontend dependencies
cd frontend
npm install new-package
npm run build

# Rebuild container
docker-compose build frontend

# Backend dependencies
cd backend
pip install new-package
pip freeze > requirements.txt

# Rebuild container
docker-compose build backend-speaker
```

## 🌐 Network Sharing Setup

### Enable Team Access
```bash
# 1. Configure network IP
./configure-network.sh

# 2. Start dengan network sharing
./start.sh

# 3. Share URLs dengan team
echo "Frontend: http://$(ipconfig getifaddr en0):3001"
echo "API: http://$(ipconfig getifaddr en0):8003"
```

### Network Troubleshooting
```bash
# Test network connectivity
curl http://192.168.2.80:8003/

# Check port binding
netstat -tlnp | grep :8003

# Check Docker network
docker network ls
docker network inspect frontend-ai_default
```

## 🛠 Development Tips

### Debugging
```bash
# Backend debugging
docker exec -it transcription-backend-speaker python -c "import torch; print(torch.cuda.is_available())"

# Frontend debugging
docker exec -it transcription-frontend npm run build

# Check environment variables
docker exec transcription-backend-speaker env | grep MISTRAL
```

### Performance Monitoring
```bash
# Resource usage
docker stats --no-stream

# Disk usage
docker system df

# Clean unused resources
docker system prune -a
```

### Backup & Restore
```bash
# Backup volumes
docker run --rm -v frontend-ai_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads.tar.gz /data

# Restore volumes
docker run --rm -v frontend-ai_uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads.tar.gz -C /
```

## 🚨 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill process using port
lsof -ti:8003 | xargs kill -9

# Use different port
SPEAKER_PORT=8005 docker-compose up -d
```

#### Memory Issues
```bash
# Increase Docker memory (Docker Desktop)
# Settings > Resources > Memory > 8GB+

# Check memory usage
docker stats --no-stream
```

#### Model Download Issues
```bash
# Check HuggingFace token
docker exec transcription-backend-speaker env | grep HUGGINGFACE

# Manually download models
docker exec -it transcription-backend-speaker python -c "from transformers import pipeline; pipeline('automatic-speech-recognition', model='openai/whisper-large-v3')"
```

#### Frontend API Connection
```bash
# Check API configuration
curl http://localhost:8003/api/status

# Verify network routing
docker exec transcription-frontend curl http://transcription-backend-speaker:8000/
```

## 📁 Project Structure

```
frontend-ai/
├── backend/                 # Python FastAPI backend
│   ├── ffmpeg_free_main.py # Main backend server
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile.speaker  # Backend Docker config
├── frontend/               # React TypeScript frontend  
│   ├── src/               # Frontend source code
│   ├── package.json       # Node dependencies
│   └── vite.config.ts     # Vite configuration
├── docker-compose.yml     # Docker orchestration
├── .env                   # Environment variables
├── start.sh              # Start script
├── stop.sh               # Stop script
└── configure-network.sh  # Network setup
```

## 🎉 Deployment Checklist

- [ ] Copy `.env.example` to `.env` dan configure API keys
- [ ] Run `./configure-network.sh` untuk network setup
- [ ] Test Docker: `docker-compose up --build`
- [ ] Test local: Backend `python ffmpeg_free_main.py` + Frontend `npm run dev`
- [ ] Verify network access: `curl http://YOUR_IP:8003/`
- [ ] Test upload file dan AI chat functionality
- [ ] Share network URL dengan team

## 📞 Support

Jika ada masalah:
1. Check logs: `docker-compose logs -f`
2. Verify environment: `docker exec container_name env`
3. Test connectivity: `curl http://localhost:8003/`
4. Restart services: `./stop.sh && ./start.sh`

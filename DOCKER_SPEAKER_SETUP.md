# 🐳 Docker Setup untuk Speaker Detection System

## 📋 Prerequisites
- Docker dan Docke## 🌐 Network Sharing antar Containers

### Docker Network Configuration
```bash
# Check existing networks
docker network ls

# Create shared network (sudah otomatis dibuat)
docker network create transcription-network

# Inspect network details
docker network inspect transcription-network
```

### Container Communication
Containers dalam network yang sama bisa communicate menggunakan nama container:
```bash
# Frontend bisa akses backend dengan:
http://transcription-backend-speaker:8000/
http://transcription-backend:8000/

# Dari host machine tetap pakai:
http://localhost:8003/  # Speaker Detection
http://localhost:8000/  # Database Backend
http://localhost:3000/  # Frontend
```

### Manual Network Setup
```bash
# Start containers dengan shared network
docker run -d \
  --name transcription-backend-speaker \
  --network transcription-network \
  -p 8003:8000 \
  transcription-backend-speaker:latest

docker run -d \
  --name transcription-frontend \
  --network transcription-network \
  -p 3000:3000 \
  frontend-ai-frontend:latest
```

## 🔧 Development Commands

### Stop Services
```bash
docker-compose -f docker-compose.speaker.yml down
```

### Rebuild setelah Code Changes
```bash
docker-compose -f docker-compose.speaker.yml down
docker-compose -f docker-compose.speaker.yml up --build
```

### Clear Volumes (Reset Data)
```bash
docker-compose -f docker-compose.speaker.yml down -v
```

### Network Management
```bash
# Remove network (hati-hati!)
docker network rm transcription-network

# Recreate network
docker network create transcription-network

# Connect existing container to network
docker network connect transcription-network container_name
```all
- Minimal 8GB RAM (untuk Whisper Large V3 + PyAnnote)
- File .env dengan konfigurasi yang benar

## 🚀 Quick Start

### 1. Build dan Jalankan dengan Speaker Detection
```bash
# Build dan run services dengan shared network
docker-compose -f docker-compose.speaker.yml up --build

# Atau run di background
docker-compose -f docker-compose.speaker.yml up -d --build

# Manual dengan shared network
docker network create transcription-network
docker run -d --name backend-speaker --network transcription-network -p 8003:8000 transcription-backend-speaker:latest
docker run -d --name frontend --network transcription-network -p 3000:3000 frontend-ai-frontend:latest
```

### 2. Akses Aplikasi
- **Frontend**: http://localhost:3000
- **Backend Speaker Detection**: http://localhost:8003 (dari host)
- **Backend Database**: http://localhost:8000 (dari host)
- **API Docs Speaker**: http://localhost:8003/docs
- **API Docs Database**: http://localhost:8000/docs

### 3. Inter-Container Communication
Dalam shared network, containers bisa communicate menggunakan nama:
```bash
# Frontend -> Backend (internal network)
http://transcription-backend-speaker:8000/api/upload-and-process
http://transcription-backend:8000/api/transcribe

# Host -> Containers (port mapping)
http://localhost:8003/api/upload-and-process  # Speaker Detection
http://localhost:8000/api/transcribe          # Database Backend
```

## 🔧 Konfigurasi Environment

Pastikan file `.env` memiliki:
```bash
# AI Services
HUGGING_FACE_TOKEN=your_huggingface_token_here
MISTRAL_API_KEY=your_mistral_api_key_here
TRANSCRIPTION_ENGINE=faster-whisper

# Ports
BACKEND_PORT=8000
FRONTEND_PORT=3000

# Notion (Optional)
NOTION_API_KEY=your_notion_api_key_here
NOTION_DATABASE_ID=your_notion_database_id_here
```

## 📦 Services yang Tersedia

### Backend Speaker Detection
- **Container**: `transcription-backend-speaker`
- **Port**: 8000
- **Features**:
  - Faster-Whisper Large V3
  - PyAnnote Speaker Diarization 3.1
  - Multiple speaker detection methods
  - Real-time progress monitoring
  - Audio format optimization

### Frontend
- **Container**: `transcription-frontend`
- **Port**: 3000
- **Features**:
  - React + TypeScript
  - Real-time progress updates
  - Speaker analysis interface
  - Audio playback with speaker labels

## 🔍 Monitoring dan Logs

### Lihat Logs
```bash
# All services
docker-compose -f docker-compose.speaker.yml logs -f

# Backend only
docker-compose -f docker-compose.speaker.yml logs -f backend-speaker

# Frontend only
docker-compose -f docker-compose.speaker.yml logs -f frontend
```

### Health Check
```bash
# Check backend health
curl http://localhost:8000/

# Check speaker methods
curl http://localhost:8000/api/speaker-methods

# Check frontend
curl http://localhost:3000/
```

## 🛠 Development Commands

### Stop Services
```bash
docker-compose -f docker-compose.speaker.yml down
```

### Rebuild setelah Code Changes
```bash
docker-compose -f docker-compose.speaker.yml down
docker-compose -f docker-compose.speaker.yml up --build
```

### Clear Volumes (Reset Data)
```bash
docker-compose -f docker-compose.speaker.yml down -v
```

## 🧪 Testing Speaker Detection

1. **Upload audio file** dengan multiple speakers
2. **Pilih speaker method**: pyannote (recommended)
3. **Enable speaker detection**: true
4. **Pilih speed**: medium atau slow
5. **Monitor progress** di interface
6. **Review hasil** dengan speaker labels dan timestamps

## 🔧 Troubleshooting

### Memory Issues
Jika terjadi out of memory:
```bash
# Increase Docker memory limit to 8GB+
# Docker Desktop -> Settings -> Resources -> Memory
```

### Model Loading Slow
PyAnnote dan Whisper models akan di-download otomatis:
- **Whisper Large V3**: ~3GB
- **PyAnnote Models**: ~2GB
- **Total startup time**: 2-5 menit

### Port Conflicts
Jika port 8000/3000 sudah digunakan:
```bash
# Edit .env file
BACKEND_PORT=8002
FRONTEND_PORT=3001
```

## 📊 Performance

### Resource Usage
- **RAM**: 4-8GB (tergantung model size)
- **CPU**: Multi-threaded optimal
- **Storage**: ~5GB untuk models + data
- **Network**: Download models saat first run

### Speed Benchmarks
- **Fast mode**: ~0.1x realtime
- **Medium mode**: ~0.05x realtime  
- **Slow mode**: ~0.02x realtime (best accuracy)

## 🌟 Features Available

✅ **Speaker Detection**: PyAnnote, SpeechBrain, Resemblyzer, WebRTC, Energy  
✅ **Transcription**: Faster-Whisper Large V3  
✅ **Multiple Languages**: 100+ languages  
✅ **Audio Formats**: MP3, WAV, M4A, MP4, MOV, WEBM  
✅ **Real-time Progress**: WebSocket updates  
✅ **Audio Player**: Built-in player dengan speaker navigation  
✅ **Export Options**: JSON, TXT dengan speaker labels  

## 🔒 Security Notes

- Semua processing dilakukan locally (privacy-first)
- Tidak ada data yang dikirim ke cloud services
- Hugging Face token hanya untuk model downloads
- Files disimpan dalam Docker volumes

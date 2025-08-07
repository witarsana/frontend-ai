# 🎯 Voice Note AI

AI-powered meeting transcription and analysis platform with Speaker Detection.

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/witarsana/frontend-ai.git
cd frontend-ai

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Configure network for team sharing
./configure-network.sh

# 4. Start everything
./start.sh
```

**Access URLs:**
- Frontend: http://localhost:3001 (or your network IP)
- Speaker Detection API: http://localhost:8003
- Database API: http://localhost:8000

## 📚 Detailed Documentation

- **[� Complete Deployment Guide](./README_DEPLOYMENT.md)** - Run, stop, update workflows
- **[🐳 Docker Speaker Setup](./DOCKER_SPEAKER_SETUP.md)** - Advanced Docker configuration
- **[🌐 Network Sharing Guide](./NETWORK_ACCESS.md)** - Team collaboration setup

## 🛑 Quick Commands

```bash
# Stop everything
./stop.sh

# Restart with rebuild
./stop.sh && ./start.sh --rebuild

# Development mode (local)
cd backend && python ffmpeg_free_main.py
cd frontend && npm run dev

# Docker mode (production)
docker-compose up --build -d
```

## ⚙️ Configuration

All settings in one place: `.env` file

```bash
# Ports
BACKEND_PORT=8000
FRONTEND_PORT=3000

# AI Services (add your keys)
MISTRAL_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here

# Notion Integration
NOTION_API_KEY=your_notion_key
NOTION_DATABASE_ID=your_database_id
```

## 📁 What You Get

- **Smart Transcription**: Multiple AI engines
- **Speaker Detection**: Who said what
- **AI Analysis**: Extract insights and action items  
- **Notion Integration**: Export to your workspace
- **Local Processing**: Privacy-first design

## 🆘 Problems?

```bash
# Emergency cleanup
./cleanup.sh

# Then try again
./start.sh
```

## 📚 More Info

- [Simple Usage Guide](SIMPLE_USAGE.md) - Essential commands
- [Full Documentation](docs/) - Complete guides
- [Demo Files](demo/) - Example presentations

---

**Made simple. Made powerful.** ⚡

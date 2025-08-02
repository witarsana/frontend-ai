# 🎯 Voice Note AI

AI-powered meeting transcription and analysis platform.

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/witarsana/frontend-ai.git
cd frontend-ai

# 2. Configure (first time only)
cp .env.master .env
# Edit .env with your API keys

# 3. Start everything
./start.sh
```

**That's it!** 

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

## 🛑 Stop Everything

```bash
./stop.sh
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

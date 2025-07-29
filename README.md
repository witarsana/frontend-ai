# 🎙️ Chronicle AI - Meeting Transcription & Analysis Platform

A comprehensive full-stack application for transcribing audio recordings and generating intelligent meeting summaries using advanced AI technologies.

## 🌟 Features

### 🎯 Core Capabilities

- **Audio Transcription**: High-quality speech-to-text using OpenAI Whisper
- **Speaker Diarization**: Automatic speaker identification and separation  
- **AI-Powered Summaries**: Intelligent meeting analysis using Mistral AI
- **Enhanced Chat System**: Interactive AI chat for exploring meeting content
- **Action Items Detection**: Automatic extraction of tasks and decisions
- **Multi-Language Support**: Primary support for Indonesian and English
- **Real-time Processing**: Live progress tracking during transcription

### 🔧 Technical Features

- **Dual Transcription Engine**: Choose between Faster-Whisper (local/free) or Deepgram (cloud/paid)
- **FFmpeg-Free Processing**: Uses librosa and pydub for audio processing
- **Flexible Audio Formats**: Support for MP3, MP4, AAC, M4A, WAV
- **RESTful API**: Clean backend API with FastAPI
- **Modern Frontend**: React TypeScript with responsive design
- **Real-time Updates**: WebSocket-like progress tracking
- **Click-to-Jump Audio**: Click timestamps in transcript to jump to audio position
- **Interactive Transcript**: Auto-highlight current segment with visual feedback

### 🚀 Transcription Engines

#### **Faster-Whisper** (Default - Local Engine)
- ✅ **Completely FREE** - No API costs
- ✅ **Privacy-focused** - Offline processing
- ✅ **No API limits** - Process unlimited audio
- ✅ **4x faster** than OpenAI Whisper
- ✅ **High accuracy** multilingual support
- ✅ **Large file support** - No size/duration limits
- 🎯 **Best for**: Privacy, cost control, large files

#### **Deepgram Nova-2** (Optional - Cloud Engine)
- ✅ **Highest accuracy** available
- ✅ **Ultra-fast** cloud processing  
- ✅ **Advanced speaker diarization** - AI-powered speaker detection
- ✅ **Smart formatting** - Auto punctuation & capitalization
- ✅ **12,000 minutes/month FREE** tier
- ✅ **Real-time processing** - Streaming support
- 💰 **Paid** service after free quota
- ⚠️ **Auto-fallback** to Faster-Whisper for files >45min or >80MB
- 🎯 **Best for**: Speed, accuracy, professional formatting

### 🧠 Dynamic Speaker Detection
- **Adaptive Algorithm**: Automatically detects 2-4 speakers based on conversation patterns
- **Multi-factor Analysis**: Time gaps, text patterns, response indicators
- **No Static Assumptions**: Works for podcasts, meetings, interviews, discussions
- **Conversation Flow**: Natural speaker switching based on dialogue patterns

### **Option 2: PowerShell**
```powershell
# Klik kanan → Run with PowerShell:
START_APP.ps1
````

### **Option 3: Manual (Step-by-step)**

```cmd
# Terminal 1 - Backend
cd ai-backend
python ffmpeg_free_main.py

# Terminal 2 - Frontend
cd frontend-ai
npm run dev

# Browser: http://localhost:3001
```

## 📋 Requirements

- **Python 3.8+** dengan pip
- **Node.js 16+** dengan npm
- **macOS/Linux** (untuk shell scripts)
- **Internet connection** (untuk AI models)

### First Time Setup
```bash
# Install Python dependencies
cd backend
pip install -r requirements.txt

# Install Node.js dependencies  
cd ../frontend
npm install

# Make scripts executable
chmod +x ../quick-start.sh
chmod +x ../scripts/*.sh
```

## 📁 Project Structure

```
frontend-ai/
├── 🚀 quick-start.sh              # Quick launcher (macOS/Linux)
├── 🚀 start-detached.sh           # Background process launcher
├── 🚀 start.sh                    # Alternative launcher
├── backend/                       # Python FastAPI backend
│   ├── ffmpeg_free_main.py        # Main backend server
│   ├── chat_system.py             # AI chat functionality
│   ├── multi_model_chat.py        # Multi-model AI chat
│   ├── prompts.py                 # AI prompt management
│   ├── requirements.txt           # Python dependencies
│   ├── results/                   # AI processing results
│   ├── source/                    # Source audio files
│   └── uploads/                   # Uploaded audio files
├── frontend/                      # React TypeScript frontend
│   ├── src/                       # React source code
│   │   ├── components/            # React components
│   │   ├── services/              # API services
│   │   ├── utils/                 # Utility functions
│   │   └── types.ts               # TypeScript definitions
│   ├── package.json               # Node.js dependencies
│   └── vite.config.ts             # Vite configuration
├── scripts/                       # Utility scripts
│   ├── start-backend.sh           # Backend launcher
│   └── start-frontend.sh          # Frontend launcher
└── docs/                          # Documentation
    └── guides/                    # Implementation guides
```

## 🚀 Quick Start

### **Option 1: Quick Start (macOS/Linux)**
```bash
# Run backend and frontend simultaneously
./quick-start.sh
```

### **Option 2: Individual Scripts**
```bash
# Terminal 1 - Backend only
./scripts/start-backend.sh

# Terminal 2 - Frontend only  
./scripts/start-frontend.sh
```

### **Option 3: Manual (Step-by-step)**
```bash
# Terminal 1 - Backend
cd backend
python ffmpeg_free_main.py

# Terminal 2 - Frontend
cd frontend  
npm run dev

# Browser: http://localhost:3001
```

### **Option 4: VS Code Task**
```bash
# In VS Code, run the task:
# Ctrl+Shift+P → "Tasks: Run Task" → "Start Development Server"
```

## 🎯 How to Use

1. **Start the app:** Run `./quick-start.sh` atau gunakan VS Code task
2. **Upload audio:** Drag & drop your meeting recording
3. **Wait for AI:** Real-time progress tracking
4. **Get results:** Summary, action items, transcript

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Required for AI features
MISTRAL_API_KEY=your_mistral_api_key_here
HUGGING_FACE_TOKEN=your_hugging_face_token_here

# Transcription Engine Configuration
TRANSCRIPTION_ENGINE=faster-whisper  # or "deepgram"

# Optional: Deepgram API (for cloud transcription)
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

### Transcription Engine Selection

#### Option 1: Faster-Whisper (Default - FREE)

```env
TRANSCRIPTION_ENGINE=faster-whisper
```

- ✅ No additional API keys needed
- ✅ Completely free and private
- ✅ Works offline

#### Option 2: Deepgram (Premium - PAID)

```env
TRANSCRIPTION_ENGINE=deepgram
DEEPGRAM_API_KEY=your_key_here
```

- 🆓 12,000 minutes/month FREE
- ⚡ Ultra-fast cloud processing
- 🎯 Highest accuracy available
- 📊 Advanced speaker diarization

### Getting API Keys

1. **Mistral AI**: [mistral.ai](https://mistral.ai) → Console → API Keys
2. **Hugging Face**: [huggingface.co](https://huggingface.co) → Settings → Tokens
3. **Deepgram** (optional): [deepgram.com](https://deepgram.com) → API Keys

### Dynamic Engine Switching

You can change transcription engines at runtime via API:

```bash
# Switch to Deepgram
curl -X POST "http://localhost:8000/api/config/engine" \
  -H "Content-Type: application/json" \
  -d '"deepgram"'

# Switch back to Faster-Whisper
curl -X POST "http://localhost:8000/api/config/engine" \
  -H "Content-Type: application/json" \
  -d '"faster-whisper"'

# Check current configuration
curl "http://localhost:8000/api/config"
```

## 🎬 Demo Materials

- **Stakeholder Presentation:** `demo/stakeholder-presentation.html`
- **Technical Test:** `demo/integration-test.html`
- **Documentation:** `demo/docs/`

## 🆘 Troubleshooting

**Backend not starting?**

```cmd
cd ai-backend
pip install -r requirements.txt
python ffmpeg_free_main.py
```

**Frontend not starting?**

```cmd
cd frontend-ai
npm install
npm run dev
```

**Port conflicts?**

- Backend: http://localhost:8000
- Frontend: http://localhost:3001

**Transcription not working?**

Check your API keys in `.env` file:
```bash
cd backend
cp .env.example .env
# Edit .env with your API keys
```

## 📊 Supported Formats

- **Audio:** WAV, MP3, M4A, FLAC
- **Video:** MP4, AVI, MOV (audio extracted)
- **Size:** Up to 500MB
- **Duration:** Up to 4 hours

## 📚 Documentation

Comprehensive documentation is organized in the `docs/` folder:

### 📋 Testing & Results
- `docs/testing/REAL_DATA_TEST_RESULTS.md` - Production test results
- `docs/testing/AI_TESTING_README.md` - Testing procedures and guidelines

### 📖 Implementation Guides  
- `docs/guides/IMPLEMENTATION_SUMMARY.md` - Complete implementation overview
- `docs/guides/CHAT_FEATURE_COMPLETE.md` - AI chat system documentation
- `docs/guides/MULTI_MODEL_SETUP.md` - Multi-model AI configuration
- `docs/guides/PROMPT_MANAGEMENT.md` - Prompt system management
- `docs/guides/CONFIG_GUIDE.md` - Configuration and setup guide

### 🔬 Research & Development
- `docs/notebooks/AI_Chat_Feature_Analysis.ipynb` - Chat feature analysis
- `docs/notebooks/improved_chat_analysis.ipynb` - Enhanced chat research

## 🎉 Ready for Production!

Chronicle AI is **production-ready** with comprehensive documentation, testing results, and clean codebase architecture!

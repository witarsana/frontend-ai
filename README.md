# 🎙️ AI Meeting Transcription & Analysis Platform

A comprehensive full-stack application for transcribing audio recordings and generating intelligent meeting summaries using advanced AI technologies.

## 🌟 Features

### 🎯 Core Capabilities
- **Audio Transcription**: High-quality speech-to-text using OpenAI Whisper
- **Speaker Diarization**: Automatic speaker identification and separation
- **AI-Powered Summaries**: Intelligent meeting analysis using Mistral AI
- **Action Items Detection**: Automatic extraction of tasks and decisions
- **Multi-Language Support**: Primary support for Indonesian and English
- **Real-time Processing**: Live progress tracking during transcription

### 🔧 Technical Features
- **FFmpeg-Free Processing**: Uses librosa and pydub for audio processing
- **Flexible Audio Formats**: Support for MP3, MP4, AAC, M4A, WAV
- **RESTful API**: Clean backend API with FastAPI
- **Modern Frontend**: React TypeScript with responsive design
- **Real-time Updates**: WebSocket-like progress tracking
```

### **Option 2: PowerShell**
```powershell
# Klik kanan → Run with PowerShell:
START_APP.ps1
```

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
- **Internet connection** (untuk AI models)

## 📁 Project Structure (Cleaned)

```
voiceNote/
├── 🚀 START_APP.bat           # Quick launcher (Windows)
├── 🚀 START_APP.ps1           # Quick launcher (PowerShell)
├── ai-backend/                # Python FastAPI backend
│   ├── ffmpeg_free_main.py    # Main backend server
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # API keys configuration
├── frontend-ai/               # React frontend application
│   ├── src/                   # React source code
│   ├── package.json           # Node.js dependencies
│   └── public/                # Static assets
├── demo/                      # Demo & presentation materials
│   ├── stakeholder-presentation.html  # Interactive slides
│   ├── integration-test.html          # Tech testing interface
│   ├── docs/                          # Documentation
│   └── scripts/                       # Utility scripts
├── results/                   # AI processing results
└── uploads/                   # Uploaded audio files
```

## 🎯 How to Use

1. **Start the app:** Run `START_APP.bat`
2. **Upload audio:** Drag & drop your meeting recording
3. **Wait for AI:** Real-time progress tracking
4. **Get results:** Summary, action items, transcript

## 🔧 Configuration

Edit `ai-backend/.env`:
```env
MISTRAL_API_KEY=your_mistral_api_key_here
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
- Backend: http://localhost:8002
- Frontend: http://localhost:3001

## 📊 Supported Formats

- **Audio:** WAV, MP3, M4A, FLAC
- **Video:** MP4, AVI, MOV (audio extracted)
- **Size:** Up to 500MB
- **Duration:** Up to 4 hours

## 🎉 Ready to Demo!

Your AI Meeting Transcription system is now **clean, organized, and ready to use**!

# 🎙️ AI Meeting Transcription - Full Stack Application

A complete full-stack application for AI-powered meeting transcription with real-time speaker diarization, automatic summary generation, and intelligent content analysis.

## ✨ Features

### 🎯 Core Functionality
- 📁 **Multi-Format Audio Upload**: Support for MP3, WAV, MP4, M4A, AAC, FLAC, OGG (up to 150MB)
- 🧠 **Real AI Processing**: 
  - Whisper AI for accurate transcription
  - Pyannote.audio for multi-speaker diarization (up to 4+ speakers)
  - Mistral AI for intelligent summaries
- 🎵 **Integrated Audio Player**: HTML5 audio player with real-time playback and seeking
- 📊 **Real-time Progress Tracking**: Live progress updates during processing
- 🔍 **Advanced Search & Filtering**: Search transcripts by text, speaker, or tags
- 📋 **Comprehensive Pagination**: Navigate through long transcripts efficiently

### 🤖 AI-Powered Features
- **Speaker Detection**: SUPER AGGRESSIVE multi-speaker detection algorithm
- **Smart Summaries**: Auto-generated meeting summaries with key insights
- **Action Items Extraction**: Automatic identification of tasks and decisions
- **Sentiment Analysis**: Meeting sentiment and tone analysis
- **Content Tagging**: Intelligent categorization of content

### 🎨 User Experience
- **Drag & Drop Upload**: Intuitive file upload interface
- **Responsive Design**: Mobile-friendly layout
- **Dark/Light Theme Support**: Modern UI with gradient backgrounds
- **Real-time Updates**: Live status updates during processing

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **HTML5 Audio API** for audio playback
- **Modern CSS** with animations and gradients

### Backend
- **FastAPI** (Python) for high-performance API
- **Whisper AI** for speech-to-text transcription
- **Pyannote.audio** for speaker diarization
- **Mistral AI** for content analysis and summaries
- **Librosa & Pydub** for audio processing
- **FFmpeg** for audio format conversion

### Audio Processing Pipeline
```
Upload → Pydub Conversion → Librosa Processing → Whisper Transcription → Speaker Diarization → AI Summary
```

## 🚀 Getting Started

### Prerequisites

Pastikan Anda memiliki:
- **Node.js** (v16 atau lebih tinggi)
- **Python** (3.9 atau lebih tinggi)
- **FFmpeg** (untuk konversi audio)
- **npm** atau **yarn**

### 🔧 Installation & Setup

#### 1. Clone Repository
```bash
git clone https://github.com/witarsana/frontend-ai.git
cd frontend-ai
git checkout Ai_integration_backend
```

#### 2. Setup Backend (Python)
```bash
# Buat virtual environment
python -m venv .venv

# Aktivasi virtual environment
# Untuk macOS/Linux:
source .venv/bin/activate
# Untuk Windows:
# .venv\Scripts\activate

# Install dependencies
cd ai-backend
pip install -r requirements.txt

# Install FFmpeg (macOS)
brew install ffmpeg
# Untuk sistem lain, lihat: https://ffmpeg.org/download.html
```

#### 3. Environment Configuration
Buat file `.env` di folder `ai-backend/`:
```env
# AI API Keys
MISTRAL_API_KEY=your_mistral_api_key_here
HUGGING_FACE_TOKEN=your_hugging_face_token_here

# Directories
UPLOADS_DIR=./uploads
RESULTS_DIR=./results
```

**Cara mendapatkan API Keys:**
- **Mistral AI**: Daftar di [mistral.ai](https://mistral.ai) → Console → API Keys
- **Hugging Face**: Daftar di [huggingface.co](https://huggingface.co) → Settings → Access Tokens

#### 4. Setup Frontend (React)
```bash
# Install dependencies
npm install

# Untuk development
npm run dev

# Untuk production build
npm run build
npm run preview
```

### 🎯 Running the Application

#### Terminal 1 - Backend Server
```bash
cd ai-backend
source ../.venv/bin/activate  # Aktivasi virtual environment
python ffmpeg_free_main.py
```
✅ Backend akan berjalan di: `http://localhost:8000`

#### Terminal 2 - Frontend Server
```bash
npm run dev
```
✅ Frontend akan berjalan di: `http://localhost:3000` atau `http://localhost:3001`

## 📋 Usage Guide

### 1. Upload Audio File
- Buka aplikasi di browser
- Drag & drop file audio atau klik "Choose File"
- Supported formats: MP3, WAV, MP4, M4A, AAC, FLAC, OGG
- Maximum file size: 150MB

### 2. Monitor Processing
- Lihat progress bar real-time
- Status akan berubah: Starting → Loading Models → Preprocessing → Transcribing → Generating Summary
- Processing time tergantung durasi audio (±1-2 menit untuk audio 5 menit)

### 3. View Results
- **Transcript Tab**: Lihat transkrip lengkap dengan speaker detection
- **Summary Tab**: Baca ringkasan, action items, dan key decisions
- **Analytics Tab**: Analisis speaker statistics dan insights
- **Audio Player**: Putar audio dengan sinkronisasi transkrip

### 4. Advanced Features
- **Search**: Cari kata kunci dalam transkrip
- **Filter by Speaker**: Filter berdasarkan pembicara tertentu
- **Pagination**: Navigate transkrip panjang dengan mudah
- **Export**: Download hasil (JSON format)

## 📁 Project Structure

```
frontend-ai/
├── src/                          # Frontend React code
│   ├── components/              # React components
│   │   ├── AudioPlayer.tsx      # HTML5 audio player
│   │   ├── TranscriptTab.tsx    # Transcript with pagination
│   │   ├── SummaryTab.tsx       # AI-generated summaries
│   │   ├── AnalyticsTab.tsx     # Speaker analytics
│   │   └── UploadSection.tsx    # File upload interface
│   ├── services/
│   │   └── api.ts               # API integration
│   ├── types.ts                 # TypeScript definitions
│   └── App.tsx                  # Main application
├── ai-backend/                   # Backend Python code
│   ├── ffmpeg_free_main.py      # Main FastAPI application
│   ├── requirements.txt         # Python dependencies
│   ├── .env                     # Environment variables
│   ├── uploads/                 # Uploaded audio files
│   └── results/                 # Processing results
├── .venv/                       # Python virtual environment
├── package.json                 # Node.js dependencies
└── README.md                    # This documentation
```

## 🔧 API Endpoints

### Backend API (Port 8000)
- `POST /api/upload-and-process` - Upload dan proses file audio
- `GET /api/status/{job_id}` - Cek status processing
- `GET /api/result/{job_id}` - Ambil hasil transcription
- `GET /api/audio/{job_id}` - Serve audio file untuk playback
- `GET /api/jobs/completed` - List semua job yang selesai

### Development Scripts
```bash
# Frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Backend
python ffmpeg_free_main.py  # Start FastAPI server
```

## ⚡ Performance & Optimization

### Audio Processing Optimization
- **Pydub + FFmpeg**: Optimal audio format conversion
- **Librosa**: High-quality audio preprocessing
- **Chunked Processing**: Efficient memory usage for large files

### AI Model Performance
- **Whisper Tiny**: Fast transcription with good accuracy
- **Pyannote 3.1**: State-of-the-art speaker diarization
- **Mistral Large**: High-quality content analysis

### Expected Processing Times
- **5-minute audio**: ~1-2 minutes processing
- **30-minute audio**: ~5-8 minutes processing
- **60+ minute audio**: ~10-15 minutes processing

## 🐛 Troubleshooting

### Common Issues

#### Backend tidak start
```bash
# Cek virtual environment
source .venv/bin/activate
pip list | grep fastapi

# Install ulang dependencies
pip install -r ai-backend/requirements.txt
```

#### Audio processing gagal
```bash
# Cek FFmpeg installation
ffmpeg -version

# Install FFmpeg jika belum ada
brew install ffmpeg  # macOS
```

#### API Keys error
- Pastikan `.env` file ada di `ai-backend/`
- Cek format API keys (tanpa quotes)
- Pastikan Hugging Face token memiliki akses ke pyannote models

#### Port already in use
```bash
# Kill process on port
lsof -ti:8000 | xargs kill -9  # Backend
lsof -ti:3000 | xargs kill -9  # Frontend
```

## 🔒 Security & Privacy

- File audio diproses secara lokal
- Tidak ada data yang dikirim ke server eksternal (kecuali AI APIs)
- File upload dibatasi 150MB untuk security
- Temporary files dibersihkan otomatis setelah processing

## 🚀 Future Enhancements

- [ ] **Real-time Transcription**: Live audio processing
- [ ] **Multiple Language Support**: Support untuk bahasa Indonesia
- [ ] **Speaker Training**: Custom speaker recognition
- [ ] **Cloud Integration**: AWS/GCP storage integration
- [ ] **Advanced Export**: PDF, DOCX, SRT formats
- [ ] **Meeting Scheduler**: Calendar integration
- [ ] **Team Collaboration**: Multi-user support
- [ ] **API Authentication**: JWT-based security

## 🚀 Quick Start

### Option 1: Manual Setup
```bash
# 1. Setup backend
cd ai-backend
python -m venv ../.venv
source ../.venv/bin/activate  # macOS/Linux
pip install -r requirements.txt

# 2. Configure environment
cp .env.example .env
# Edit .env dengan API keys Anda

# 3. Install FFmpeg
brew install ffmpeg  # macOS

# 4. Setup frontend
cd ..
npm install

# 5. Run aplikasi
# Terminal 1 - Backend
cd ai-backend && source ../.venv/bin/activate && python ffmpeg_free_main.py

# Terminal 2 - Frontend  
npm run dev
```

### Option 2: One-Command Start (Recommended)
```bash
# Setup sekali saja
npm run setup

# Jalankan aplikasi (frontend + backend)
npm start
```

### Quick Commands
```bash
npm run dev          # Frontend only (port 3000)
npm run backend      # Backend only (port 8000)  
npm run dev:full     # Both frontend + backend
npm start            # Alias untuk dev:full
npm run clean        # Clean semua generated files
```

## 🌐 Access Points

- **Frontend**: `http://localhost:3000` (atau 3001 jika 3000 occupied)
- **Backend API**: `http://localhost:8000`
- **API Docs**: `http://localhost:8000/docs` (Swagger UI)
- **API Redoc**: `http://localhost:8000/redoc`

## 📊 Monitoring & Debugging

### Development Logs
```bash
# Frontend logs
npm run dev

# Backend logs  
cd ai-backend && python ffmpeg_free_main.py

# Combined logs
npm run dev:full
```

### Health Checks
```bash
# Backend health
curl http://localhost:8000/

# API status
curl http://localhost:8000/api/jobs/completed
```

### Common Development Issues

#### Port conflicts
```bash
# Kill processes
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:8000 | xargs kill -9  # Backend
```

#### Environment issues
```bash
# Check Python environment
which python && python --version

# Check Node environment  
which node && node --version && npm --version

# Check FFmpeg
ffmpeg -version
```

## 🤝 Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

### Development Guidelines
- Gunakan TypeScript untuk frontend code
- Follow ESLint rules untuk code quality
- Test changes dengan audio files berbeda
- Update documentation jika diperlukan

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI Whisper** untuk speech-to-text technology
- **Pyannote.audio** untuk speaker diarization
- **Mistral AI** untuk content analysis
- **FFmpeg** untuk audio processing
- **React & Vite** untuk modern frontend development
- **FastAPI** untuk high-performance backend

## 📞 Support

Jika Anda mengalami masalah atau memiliki pertanyaan:

1. **Check README** - Dokumentasi lengkap tersedia di atas
2. **Check Issues** - Lihat existing issues di GitHub
3. **Create Issue** - Buat issue baru dengan detail yang lengkap
4. **Troubleshooting** - Ikuti panduan troubleshooting di atas

### Reporting Bugs
Saat melaporkan bug, sertakan:
- OS dan versi (macOS, Windows, Linux)
- Node.js dan Python version
- Error messages lengkap
- Steps to reproduce
- Sample audio file (jika memungkinkan)

---

**Dibuat dengan ❤️ menggunakan AI-powered technology**

**Status**: ✅ Production Ready | 🚀 Actively Developed | 🔧 Community Driven

- `npm run dev` - Start development server (Frontend)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `python ffmpeg_free_main.py` - Start backend server (Backend)

## 📂 Complete Project Structure

```
frontend-ai/                     # Main repository
├── 📁 src/                      # Frontend React application
│   ├── 📁 components/           # React components
│   │   ├── 🎵 AudioPlayer.tsx   # HTML5 audio player with seek
│   │   ├── 📝 TranscriptItem.tsx # Individual transcript segment
│   │   ├── 📋 TranscriptTab.tsx  # Transcript with pagination & search
│   │   ├── 📊 SummaryTab.tsx     # AI-generated summaries & insights
│   │   ├── 📈 AnalyticsTab.tsx   # Speaker statistics & analytics
│   │   ├── 📤 UploadSection.tsx  # Drag & drop file upload
│   │   └── ⚙️ ProcessingSection.tsx # Real-time processing status
│   ├── 📁 services/             # API integration
│   │   └── 🔌 api.ts            # FastAPI backend integration
│   ├── 📁 utils/                # Utility functions
│   │   └── 🛠️ helpers.ts         # Helper functions
│   ├── 📄 types.ts              # TypeScript type definitions
│   ├── 📱 App.tsx               # Main application component
│   ├── 🚀 main.tsx              # Application entry point
│   └── 🎨 index.css             # Global styles & themes
├── 📁 ai-backend/               # Backend Python application
│   ├── 🐍 ffmpeg_free_main.py   # FastAPI server with AI processing
│   ├── 📋 requirements.txt      # Python dependencies
│   ├── 🔐 .env                  # Environment variables (API keys)
│   ├── 📁 uploads/              # Uploaded audio files storage
│   ├── 📁 results/              # Processing results (JSON)
│   └── 📚 README.md             # Backend-specific documentation
├── 📁 .venv/                    # Python virtual environment
├── 📦 package.json              # Node.js dependencies & scripts
├── ⚙️ vite.config.ts            # Vite configuration
├── 🧹 .eslintrc.js              # ESLint configuration
├── 🔧 tsconfig.json             # TypeScript configuration
└── 📖 README.md                 # This comprehensive documentation
```

## 🔧 Component Architecture

### 🎯 Main Components

- **App.tsx**: Main application component with centralized state management
- **UploadSection**: Modern file upload with drag & drop, progress tracking
- **ProcessingSection**: Real-time AI processing with live progress updates
- **AudioPlayer**: HTML5 audio player with seek functionality and duration display
- **TranscriptTab**: Advanced transcript display with pagination, search, and filtering
- **SummaryTab**: AI-generated summaries, action items, key decisions, and insights
- **AnalyticsTab**: Speaker statistics, meeting analytics, and visual insights

### 🚀 Key Features Implementation

#### 🔄 Real-time State Management
Centralized state using React hooks with live updates:
- Upload/processing/results flow management
- Real-time progress tracking (0-100%)
- Dynamic tab switching and content loading
- Search query and filter state management
- Audio playback synchronization

#### 🎵 Advanced Audio Player Integration
Professional audio player with:
- HTML5 Audio API integration
- Real-time duration loading from backend
- Play/pause with visual feedback
- Seek bar with precise time display
- Integration with transcript timestamps
- Auto-scroll transcript during playback

#### 🔍 Intelligent Search and Filtering
Advanced filtering system:
- Full-text search across transcript content
- Multi-speaker filtering with dynamic speaker list
- Tag-based filtering (action items, decisions, questions)
- Real-time filter application with debouncing
- Pagination with filtered results
- Search result highlighting

#### 📊 Pagination & Performance
Optimized for large transcripts:
- Configurable items per page (10, 25, 50, 100)
- Smart page navigation with jump-to-page
- Efficient rendering for long conversations
- Search-aware pagination
- Mobile-responsive page controls

## 🤖 AI Processing Pipeline

### 🎙️ Audio Processing Flow
```
1. 📤 File Upload (Drag & Drop)
   ↓
2. 🔄 Format Detection (MP3/MP4/AAC/etc.)
   ↓
3. 🎵 Pydub Conversion (to WAV)
   ↓
4. 📊 Librosa Preprocessing (16kHz, mono)
   ↓
5. 🧠 Whisper AI Transcription
   ↓
6. 🎭 Pyannote Speaker Diarization
   ↓
7. 🤖 Mistral AI Content Analysis
   ↓
8. ✅ Results & Summary Generation
```

### 🎯 SUPER AGGRESSIVE Speaker Detection
Advanced multi-speaker detection algorithm:
- **Time-based switching**: Every 20-30 seconds
- **Segment-based analysis**: Every 3-4 segments
- **Audio feature analysis**: MFCC-based speaker guidance
- **Pattern recognition**: Natural conversation flow
- **Minimum speaker guarantee**: Always detects 2-4 speakers
- **Fallback mechanisms**: Multiple detection strategies

### 📋 Content Analysis Features
- **Automatic summarization**: Key points and insights
- **Action item extraction**: Actionable tasks identification
- **Decision tracking**: Important decisions and outcomes
- **Sentiment analysis**: Meeting tone and sentiment
- **Topic categorization**: Intelligent content tagging
- **Speaker analytics**: Talk time and participation metrics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if necessary
5. Submit a pull request

## License

This project is licensed under the MIT License.

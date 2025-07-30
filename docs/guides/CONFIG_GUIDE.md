# AI Project Configuration Guide

## 🔧 Centralized Configuration System

Sistem ini menggunakan konfigurasi terpusat untuk mengelola semua port dan environment variables.

### 📁 File Konfigurasi

1. **`.env`** (Root directory)

   - Konfigurasi utama untuk backend dan frontend
   - Berisi API keys, port settings, dan host configuration

2. **`frontend/.env`**

   - Environment variables khusus untuk Vite frontend
   - Otomatis loaded oleh Vite development server

3. **`frontend/src/config/ports.ts`**
   - Centralized TypeScript configuration
   - Type-safe port and URL management

### 🚀 Cara Menjalankan

#### Menggunakan Script Terpusat (Recommended)

```bash
npm run dev
# atau
./start.sh
```

#### Menjalankan Service Terpisah

```bash
# Backend saja
npm run backend

# Frontend saja
npm run frontend
```

### 🌐 Port Configuration

- **Backend**: `http://localhost:8001`
- **Frontend**: `http://localhost:3000`
- **Proxy**: Frontend otomatis proxy ke backend

### 🤖 AI Transcription Engines

The system now supports four transcription engines:

1. **Faster-Whisper (OpenAI)** - High accuracy, multilingual, paid
2. **Deepgram Nova-2** - Ultra-fast, speaker diarization, paid
3. **Hugging Face Whisper** - Open source, free tier, community models
4. **Mistral AI** - Experimental, enhancement features, paid

### 📝 Environment Variables

#### Backend (.env)

```env
BACKEND_HOST=localhost
BACKEND_PORT=8001
FRONTEND_HOST=localhost
FRONTEND_PORT=3000

# AI Service API Keys
OPENAI_API_KEY=your_openai_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
MISTRAL_API_KEY=your_mistral_api_key
HUGGING_FACE_TOKEN=your_huggingface_token

# Default transcription engine
TRANSCRIPTION_ENGINE=faster-whisper
```

#### Frontend (frontend/.env)

```env
VITE_BACKEND_HOST=localhost
VITE_BACKEND_PORT=8000
VITE_FRONTEND_PORT=3000
```

### 🔄 Scripts Available

- `npm run dev` - Start semua services dengan environment configuration
- `npm run backend` - Start backend dengan environment variables
- `npm run frontend` - Start frontend dengan proxy configuration
- `npm run dev:old` - Legacy scripts (untuk fallback)

### ⚙️ TypeScript Configuration

File `frontend/src/config/ports.ts` menyediakan:

- Centralized port management
- Type-safe configuration
- Development/production settings
- Auto-generated URLs

### 🛠️ Troubleshooting

1. **Port Conflict**: Script otomatis check port availability
2. **Environment Loading**: Pastikan .env files ada di lokasi yang benar
3. **TypeScript Errors**: Pastikan @types/node terinstall

### 📊 File Structure

```
ai_project/
├── .env                          # Main configuration
├── start.sh                     # Main startup script
├── scripts/
│   ├── start-backend.sh         # Backend startup
│   └── start-frontend.sh        # Frontend startup
├── frontend/
│   ├── .env                     # Vite environment
│   ├── vite.config.ts           # Vite + proxy config
│   └── src/config/ports.ts      # TypeScript config
└── ffmpeg_free_main.py          # Backend with env support
```

Semua port configuration sekarang terpusat dan mudah dikelola! 🎉

# Node.js Quick Start Guide

## 🚀 Quick Start (Node.js Backend)

### Start Everything
```bash
./start-node.sh
```

This will start:
- **Node.js Backend** on `http://localhost:8001`
- **React Frontend** on `http://localhost:3000`

### Manual Setup

#### 1. Backend Setup
```bash
cd backend-node
npm install
cp .env.example .env
# Edit .env with your API keys
npm start
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🔧 Configuration

### Backend Environment Variables (.env)
```bash
BACKEND_PORT=8001
OPENAI_API_KEY=your_openai_api_key_here
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

### Frontend Environment Variables (.env)
```bash
VITE_BACKEND_PORT=8001
VITE_BACKEND_URL=http://localhost:8001
```

## 🎯 Features Available

- ✅ **File Upload**: Drag & drop audio/video files
- ✅ **Real-time Transcription**: OpenAI Whisper + Deepgram
- ✅ **AI Analysis**: Summaries, action items, key decisions
- ✅ **Interactive Chat**: Ask questions about your transcripts
- ✅ **Session Management**: Track multiple transcription jobs
- ✅ **Export Options**: Download transcripts and summaries

## 🔗 API Endpoints

- `GET /` - Server status
- `POST /api/upload-and-process` - Upload files
- `GET /api/status/:jobId` - Processing status
- `GET /api/result/:jobId` - Get results
- `POST /api/chat` - Chat with transcripts

## 🐛 Troubleshooting

### Backend Not Starting
```bash
# Check if port 8001 is available
lsof -ti :8001
# Kill process if needed
kill $(lsof -ti :8001)
```

### Frontend Not Connecting
- Ensure backend is running on port 8001
- Check browser console for CORS errors
- Verify `.env` files are configured correctly

## 🔄 Legacy Python Backend

The original Python backend is still available in the `backend/` directory. Use `./start-project.sh` to run the Python version instead.

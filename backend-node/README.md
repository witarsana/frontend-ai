# Node.js Transcription Backend

A complete Node.js/Express backend for AI-powered audio transcription and analysis.

## Features

- 🎵 **Audio Transcription**: OpenAI Whisper and Deepgram support
- 🤖 **AI Analysis**: Automatic summaries, action items, and key decisions
- 💬 **Chat System**: Ask questions about your transcripts
- 📁 **File Management**: Upload and process various audio/video formats
- 🔄 **Real-time Status**: Live progress tracking for transcription jobs

## Quick Start

### 1. Install Dependencies
```bash
cd backend-node
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Start Server
```bash
npm start
```

The server will start on `http://localhost:8000`

## API Endpoints

### Core Endpoints
- `GET /` - Server status and configuration
- `POST /api/upload-and-process` - Upload and transcribe audio files
- `GET /api/status/:jobId` - Get processing status
- `GET /api/result/:jobId` - Get transcription results

### Configuration
- `GET /api/config` - Get server configuration
- `GET /api/engines` - Get available transcription engines

### Chat System
- `POST /api/chat` - Ask questions about transcripts
- `POST /api/chat/load/:jobId` - Load transcript for chat
- `GET /api/chat/suggestions` - Get suggested questions

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BACKEND_PORT` | No | Server port (default: 8000) |
| `OPENAI_API_KEY` | Yes | OpenAI API key for Whisper |
| `DEEPGRAM_API_KEY` | No | Deepgram API key (optional) |

## Supported Formats

### Audio
- WAV, MP3, M4A, FLAC, OGG

### Video
- MP4, MKV, AVI, MOV

## Architecture

```
backend-node/
├── server.js              # Main Express server
├── services/
│   ├── transcriptionService.js  # Audio transcription logic
│   ├── aiService.js             # AI analysis (summaries, etc.)
│   └── chatService.js           # Chat system
├── uploads/               # Uploaded files
├── results/              # Processing results
└── temp/                 # Temporary files
```

## Development

### Start Development Server
```bash
npm run dev  # With nodemon for auto-restart
```

### Test API
```bash
# Check server status
curl http://localhost:8000/

# Upload a file
curl -X POST -F "file=@test.mp3" http://localhost:8000/api/upload-and-process
```

## Dependencies

- **Express**: Web framework
- **Multer**: File upload handling
- **OpenAI**: Whisper transcription
- **Deepgram SDK**: Alternative transcription
- **FFmpeg**: Audio processing
- **fs-extra**: Enhanced file system operations

## Error Handling

The backend includes comprehensive error handling:
- File format validation
- Size limits (1GB max)
- API key validation
- Graceful fallbacks when services are unavailable

## Mock Mode

When no API keys are provided, the backend runs in mock mode with sample data for testing the frontend integration.

## Production Notes

- Use environment variables for all sensitive configuration
- Consider implementing rate limiting
- Set up proper logging
- Use a process manager like PM2 for production deployment

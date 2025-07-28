# 🐍 AI Backend - FastAPI Audio Processing Server

Backend server untuk AI Meeting Transcription menggunakan FastAPI dengan integrasi Whisper AI, Pyannote.audio, dan Mistral AI.

## 🚀 Features

### 🎙️ Audio Processing
- **Multi-format Support**: MP3, WAV, MP4, M4A, AAC, FLAC, OGG
- **Intelligent Conversion**: Pydub + FFmpeg untuk konversi optimal
- **Audio Preprocessing**: Librosa untuk preprocessing audio berkualitas tinggi
- **Large File Support**: Hingga 150MB per file

### 🧠 AI Integration
- **Whisper AI**: Speech-to-text transcription dengan akurasi tinggi
- **Pyannote.audio**: State-of-the-art speaker diarization
- **Mistral AI**: Content analysis dan summary generation
- **Multi-speaker Detection**: SUPER AGGRESSIVE algorithm untuk deteksi speaker

### ⚡ Performance
- **Async Processing**: Non-blocking audio processing
- **Real-time Progress**: Live progress updates
- **Memory Optimization**: Efficient handling untuk file besar
- **Error Handling**: Robust error handling dengan fallback mechanisms

## 🔧 Installation

### 1. Virtual Environment
```bash
# Buat virtual environment
python -m venv .venv

# Aktivasi (macOS/Linux)
source .venv/bin/activate

# Aktivasi (Windows)
.venv\Scripts\activate
```

### 2. Dependencies
```bash
# Install Python packages
pip install -r requirements.txt

# Install FFmpeg
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Windows
# Download dari: https://ffmpeg.org/download.html
```

### 3. Environment Configuration
Buat file `.env`:
```env
# AI API Keys
MISTRAL_API_KEY=your_mistral_api_key_here
HUGGING_FACE_TOKEN=your_hugging_face_token_here

# Directories
UPLOADS_DIR=./uploads
RESULTS_DIR=./results
```

2. **Install FFmpeg** (required for audio processing):
   - Windows: Download from https://ffmpeg.org/download.html
   - Or use: `winget install FFmpeg`

3. **Setup environment variables:**
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. **Get Hugging Face token** (for speaker diarization):
   - Go to https://huggingface.co/pyannote/speaker-diarization-3.1
   - Accept user agreement
   - Get your token from https://huggingface.co/settings/tokens

## Usage

1. **Start the server:**
```bash
python main.py
```
Server runs at: http://localhost:8000

2. **API Endpoints:**
   - `POST /api/upload-and-process` - Upload and process audio/video
   - `GET /api/status/{job_id}` - Check processing status
   - `GET /api/result/{job_id}` - Get transcription results

3. **Example request:**
```bash
curl -X POST "http://localhost:8000/api/upload-and-process" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@meeting.mp3"
```

## Supported Formats

**Audio**: MP3, WAV, M4A, FLAC, OGG
**Video**: MP4, MOV, MKV, AVI, WMV, FLV, WEBM

## API Response Format

```json
{
  "job_id": "job_20250125_143022",
  "filename": "meeting.mp3",
  "transcript": [
    {
      "start": 0.0,
      "end": 5.2,
      "text": "Mari kita mulai meeting hari ini",
      "speaker": "speaker-1",
      "speaker_name": "John",
      "confidence": 0.95,
      "tags": []
    }
  ],
  "summary": "Meeting membahas project timeline dan deliverables...",
  "action_items": [
    "John: Finalisasi wireframe (Deadline: Jumat)"
  ],
  "key_decisions": [
    "Menggunakan React untuk frontend redesign"
  ],
  "tags": [
    {
      "text": "finalisasi wireframe",
      "tag": "action-item",
      "speaker": "John",
      "timestamp": "02:15"
    }
  ],
  "speakers": ["speaker-1", "speaker-2"],
  "participants": ["John", "Sarah"],
  "meeting_type": "planning",
  "sentiment": "positive",
  "duration": 120.5,
  "processed_at": "2025-01-25T14:30:22"
}
```

## Configuration

Edit `.env` file:
```env
MISTRAL_API_KEY=your_mistral_api_key
HUGGING_FACE_TOKEN=your_hf_token
UPLOADS_DIR=./uploads
RESULTS_DIR=./results
```

## Notes

- First run will download Whisper model (~140MB for base model)
- Speaker diarization requires Hugging Face token and user agreement
- Processing time depends on file size and hardware capabilities
- Results are saved to `./results/` directory for persistence

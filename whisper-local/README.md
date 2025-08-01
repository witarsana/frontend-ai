# Local Whisper Setup

This directory contains a Docker-based local Whisper service that provides an OpenAI-compatible API without requiring internet access.

## Features

- 🏠 **Local Processing**: No internet required for transcription
- 🔌 **OpenAI Compatible**: Drop-in replacement for OpenAI Whisper API
- 🚀 **Multiple Models**: Support for tiny, base, small, medium, and large models
- 🐳 **Docker Ready**: Easy deployment with Docker Compose
- 💰 **Cost Effective**: No API usage fees
- 🔒 **Privacy**: Audio never leaves your machine

## Quick Start

1. **Build and start the local Whisper service:**

   ```bash
   # From the project root
   docker-compose -f docker-compose.whisper.yml up -d
   ```

2. **Set environment variables:**

   ```bash
   # Copy example environment file
   cp .env.whisper.example .env.local

   # Edit .env.local or add to your main .env file:
   USE_LOCAL_WHISPER=true
   LOCAL_WHISPER_URL=http://localhost:8000
   ```

3. **Install dependencies:**

   ```bash
   cd backend-node
   npm install
   ```

4. **Start your application:**
   ```bash
   npm run dev
   ```

## Configuration

### Environment Variables

- `USE_LOCAL_WHISPER=true` - Enable local Whisper service
- `LOCAL_WHISPER_URL=http://localhost:8000` - Local service URL
- `WHISPER_MODEL=base` - Model size (tiny, base, small, medium, large)

### Model Selection

Choose the right model for your needs:

| Model  | Size   | Speed | Quality | Use Case           |
| ------ | ------ | ----- | ------- | ------------------ |
| tiny   | 39MB   | ~32x  | Good    | Real-time, testing |
| base   | 74MB   | ~16x  | Better  | General use        |
| small  | 244MB  | ~6x   | Good    | Balanced           |
| medium | 769MB  | ~2x   | Better  | High quality       |
| large  | 1550MB | ~1x   | Best    | Production         |

### GPU Support

For faster processing with NVIDIA GPUs:

1. Install [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)

2. Update docker-compose.whisper.yml:
   ```yaml
   services:
     whisper-local:
       deploy:
         resources:
           reservations:
             devices:
               - driver: nvidia
                 count: 1
                 capabilities: [gpu]
   ```

## API Endpoints

The local service provides OpenAI-compatible endpoints:

- `POST /v1/audio/transcriptions` - Transcribe audio
- `POST /v1/audio/translations` - Translate audio to English
- `GET /v1/models` - List available models
- `GET /health` - Health check

## Usage Examples

### Basic Transcription

```bash
curl -X POST http://localhost:8000/v1/audio/transcriptions \
  -H "Content-Type: multipart/form-data" \
  -F "file=@audio.mp3" \
  -F "model=whisper-1" \
  -F "response_format=json"
```

### Verbose Response with Timestamps

```bash
curl -X POST http://localhost:8000/v1/audio/transcriptions \
  -H "Content-Type: multipart/form-data" \
  -F "file=@audio.mp3" \
  -F "model=whisper-1" \
  -F "response_format=verbose_json" \
  -F "timestamp_granularities=segment"
```

## Troubleshooting

### Service Not Starting

```bash
# Check logs
docker-compose -f docker-compose.whisper.yml logs whisper-local

# Check status
docker-compose -f docker-compose.whisper.yml ps
```

### Out of Memory

```bash
# Use smaller model
WHISPER_MODEL=tiny docker-compose -f docker-compose.whisper.yml up -d

# Or increase memory limit in docker-compose.whisper.yml
```

### Slow Performance

- Use GPU if available
- Use smaller model (tiny/base)
- Increase Docker memory allocation
- Preprocess audio to reduce file size

## Integration

The backend automatically detects and uses the local Whisper service when:

1. `USE_LOCAL_WHISPER=true` is set, OR
2. No `OPENAI_API_KEY` is provided (auto-fallback to local)

The system gracefully falls back to cloud services if the local service is unavailable.

## Development

### Building Custom Images

```bash
cd whisper-local
docker build -t my-whisper-service .
```

### Extending the Service

The `whisper_server.py` can be modified to add:

- Custom preprocessing
- Additional response formats
- Authentication
- Rate limiting
- Batch processing

## Performance Tips

1. **Model Caching**: Models are cached in Docker volume to avoid redownloading
2. **Audio Preprocessing**: Convert to supported formats (MP3, WAV, M4A)
3. **Memory Management**: Larger models need more RAM
4. **GPU Acceleration**: Significantly faster with NVIDIA GPUs

## Security Notes

- Local service runs without authentication by default
- Bind to localhost only in production
- Consider adding API keys for production use
- Audio files are temporarily stored during processing

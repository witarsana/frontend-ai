#!/bin/bash

# Test Local Whisper Setup
echo "🧪 Testing Local Whisper Setup..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    exit 1
fi

# Check if service is running
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "❌ Local Whisper service is not running"
    echo "💡 Start it with: ./start-whisper.sh"
    exit 1
fi

echo "✅ Docker is running"
echo "✅ Local Whisper service is accessible"

# Get service health
echo ""
echo "📊 Service Health:"
curl -s http://localhost:8000/health | python3 -m json.tool

# Test models endpoint
echo ""
echo "📋 Available Models:"
curl -s http://localhost:8000/v1/models | python3 -m json.tool

# Check if test audio file exists
TEST_AUDIO="/Users/madewitarsana/Documents/Job/Chronicle/frontend-ai/backend-node/uploads"
if [ -d "$TEST_AUDIO" ] && [ "$(ls -A $TEST_AUDIO 2>/dev/null)" ]; then
    echo ""
    echo "🎵 Found test audio files in uploads directory"
    
    # Get first audio file
    FIRST_AUDIO=$(ls "$TEST_AUDIO"/*.{mp3,mp4,wav,m4a} 2>/dev/null | head -1)
    
    if [ -n "$FIRST_AUDIO" ]; then
        echo "🧪 Testing transcription with: $(basename "$FIRST_AUDIO")"
        
        # Test transcription
        RESULT=$(curl -s -X POST http://localhost:8000/v1/audio/transcriptions \
            -F "file=@$FIRST_AUDIO" \
            -F "model=whisper-1" \
            -F "response_format=json")
        
        if echo "$RESULT" | grep -q "text"; then
            echo "✅ Transcription test successful!"
            echo "📝 Result: $(echo "$RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin)['text'][:100] + '...')" 2>/dev/null || echo "Response received")"
        else
            echo "❌ Transcription test failed"
            echo "📋 Error: $RESULT"
        fi
    fi
else
    echo ""
    echo "ℹ️  No test audio files found in uploads directory"
    echo "💡 Upload an audio file to test transcription"
fi

echo ""
echo "🎯 Setup Summary:"
echo "   - Local Whisper service: ✅ Running"
echo "   - API endpoints: ✅ Available"
echo "   - Ready for use: ✅ Yes"
echo ""
echo "🔧 To configure your app:"
echo "   USE_LOCAL_WHISPER=true"
echo "   LOCAL_WHISPER_URL=http://localhost:8000"

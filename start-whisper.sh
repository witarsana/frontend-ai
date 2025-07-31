#!/bin/bash

# Start Local Whisper Service
echo "🚀 Starting Local Whisper Service..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Default model if not set
WHISPER_MODEL=${WHISPER_MODEL:-base}

echo "📦 Using Whisper model: $WHISPER_MODEL"

# Set environment variable for docker-compose
export WHISPER_MODEL

# Start the service
docker-compose -f docker-compose.whisper.yml up -d

# Wait for service to be ready
echo "⏳ Waiting for service to be ready..."
timeout=60
count=0

while [ $count -lt $timeout ]; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Local Whisper service is ready!"
        
        # Show service info
        echo ""
        echo "📊 Service Information:"
        curl -s http://localhost:8000/health | python3 -m json.tool 2>/dev/null || echo "Service is running on http://localhost:8000"
        
        echo ""
        echo "🎯 To use local Whisper, set in your .env file:"
        echo "USE_LOCAL_WHISPER=true"
        echo "LOCAL_WHISPER_URL=http://localhost:8000"
        
        exit 0
    fi
    
    sleep 2
    count=$((count + 2))
    echo "⏳ Still waiting... ($count/$timeout seconds)"
done

echo "❌ Service failed to start within $timeout seconds"
echo "📋 Check logs with: docker-compose -f docker-compose.whisper.yml logs whisper-local"
exit 1

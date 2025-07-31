#!/bin/bash

# Stop Local Whisper Service
echo "🛑 Stopping Local Whisper Service..."

docker-compose -f docker-compose.whisper.yml down

echo "✅ Local Whisper service stopped"

# Optional: Remove volumes (uncomment to delete cached models)
# echo "🗑️  Removing cached models..."
# docker-compose -f docker-compose.whisper.yml down -v

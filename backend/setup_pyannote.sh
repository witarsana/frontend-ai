#!/bin/bash

echo "🔧 PyAnnote Speaker Diarization Setup"
echo "======================================"

echo "📋 Steps to enable PyAnnote:"
echo ""
echo "1. Create HuggingFace Account:"
echo "   Visit: https://huggingface.co/join"
echo ""
echo "2. Create Access Token:"
echo "   Visit: https://huggingface.co/settings/tokens"
echo "   - Click 'New token'"
echo "   - Name: 'pyannote-access'"
echo "   - Type: 'Read'"
echo "   - Click 'Generate'"
echo ""
echo "3. Accept Model Conditions:"
echo "   Visit: https://huggingface.co/pyannote/speaker-diarization"
echo "   - Click 'Accept' on user conditions"
echo "   - This enables model download"
echo ""
echo "4. Set Environment Variable:"
echo "   export HUGGINGFACE_TOKEN=your_token_here"
echo ""
echo "5. Add to .env file:"
echo "   echo 'HUGGINGFACE_TOKEN=your_token_here' >> .env"
echo ""
echo "6. Restart backend server"
echo ""

# Check current status
echo "🔍 Current Status:"
if [ -z "$HUGGINGFACE_TOKEN" ]; then
    echo "❌ HUGGINGFACE_TOKEN not set"
else
    echo "✅ HUGGINGFACE_TOKEN is set"
fi

echo ""
echo "💡 After setup, PyAnnote will provide:"
echo "   - Higher accuracy speaker detection"
echo "   - Better speaker separation"
echo "   - method: 'pyannote.audio'"
echo "   - confidence: 'high'"

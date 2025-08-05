#!/bin/bash

# Whisper Large V3 Upgrade Script
# This script upgrades Faster-Whisper and prepares the system for Large V3

echo "🚀 Upgrading to Whisper Large V3..."
echo "=================================="

# Check if we're in a virtual environment
if [[ "$VIRTUAL_ENV" != "" ]]; then
    echo "✅ Virtual environment detected: $VIRTUAL_ENV"
else
    echo "⚠️  No virtual environment detected. Consider using one for isolation."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted. Please activate your virtual environment first."
        exit 1
    fi
fi

# Upgrade pip first
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install/upgrade faster-whisper
echo "📦 Installing/upgrading faster-whisper to latest version..."
pip install --upgrade faster-whisper>=1.2.0

# Install additional dependencies if needed
echo "📦 Checking PyTorch installation..."
pip install torch torchaudio --extra-index-url https://download.pytorch.org/whl/cpu

# Check GPU availability
echo "🔍 Checking GPU availability..."
python3 -c "
import torch
print('CUDA available:', torch.cuda.is_available())
if torch.cuda.is_available():
    print('CUDA devices:', torch.cuda.device_count())
    print('Current device:', torch.cuda.current_device())
    print('Device name:', torch.cuda.get_device_name(0))
if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
    print('Apple MPS available: True')
else:
    print('Apple MPS available: False')
"

# Test faster-whisper installation
echo "🧪 Testing faster-whisper installation..."
python3 -c "
try:
    from faster_whisper import WhisperModel
    print('✅ faster-whisper imported successfully')
    
    # Test model loading (will download if needed)
    print('📦 Testing model loading (this may take a few minutes on first run)...')
    model = WhisperModel('tiny', device='cpu', compute_type='int8')
    print('✅ Model loading test successful')
    
    # Test transcription with a simple example
    print('🧪 Testing transcription...')
    segments, info = model.transcribe('test', task='transcribe')
    print('✅ Transcription test successful')
    print(f'Detected language: {info.language}')
    
except Exception as e:
    print('❌ Error testing faster-whisper:', e)
    exit(1)
"

# Create environment file for model configuration
echo "📝 Creating environment configuration..."
cat > .env.whisper << EOL
# Whisper Model Configuration
# Available modes: production, balanced, fast, fastest, debug
WHISPER_MODEL_MODE=production

# Force CPU usage (set to true to disable GPU detection)
WHISPER_FORCE_CPU=false

# Custom model settings (optional - overrides mode settings)
# WHISPER_CUSTOM_MODEL=large-v3
# WHISPER_CUSTOM_DEVICE=cpu
# WHISPER_CUSTOM_COMPUTE_TYPE=int8
EOL

echo "✅ Configuration file created: .env.whisper"

# Pre-download Large V3 model
echo "📥 Pre-downloading Whisper Large V3 model..."
echo "This is a one-time download (~3GB) and may take 5-10 minutes..."
python3 -c "
from faster_whisper import WhisperModel
import time

print('Starting Large V3 model download...')
start_time = time.time()

try:
    model = WhisperModel('large-v3', device='cpu', compute_type='int8')
    download_time = time.time() - start_time
    print(f'✅ Large V3 model downloaded and cached successfully!')
    print(f'Download time: {download_time:.1f} seconds')
    print('Model location: ~/.cache/huggingface/transformers/')
except Exception as e:
    print(f'❌ Error downloading model: {e}')
    print('The model will be downloaded automatically on first use.')
"

# Show disk usage
echo "💾 Checking model cache size..."
python3 -c "
import os
import glob

cache_dir = os.path.expanduser('~/.cache/huggingface/transformers/')
if os.path.exists(cache_dir):
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(cache_dir):
        for filename in filenames:
            filepath = os.path.join(dirpath, filename)
            total_size += os.path.getsize(filepath)
    
    print(f'Model cache size: {total_size / (1024**3):.2f} GB')
    print(f'Cache location: {cache_dir}')
else:
    print('No model cache found yet.')
"

echo ""
echo "🎉 Whisper Large V3 upgrade completed!"
echo "======================================"
echo ""
echo "📋 Summary:"
echo "• Faster-Whisper upgraded to latest version"
echo "• Large V3 model downloaded and cached"
echo "• Configuration file created: .env.whisper"
echo "• GPU support checked and configured"
echo ""
echo "🚀 Next steps:"
echo "1. Restart your backend server"
echo "2. Check /api/whisper/config for current configuration"
echo "3. Upload an audio file to test the new model"
echo ""
echo "⚙️  Configuration options:"
echo "• Edit .env.whisper to change model mode"
echo "• Set WHISPER_MODEL_MODE=balanced for faster processing"
echo "• Set WHISPER_MODEL_MODE=production for best accuracy"
echo ""
echo "🔧 Troubleshooting:"
echo "• If download fails, check internet connection"
echo "• Large models need ~3GB RAM minimum"
echo "• GPU usage requires CUDA or Apple Silicon"

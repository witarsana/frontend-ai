# Whisper Model Configuration
# Supports different model sizes for different use cases

# Available Faster-Whisper models:
# - tiny: Fastest, lowest accuracy (~1GB VRAM)
# - base: Good balance (~1.5GB VRAM) 
# - small: Better quality (~2GB VRAM)
# - medium: High quality (~4GB VRAM)
# - large-v1: Very high quality (~6GB VRAM)
# - large-v2: Improved accuracy (~6GB VRAM)
# - large-v3: Latest, best accuracy (~6GB VRAM) - RECOMMENDED

# Model Selection Strategy:
WHISPER_MODEL_CONFIG = {
    "production": {
        "model": "large-v3",
        "device": "cpu",  # Change to "cuda" if GPU available
        "compute_type": "int8",  # int8 for CPU, float16 for GPU
        "description": "Best accuracy, slower processing",
        "memory_usage": "~3GB RAM (CPU) / ~6GB VRAM (GPU)",
        "use_case": "Production, high-accuracy transcription"
    },
    "balanced": {
        "model": "medium",
        "device": "cpu",
        "compute_type": "int8",
        "description": "Good balance of speed and accuracy",
        "memory_usage": "~2GB RAM",
        "use_case": "General purpose, good quality"
    },
    "fast": {
        "model": "small",
        "device": "cpu", 
        "compute_type": "int8",
        "description": "Fast processing, good accuracy",
        "memory_usage": "~1.5GB RAM",
        "use_case": "Quick transcription, development"
    },
    "fastest": {
        "model": "base",
        "device": "cpu",
        "compute_type": "int8", 
        "description": "Very fast, basic accuracy",
        "memory_usage": "~1GB RAM",
        "use_case": "Real-time, low-resource environments"
    },
    "debug": {
        "model": "tiny",
        "device": "cpu",
        "compute_type": "int8",
        "description": "Ultra-fast for testing",
        "memory_usage": "~512MB RAM",
        "use_case": "Development, debugging"
    }
}

# Default model mode (can be overridden by environment variable)
DEFAULT_MODEL_MODE = "production"  # Use large-v3 by default

# GPU Configuration (automatic detection)
import torch
import os

def get_optimal_device_config():
    """Detect optimal device and compute type"""
    if torch.cuda.is_available():
        return {
            "device": "cuda",
            "compute_type": "float16",  # Better for GPU
            "gpu_memory": f"{torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f}GB"
        }
    elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
        # MPS not yet fully supported by faster-whisper, use CPU with optimization
        print("⚠️  MPS detected but not fully supported by faster-whisper, using optimized CPU")
        return {
            "device": "cpu",  # Fallback to CPU for MPS systems
            "compute_type": "int8",
            "gpu_memory": "MPS Available (using CPU fallback)"
        }
    else:
        return {
            "device": "cpu",
            "compute_type": "int8",  # Better for CPU
            "gpu_memory": "N/A"
        }

def get_whisper_config(mode: str = None):
    """Get Whisper configuration for specified mode"""
    if mode is None:
        mode = os.getenv("WHISPER_MODEL_MODE", DEFAULT_MODEL_MODE)
    
    if mode not in WHISPER_MODEL_CONFIG:
        print(f"⚠️  Unknown model mode '{mode}', falling back to '{DEFAULT_MODEL_MODE}'")
        mode = DEFAULT_MODEL_MODE
    
    config = WHISPER_MODEL_CONFIG[mode].copy()
    
    # Auto-detect optimal device if not specified in environment
    if not os.getenv("WHISPER_FORCE_CPU"):
        optimal = get_optimal_device_config()
        if optimal["device"] != "cpu":
            config.update(optimal)
            print(f"🚀 GPU detected: Using {optimal['device']} with {optimal['compute_type']}")
    
    return config

# Advanced Features for Large V3
LARGE_V3_FEATURES = {
    "improved_accuracy": "Better handling of accents and background noise",
    "multilingual": "Enhanced support for 100+ languages",
    "timestamp_accuracy": "More precise word-level timestamps",
    "noise_robustness": "Better performance in noisy environments",
    "code_switching": "Handles multiple languages in same audio",
    "technical_terms": "Better recognition of technical vocabulary"
}

# Performance Optimization Settings
OPTIMIZATION_SETTINGS = {
    "batch_size": 16,  # Larger batches for Large V3
    "beam_size": 5,    # Better accuracy with beam search
    "best_of": 5,      # Multiple candidates for better results
    "temperature": 0.0, # Deterministic output
    "compression_ratio_threshold": 2.4,
    "log_prob_threshold": -1.0,
    "no_speech_threshold": 0.6,
    "condition_on_previous_text": True,  # Better context awareness
    "prepend_punctuations": "\"'([{-",
    "append_punctuations": "\"'.(),!?:;"
}

# Model Download Information
MODEL_DOWNLOAD_INFO = {
    "large-v3": {
        "size": "~3GB download",
        "first_load_time": "5-10 minutes (one-time)",
        "subsequent_loads": "30-60 seconds",
        "cache_location": "~/.cache/huggingface/transformers/"
    }
}

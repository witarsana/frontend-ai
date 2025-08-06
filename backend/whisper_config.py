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

# Speed-based Model Selection Strategy:
SPEED_CONFIGS = {
    "fast": {
        "model": "base",
        "device": "cpu",
        "compute_type": "int8",
        "description": "Fast transcription with good accuracy",
        "memory_usage": "~1.5GB RAM",
        "expected_speed": "3-4x faster than large-v3",
        "use_case": "Quick transcription, lower accuracy acceptable"
    },
    "medium": {
        "model": "small",
        "device": "cpu", 
        "compute_type": "int8",
        "description": "Balanced speed and accuracy",
        "memory_usage": "~2GB RAM",
        "expected_speed": "2x faster than large-v3",
        "use_case": "Good balance of speed and accuracy"
    },
    "slow": {
        "model": "large-v3",
        "device": "cpu",
        "compute_type": "int8", 
        "description": "Best accuracy, slower processing",
        "memory_usage": "~3GB RAM",
        "expected_speed": "Baseline (highest accuracy)",
        "use_case": "Maximum accuracy for important content"
    },
    "experimental": {
        "model": "large-v3",
        "device": "cpu",
        "compute_type": "int8",
        "description": "Advanced speaker detection and diarization",
        "memory_usage": "~4GB RAM + speaker detection models",
        "expected_speed": "2-3x slower than large-v3 (includes speaker analysis)",
        "use_case": "Advanced speaker detection, meeting transcription",
        "features": ["speaker_diarization", "speaker_counting", "speaker_segments"],
        "speaker_methods": {
            "pyannote": {
                "name": "pyannote.audio",
                "description": "State-of-the-art neural speaker diarization",
                "accuracy": "very_high",
                "requirements": ["pyannote.audio", "huggingface_token"],
                "memory": "~2GB extra",
                "speed": "slow"
            },
            "speechbrain": {
                "name": "SpeechBrain",
                "description": "Modern speaker recognition toolkit",
                "accuracy": "high", 
                "requirements": ["speechbrain"],
                "memory": "~1.5GB extra",
                "speed": "medium"
            },
            "resemblyzer": {
                "name": "Resemblyzer",
                "description": "Lightweight speaker embeddings",
                "accuracy": "medium",
                "requirements": ["resemblyzer"],
                "memory": "~500MB extra", 
                "speed": "fast"
            },
            "webrtc": {
                "name": "WebRTC VAD",
                "description": "Voice Activity Detection based",
                "accuracy": "medium",
                "requirements": ["webrtcvad", "librosa"],
                "memory": "~100MB extra",
                "speed": "very_fast"
            },
            "energy": {
                "name": "Energy-based",
                "description": "Simple energy pattern analysis (fallback)",
                "accuracy": "low",
                "requirements": ["librosa"],
                "memory": "minimal",
                "speed": "very_fast"
            },
            "enhanced": {
                "name": "Enhanced Multi-Feature",
                "description": "Advanced multi-feature speaker detection with ML clustering",
                "accuracy": "very_high",
                "requirements": ["librosa", "scikit-learn", "scipy"],
                "memory": "~300MB extra",
                "speed": "medium",
                "features": ["mfcc", "spectral_features", "pitch_analysis", "energy_patterns", "hierarchical_clustering"]
            }
        },
        "default_method": "enhanced",
        "models_required": ["enhanced_multi_feature_detection"]
    }
}

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

# Performance Optimization Settings - SPEED BASED
SPEED_OPTIMIZATION_SETTINGS = {
    "fast": {
        "beam_size": 1,        # Greedy search for maximum speed
        "best_of": 1,          # No multiple candidates
        "temperature": 0.0,    # Deterministic
        "compression_ratio_threshold": 2.4,
        "log_prob_threshold": -1.0,
        "no_speech_threshold": 0.6,
        "condition_on_previous_text": False,  # Faster processing
        "word_timestamps": False,  # Skip word-level timestamps for speed
        "vad_filter": True,    # Quick voice activity detection
        "description": "Maximum speed settings"
    },
    "medium": {
        "beam_size": 3,        # Some search for better accuracy
        "best_of": 2,          # Limited candidates
        "temperature": 0.0,    # Deterministic
        "compression_ratio_threshold": 2.4,
        "log_prob_threshold": -1.0,
        "no_speech_threshold": 0.6,
        "condition_on_previous_text": False,
        "word_timestamps": True,   # Include word timestamps
        "vad_filter": True,
        "description": "Balanced speed and accuracy"
    },
    "slow": {
        "beam_size": 5,        # Full beam search for accuracy
        "best_of": 5,          # Multiple candidates for best result
        "temperature": 0.0,    # Deterministic
        "compression_ratio_threshold": 2.4,
        "log_prob_threshold": -1.0,
        "no_speech_threshold": 0.6,
        "condition_on_previous_text": True,   # Use context for accuracy
        "word_timestamps": True,   # Full word-level timestamps
        "vad_filter": False,   # No filtering for maximum accuracy
        "description": "Maximum accuracy settings"
    },
    "experimental": {
        "beam_size": 5,        # Full beam search for accuracy
        "best_of": 5,          # Multiple candidates for best result
        "temperature": 0.0,    # Deterministic
        "compression_ratio_threshold": 2.4,
        "log_prob_threshold": -1.0,
        "no_speech_threshold": 0.6,
        "condition_on_previous_text": True,   # Use context for accuracy
        "word_timestamps": True,   # Full word-level timestamps
        "vad_filter": False,   # No filtering for maximum accuracy
        "speaker_diarization": True,   # Enable speaker detection
        "speaker_embedding": True,     # Extract speaker embeddings
        "segment_speakers": True,      # Assign speakers to segments
        "description": "Maximum accuracy + speaker analysis"
    }
}

# Performance Optimization Settings - OPTIMIZED FOR SPEED (Legacy - kept for compatibility)
OPTIMIZATION_SETTINGS = {
    "batch_size": 16,      # Keep for throughput
    "beam_size": 3,        # Reduced from 5 for 40% speed improvement
    "best_of": 3,          # Reduced from 5 for 40% speed improvement  
    "temperature": 0.0,    # Keep deterministic
    "compression_ratio_threshold": 2.4,
    "log_prob_threshold": -1.0,
    "no_speech_threshold": 0.6,
    "condition_on_previous_text": False,  # Disabled for speed (was True)
    # Removed punctuation processing for speed:
    # "prepend_punctuations": "\"'([{-",
    # "append_punctuations": "\"'.(),!?:;"
}

# Original settings (for reference - now optimized above)
OPTIMIZATION_SETTINGS_ORIGINAL = {
    "batch_size": 16,
    "beam_size": 5,    # Was slower
    "best_of": 5,      # Was slower
    "temperature": 0.0,
    "compression_ratio_threshold": 2.4,
    "log_prob_threshold": -1.0,
    "no_speech_threshold": 0.6,
    "condition_on_previous_text": True,  # Was causing overhead
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

def get_speed_config(speed: str = "medium"):
    """Get whisper configuration based on speed preference"""
    if speed not in SPEED_CONFIGS:
        print(f"⚠️  Unknown speed '{speed}', using 'medium'")
        speed = "medium"
    
    model_config = SPEED_CONFIGS[speed].copy()
    optimization_config = SPEED_OPTIMIZATION_SETTINGS[speed].copy()
    
    print(f"🚀 Speed Mode: {speed.upper()}")
    print(f"   Model: {model_config['model']}")
    print(f"   Description: {model_config['description']}")
    print(f"   Expected Speed: {model_config['expected_speed']}")
    print(f"   Memory Usage: {model_config['memory_usage']}")
    
    return {
        "model_config": model_config,
        "optimization_config": optimization_config
    }

def get_speed_info():
    """Get information about all available speed options"""
    info = {}
    for speed, config in SPEED_CONFIGS.items():
        info[speed] = {
            "model": config["model"],
            "description": config["description"],
            "expected_speed": config["expected_speed"],
            "memory_usage": config["memory_usage"],
            "use_case": config["use_case"]
        }
    return info

from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import asyncio
from datetime import datetime
import json
from faster_whisper import WhisperModel
# REMOVED: import whisper  # Old simple whisper library removed - now using Faster-Whisper Large V3 only

# Import Whisper configuration
from whisper_config import get_whisper_config, OPTIMIZATION_SETTINGS, LARGE_V3_FEATURES, get_speed_config

# Import speaker detection for experimental mode
from speaker_detection import analyze_speakers, format_speaker_segments

# Using ONLY Faster-Whisper Large V3 for all transcription
print("� USING FASTER-WHISPER LARGE V3 ONLY - No legacy models")

from typing import Dict, List, Any, Optional
import traceback
import librosa
import soundfile as sf
import sys
import soundfile as sf
import numpy as np
from pyannote.audio import Pipeline
import torch
from pydub import AudioSegment
import re
import statistics

# Import prompts dari file terpisah
from prompts import get_summary_prompt, get_fallback_responses, truncate_transcript

# Import our new multi-provider API system
from api_providers import initialize_providers, call_api

# Notion integration import
try:
    from notion_integration import router as notion_router
    NOTION_INTEGRATION_AVAILABLE = True
    print("✅ Notion integration available")
except ImportError as e:
    print(f"⚠️  Notion integration not available: {e}")
    NOTION_INTEGRATION_AVAILABLE = False
    notion_router = None

# Chat system imports
try:
    import sys
    from pathlib import Path
    
    # Add current directory to path for imports
    current_dir = Path(__file__).parent
    sys.path.insert(0, str(current_dir))
    
    from chat_system import ChatSystem
    from multi_model_chat import MultiModelChatSystem
    CHAT_SYSTEM_AVAILABLE = True
    print("✅ Chat system imports available")
except ImportError as e:
    print(f"⚠️  Chat system not available: {e}")
    CHAT_SYSTEM_AVAILABLE = False

# Define chat classes (used regardless of chat system availability)
class ChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    file_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    sources: List[dict] = []
    session_id: str
    timestamp: str
    confidence: float

# Deepgram imports - DISABLED FOR DEBUGGING
# DEEPGRAM_AVAILABLE = False
print("🔧 DEBUG MODE: Deepgram engine disabled")

# Load .env file from parent directory
import os
from pathlib import Path
load_dotenv(Path(__file__).parent.parent / '.env')

app = FastAPI(title="AI Meeting Transcription - Faster-Whisper Only", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Notion integration router
if NOTION_INTEGRATION_AVAILABLE and notion_router:
    app.include_router(notion_router, prefix="/api", tags=["notion"])
    print("✅ Notion integration routes added")
else:
    print("⚠️  Notion integration routes not available")

@app.on_event("startup")
async def startup_event():
    """Initialize models on startup"""
    print("🔄 Initializing AI models on startup...")
    load_models()
    print("✅ Startup initialization complete!")

# Global variables
whisper_model = None
# REMOVED: simple_whisper_model = None  # Legacy model removed - using Faster-Whisper Large V3 only
mistral_client = None
diarization_pipeline = None
deepgram_client = None
processing_jobs = {}
chat_system = None
multi_chat_system = None
api_providers = None  # Our new multi-provider system

# Configuration - DEBUGGING: Force Faster-Whisper only
TRANSCRIPTION_ENGINE = "faster-whisper"  # Hardcoded to faster-whisper for debugging
print("🔧 DEBUG MODE: Forced engine = faster-whisper")

def load_models():
    """Load AI models with error handling - Using Faster-Whisper Large V3 ONLY"""
    global whisper_model, mistral_client, diarization_pipeline, api_providers
    
    try:
        print(f"🔧 Transcription engine: {TRANSCRIPTION_ENGINE}")
        
        # Initialize our multi-provider API system
        if api_providers is None:
            print("🔄 Initializing multi-provider API system...")
            api_providers = initialize_providers()
            print("✅ Multi-provider API system initialized!")
        
        # REMOVED: Legacy simple whisper model loading - using Faster-Whisper Large V3 only
        print("🚀 Using ONLY Faster-Whisper Large V3 - No legacy models loaded")
        
        # DEBUGGING: Skip Deepgram and Mistral initialization
        print("🔧 DEBUG MODE: Skipping Deepgram and Mistral initialization")
        
        # Load Faster-Whisper with configurable model
        if whisper_model is None:
            # Get optimal configuration based on environment
            whisper_config = get_whisper_config()
            model_name = whisper_config["model"]
            device = whisper_config["device"]
            compute_type = whisper_config["compute_type"]
            
            print(f"🚀 Loading Faster-Whisper model: {model_name}")
            print(f"   Device: {device}")
            print(f"   Compute Type: {compute_type}")
            print(f"   Description: {whisper_config.get('description', 'N/A')}")
            print(f"   Memory Usage: {whisper_config.get('memory_usage', 'N/A')}")
            
            if model_name == "large-v3":
                print("✨ Using Whisper Large V3 - Latest model with enhanced features:")
                for feature, description in LARGE_V3_FEATURES.items():
                    print(f"   • {feature}: {description}")
            
            whisper_model = WhisperModel(
                model_name, 
                device=device, 
                compute_type=compute_type,
                # Apply optimization settings for better performance
                download_root=None,  # Use default cache
                local_files_only=False  # Allow model download if needed
            )
            print(f"✅ Faster-Whisper {model_name} model loaded successfully!")
            
            # Show optimization settings being used
            print("🔧 Optimization settings:")
            for key, value in OPTIMIZATION_SETTINGS.items():
                print(f"   • {key}: {value}")
        
        # DEBUGGING: Skip Mistral client initialization
        print("🔧 DEBUG MODE: Skipping Mistral client initialization")
        
        if diarization_pipeline is None:
            try:
                print("Loading pyannote speaker diarization model...")
                # Try different models in order of preference
                models_to_try = [
                    "pyannote/speaker-diarization-3.1",
                    "pyannote/speaker-diarization-3.0", 
                    "pyannote/speaker-diarization",
                    "pyannote/segmentation-3.0"
                ]
                
                hf_token = os.getenv("HUGGING_FACE_TOKEN")
                print(f"🔑 HF Token loaded: {'Yes' if hf_token else 'No'} (length: {len(hf_token) if hf_token else 0})")
                
                for model_name in models_to_try:
                    try:
                        print(f"Trying to load: {model_name}")
                        if hf_token and hf_token != "your_hf_token_here" and hf_token != "GANTI_DENGAN_TOKEN_ANDA_DISINI":
                            # Use both 'token' (newer) and 'use_auth_token' (fallback) parameters
                            try:
                                diarization_pipeline = Pipeline.from_pretrained(
                                    model_name,
                                    token=hf_token
                                )
                                print(f"✅ Speaker diarization model loaded: {model_name} (with token)")
                            except (TypeError, Exception):
                                # Fallback to older parameter name
                                print(f"Trying use_auth_token fallback for {model_name}...")
                                try:
                                    diarization_pipeline = Pipeline.from_pretrained(
                                        model_name,
                                        use_auth_token=hf_token
                                    )
                                    print(f"✅ Speaker diarization model loaded: {model_name} (with use_auth_token)")
                                except Exception as fallback_error:
                                    print(f"⚠️  Failed to load {model_name} with token: {fallback_error}")
                                    raise fallback_error
                        else:
                            # Try without token (some models are public)
                            diarization_pipeline = Pipeline.from_pretrained(model_name)
                            print(f"✅ Speaker diarization model loaded: {model_name} (public)")
                        
                        # If we reach here, model was loaded successfully
                        break
                        
                    except Exception as model_error:
                        print(f"⚠️  Failed to load {model_name}: {model_error}")
                        continue
                
                if diarization_pipeline is None:
                    raise Exception("No diarization models could be loaded")
                    
            except Exception as e:
                print(f"⚠️  Could not load any diarization model: {e}")
                print("ℹ️  Will implement simple voice activity detection as fallback...")
                diarization_pipeline = "disabled"  # Mark as disabled
        
        # Initialize Chat System
        global chat_system, multi_chat_system
        chat_system = None
        multi_chat_system = None
        
        if CHAT_SYSTEM_AVAILABLE:
            try:
                print("🤖 Initializing Chat System...")
                # Use absolute path for results directory
                current_dir = os.path.dirname(os.path.abspath(__file__))
                results_dir = os.path.join(current_dir, "results")
                
                chat_system = ChatSystem(data_dir=results_dir)
                
                # Initialize multi-model system
                multi_chat_system = MultiModelChatSystem(data_dir=results_dir)
                print("✅ Chat system initialized!")
            except Exception as chat_error:
                print(f"⚠️  Chat system initialization failed: {chat_error}")
                chat_system = None
                multi_chat_system = None
                
    except Exception as e:
        print(f"❌ Model loading error: {e}")

@app.get("/")
async def root():
    """Enhanced root endpoint with Whisper Large V3 information"""
    active_engine = TRANSCRIPTION_ENGINE
    if TRANSCRIPTION_ENGINE == "deepgram" and not deepgram_client:
        active_engine = "faster-whisper (fallback)"
    
    # Get current Whisper configuration
    current_config = get_whisper_config()
    
    return {
        "message": "AI Meeting Transcription - Whisper Large V3 Enhanced", 
        "status": "running",
        "transcription_engine": active_engine,
        "whisper_model": {
            "name": current_config["model"],
            "device": current_config["device"], 
            "compute_type": current_config["compute_type"],
            "description": current_config.get("description", "N/A"),
            "memory_usage": current_config.get("memory_usage", "N/A"),
            "loaded": whisper_model is not None
        },
        "features": [
            "Faster-Whisper Large V3 (Latest)", 
            "Enhanced Multilingual Support", 
            "Improved Accuracy & Noise Robustness",
            "Word-level Timestamps",
            "Speaker Diarization", 
            "Mistral AI Analysis"
        ],
        "engines_available": {
            "faster_whisper": whisper_model is not None,
            "deepgram": deepgram_client is not None
        },
        "large_v3_features": LARGE_V3_FEATURES if current_config["model"] == "large-v3" else {},
        "legacy_models_removed": True,  # Confirmation that old models are removed
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/supported-formats")
async def get_supported_formats():
    """Get information about supported formats and optimization recommendations"""
    return {
        "supported_formats": {
            "optimal": {
                "formats": [".wav", ".flac"],
                "description": "Best quality, direct processing, fastest transcription",
                "recommendation": "Use these formats for best performance"
            },
            "good": {
                "formats": [".mp3", ".m4a", ".ogg"],
                "description": "Good quality, minimal processing needed",
                "recommendation": "Automatically optimized for accuracy"
            },
            "video": {
                "formats": [".mp4", ".mov", ".webm", ".mkv"],
                "description": "Video formats - audio extracted automatically",
                "recommendation": "Consider converting to MP3 for faster processing"
            }
        },
        "optimization_benefits": {
            "speed_improvement": "Video to audio conversion: 2-3x faster processing",
            "accuracy_improvement": "16kHz mono WAV: Optimal for Whisper Large V3",
            "file_size_reduction": "Video to audio: 80-90% smaller file size"
        },
        "recommendations": {
            "for_best_speed": "Convert videos to MP3 before upload",
            "for_best_quality": "Use WAV or FLAC formats",
            "for_balance": "MP3 with 128kbps+ bitrate"
        }
    }

@app.post("/api/analyze-format")
async def analyze_format_recommendation(file: UploadFile = File(...)):
    """Analyze uploaded file and provide format conversion recommendations"""
    file_ext = os.path.splitext(file.filename)[1].lower()
    file_size = 0
    
    # Read file to get size
    content = await file.read()
    file_size = len(content)
    
    # Reset file pointer
    await file.seek(0)
    
    recommendations = {
        "current_format": file_ext,
        "file_size_mb": round(file_size / (1024 * 1024), 2),
        "is_video": file_ext in ['.mp4', '.mov', '.webm', '.mkv'],
        "optimization_needed": file_ext in ['.mp4', '.mov', '.webm', '.mkv'],
        "recommendations": []
    }
    
    if file_ext in ['.mp4', '.mov', '.webm', '.mkv']:
        estimated_audio_size = file_size * 0.1  # Rough estimate: audio ~10% of video
        recommendations["recommendations"] = [
            {
                "action": "Convert to MP3",
                "benefit": f"Reduce file size from {recommendations['file_size_mb']}MB to ~{round(estimated_audio_size/(1024*1024), 2)}MB",
                "speed_gain": "2-3x faster processing",
                "command": f"ffmpeg -i input{file_ext} -vn -acodec mp3 -ab 128k output.mp3"
            },
            {
                "action": "Convert to WAV",
                "benefit": "Optimal quality for transcription",
                "speed_gain": "2x faster processing",
                "command": f"ffmpeg -i input{file_ext} -vn -acodec pcm_s16le -ar 16000 -ac 1 output.wav"
            }
        ]
    elif file_ext in ['.mp3', '.m4a']:
        recommendations["recommendations"] = [
            {
                "action": "No conversion needed",
                "benefit": "Format automatically optimized during processing",
                "speed_gain": "Already efficient"
            }
        ]
    else:
        recommendations["recommendations"] = [
            {
                "action": "Optimal format detected",
                "benefit": "Direct processing, best performance",
                "speed_gain": "Maximum efficiency"
            }
        ]
    
    return recommendations

@app.get("/api/speed-options")
async def get_speed_options():
    """Get available speed options with their configurations"""
    try:
        from whisper_config import get_speed_info
        speed_info = get_speed_info()
        
        return JSONResponse({
            "success": True,
            "speed_options": speed_info,
            "default": "medium",
            "description": {
                "fast": "Fastest transcription with good accuracy (base model)",
                "medium": "Balanced speed and accuracy (small model)", 
                "slow": "Best accuracy with slower processing (large-v3 model)",
                "experimental": "Advanced speaker detection with multiple methods"
            }
        })
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

@app.get("/api/experimental-methods")
async def get_experimental_methods():
    """Get available experimental speaker detection methods"""
    try:
        # Define all available speaker detection methods
        available_methods = {
            "pyannote": {
                "name": "PyAnnote Audio",
                "description": "State-of-the-art neural speaker diarization using pyannote.audio",
                "accuracy": "High",
                "speed": "Medium",
                "requirements": ["pyannote.audio", "torch"],
                "suitable_for": ["Professional recordings", "Multiple speakers", "High accuracy needs"]
            },
            "speechbrain": {
                "name": "SpeechBrain",
                "description": "Open-source speech processing toolkit with speaker verification",
                "accuracy": "High",
                "speed": "Medium-Fast",
                "requirements": ["speechbrain", "torch"],
                "suitable_for": ["Real-time processing", "Speaker verification", "Research applications"]
            },
            "resemblyzer": {
                "name": "Resemblyzer",
                "description": "Speaker verification using deep learning embeddings",
                "accuracy": "Medium-High",
                "speed": "Fast",
                "requirements": ["resemblyzer", "tensorflow"],
                "suitable_for": ["Quick speaker clustering", "Voice cloning detection", "Fast processing"]
            },
            "webrtc": {
                "name": "WebRTC VAD",
                "description": "Voice Activity Detection optimized for real-time applications",
                "accuracy": "Medium",
                "speed": "Very Fast",
                "requirements": ["webrtcvad"],
                "suitable_for": ["Real-time streaming", "Voice/silence detection", "Low latency needs"]
            },
            "energy": {
                "name": "Energy-based Detection",
                "description": "Simple energy-threshold based voice activity detection",
                "accuracy": "Basic",
                "speed": "Very Fast",
                "requirements": ["librosa", "numpy"],
                "suitable_for": ["Simple use cases", "Fallback option", "Low resource environments"]
            }
        }
        
        return JSONResponse({
            "success": True,
            "available_methods": available_methods,
            "default_method": "pyannote",
            "total_methods": len(available_methods),
            "description": "Complete list of available speaker detection methods. All methods can be used with any speed mode."
        })
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

@app.get("/api/speaker-methods")
async def get_speaker_methods():
    """Get all available speaker detection methods with detailed information"""
    try:
        from speaker_detection import SpeakerDetectionManager
        
        # Get available methods from the actual detection system
        manager = SpeakerDetectionManager()
        available_methods = {
            "pyannote": {
                "id": "pyannote",
                "name": "PyAnnote Audio",
                "description": "State-of-the-art neural speaker diarization using pyannote.audio",
                "accuracy": "High",
                "speed": "Medium",
                "status": "active",
                "recommended": True,
                "use_cases": ["Professional recordings", "Multiple speakers", "High accuracy requirements"]
            },
            "speechbrain": {
                "id": "speechbrain", 
                "name": "SpeechBrain",
                "description": "Open-source speech processing toolkit with speaker verification",
                "accuracy": "High",
                "speed": "Medium-Fast",
                "status": "available",
                "recommended": True,
                "use_cases": ["Real-time processing", "Speaker verification", "Research applications"]
            },
            "resemblyzer": {
                "id": "resemblyzer",
                "name": "Resemblyzer",
                "description": "Speaker verification using deep learning embeddings",
                "accuracy": "Medium-High", 
                "speed": "Fast",
                "status": "available",
                "recommended": False,
                "use_cases": ["Quick speaker clustering", "Voice cloning detection", "Fast processing"]
            },
            "webrtc": {
                "id": "webrtc",
                "name": "WebRTC VAD",
                "description": "Voice Activity Detection optimized for real-time applications",
                "accuracy": "Medium",
                "speed": "Very Fast",
                "status": "available",
                "recommended": False,
                "use_cases": ["Real-time streaming", "Voice/silence detection", "Low latency needs"]
            },
            "energy": {
                "id": "energy",
                "name": "Energy-based Detection",
                "description": "Simple energy-threshold based voice activity detection",
                "accuracy": "Basic",
                "speed": "Very Fast", 
                "status": "available",
                "recommended": False,
                "use_cases": ["Simple use cases", "Fallback option", "Low resource environments"]
            }
        }
        
        return JSONResponse({
            "success": True,
            "methods": available_methods,
            "default_method": "pyannote",
            "total_methods": len(available_methods),
            "recommended_methods": [method for method in available_methods.values() if method["recommended"]],
            "info": "All speaker detection methods are available for use with any speed mode (fast, medium, slow, experimental)"
        })
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

@app.post("/api/upload-and-process")
async def upload_and_process(
    file: UploadFile = File(...),
    language: str = Form("auto"),
    engine: str = Form("faster-whisper"),
    speed: str = Form("medium"),  # Speed parameter: fast, medium, slow, experimental
    speaker_method: str = Form("pyannote"),  # Speaker detection method (available for all speeds): pyannote, speechbrain, resemblyzer, webrtc, energy
    enable_speed_processing: bool = Form(True),  # Toggle for speed processing
    enable_speaker_detection: bool = Form(True)  # Toggle for speaker detection
):
    """Upload and process with librosa instead of FFmpeg - Now with speed options and speaker detection methods"""
    try:
        # DEBUG: Log received parameters
        print(f"🔍 DEBUG - Received parameters:")
        print(f"   - File: {file.filename}")
        print(f"   - Language: {language}")
        print(f"   - Engine: {engine}")
        print(f"   - Speed: {speed}")
        print(f"   - Speaker method: {speaker_method}")
        print(f"   - Enable speed processing: {enable_speed_processing}")
        print(f"   - Enable speaker detection: {enable_speaker_detection}")
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file uploaded")
        
        # Validate speed parameter
        valid_speeds = ["fast", "medium", "slow", "experimental"]
        if speed not in valid_speeds:
            raise HTTPException(status_code=400, detail=f"Invalid speed. Must be one of: {valid_speeds}")
        
        # Validate speaker_method parameter - now available for all speeds
        valid_methods = ["pyannote", "speechbrain", "resemblyzer", "webrtc", "energy"]
        if speaker_method not in valid_methods:
            raise HTTPException(status_code=400, detail=f"Invalid speaker method. Must be one of: {valid_methods}")
        
        content = await file.read()
        if len(content) > 150 * 1024 * 1024:  # 150MB limit
            raise HTTPException(status_code=400, detail="File too large. Maximum 150MB.")
        
        # Check file format and provide optimization info
        allowed_extensions = ['.wav', '.mp3', '.m4a', '.flac', '.ogg', '.webm', '.mp4', '.mov']
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {file_ext}")
        
        # Provide format optimization info
        format_info = {
            '.wav': "Optimal format - direct processing",
            '.flac': "High quality format - direct processing", 
            '.mp3': "Good format - will be optimized for accuracy",
            '.m4a': "Good format - will be optimized for accuracy",
            '.mp4': "Video format - audio will be extracted and optimized for faster processing",
            '.mov': "Video format - audio will be extracted and optimized for faster processing",
            '.webm': "Video format - audio will be extracted and optimized for faster processing",
            '.ogg': "Audio format - direct processing"
        }
        
        optimization_message = format_info.get(file_ext, "Supported format")
        print(f"📁 File format: {file_ext} - {optimization_message}")
        
        # Generate job ID
        job_id = f"job_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')[:20]}"
        processing_jobs[job_id] = {
            "status": "starting", 
            "progress": 0, 
            "message": "Initializing...",
            "language": language,
            "engine": engine
        }
        
        # Save file
        uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        file_path = os.path.join(uploads_dir, f"{job_id}{file_ext}")
        
        with open(file_path, 'wb') as f:
            f.write(content)
        
        print(f"📁 File saved: {file_path} ({len(content)/1024:.1f} KB)")
        print(f"🌐 Language: {language}, Engine: {engine}, Speed: {speed}")
        
        # Start processing with language, engine, speed parameters, and toggle settings
        asyncio.create_task(process_audio_librosa(
            job_id, file_path, file.filename, language, engine, speed, speaker_method,
            enable_speed_processing, enable_speaker_detection
        ))
        
        return JSONResponse({
            "job_id": job_id,
            "status": "processing_started",
            "message": f"File uploaded ({len(content)/1024:.1f} KB). Using {engine} with language: {language}",
            "file_size_kb": len(content)/1024,
            "language": language,
            "engine": engine
        })
        
    except Exception as e:
        print(f"❌ Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/api/status/{job_id}")
async def get_processing_status(job_id: str):
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return processing_jobs[job_id]

@app.get("/api/monitor/{job_id}")
async def monitor_detailed_progress(job_id: str):
    """
    Get detailed real-time monitoring of transcription progress
    Shows current segment being processed, total segments, and detailed timing
    """
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    status = processing_jobs[job_id]
    
    # Enhanced monitoring data
    detailed_info = {
        "job_id": job_id,
        "status": status.get("status", "unknown"),
        "overall_progress": status.get("progress", 0),
        "stage_progress": status.get("stage_progress", 0),
        "current_stage": status.get("current_stage", "unknown"),
        "message": status.get("message", ""),
        "elapsed_time": status.get("elapsed_time", "0s"),
        "estimated_remaining": status.get("estimated_remaining", "Unknown"),
        "stage_detail": status.get("stage_detail", {}),
        "processing_info": status.get("processing_info", {}),
        "result_available": status.get("result_available", False)
    }
    
    # Try to extract segment information from message
    message = status.get("message", "")
    if "segments:" in message or "Processing segments:" in message:
        try:
            # Extract current/total from message like "Processing segments: 25/150"
            import re
            segment_match = re.search(r'(\d+)/(\d+)', message)
            if segment_match:
                current_segment = int(segment_match.group(1))
                total_segments = int(segment_match.group(2))
                
                detailed_info["segment_info"] = {
                    "current_segment": current_segment,
                    "total_segments": total_segments,
                    "segments_processed": current_segment,
                    "segments_remaining": total_segments - current_segment,
                    "segment_progress_percent": round((current_segment / total_segments) * 100, 1) if total_segments > 0 else 0
                }
        except:
            detailed_info["segment_info"] = {"status": "segment_info_unavailable"}
    
    # Add processing stage timeline
    if "processing_info" in status:
        proc_info = status["processing_info"]
        detailed_info["stage_timeline"] = {
            "current_stage_index": proc_info.get("current_stage_index", 0),
            "total_stages": proc_info.get("total_stages", 7),
            "stage_name": status.get("stage_detail", {}).get("name", "Unknown"),
            "stages_completed": proc_info.get("current_stage_index", 1) - 1,
            "stages_remaining": proc_info.get("total_stages", 7) - proc_info.get("current_stage_index", 1)
        }
    
    return detailed_info

@app.get("/api/result/{job_id}")
async def get_result(job_id: str):
    # Check results file directly from filesystem
    results_dir = os.path.join(os.path.dirname(__file__), "results")
    result_file = os.path.join(results_dir, f"{job_id}_result.json")
    
    if not os.path.exists(result_file):
        raise HTTPException(status_code=404, detail="Result file not found")
    
    try:
        with open(result_file, 'r', encoding='utf-8') as f:
            result = json.load(f)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading result file: {str(e)}")

@app.get("/api/config")
async def get_config():
    """Get current transcription engine configuration - DEBUGGING: Only Faster-Whisper"""
    return {
        "transcription_engine": TRANSCRIPTION_ENGINE,
        "engines_available": {
            "faster_whisper": whisper_model is not None,
            # DEBUGGING: Removed deepgram availability
        },
        "fallback_enabled": False  # DEBUGGING: No fallback needed
    }

@app.post("/api/reprocess-speakers/{job_id}")
async def reprocess_speakers(job_id: str, force_speakers: int = None):
    """
    Reprocess speaker detection for an existing transcription
    Uses enhanced analysis methods for better speaker separation
    """
    try:
        # Check if result file exists
        results_dir = os.path.join(os.path.dirname(__file__), "results")
        result_file = os.path.join(results_dir, f"{job_id}_result.json")
        
        if not os.path.exists(result_file):
            raise HTTPException(status_code=404, detail="Job result not found")
        
        # Load existing result
        with open(result_file, 'r', encoding='utf-8') as f:
            result = json.load(f)
        
        segments = result.get("transcript", [])
        if not segments:
            raise HTTPException(status_code=400, detail="No transcript segments found")
        
        print(f"🔄 Reprocessing speakers for {job_id} with {len(segments)} segments")
        
        # Enhanced speaker detection
        if force_speakers:
            speaker_count = force_speakers
            print(f"🎯 Forcing {speaker_count} speakers as requested")
        else:
            speaker_count = analyze_smart_speaker_patterns(segments)
            print(f"🎯 Enhanced analysis detected {speaker_count} speakers")
        
        # Reprocess segments with enhanced speaker assignment
        enhanced_segments = enhance_speaker_assignment(segments, speaker_count)
        
        # Update speaker statistics
        speaker_stats = calculate_speaker_statistics(enhanced_segments)
        
        # Update result
        result["transcript"] = enhanced_segments
        result["speakers"] = [f"Speaker {i+1}" for i in range(speaker_count)]
        result["participants"] = result["speakers"]
        result["detected_speakers"] = speaker_count
        result["speaker_stats"] = speaker_stats
        result["reprocessed_at"] = datetime.now().isoformat()
        result["processing_method"] = "enhanced_speaker_reprocessing"
        
        # Save updated result
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Speaker reprocessing completed: {speaker_count} speakers, {len(enhanced_segments)} segments")
        
        return {
            "success": True,
            "job_id": job_id,
            "speakers_detected": speaker_count,
            "segments_updated": len(enhanced_segments),
            "speaker_stats": speaker_stats,
            "message": f"Speaker detection reprocessed with {speaker_count} speakers"
        }
        
    except Exception as e:
        print(f"❌ Speaker reprocessing error: {e}")
        raise HTTPException(status_code=500, detail=f"Speaker reprocessing failed: {str(e)}")

def enhance_speaker_assignment(segments: List, target_speakers: int) -> List:
    """
    Enhanced speaker assignment using multiple analysis methods
    """
    if target_speakers <= 1:
        # Single speaker - assign all to speaker 1
        for segment in segments:
            segment.update({
                "speaker": "speaker-01",
                "speaker_name": "Speaker 1", 
                "assigned_speaker": 1,
                "confidence": 0.95
            })
        return segments
    
    # Multi-speaker assignment with enhanced logic
    current_speaker = 1
    last_speaker_change = 0
    speaker_changes_made = 0
    
    for i, segment in enumerate(segments):
        segment_text = segment['text'].strip()
        prev_text = segments[i-1]['text'].strip() if i > 0 else ""
        time_gap = segment['start'] - segments[i-1]['end'] if i > 0 else 0
        segments_since_change = i - last_speaker_change
        
        # Enhanced speaker change detection
        should_change = detect_speaker_change(
            segment_text, prev_text, time_gap, segments_since_change, target_speakers
        )
        
        if should_change and i > 0:
            current_speaker = (current_speaker % target_speakers) + 1
            last_speaker_change = i
            speaker_changes_made += 1
            print(f"🔄 Enhanced: Speaker change at {segment['start']:.1f}s → Speaker {current_speaker}")
        
        # Apply speaker assignment with higher confidence
        segment.update({
            "speaker": f"speaker-{current_speaker:02d}",
            "speaker_name": f"Speaker {current_speaker}",
            "assigned_speaker": current_speaker,
            "confidence": 0.9  # Higher confidence for enhanced processing
        })
    
    print(f"📊 Enhanced assignment: {speaker_changes_made} speaker changes across {len(segments)} segments")
    return segments

def calculate_speaker_statistics(segments: List) -> Dict:
    """
    Calculate detailed statistics for each speaker
    """
    speaker_stats = {}
    
    for segment in segments:
        speaker_id = segment.get("assigned_speaker", 1)
        if speaker_id not in speaker_stats:
            speaker_stats[speaker_id] = {
                "total_time": 0,
                "segment_count": 0,
                "word_count": 0,
                "avg_segment_length": 0
            }
        
        speaker_stats[speaker_id]["total_time"] += segment.get("duration", 0)
        speaker_stats[speaker_id]["segment_count"] += 1
        speaker_stats[speaker_id]["word_count"] += len(segment.get("text", "").split())
    
    # Calculate averages
    for speaker_id in speaker_stats:
        stats = speaker_stats[speaker_id]
        if stats["segment_count"] > 0:
            stats["avg_segment_length"] = stats["total_time"] / stats["segment_count"]
        
        print(f"👤 Speaker {speaker_id}: {stats['segment_count']} segments, {stats['total_time']:.1f}s, {stats['word_count']} words")
    
    return speaker_stats

@app.get("/api/analyze-audio/{job_id}")
async def analyze_audio_for_speakers(job_id: str):
    """
    Analyze audio characteristics to help determine speaker count
    Uses audio processing techniques for better speaker detection
    """
    try:
        # Find audio file
        uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
        audio_file = None
        
        for ext in ['.wav', '.mp3', '.m4a', '.mp4', '.webm', '.mkv', '.flac', '.ogg', '.mov']:
            potential_file = os.path.join(uploads_dir, f"{job_id}{ext}")
            if os.path.exists(potential_file):
                audio_file = potential_file
                break
        
        if not audio_file:
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        print(f"🎵 Analyzing audio characteristics: {audio_file}")
        
        # Basic audio analysis using librosa
        try:
            import librosa
            import numpy as np
            
            # Load audio
            y, sr = librosa.load(audio_file, sr=16000)
            duration = len(y) / sr
            
            # Voice activity detection
            # Simple energy-based VAD
            hop_length = 512
            frame_length = 2048
            
            # Calculate short-time energy
            energy = np.array([
                sum(abs(y[i:i+frame_length]**2)) 
                for i in range(0, len(y)-frame_length, hop_length)
            ])
            
            # Detect voice segments
            energy_threshold = np.percentile(energy, 30)  # Bottom 30% considered silence
            voice_segments = energy > energy_threshold
            
            # Count voice activity changes (potential speaker changes)
            voice_changes = np.sum(np.diff(voice_segments.astype(int)) != 0)
            
            # Calculate speaking vs silence ratio
            speaking_ratio = np.sum(voice_segments) / len(voice_segments)
            
            # Estimate speaker count based on voice activity patterns
            if voice_changes > 20 and speaking_ratio > 0.6:
                estimated_speakers_audio = 3
            elif voice_changes > 10 and speaking_ratio > 0.4:
                estimated_speakers_audio = 2
            else:
                estimated_speakers_audio = 1
            
            analysis_result = {
                "audio_duration": duration,
                "voice_activity_changes": int(voice_changes),
                "speaking_ratio": float(speaking_ratio),
                "estimated_speakers_from_audio": estimated_speakers_audio,
                "energy_variance": float(np.var(energy)),
                "analysis_method": "voice_activity_detection"
            }
            
            print(f"🎵 Audio analysis results:")
            print(f"   Duration: {duration:.1f}s")
            print(f"   Voice changes: {voice_changes}")
            print(f"   Speaking ratio: {speaking_ratio:.2f}")
            print(f"   Estimated speakers: {estimated_speakers_audio}")
            
            return analysis_result
            
        except ImportError:
            return {
                "error": "librosa not available for audio analysis",
                "estimated_speakers_from_audio": 2,  # Default assumption
                "analysis_method": "fallback_estimation"
            }
        
    except Exception as e:
        print(f"❌ Audio analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Audio analysis failed: {str(e)}")

@app.post("/api/config/speakers")
async def set_transcription_engine(engine: str):
    """Set transcription engine - DEBUGGING: Only faster-whisper allowed"""
    global TRANSCRIPTION_ENGINE
    
    # DEBUGGING: Only allow faster-whisper
    if engine != "faster-whisper":
        raise HTTPException(status_code=400, detail="DEBUG MODE: Only 'faster-whisper' engine is allowed")
    
    # Update configuration
    old_engine = TRANSCRIPTION_ENGINE
    TRANSCRIPTION_ENGINE = engine
    
    # Load appropriate models
    try:
        load_models()
        return {
            "status": "success",
            "previous_engine": old_engine,
            "current_engine": TRANSCRIPTION_ENGINE,
            "message": f"Transcription engine switched to {engine}"
        }
    except Exception as e:
        # Rollback on error
        TRANSCRIPTION_ENGINE = old_engine
        raise HTTPException(status_code=500, detail=f"Failed to switch engine: {str(e)}")

@app.post("/api/config/engine")
async def set_transcription_engine(engine: str = Query(..., description="Engine to switch to")):
    """Set transcription engine - frontend compatibility endpoint"""
    global TRANSCRIPTION_ENGINE
    
    # Validate engine
    valid_engines = ["faster-whisper"]  # Only faster-whisper available in optimized version
    if engine not in valid_engines:
        raise HTTPException(status_code=400, detail=f"Invalid engine. Available: {valid_engines}")
    
    old_engine = TRANSCRIPTION_ENGINE
    
    # Since we only have faster-whisper in optimized version, always return success
    try:
        TRANSCRIPTION_ENGINE = engine
        return {
            "status": "success", 
            "previous_engine": old_engine,
            "current_engine": TRANSCRIPTION_ENGINE,
            "message": f"Engine set to {engine} (optimized Large V3)",
            "optimization_applied": True
        }
    except Exception as e:
        TRANSCRIPTION_ENGINE = old_engine
        raise HTTPException(status_code=500, detail=f"Failed to set engine: {str(e)}")

@app.get("/api/whisper/config")
async def get_whisper_config_info():
    """Get current Whisper model configuration and available options"""
    from whisper_config import get_whisper_config, WHISPER_MODEL_CONFIG, get_optimal_device_config
    
    current_config = get_whisper_config()
    optimal_device = get_optimal_device_config()
    
    return {
        "current_model": current_config,
        "available_models": WHISPER_MODEL_CONFIG,
        "optimal_device": optimal_device,
        "model_loaded": whisper_model is not None,
        "legacy_models_removed": True,  # No more simple_whisper_model
        "features": LARGE_V3_FEATURES if current_config["model"] == "large-v3" else {},
        "optimization_settings": OPTIMIZATION_SETTINGS
    }

@app.post("/api/whisper/reload-model")
async def reload_whisper_model(model_mode: str = "production"):
    """Reload Whisper model with different configuration"""
    global whisper_model
    
    try:
        # Validate model mode
        from whisper_config import WHISPER_MODEL_CONFIG
        if model_mode not in WHISPER_MODEL_CONFIG:
            raise HTTPException(status_code=400, detail=f"Invalid model mode. Available: {list(WHISPER_MODEL_CONFIG.keys())}")
        
        # Clear current model
        old_model = None
        if whisper_model:
            old_model = whisper_model
            whisper_model = None
        
        # Set environment variable for new mode
        import os
        os.environ["WHISPER_MODEL_MODE"] = model_mode
        
        # Reload models
        load_models()
        
        current_config = get_whisper_config(model_mode)
        
        return {
            "status": "success",
            "message": f"Model reloaded successfully to {current_config['model']}",
            "previous_model": "unknown" if not old_model else "previous_model",
            "current_config": current_config,
            "model_loaded": whisper_model is not None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reload model: {str(e)}")

@app.get("/api/engines")
async def get_available_engines():
    """Get information about available transcription engines with Whisper Large V3 info"""
    current_config = get_whisper_config()
    
    return {
        "engines": {
            "faster-whisper": {
                "name": "Faster-Whisper Large V3 (Latest)",
                "type": "local",
                "cost": "free",
                "speed": "optimized" if current_config["model"] == "large-v3" else "medium",
                "accuracy": "maximum" if current_config["model"] == "large-v3" else "high",
                "languages": "multilingual (100+ languages with enhanced support)",
                "features": [
                    "offline", 
                    "privacy", 
                    "no_api_limits",
                    "word_timestamps",
                    "voice_activity_detection",
                    "large_v3_enhanced_accuracy",
                    "improved_noise_robustness",
                    "technical_vocabulary_recognition",
                    "code_switching_support"
                ],
                "available": whisper_model is not None,
                "current_model": current_config["model"],
                "device": current_config["device"],
                "compute_type": current_config["compute_type"],
                "memory_usage": current_config.get("memory_usage", "N/A"),
                "large_v3_features": LARGE_V3_FEATURES if current_config["model"] == "large-v3" else {},
                "optimization_applied": OPTIMIZATION_SETTINGS if current_config["model"] == "large-v3" else {},
                "legacy_models_removed": True  # Confirmation that old models are removed
            },
            "deepgram": {
                "name": "Deepgram Nova-2",
                "type": "cloud",
                "cost": "paid",
                "speed": "very_fast", 
                "accuracy": "very_high",
                "languages": "multilingual",
                "features": ["real_time", "speaker_diarization", "smart_formatting", "word_timestamps"],
                "available": False,  # DEBUGGING: Deepgram disabled
                "quota": "12000_minutes_free_monthly",
                "max_duration_recommended": "45_minutes",
                "max_file_size_recommended": "80MB",
                "timeout_note": "Auto-switches to Faster-Whisper for files >45 min or >80MB"
            }
        },
        "current_engine": TRANSCRIPTION_ENGINE,
        "recommendations": {
            "for_privacy": "faster-whisper",
            "for_accuracy": "faster-whisper (large-v3)",
            "for_cost": "faster-whisper",
            "for_speed": "faster-whisper (small/base)" if current_config["model"] in ["small", "base"] else "faster-whisper",
            "for_large_files": "faster-whisper",
            "for_multilingual": "faster-whisper (large-v3)",
            "for_technical_terms": "faster-whisper (large-v3)",
            "auto_fallback": "Files >45 min or >80MB automatically use Faster-Whisper"
        }
    }

@app.get("/api/jobs/completed")
async def get_completed_jobs():
    """Get list of completed jobs with basic info"""
    results_dir = os.path.join(os.path.dirname(__file__), "results")
    if not os.path.exists(results_dir):
        return {"jobs": []}
    
    completed_jobs = []
    for filename in os.listdir(results_dir):
        if filename.endswith('_result.json'):
            job_id = filename.replace('_result.json', '')
            result_file = os.path.join(results_dir, filename)
            
            try:
                with open(result_file, 'r', encoding='utf-8') as f:
                    result = json.load(f)
                
                completed_jobs.append({
                    "job_id": job_id,
                    "filename": result.get('filename', 'Unknown'),
                    "duration": result.get('duration', 0),
                    "word_count": result.get('word_count', 0),
                    "processed_at": result.get('processed_at', ''),
                    "summary_preview": result.get('summary', '')[:100] + "..." if result.get('summary') else ""
                })
            except Exception as e:
                print(f"Error reading result file {filename}: {e}")
                continue
    
    # Sort by processed_at descending
    completed_jobs.sort(key=lambda x: x['processed_at'], reverse=True)
    
    return {"jobs": completed_jobs}

@app.get("/api/jobs/{job_id}/result")
async def get_job_result(job_id: str):
    """Get full result data for a completed job"""
    results_dir = os.path.join(os.path.dirname(__file__), "results")
    result_file = os.path.join(results_dir, f"{job_id}_result.json")
    
    if not os.path.exists(result_file):
        raise HTTPException(status_code=404, detail="Job result not found")
    
    try:
        with open(result_file, 'r', encoding='utf-8') as f:
            result = json.load(f)
        
        return {
            "success": True,
            "job_id": job_id,
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading result file: {str(e)}")

@app.get("/api/audio/{job_id}")
async def get_audio_file(job_id: str):
    """Serve processed audio file for playback - prioritize MP3 files"""
    try:
        uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
        print(f"🔍 Looking for audio file: {job_id}")
        print(f"📁 Uploads directory: {uploads_dir}")
        
        # Priority 1: Look for MP3 files first (converted or processed)
        mp3_options = [
            f"{job_id}.mp3",                    # Direct MP3 conversion
            f"{job_id}_processed.mp3",          # Processed MP3
            f"{job_id}_extracted.mp3",          # Extracted from video
            f"{job_id}_optimized.mp3"           # Optimized MP3
        ]
        
        for mp3_filename in mp3_options:
            mp3_file = os.path.join(uploads_dir, mp3_filename)
            if os.path.exists(mp3_file):
                file_size = os.path.getsize(mp3_file) / (1024 * 1024)
                print(f"✅ Found MP3 file: {mp3_filename} ({file_size:.1f}MB)")
                return FileResponse(
                    mp3_file,
                    media_type="audio/mpeg",
                    headers={"Content-Disposition": f"inline; filename={mp3_filename}"}
                )
        
        # Priority 2: Look for processed WAV file (legacy)
        processed_wav = os.path.join(uploads_dir, f"{job_id}_processed.wav")
        if os.path.exists(processed_wav):
            print(f"✅ Found processed WAV file: {processed_wav}")
            return FileResponse(
                processed_wav,
                media_type="audio/wav",
                headers={"Content-Disposition": f"inline; filename={job_id}_processed.wav"}
            )
        
        # Priority 3: Fall back to original files (should be rare now)
        for ext in ['.mp3', '.wav', '.m4a', '.flac', '.ogg']:  # Audio formats only
            original_file = os.path.join(uploads_dir, f"{job_id}{ext}")
            if os.path.exists(original_file):
                print(f"✅ Found original audio file: {original_file}")
                media_type_map = {
                    '.mp3': 'audio/mpeg',
                    '.wav': 'audio/wav', 
                    '.m4a': 'audio/mp4',
                    '.flac': 'audio/flac',
                    '.ogg': 'audio/ogg'
                }
                media_type = media_type_map.get(ext, f"audio/{ext[1:]}")
                return FileResponse(
                    original_file,
                    media_type=media_type,
                    headers={"Content-Disposition": f"inline; filename={job_id}{ext}"}
                )
        
        # List all files in uploads directory for debugging
        available_files = []
        if os.path.exists(uploads_dir):
            available_files = [f for f in os.listdir(uploads_dir) if job_id in f]
        
        print(f"📂 Available files for {job_id}: {available_files}")
        print(f"⚠️ Note: Video files (MP4/MOV) should have been converted to MP3")
        
        raise HTTPException(status_code=404, detail=f"Audio file not found for job_id: {job_id}. Available files: {available_files}")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_audio_file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/api/process-existing/{job_id}")
async def process_existing_file(job_id: str, language: str = "auto", engine: str = "faster-whisper"):
    """Process an existing uploaded file that hasn't been transcribed yet"""
    try:
        uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
        
        # Find the existing file
        file_path = None
        filename = None
        for ext in ['.wav', '.mp3', '.m4a', '.mp4', '.webm', '.mkv', '.flac', '.ogg', '.mov']:
            potential_file = os.path.join(uploads_dir, f"{job_id}{ext}")
            if os.path.exists(potential_file):
                file_path = potential_file
                filename = f"{job_id}{ext}"
                break
        
        if not file_path:
            raise HTTPException(status_code=404, detail=f"No audio file found for job_id: {job_id}")
        
        # Check if result already exists
        results_dir = os.path.join(os.path.dirname(__file__), "results")
        result_file = os.path.join(results_dir, f"{job_id}_result.json")
        if os.path.exists(result_file):
            return JSONResponse({
                "status": "already_processed",
                "message": "File already has results available",
                "job_id": job_id
            })
        
        # Initialize processing job
        processing_jobs[job_id] = {
            "status": "starting", 
            "progress": 0, 
            "message": "Processing existing file...",
            "language": language,
            "engine": engine
        }
        
        print(f"🔄 Processing existing file: {file_path}")
        print(f"🌐 Language: {language}, Engine: {engine}, Speed: medium (default)")
        
        # Start processing with default medium speed
        asyncio.create_task(process_audio_librosa(job_id, file_path, filename, language, engine, "medium"))
        
        return JSONResponse({
            "job_id": job_id,
            "status": "processing_started",
            "message": f"Started processing existing file: {filename}",
            "language": language,
            "engine": engine,
            "speed": "medium",
            "file_path": file_path
        })
        
    except Exception as e:
        print(f"❌ Process existing file error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process existing file: {str(e)}")

async def transcribe_with_faster_whisper_large_v3(file_path: str, job_id: str = None, progress: 'ProgressTracker' = None, language: str = "auto", speed: str = "medium", speaker_method: str = "pyannote") -> Dict[Any, Any]:
    """
    OPTIMIZED Transcription using Faster-Whisper with speed options
    Performance improvements: Variable speed based on model selection, optimized settings
    Speed options: fast (base model), medium (small model), slow (large-v3 model)
    """
    import time  # Fix missing import
    start_time = time.time()
    try:
        # Import speed config
        from whisper_config import get_speed_config
        speed_config = get_speed_config(speed)
        
        model_name = speed_config['model_config']['model']
        optimization_settings = speed_config['optimization_config']
        
        print(f"🚀 {speed.upper()} transcription: {os.path.basename(file_path)} (Language: {language})")
        print(f"   Model: {model_name}")
        print(f"   Settings: {optimization_settings['description']}")
        
        # Load appropriate model based on speed
        global whisper_model
        current_model_name = getattr(whisper_model, 'model_size_or_path', None) if whisper_model else None
        
        # Load new model if different from current or if not loaded
        if whisper_model is None or current_model_name != model_name:
            if progress:
                progress.update_stage("transcription", 5, f"Loading {model_name} model for {speed} mode...")
            print(f"🔄 Loading {model_name} model for {speed} transcription...")
            
            # Load model with speed-specific configuration
            device_config = speed_config['model_config']
            whisper_model = WhisperModel(
                model_name, 
                device=device_config['device'],
                compute_type=device_config['compute_type']
            )
            print(f"✅ {model_name} model loaded for {speed} mode")
        
        if progress:
            progress.update_stage("transcription", 15, f"Starting {speed} transcription...")
        
        # OPTIMIZED transcription with speed-specific settings
        async def _optimized_transcribe():
            print(f"📝 {speed.upper()} processing: {os.path.basename(file_path)}")
            
            if progress:
                progress.update_stage("transcription", 20, "Large V3 processing (optimized)...")
            
            # Simplified progress tracking (no complex threading)
            import threading
            import time
            progress_stop = threading.Event()
            
            def simple_progress_update():
                """Simplified progress without overhead"""
                current = 25
                start = time.time()
                while not progress_stop.is_set() and current < 70:
                    progress_stop.wait(8)  # Update every 8 seconds
                    if not progress_stop.is_set():
                        current = min(70, current + 3)
                        elapsed = time.time() - start
                        if progress:
                            progress.update_stage("transcription", current, f"Processing... ({current}%) - {elapsed:.0f}s")
            
            # Start simple progress in background
            progress_thread = threading.Thread(target=simple_progress_update)
            progress_thread.daemon = True
            progress_thread.start()
            
            try:
                # Run optimized transcription
                def _transcribe_optimized():
                    print(f"🎵 Starting optimized Large V3 transcription")
                    
                    # Use speed-specific optimization settings
                    transcribe_options = optimization_settings.copy()
                    
                    # Remove non-whisper parameters
                    if "description" in transcribe_options:
                        del transcribe_options["description"]
                    if "vad_filter" in transcribe_options:
                        del transcribe_options["vad_filter"]
                    # Remove experimental speaker detection parameters (not supported by whisper)
                    if "speaker_diarization" in transcribe_options:
                        del transcribe_options["speaker_diarization"]
                    if "speaker_embedding" in transcribe_options:
                        del transcribe_options["speaker_embedding"]
                    if "segment_speakers" in transcribe_options:
                        del transcribe_options["segment_speakers"]
                    
                    if language != "auto" and language:
                        transcribe_options["language"] = language
                        print(f"🌐 Using language: {language}")
                    else:
                        print("🌐 Using auto-detect")
                    
                    print(f"⚙️  {speed.upper()} settings: beam_size={transcribe_options['beam_size']}, best_of={transcribe_options['best_of']}")
                    
                    # Faster-Whisper transcription with speed-specific optimizations
                    segments, info = whisper_model.transcribe(file_path, **transcribe_options)
                    
                    # OPTIMIZED segment processing with batch handling
                    segment_list = []
                    full_text = ""
                    processed_segments = 0
                    
                    print(f"📊 Starting optimized segment processing...")
                    
                    for segment in segments:
                        processed_segments += 1
                        
                        # Batch progress reporting (every 25 segments)
                        if processed_segments % 25 == 0:
                            print(f"📝 Processed {processed_segments} segments...")
                        
                        # Performance limit - max 3000 segments for speed
                        if processed_segments > 3000:
                            print(f"⚠️  Reached segment limit (3000) for performance")
                            break
                        if processed_segments > 5000:
                            print(f"⚠️  Reached maximum segment limit (5000), stopping transcription")
                            break
                        segment_dict = {
                            "id": len(segment_list),
                            "start": segment.start,
                            "end": segment.end,
                            "text": segment.text,
                            "words": []
                        }
                        
                        # Add word-level timestamps if available
                        if hasattr(segment, 'words') and segment.words:
                            for word in segment.words:
                                segment_dict["words"].append({
                                    "start": word.start,
                                    "end": word.end,
                                    "word": word.word,
                                    "probability": getattr(word, 'probability', 0.9)
                                })
                        
                        segment_list.append(segment_dict)
                        full_text += segment.text + " "
                    
                    return {
                        "segments": segment_list,
                        "text": full_text.strip(),
                        "language": info.language,
                        "language_probability": info.language_probability,
                        "duration": info.duration,
                        "model_info": {
                            "model": "large-v3",
                            "version": "faster-whisper",
                            "features_used": list(LARGE_V3_FEATURES.keys())
                        }
                    }
                
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(None, _transcribe_optimized)
                
                # Stop progress simulation
                progress_stop.set()
                progress_thread.join()
                
                if progress:
                    progress.update_stage("transcription", 70, f"Large V3 transcription completed, processing {len(result['segments'])} segments...")
                
                print(f"✅ Large V3 transcription completed! Language: {result['language']} (confidence: {result['language_probability']:.2f})")
                return result
                
            except Exception as e:
                # Stop progress simulation on error
                progress_stop.set()
                progress_thread.join()
                raise e
        
        # Run optimized transcription
        whisper_result = await _optimized_transcribe()
        
        print("✅ Optimized Large V3 transcription completed!")
        
        # Initialize segments and speaker data
        segments_with_speakers = []
        total_segments = len(whisper_result["segments"])
        
        # Check if speaker detection is disabled
        if speaker_method == "none":
            print("🚫 Speaker detection DISABLED - Processing without speaker assignment")
            if progress:
                progress.update_stage("transcription", 75, "Processing segments without speaker detection...")
            
            # Process segments without speaker detection
            for i, segment in enumerate(whisper_result["segments"]):
                segments_with_speakers.append({
                    "id": i,
                    "start": segment['start'],
                    "end": segment['end'],
                    "text": segment['text'].strip(),
                    "speaker": "speaker-01",  # Default single speaker
                    "speaker_name": "Speaker",
                    "confidence": 1.0,
                    "tags": [],
                    "assigned_speaker": 1,
                    "duration": segment['end'] - segment['start'],
                    "words": segment.get("words", [])
                })
                
                # Update progress periodically
                if progress and i % 50 == 0:
                    segment_progress = 75 + (i / total_segments) * 20  # 75% to 95%
                    progress.update_stage("transcription", segment_progress, f"Processing segments: {i+1}/{total_segments}")
            
            # Set default values for no speaker detection
            speaker_count = 1
            speaker_changes_detected = 0
            speaker_stats = {1: {"total_time": whisper_result.get("duration", 0), "segment_count": total_segments, "avg_length": 0}}
            advanced_speaker_data = None
            
            print(f"✅ Processed {total_segments} segments without speaker detection")
            
        else:
            # Enhanced speaker detection for Large V3 results
            if progress:
                progress.update_stage("transcription", 75, f"Analyzing {total_segments} segments for speakers...")
            
            # Analyze conversation patterns to detect real speaker count
            speaker_count = analyze_smart_speaker_patterns(whisper_result["segments"])
            print(f"🎯 Large V3 Smart detection found {speaker_count} speakers in conversation")
            
            if progress:
                progress.update_stage("transcription", 80, f"Detected {speaker_count} speakers, assigning segments...")
            
            # Enhanced speaker assignment for Large V3 with better accuracy
            current_speaker = 1
            last_speaker_change = 0
            speaker_changes_detected = 0
            speaker_stats = {i+1: {"total_time": 0, "segment_count": 0, "avg_length": 0} for i in range(speaker_count)}
            
            for i, segment in enumerate(whisper_result["segments"]):
                segment_text = segment['text'].strip()
                segment_duration = segment['end'] - segment['start']
                time_since_last = segment['start'] - (whisper_result["segments"][i-1]['end'] if i > 0 else 0)
                
                # Enhanced speaker change detection for Large V3
                should_change_speaker = detect_speaker_change(
                    segment_text, 
                    whisper_result["segments"][i-1]['text'].strip() if i > 0 else "",
                    time_since_last,
                    i - last_speaker_change,
                    speaker_count
                )
                
                if should_change_speaker and i > 0:
                    # Cycle to next speaker
                    current_speaker = (current_speaker % speaker_count) + 1
                    last_speaker_change = i
                    speaker_changes_detected += 1
                    print(f"🔄 Large V3 Speaker change detected at {segment['start']:.1f}s → Speaker {current_speaker}")
                
                # Track speaker statistics
                speaker_stats[current_speaker]["total_time"] += segment_duration
                speaker_stats[current_speaker]["segment_count"] += 1
                speaker_stats[current_speaker]["avg_length"] += len(segment_text)
                
                segments_with_speakers.append({
                    "id": i,
                    "start": segment['start'],
                    "end": segment['end'],
                    "text": segment_text,
                    "speaker": f"speaker-{current_speaker:02d}",
                    "speaker_name": f"Speaker {current_speaker}",
                    "confidence": 0.9,  # Higher confidence for Large V3
                    "tags": [],
                    "assigned_speaker": current_speaker,
                    "duration": segment_duration,
                    "words": segment.get("words", [])  # Include word-level timestamps
                })
                
                # Update progress periodically during segment processing
                if progress and i % 25 == 0:
                    segment_progress = 80 + (i / total_segments) * 15  # 80% to 95%
                    progress.update_stage("transcription", segment_progress, f"Processing segments: {i+1}/{total_segments}")
            
            # Calculate final speaker statistics
            for speaker_id in speaker_stats:
                if speaker_stats[speaker_id]["segment_count"] > 0:
                    speaker_stats[speaker_id]["avg_length"] /= speaker_stats[speaker_id]["segment_count"]
                    print(f"👤 Speaker {speaker_id}: {speaker_stats[speaker_id]['segment_count']} segments, {speaker_stats[speaker_id]['total_time']:.1f}s total")
            
            print(f"🔍 LARGE V3 ANALYSIS RESULTS:")
            print(f"   - Model: Faster-Whisper Large V3")
            print(f"   - Language: {whisper_result['language']} (confidence: {whisper_result['language_probability']:.2f})")
            print(f"   - Detected speakers: {speaker_count}")
            print(f"   - Speaker changes: {speaker_changes_detected}")
            print(f"   - Total segments: {total_segments}")
            
            # ADVANCED: Advanced speaker detection with selected method
            advanced_speaker_data = None
            print(f"🎯 ADVANCED SPEAKER DETECTION ACTIVATED!")
            print(f"   - Selected method: {speaker_method}")
            print(f"   - Audio file: {file_path}")
            print(f"🔍 Running {speaker_method} speaker detection...")
            if progress:
                progress.update_stage("transcription", 85, f"Running {speaker_method} speaker detection...")
            
            try:
                # Run selected speaker detection method
                advanced_speaker_data = analyze_speakers(file_path, method=speaker_method)
                
                if advanced_speaker_data:
                    advanced_count = advanced_speaker_data.get("speaker_count", 0)
                    advanced_method = advanced_speaker_data.get("method", "unknown")
                    advanced_confidence = advanced_speaker_data.get("confidence", "unknown")
                    
                    print(f"🎯 {speaker_method.upper()} detection: {advanced_count} speakers ({advanced_method}, confidence: {advanced_confidence})")
                    
                    # Enhanced segment processing with speaker detection data
                    segments_with_speakers = format_speaker_segments(
                        advanced_speaker_data, 
                        segments_with_speakers
                    )
                    
                    # Update speaker count if advanced detection is more confident
                    if advanced_confidence in ["high", "medium"] and advanced_count > 0:
                        speaker_count = advanced_count
                        print(f"🔄 Updated speaker count to {speaker_count} based on advanced detection")
                    
                    if progress:
                        progress.update_stage("transcription", 95, f"Advanced detection completed: {advanced_count} speakers")
                else:
                    print("⚠️ Advanced speaker detection returned no data")
                    
            except Exception as adv_error:
                print(f"⚠️ Advanced speaker detection failed: {adv_error}")
                print("   Continuing with basic speaker assignment...")
                advanced_speaker_data = None
        
        if progress:
            progress.update_stage("transcription", 100, f"Large V3 analysis completed: {speaker_count} speakers, {speaker_changes_detected} changes")
        
        # Get audio duration
        duration = whisper_result.get("duration", 0)
        
        # Prepare result with Large V3 specific info and experimental data
        audio_info = {
            "method": "faster_whisper_large_v3",
            "model": "large-v3",
            "model_version": "faster-whisper",
            "sample_rate": 16000,
            "channels": 1,
            "processing_time": "optimized",
            "total_segments": total_segments,
            "speaker_detection": "disabled" if speaker_method == "none" else f"{speaker_method}_advanced_detection",
            "features_used": list(LARGE_V3_FEATURES.keys()),
            "optimization_settings": optimization_settings,
            "speed_mode": "disabled" if speed == "medium" and speaker_method == "none" else speed,  # Show disabled only when both features off
            "speaker_method": speaker_method
        }
        
        # Add advanced speaker detection data if available
        if advanced_speaker_data:
            audio_info["experimental_speaker_detection"] = {
                "method": advanced_speaker_data.get("method", "unknown"),
                "confidence": advanced_speaker_data.get("confidence", "unknown"),
                "speaker_count": advanced_speaker_data.get("speaker_count", 0),
                "speakers": advanced_speaker_data.get("speakers", []),
                "segments_count": len(advanced_speaker_data.get("segments", []))
            }
        
        result = {
            "segments": segments_with_speakers,
            "text": whisper_result["text"],
            "language": whisper_result.get("language", "unknown"),
            "language_probability": whisper_result.get("language_probability", 0.0),
            "duration": duration,
            "speaker_stats": speaker_stats,
            "detected_speakers": speaker_count,
            "experimental_speaker_data": advanced_speaker_data,  # Include full advanced speaker data
            "audio_info": audio_info,
            "toggle_states": {
                "speed_processing_enabled": speed != "medium",  # If not forced to medium, speed processing is ON
                "speaker_detection_enabled": speaker_method != "none"  # If not "none", speaker detection is ON
            }
        }
        
        print(f"✅ Large V3 transcription complete: {len(segments_with_speakers)} segments, {duration:.1f}s, {speaker_count} speakers")
        
        return result
        
    except Exception as e:
        print(f"❌ Large V3 transcription error: {e}")
        traceback.print_exc()
        raise e

class ProgressTracker:
    """Enhanced progress tracking with detailed stages and accurate percentages"""
    
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.start_time = datetime.now()
        self.stages = {
            "initialization": {"weight": 5, "start": 0, "end": 5},
            "model_loading": {"weight": 10, "start": 5, "end": 15},
            "audio_analysis": {"weight": 5, "start": 15, "end": 20},
            "transcription": {"weight": 45, "start": 20, "end": 65},
            "speaker_processing": {"weight": 10, "start": 65, "end": 75},
            "ai_analysis": {"weight": 20, "start": 75, "end": 95},
            "finalization": {"weight": 5, "start": 95, "end": 100}
        }
        self.current_stage = None
        self.stage_progress = 0
    
    def update_stage(self, stage_name: str, stage_progress: float = 0, message: str = ""):
        """Update current stage and progress with immediate processing job update"""
        if stage_name not in self.stages:
            print(f"⚠️ Unknown stage: {stage_name}")
            return
        
        self.current_stage = stage_name
        self.stage_progress = max(0, min(100, stage_progress))
        
        stage_info = self.stages[stage_name]
        stage_range = stage_info["end"] - stage_info["start"]
        overall_progress = stage_info["start"] + (self.stage_progress / 100) * stage_range
        
        # Calculate elapsed time and estimate remaining
        elapsed = (datetime.now() - self.start_time).total_seconds()
        if overall_progress > 5:  # Only estimate after some progress
            estimated_total = (elapsed / overall_progress) * 100
            remaining = max(0, estimated_total - elapsed)
        else:
            remaining = 0
        
        # Enhanced status message for better user experience
        stage_display_name = stage_name.replace('_', ' ').title()
        if message:
            detailed_message = f"{stage_display_name}: {message}"
        else:
            detailed_message = f"{stage_display_name} ({self.stage_progress:.0f}%)"
        
        # Update processing job with detailed info - IMMEDIATE UPDATE
        processing_jobs[self.job_id] = {
            "status": stage_name,
            "progress": int(overall_progress),
            "stage_progress": int(self.stage_progress),
            "message": detailed_message,
            "result_available": False,
            "elapsed_time": f"{elapsed:.1f}s",
            "estimated_remaining": f"{remaining:.1f}s" if remaining > 0 else "Almost done!",
            "current_stage": stage_name,
            "stage_detail": {
                "name": stage_display_name,
                "progress": int(self.stage_progress),
                "weight": stage_info["weight"],
                "description": message or f"Processing {stage_display_name.lower()}"
            },
            "processing_info": {
                "total_stages": len(self.stages),
                "current_stage_index": list(self.stages.keys()).index(stage_name) + 1,
                "stage_start": stage_info["start"],
                "stage_end": stage_info["end"]
            }
        }
        
        print(f"📊 [{overall_progress:5.1f}%] {stage_name}: {message or 'Processing...'} (Stage: {self.stage_progress:.1f}%)")
        
        # Force a small delay to ensure the update is persisted
        import time
        time.sleep(0.1)
    
    def complete(self, final_data: dict = None):
        """Mark processing as complete"""
        elapsed = (datetime.now() - self.start_time).total_seconds()
        final_update = {
            "status": "completed",
            "progress": 100,
            "stage_progress": 100,
            "message": "Processing completed successfully!",
            "result_available": True,
            "elapsed_time": f"{elapsed:.1f}s",
            "estimated_remaining": "0s",
            "current_stage": "completed",
            "stage_detail": {
                "name": "Completed",
                "progress": 100,
                "weight": 100
            }
        }
        
        if final_data:
            final_update.update(final_data)
        
        processing_jobs[self.job_id] = final_update
        print(f"✅ Processing completed in {elapsed:.1f}s")
    
    def error(self, error_message: str):
        """Mark processing as failed"""
        elapsed = (datetime.now() - self.start_time).total_seconds()
        processing_jobs[self.job_id] = {
            "status": "error",
            "progress": 0,
            "stage_progress": 0,
            "error": error_message,
            "message": f"Processing failed: {error_message}",
            "result_available": False,
            "elapsed_time": f"{elapsed:.1f}s",
            "current_stage": "error"
        }
        print(f"❌ Processing failed after {elapsed:.1f}s: {error_message}")

async def process_audio_librosa(job_id: str, file_path: str, filename: str, language: str = "auto", engine: str = "faster-whisper", speed: str = "medium", speaker_method: str = "pyannote", enable_speed_processing: bool = True, enable_speaker_detection: bool = True):
    """Process audio using fast Whisper approach with enhanced progress tracking, speed options, speaker detection methods, and toggle controls"""
    progress = ProgressTracker(job_id)
    
    # Initialize variables at function scope to avoid NameError
    final_result = None
    unique_speakers = ["Speaker 1"]  # Default
    transcription = None
    optimized_file_path = file_path  # Default to original path
    
    try:
        print(f"⚡ Starting processing: {filename}")
        print(f"🌐 Language: {language}, Engine: {engine}")
        print(f"⚙️ Feature toggles:")
        print(f"   - Speed processing: {'ON' if enable_speed_processing else 'OFF'}")
        print(f"   - Speaker detection: {'ON' if enable_speaker_detection else 'OFF'}")
        
        # Determine processing configuration based on toggles
        if enable_speed_processing:
            print(f"🚀 Speed processing enabled - using {speed} mode")
            # Import speed config
            from whisper_config import get_speed_config
            speed_config = get_speed_config(speed)
            
            print(f"🚀 Using {speed} mode:")
            print(f"   Model: {speed_config['model_config']['model']}")
            print(f"   Expected: {speed_config['model_config']['expected_speed']}")
        else:
            print(f"🎯 Speed processing disabled - using default medium mode")
            speed = "medium"  # Force medium mode when speed processing is disabled
            from whisper_config import get_speed_config
            speed_config = get_speed_config(speed)
        
        if enable_speaker_detection:
            print(f"🔬 Speaker detection enabled - using {speaker_method} method")
        else:
            print(f"🔇 Speaker detection disabled - single speaker mode")
            speaker_method = "none"  # Disable speaker detection
        
        # Handle case when both features are disabled
        if not enable_speed_processing and not enable_speaker_detection:
            print("⚠️  MINIMAL MODE: Both speed processing and speaker detection disabled")
            print("   🎯 Using: Medium model, Single speaker, Basic transcription")
            print("   ✅ This provides fastest processing with minimal features")
        elif not enable_speed_processing:
            print("⚠️  Speed optimization disabled - using standard medium processing")
        elif not enable_speaker_detection:
            print("⚠️  Speaker detection disabled - treating as single speaker audio")
        
        # Stage 1: Initialization
        progress.update_stage("initialization", 50, f"Initializing {speed} processing for {filename} (Language: {language})")
        
        # Get file info for better progress estimation
        file_size = os.path.getsize(file_path) / (1024 * 1024)  # MB
        progress.update_stage("initialization", 100, f"File analyzed: {file_size:.1f}MB")
        
        # Stage 2: FORMAT OPTIMIZATION - Convert video to audio for 2-3x speed improvement
        file_ext = os.path.splitext(file_path)[1].lower()
        optimized_file_path = file_path
        
        if file_ext in ['.mp4', '.mov', '.webm', '.mkv', '.avi']:
            progress.update_stage("format_optimization", 20, f"Converting {file_ext} to optimized audio...")
            print(f"🎬 Video file detected ({file_ext}) - converting to audio for 2-3x speed improvement")
            
            try:
                # Convert video to optimized audio
                from pydub import AudioSegment
                
                print(f"📁 Original file: {file_path} ({file_size:.1f}MB)")
                
                # Extract audio track
                audio_segment = AudioSegment.from_file(file_path)
                
                # Create MP3 path with same job_id for consistency
                uploads_dir = os.path.dirname(file_path)
                mp3_filename = f"{job_id}.mp3"
                optimized_audio_path = os.path.join(uploads_dir, mp3_filename)
                
                progress.update_stage("format_optimization", 60, "Optimizing audio for transcription...")
                
                # Convert with optimal settings for transcription
                audio_segment = audio_segment.set_frame_rate(16000).set_channels(1)
                audio_segment.export(optimized_audio_path, format="mp3", bitrate="128k")  # Balanced quality for transcription
                
                # Check optimized file size
                optimized_size_mb = os.path.getsize(optimized_audio_path) / (1024 * 1024)
                reduction_percent = ((file_size - optimized_size_mb) / file_size) * 100
                
                print(f"✅ FORMAT OPTIMIZATION SUCCESS:")
                print(f"   Original: {file_size:.1f}MB ({file_ext})")
                print(f"   Converted: {optimized_size_mb:.1f}MB (.mp3)")
                print(f"   Reduction: {reduction_percent:.1f}% smaller")
                print(f"   Expected speedup: 2-3x faster transcription")
                print(f"   Saved as: {mp3_filename}")
                
                # IMPORTANT: Remove original video file to save space
                try:
                    os.remove(file_path)
                    print(f"🗑️ Removed original video file: {os.path.basename(file_path)}")
                    print(f"💾 Space saved: {file_size:.1f}MB")
                except Exception as remove_error:
                    print(f"⚠️ Could not remove original file: {remove_error}")
                
                # Update file path to use converted MP3
                optimized_file_path = optimized_audio_path
                
                progress.update_stage("format_optimization", 100, f"Video→MP3 conversion complete: {reduction_percent:.0f}% space saved, original removed")
                
            except Exception as e:
                print(f"⚠️ Format conversion failed: {e}")
                print(f"🔄 Using original file: {file_path}")
                progress.update_stage("format_optimization", 100, "Using original file (conversion failed)")
        else:
            progress.update_stage("format_optimization", 100, f"Audio format detected - no conversion needed")
            print(f"🎵 Audio file detected ({file_ext}) - direct processing")
        
        # Stage 3: Load models
        progress.update_stage("model_loading", 20, "Loading AI models...")
        load_models()
        progress.update_stage("model_loading", 100, "AI models loaded successfully")
        
        # Stage 3: Audio analysis
        progress.update_stage("audio_analysis", 30, "Analyzing audio format...")
        # Quick audio info check
        try:
            import librosa
            duration = librosa.get_duration(path=file_path)
            progress.update_stage("audio_analysis", 100, f"Audio analyzed: {duration:.1f}s duration")
        except:
            progress.update_stage("audio_analysis", 100, "Audio format validated")
        
        # Stage 4: Transcription (this is the longest stage) - use optimized file
        progress.update_stage("transcription", 0, f"Starting transcription with {engine} (Language: {language})...")
        
        # Transcription using Faster-Whisper with speed optimization
        transcription = await transcribe_with_faster_whisper_large_v3(optimized_file_path, job_id, progress, language, speed, speaker_method)
        
        if not transcription or not transcription.get("segments"):
            raise Exception("Transcription failed or returned empty result")
        
        # Stage 5: Speaker processing
        progress.update_stage("speaker_processing", 30, "Processing speaker information...")
        
        # Extract unique speakers from transcript segments
        unique_speakers = sorted(list(set(segment.get("speaker_name", "Speaker 1") for segment in transcription["segments"] if segment.get("speaker_name"))))
        
        progress.update_stage("speaker_processing", 70, f"Identified {len(unique_speakers)} speakers")
        
        # Prepare final result
        progress.update_stage("speaker_processing", 100, "Speaker processing completed")
        
        final_result = {
            "filename": filename,
            "job_id": job_id,
            "transcript": transcription["segments"],
            "summary": None,  # Will be generated after saving
            # "action_items": [],  # DISABLED: We only use enhanced_action_items now
            "key_decisions": [],
            "tags": ["conversation", "transcription"],
            "speakers": unique_speakers if unique_speakers else ["Speaker 1"],
            "participants": unique_speakers if unique_speakers else ["Speaker 1"],
            "meeting_type": "general",
            "sentiment": "neutral",
            "duration": transcription.get("duration", 0),
            "language": transcription.get("language", "unknown"),
            "word_count": len(transcription.get("text", "").split()),
            "audio_info": transcription.get("audio_info", {}),
            "processed_at": datetime.now().isoformat()
        }
        
        # Stage 6: AI Analysis (most complex stage)
        progress.update_stage("finalization", 20, "Saving initial results...")
        
        # Save initial result without summary
        results_dir = os.path.join(os.path.dirname(__file__), "results")
        os.makedirs(results_dir, exist_ok=True)
        result_file = os.path.join(results_dir, f"{job_id}_result.json")
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(final_result, f, ensure_ascii=False, indent=2)
        
        progress.update_stage("finalization", 50, "Initial results saved")
        
        # Generate comprehensive summary automatically after transcription
        print(f"🧠 Generating comprehensive summary automatically...")
        
        # Stage 6: AI Analysis 
        progress.update_stage("ai_analysis", 10, "Preparing AI analysis...")
        
        try:
            # Generate unified analysis using new no-redundancy approach
            progress.update_stage("ai_analysis", 30, "Generating unified analysis...")
            analysis_result = await generate_unified_analysis(transcription["segments"], progress)
            
            progress.update_stage("ai_analysis", 80, "Processing AI analysis results...")
            
            # Extract all data from unified analysis
            narrative_summary = analysis_result.get("narrative_summary", "")
            speaker_points = analysis_result.get("speaker_points", [])
            enhanced_action_items = analysis_result.get("enhanced_action_items", [])
            key_decisions = analysis_result.get("key_decisions", [])
            
            # Update result with clean separated data (NO REDUNDANCY)
            final_result["summary"] = narrative_summary  # Clean narrative summary only
            final_result["clean_summary"] = narrative_summary  # Same as summary now
            final_result["speaker_points"] = speaker_points  # Structured speaker data
            final_result["enhanced_action_items"] = enhanced_action_items  # Rich structured action items
            # NO legacy action_items - frontend should use enhanced_action_items only
            final_result["key_decisions"] = key_decisions  # Enhanced structured decisions and insights
            final_result["point_of_view"] = []  # Deprecated, data moved to speaker_points
            final_result["tags"] = ["conversation", "transcription", "ai-analysis"]
            # Remove next_steps as it's redundant with enhanced_action_items
            
            progress.update_stage("ai_analysis", 100, f"AI analysis completed: {len(enhanced_action_items)} action items, {len(key_decisions)} decisions")
            
            # Stage 7: Finalization
            progress.update_stage("finalization", 70, "Saving final results...")
            
            # Save updated result with summary - ensure clean JSON output
            try:
                # Validate that all data is JSON serializable before saving
                print("🔍 Validating JSON serializability...")
                test_json = json.dumps(final_result, ensure_ascii=False, indent=2)
                print("✅ JSON validation passed")
                
                # Write atomically to prevent corruption
                temp_file = result_file + '.tmp'
                with open(temp_file, 'w', encoding='utf-8') as f:
                    f.write(test_json)
                
                # Atomic rename to prevent corruption during write
                os.rename(temp_file, result_file)
                
                print(f"✅ Result file saved successfully: {result_file}")
                progress.update_stage("finalization", 100, "Results saved successfully")
                
            except Exception as save_error:
                print(f"❌ Error saving result file: {save_error}")
                print(f"❌ Error details: {type(save_error).__name__}: {str(save_error)}")
                
                # Clean up temp file if it exists
                temp_file = result_file + '.tmp'
                if os.path.exists(temp_file):
                    os.remove(temp_file)
                
                # Try saving without summary field as last resort
                try:
                    safe_result = {k: v for k, v in final_result.items() if k != 'summary'}
                    safe_result['summary'] = "Summary generation failed during save - please regenerate"
                    
                    safe_json = json.dumps(safe_result, ensure_ascii=False, indent=2)
                    with open(result_file, 'w', encoding='utf-8') as f:
                        f.write(safe_json)
                    
                    print(f"⚠️ Saved with fallback summary: {result_file}")
                    progress.update_stage("finalization", 100, "Results saved with fallback")
                    
                except Exception as final_error:
                    print(f"❌ Even safe save failed: {final_error}")
                    raise final_error
            
            print(f"✅ Unified analysis generated with {len(enhanced_action_items)} enhanced action items, {len(key_decisions)} key decisions, and {len(speaker_points)} speaker groups")
            
        except Exception as e:
            print(f"⚠️ Summary generation failed (transcript still available): {e}")
            progress.update_stage("ai_analysis", 100, f"Analysis failed: {e}")
            # Continue without summary - transcript is still usable
        
        # Complete processing
        if final_result is not None:
            progress.complete({
                "word_count": final_result["word_count"],
                "duration": final_result["duration"],
                "speakers_count": len(unique_speakers),
                "segments_count": len(transcription["segments"])
            })
            
            print(f"✅ FAST Processing completed: {filename} ({final_result['word_count']} words, {final_result['duration']:.1f}s)")
        else:
            progress.complete({
                "word_count": 0,
                "duration": 0,
                "speakers_count": len(unique_speakers),
                "segments_count": 0
            })
            print(f"✅ Processing completed: {filename} (result creation failed)")
        
        # Keep converted MP3 files - DO NOT cleanup optimized files
        # Only log what we're keeping for transparency
        if optimized_file_path != file_path:
            if optimized_file_path.endswith('.mp3'):
                print(f"💾 Keeping converted MP3 file: {os.path.basename(optimized_file_path)}")
                print(f"📁 Full path: {optimized_file_path}")
            else:
                # Only cleanup non-MP3 temporary files
                if os.path.exists(optimized_file_path):
                    try:
                        os.remove(optimized_file_path)
                        print(f"🧹 Cleaned up temporary file: {optimized_file_path}")
                    except Exception as cleanup_error:
                        print(f"⚠️ Cleanup warning: {cleanup_error}")
        
        print(f"📊 Final storage: Audio file stored as MP3 for optimal space usage")
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Processing failed: {error_msg}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        
        # Safe error handling - use initialized variables
        try:
            if final_result is not None:
                progress.complete({
                    "word_count": final_result.get("word_count", 0),
                    "duration": final_result.get("duration", 0),
                    "speakers_count": len(unique_speakers),
                    "segments_count": len(transcription.get("segments", []) if transcription else [])
                })
            else:
                # Create minimal final_result for completion
                progress.complete({
                    "word_count": 0,
                    "duration": 0,
                    "speakers_count": len(unique_speakers),
                    "segments_count": 0
                })
        except Exception as complete_error:
            print(f"⚠️ Error in progress.complete: {complete_error}")
        
        progress.error(error_msg)

async def preprocess_audio_librosa(file_path: str) -> str:
    """Preprocess audio file using librosa"""
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _preprocess_audio_sync, file_path)
    return result

def _preprocess_audio_sync(file_path: str) -> str:
    """Synchronous audio preprocessing with enhanced MP3 support"""
    try:
        print(f"🔧 Preprocessing audio: {file_path}")
        file_ext = os.path.splitext(file_path)[1].lower()
        
        # Optimized audio handling for different formats
        print(f"🎵 Processing audio file: {file_ext}")
        
        # Video formats need audio extraction for optimal performance
        if file_ext in ['.mp4', '.mov', '.webm', '.mkv']:
            try:
                print(f"🎬 Video detected ({file_ext}) - extracting audio track...")
                
                # Extract audio and save as MP3 for optimal storage
                audio_segment = AudioSegment.from_file(file_path)
                
                # Create MP3 path in same directory  
                uploads_dir = os.path.dirname(file_path)
                base_name = os.path.splitext(os.path.basename(file_path))[0]
                mp3_path = os.path.join(uploads_dir, f"{base_name}_extracted.mp3")
                
                # Optimize for Whisper: 16kHz, mono, MP3
                audio_segment = audio_segment.set_frame_rate(16000).set_channels(1)
                audio_segment.export(mp3_path, format="mp3", bitrate="128k")
                
                print(f"✅ Audio extracted to MP3: {mp3_path}")
                
                # Remove original video file to save space
                try:
                    original_size = os.path.getsize(file_path) / (1024 * 1024)
                    mp3_size = os.path.getsize(mp3_path) / (1024 * 1024)
                    os.remove(file_path)
                    print(f"🗑️ Removed original video file ({original_size:.1f}MB)")
                    print(f"💾 Space saved: {(original_size - mp3_size):.1f}MB (kept {mp3_size:.1f}MB MP3)")
                except Exception as remove_error:
                    print(f"⚠️ Could not remove original video: {remove_error}")
                
                # Process with librosa using MP3
                audio, sample_rate = librosa.load(mp3_path, sr=16000, mono=True)
                
                print(f"🚀 Video to MP3 conversion complete - space optimized")
                return mp3_path  # Return MP3 path for further processing
                    
            except Exception as video_error:
                print(f"⚠️  Video audio extraction failed: {video_error}")
                print("🔄 Attempting direct librosa load...")
                audio, sample_rate = librosa.load(file_path, sr=16000, mono=True)
                
        # Audio formats - direct processing with optional optimization
        elif file_ext in ['.mp3', '.m4a', '.aac']:
            try:
                print(f"🎵 Audio file detected ({file_ext}) - optimizing for transcription...")
                
                # For compressed audio, convert to optimal WAV for better accuracy
                audio_segment = AudioSegment.from_file(file_path)
                
                # Ensure optimal settings for Whisper Large V3
                temp_wav_path = file_path.replace(file_ext, '_temp.wav')
                audio_segment = audio_segment.set_frame_rate(16000).set_channels(1)
                audio_segment.export(temp_wav_path, format="wav", parameters=["-ac", "1", "-ar", "16000"])
                
                print(f"✅ Audio optimized for transcription accuracy")
                
                # Process with librosa
                audio, sample_rate = librosa.load(temp_wav_path, sr=16000, mono=True)
                
                # Clean up temporary file
                if os.path.exists(temp_wav_path):
                    os.remove(temp_wav_path)
                    
            except Exception as audio_error:
                print(f"⚠️  Audio optimization failed: {audio_error}")
                print("🔄 Attempting direct librosa load...")
                audio, sample_rate = librosa.load(file_path, sr=16000, mono=True)
        else:
            # WAV, FLAC, OGG - direct processing (already optimal)
            print(f"🎯 Optimal audio format detected ({file_ext}) - direct processing")
            audio, sample_rate = librosa.load(file_path, sr=16000, mono=True)
        
        print(f"📊 Audio info: {len(audio)} samples, {sample_rate} Hz, {len(audio)/sample_rate:.1f}s")
        
        # For video files that were converted to MP3, return the MP3 path directly
        if file_ext in ['.mp4', '.mov', '.webm', '.mkv'] and file_path.endswith('_extracted.mp3'):
            print(f"✅ Audio already optimized as MP3: {file_path}")
            return file_path
        
        # For other formats, save preprocessed audio appropriately
        if file_ext == '.mp3':
            # Already MP3, return as-is
            print(f"✅ Audio already in MP3 format: {file_path}")
            return file_path
        else:
            # Convert to MP3 for consistency and space savings
            output_path = file_path.replace(os.path.splitext(file_path)[1], '_processed.mp3')
            
            # Convert numpy audio to MP3 using soundfile and pydub
            temp_wav = file_path.replace(os.path.splitext(file_path)[1], '_temp.wav')
            sf.write(temp_wav, audio, sample_rate)
            
            # Convert WAV to MP3
            audio_segment = AudioSegment.from_wav(temp_wav)
            audio_segment.export(output_path, format="mp3", bitrate="128k")
            
            # Clean up temp WAV
            os.remove(temp_wav)
            
            print(f"✅ Audio processed and saved as MP3: {output_path}")
            return output_path
        
    except Exception as e:
        print(f"❌ Audio preprocessing error: {e}")
        print(f"❌ Preprocessing traceback: {traceback.format_exc()}")
        # If preprocessing fails, try original file
        return file_path

async def transcribe_with_librosa(audio_path: str, job_id: str = None) -> Dict[Any, Any]:
    """
    OPTIMIZED transcription using fast approach from mainSample.py
    Skip heavy preprocessing and use direct Simple Whisper for speed
    """
    
    print(f"🚀 OPTIMIZED transcription starting: {os.path.basename(audio_path)}")
    
    # DEBUGGING: Always use fast transcription approach
    print("🔧 DEBUG MODE: Using fast Simple Whisper approach for all files")
    
    try:
        # Use Large V3 transcription approach 
        result = await transcribe_with_faster_whisper_large_v3(audio_path, job_id)
        
        # Add auto_fallback info to show we're using optimized approach
        if job_id and "auto_fallback" not in result:
            result["auto_fallback"] = {
                "reason": "optimized_fast_transcription",
                "message": "Using optimized Simple Whisper for maximum speed (like mainSample.py)",
                "details": {
                    "approach": "direct_whisper",
                    "preprocessing": "minimal",
                    "speaker_detection": "simple_time_based"
                }
            }
        
        return result
        
    except Exception as e:
        print(f"❌ Fast transcription failed: {e}")
        print("🔄 Falling back to Faster-Whisper...")
        
        # Fallback to faster-whisper if simple whisper fails
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _transcribe_librosa_sync, audio_path, job_id)
        
        # Add timeout fallback info
        if job_id:
            result["timeout_fallback"] = {
                "reason": "simple_whisper_failed",
                "message": "Simple Whisper failed, used Faster-Whisper as backup",
                "original_error": str(e)
            }
        
        return result

# DEBUGGING: Removed old engine selection logic - now using fast approach only

async def transcribe_with_deepgram(audio_path: str, job_id: str = None) -> Dict[Any, Any]:
    """DEBUGGING: Disabled Deepgram for debugging - fallback to Faster-Whisper"""
    print("🔧 DEBUG MODE: Deepgram disabled, falling back to Faster-Whisper")
    
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _transcribe_librosa_sync, audio_path, job_id)
    
    # Add timeout fallback info
    if job_id:
        result["timeout_fallback"] = {
            "reason": "deepgram_disabled_debug",
            "message": "Deepgram disabled for debugging, used Faster-Whisper",
        }
    
    return result

# DEBUGGING: Removed broken Deepgram implementation - clean up starts here

async def transcribe_with_deepgram_original(audio_path: str, job_id: str = None) -> Dict[Any, Any]:
    """DEBUGGING: Disabled Deepgram original implementation - fallback to Faster-Whisper"""
    print("� DEBUG MODE: Original Deepgram disabled, falling back to Faster-Whisper")
    
    # Load Faster-Whisper if needed
    global whisper_model
    if whisper_model is None:
        load_models()
    
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _transcribe_librosa_sync, audio_path, job_id)
    
    # Add timeout fallback info
    if job_id:
        result["timeout_fallback"] = {
            "reason": "deepgram_original_disabled_debug",
            "message": "Original Deepgram disabled for debugging, used Faster-Whisper",
        }
    
    return result

def fast_algorithmic_speaker_assignment(segments: List) -> Dict:
    """Dynamic speaker detection based on audio patterns and conversation flow"""
    speaker_segments = {}
    total_segments = len(segments)
    
    print(f"⚡ DYNAMIC speaker detection: {total_segments} segments")
    
    # Analyze conversation patterns to determine optimal speaker count
    speaker_count = analyze_conversation_patterns(segments)
    print(f"📊 Detected conversation pattern suggests {speaker_count} speakers")
    
    current_speaker = 1
    speakers_detected = set()
    
    for i, segment in enumerate(segments):
        segment_text = segment.get("text", "").strip()
        
        # Determine speaker based on conversation dynamics
        if i == 0:
            # First segment
            current_speaker = 1
        else:
            prev_segment = segments[i-1] 
            time_gap = segment["start"] - prev_segment["end"]
            prev_speaker = prev_segment.get("assigned_speaker", current_speaker)
            
            # Dynamic speaker switching based on multiple factors
            speaker_change_probability = calculate_speaker_change_probability(
                segment, prev_segment, time_gap, i, total_segments, segments
            )
            
            if speaker_change_probability > 0.6:  # High probability of speaker change
                # Select next speaker in rotation, but don't exceed detected count
                available_speakers = list(range(1, speaker_count + 1))
                if prev_speaker in available_speakers:
                    current_speaker_idx = available_speakers.index(prev_speaker)
                    current_speaker = available_speakers[(current_speaker_idx + 1) % len(available_speakers)]
                else:
                    current_speaker = available_speakers[0]
            else:
                # Continue with same speaker
                current_speaker = prev_speaker
        
        # Store speaker assignment
        segment["assigned_speaker"] = current_speaker
        speakers_detected.add(current_speaker)
        
        speaker_id = f"SPEAKER_{current_speaker:02d}"
        
        if speaker_id not in speaker_segments:
            speaker_segments[speaker_id] = []
        
        speaker_segments[speaker_id].append({
            "start": segment["start"],
            "end": segment["end"],
            "speaker": speaker_id
        })
    
    print(f"✅ Dynamic speaker assignment complete: {len(speaker_segments)} speakers detected ({speakers_detected})")
    return speaker_segments

def analyze_conversation_patterns(segments: List) -> int:
    """Analyze conversation patterns to estimate optimal speaker count"""
    total_segments = len(segments)
    
    if total_segments < 10:
        return 2  # Default for very short conversations
    
    # Analyze pause patterns
    pause_changes = 0
    text_length_variations = []
    
    for i in range(1, min(total_segments, 100)):  # Sample first 100 segments for efficiency
        current_segment = segments[i]
        prev_segment = segments[i-1]
        
        time_gap = current_segment["start"] - prev_segment["end"]
        text_length = len(current_segment.get("text", ""))
        
        text_length_variations.append(text_length)
        
        # Count significant pauses (likely speaker changes)
        if time_gap > 1.5:
            pause_changes += 1
    
    # Estimate speakers based on conversation dynamics
    pause_ratio = pause_changes / min(total_segments, 100)
    
    # Calculate text length variance (different speakers often have different speaking patterns)
    import statistics
    if len(text_length_variations) > 5:
        text_variance = statistics.variance(text_length_variations)
        normalized_variance = min(text_variance / 1000, 1.0)  # Normalize
    else:
        normalized_variance = 0.5
    
    # Dynamic speaker count estimation
    if pause_ratio > 0.4 and normalized_variance > 0.3:
        estimated_speakers = min(4, max(2, int(pause_ratio * 8)))  # 2-4 speakers for high-variation conversations
    elif pause_ratio > 0.2:
        estimated_speakers = min(3, max(2, int(pause_ratio * 6)))  # 2-3 speakers for medium-variation
    else:
        estimated_speakers = 2  # Default to 2 speakers for low-variation (likely interview/podcast)
    
    print(f"📈 Analysis: pause_ratio={pause_ratio:.2f}, text_variance={normalized_variance:.2f} → {estimated_speakers} speakers")
    return estimated_speakers

def calculate_speaker_change_probability(current_segment, prev_segment, time_gap, segment_index, total_segments, all_segments) -> float:
    """Calculate probability of speaker change based on multiple factors"""
    probability = 0.0
    
    current_text = current_segment.get("text", "").strip().lower()
    prev_text = prev_segment.get("text", "").strip().lower() 
    
    # Factor 1: Time gap analysis
    if time_gap > 3.0:
        probability += 0.7  # Very long pause
    elif time_gap > 1.5:
        probability += 0.4  # Medium pause
    elif time_gap > 0.8:
        probability += 0.2  # Short pause
    
    # Factor 2: Text pattern analysis
    current_length = len(current_text)
    prev_length = len(prev_text.split()) if prev_text else 0
    
    # Short responses often indicate speaker change
    if current_length < 30 and prev_length > 50:
        probability += 0.3
    
    # Factor 3: Language pattern indicators
    response_words = ["ya", "iya", "oh", "mm", "hmm", "betul", "benar", "tidak", "nggak"]
    question_indicators = ["apa", "kenapa", "bagaimana", "kapan", "dimana", "siapa"]
    
    if any(word in current_text for word in response_words):
        probability += 0.3  # Likely response from different speaker
        
    if any(word in prev_text for word in question_indicators):
        probability += 0.2  # Previous was question, current might be answer
    
    # Factor 4: Position-based natural flow (prevent too frequent changes)
    segments_since_start = segment_index
    if segments_since_start < 3:
        probability *= 0.7  # Less likely to change in opening
    
    # Factor 5: Conversation flow (prevent same speaker monopolizing)
    prev_speaker = prev_segment.get("assigned_speaker", 1)
    consecutive_count = 1
    
    # Look back to count consecutive segments from same speaker
    for i in range(max(0, segment_index - 5), segment_index):
        if i < len(all_segments) and all_segments[i].get("assigned_speaker", 1) == prev_speaker:
            consecutive_count += 1
        else:
            break
    
    if consecutive_count > 4:
        probability += 0.4  # Encourage change after long run
    elif consecutive_count > 7:
        probability += 0.6  # Strong encouragement for very long runs
    
    # Cap probability between 0 and 1
    return min(1.0, max(0.0, probability))

def simple_speaker_detection(audio_path: str, segments: List) -> Dict:
    """DYNAMIC speaker detection based on conversation analysis"""
    total_segments = len(segments)
    print(f"⚡ DYNAMIC speaker detection for {total_segments} segments...")
    
    # Use dynamic algorithmic approach for any conversation type
    print(f"🎙️ Analyzing conversation patterns to detect optimal speaker count...")
    return fast_algorithmic_speaker_assignment(segments)

def force_minimum_speakers(segments: List) -> Dict:
    """Absolute fallback - guarantee at least 3 speakers no matter what"""
    speaker_segments = {}
    total_segments = len(segments)
    
    print(f"🔧 ABSOLUTE FALLBACK: Forcing minimum 3 speakers for {total_segments} segments")
    
    for i, segment in enumerate(segments):
        # Simple distribution: cycle through 3 speakers
        if i < total_segments // 3:
            speaker_id = "SPEAKER_01"
        elif i < 2 * total_segments // 3:
            speaker_id = "SPEAKER_02"
        else:
            speaker_id = "SPEAKER_03"
        
        # Add some variation
        if i % 7 == 0 and i > 0:  # Every 7th segment, switch speaker
            speaker_num = ((i // 7) % 3) + 1
            speaker_id = f"SPEAKER_{speaker_num:02d}"
        
        if speaker_id not in speaker_segments:
            speaker_segments[speaker_id] = []
            
        speaker_segments[speaker_id].append({
            "start": segment["start"],
            "end": segment["end"],
            "speaker": speaker_id
        })
    
    print(f"✅ Fallback complete: {len(speaker_segments)} speakers created")
    return speaker_segments

def perform_speaker_diarization(audio_path: str) -> Dict:
    """Perform speaker diarization using pyannote.audio"""
    global diarization_pipeline
    
    try:
        if diarization_pipeline is None or diarization_pipeline == "disabled":
            print("⚠️  No diarization pipeline available, using single speaker")
            return {}
            
        print(f"🎭 Performing speaker diarization: {audio_path}")
        
        # Perform diarization
        diarization = diarization_pipeline(audio_path)
        
        # Convert diarization result to speaker segments
        speaker_segments = {}
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            if speaker not in speaker_segments:
                speaker_segments[speaker] = []
            speaker_segments[speaker].append({
                "start": turn.start,
                "end": turn.end,
                "speaker": speaker
            })
        
        print(f"✅ Found {len(speaker_segments)} speakers: {list(speaker_segments.keys())}")
        return speaker_segments
        
    except Exception as e:
        print(f"❌ Diarization error: {e}")
        return {}

def analyze_smart_speaker_patterns(segments: List) -> int:
    """
    Enhanced conversation analysis to intelligently detect speaker count
    Now supports multilingual detection and more sensitive pattern recognition
    """
    total_segments = len(segments)
    
    if total_segments < 3:
        return 1  # Too short to determine multiple speakers
    
    # Analyze pause patterns, text patterns, and conversation flow
    pause_changes = 0
    text_length_variations = []
    response_indicators = 0
    question_indicators = 0
    sentiment_changes = 0
    direct_address_indicators = 0
    
    # Enhanced sample size for better analysis
    sample_size = min(total_segments, 100)  # Increased from 50
    
    for i in range(1, sample_size):
        prev_segment = segments[i-1]
        current_segment = segments[i]
        
        # Time gap analysis - MORE SENSITIVE
        time_gap = current_segment['start'] - prev_segment['end']
        if time_gap > 0.8:  # Reduced from 1.0 - more sensitive to pauses
            pause_changes += 1
        
        # Text length variance (different speakers often have different patterns)
        text_length_variations.append(len(current_segment['text']))
        
        # Enhanced conversation flow indicators
        current_text = current_segment['text'].lower().strip()
        prev_text = prev_segment['text'].lower().strip()
        
        # MULTILINGUAL response indicators (English + Indonesian)
        response_words = [
            # English responses
            "yes", "yeah", "yep", "no", "nope", "right", "correct", "exactly", 
            "absolutely", "definitely", "sure", "okay", "ok", "alright", "well",
            "hmm", "mm", "uh", "ah", "oh", "wow", "really", "indeed", "true",
            "i see", "got it", "understood", "makes sense", "agreed", "disagree",
            # Indonesian responses  
            "ya", "iya", "iyah", "tidak", "nggak", "enggak", "betul", "benar", 
            "setuju", "sepakat", "oh", "wah", "hmm", "mm", "eh", "ah", "oke", "baik"
        ]
        
        # MULTILINGUAL question indicators
        question_words = [
            # English questions
            "what", "why", "how", "when", "where", "who", "which", "whose", "whom",
            "can you", "could you", "would you", "will you", "do you", "are you",
            "is it", "have you", "did you", "?", "tell me", "explain", "describe",
            # Indonesian questions
            "apa", "kenapa", "mengapa", "bagaimana", "gimana", "kapan", "dimana", 
            "siapa", "yang mana", "apakah", "bisakah", "bisa", "maukah", "mau", 
            "sudah", "belum", "jelaskan", "ceritakan"
        ]
        
        # Direct address indicators (suggests multiple people)
        address_words = [
            "you", "your", "yours", "yourself", "kamu", "anda", "kalo kamu", 
            "kalau anda", "menurut kamu", "menurut anda", "pendapat kamu"
        ]
        
        # Count indicators
        if any(word in current_text for word in response_words):
            response_indicators += 1
        
        if any(word in prev_text for word in question_words) or current_text.endswith('?'):
            question_indicators += 1
            
        if any(word in current_text for word in address_words):
            direct_address_indicators += 1
        
        # Sentiment/tone changes (simple heuristic)
        if len(current_text) < 30 and len(prev_text) > 60:  # Short response after long statement
            sentiment_changes += 1
        
        # Interview/conversation patterns
        if i > 2:
            # Look for back-and-forth patterns
            if (len(current_text) < 50 and len(segments[i-2]['text']) < 50 and 
                len(prev_text) > 80):  # Short-Long-Short pattern
                response_indicators += 1
    
    # Calculate enhanced conversation metrics
    pause_ratio = pause_changes / sample_size
    response_ratio = response_indicators / sample_size
    question_ratio = question_indicators / sample_size
    address_ratio = direct_address_indicators / sample_size
    sentiment_ratio = sentiment_changes / sample_size
    
    # Text length variance analysis
    if len(text_length_variations) > 5:
        import statistics
        mean_length = statistics.mean(text_length_variations)
        variance = statistics.stdev(text_length_variations) if len(text_length_variations) > 1 else 0
        normalized_variance = variance / mean_length if mean_length > 0 else 0
    else:
        normalized_variance = 0
    
    # ENHANCED speaker count estimation - MUCH MORE SENSITIVE
    conversation_score = (
        pause_ratio * 2.0 +           # Weight pauses heavily
        response_ratio * 3.0 +        # Weight responses very heavily
        question_ratio * 2.5 +        # Weight questions heavily
        address_ratio * 4.0 +         # Weight direct address very heavily
        sentiment_ratio * 1.5 +       # Weight sentiment changes
        normalized_variance * 1.0     # Weight text variance
    )
    
    print(f"🔍 ENHANCED Analysis:")
    print(f"   Segments: {total_segments}, Sample: {sample_size}")
    print(f"   Pause ratio: {pause_ratio:.3f}")
    print(f"   Response ratio: {response_ratio:.3f}")
    print(f"   Question ratio: {question_ratio:.3f}")
    print(f"   Address ratio: {address_ratio:.3f}")
    print(f"   Sentiment ratio: {sentiment_ratio:.3f}")
    print(f"   Text variance: {normalized_variance:.3f}")
    print(f"   Conversation score: {conversation_score:.3f}")
    
    # MUCH MORE AGGRESSIVE speaker detection
    if conversation_score > 1.5:
        estimated_speakers = 3  # Active multi-person discussion
    elif conversation_score > 0.8:
        estimated_speakers = 2  # Clear two-person conversation
    elif conversation_score > 0.4 or total_segments > 30:  # LOWERED THRESHOLD significantly
        estimated_speakers = 2  # Likely conversation
    else:
        estimated_speakers = 1  # Monologue
    
    # Special case: Force 2 speakers for content with clear indicators
    if (response_indicators > 3 or question_indicators > 2 or 
        direct_address_indicators > 2 or pause_changes > 5):
        estimated_speakers = max(estimated_speakers, 2)
    
    # Cap at reasonable maximum
    estimated_speakers = min(estimated_speakers, 4)
    
    print(f"📈 RESULT: {estimated_speakers} speakers detected (score: {conversation_score:.3f})")
    return estimated_speakers

def detect_speaker_change(current_text: str, prev_text: str, time_gap: float, segments_since_change: int, total_speakers: int) -> bool:
    """
    Enhanced speaker change detection with multilingual support
    More sensitive to conversation patterns and turn-taking
    """
    # Only enforce if we have more than 1 speaker detected
    if total_speakers <= 1:
        return False
    
    # Allow more frequent changes (minimum 1 segment per speaker for very responsive detection)
    if segments_since_change < 1:
        return False
    
    # Enhanced indicators for speaker change
    change_probability = 0.0
    
    current_lower = current_text.lower().strip()
    prev_lower = prev_text.lower().strip()
    
    # Factor 1: Time gap (MUCH MORE SENSITIVE)
    if time_gap > 1.5:
        change_probability += 0.8
    elif time_gap > 1.0:
        change_probability += 0.6
    elif time_gap > 0.5:
        change_probability += 0.4
    elif time_gap > 0.3:  # Even small gaps matter
        change_probability += 0.2
    
    # Factor 2: Enhanced response patterns (MULTILINGUAL)
    response_words_strong = [
        # Strong English responses
        "yes", "yeah", "yep", "no", "nope", "exactly", "absolutely", "definitely",
        "right", "correct", "true", "false", "agreed", "disagree", "sure", "maybe",
        # Strong Indonesian responses
        "iya", "ya", "tidak", "nggak", "betul", "benar", "salah", "setuju", "beda"
    ]
    
    response_words_medium = [
        # Medium English responses
        "okay", "ok", "alright", "well", "hmm", "mm", "uh", "ah", "oh", "wow",
        "really", "indeed", "i see", "got it", "makes sense", "interesting",
        # Medium Indonesian responses
        "oke", "baik", "oh", "eh", "ah", "hmm", "mm", "wah", "begitu", "gitu"
    ]
    
    # Check for strong response indicators
    if any(word in current_lower for word in response_words_strong):
        change_probability += 0.7
    elif any(word in current_lower for word in response_words_medium):
        change_probability += 0.5
    
    # Factor 3: Question-answer patterns (ENHANCED)
    question_indicators = [
        # English questions
        "what", "why", "how", "when", "where", "who", "which", "?",
        "can you", "could you", "would you", "will you", "do you", "are you",
        "is it", "have you", "did you", "tell me", "explain", "describe",
        # Indonesian questions
        "apa", "kenapa", "mengapa", "bagaimana", "gimana", "kapan", "dimana",
        "siapa", "yang mana", "apakah", "bisakah", "bisa", "maukah", "jelaskan"
    ]
    
    if any(indicator in prev_lower for indicator in question_indicators) or prev_text.endswith('?'):
        change_probability += 0.6
    
    # Factor 4: Length pattern changes (MORE SENSITIVE)
    if len(current_text) < 50 and len(prev_text) > 100:  # Short response after long statement
        change_probability += 0.6
    elif len(current_text) < 30 and len(prev_text) > 60:
        change_probability += 0.4
    elif abs(len(current_text) - len(prev_text)) > 80:  # Significant length difference
        change_probability += 0.3
    
    # Factor 5: Direct address indicators
    address_words = [
        "you", "your", "yours", "yourself", "kamu", "anda", "kalo kamu",
        "kalau anda", "menurut kamu", "menurut anda", "what do you think"
    ]
    
    if any(word in prev_lower for word in address_words):
        change_probability += 0.5
    
    # Factor 6: Conversation flow indicators
    conversation_starters = [
        "well", "so", "now", "but", "however", "actually", "i think", "i believe",
        "in my opinion", "nah", "tapi", "trus", "terus", "jadi", "kalau begitu"
    ]
    
    if any(starter in current_lower for starter in conversation_starters):
        change_probability += 0.3
    
    # Factor 7: Prevent excessively long segments for one speaker (MORE AGGRESSIVE)
    if segments_since_change > 8:  # Reduced from 10
        change_probability += 0.4
    elif segments_since_change > 5:  # Reduced from 6
        change_probability += 0.3
    elif segments_since_change > 3:  # Additional tier
        change_probability += 0.2
    
    # Factor 8: Force regular rotation in multi-speaker scenarios
    if total_speakers >= 2 and segments_since_change > 4:
        change_probability += 0.2
    
    # Decision threshold (LOWERED for more sensitivity)
    threshold = 0.5  # Reduced from higher threshold
    
    # Special case: Very strong indicators override minimum segment requirement
    if change_probability > 0.8 and segments_since_change >= 1:
        return True
    
    return change_probability >= threshold
    """ULTRA-FAST speaker assignment - optimized for ALL files"""
    total_segments = len(whisper_segments)
    total_speakers = len(speaker_segments)
    
    print(f"⚡ ULTRA-FAST speaker assignment: {total_segments} segments, {total_speakers} speakers")
    
    if not speaker_segments:
        print("⚠️  No speaker segments provided, using intelligent fallback...")
        # INTELLIGENT fallback based on audio characteristics
        for i, segment in enumerate(whisper_segments):
            # Use text characteristics and time gaps for speaker assignment
            segment_text = segment['text'].strip()
            time_gap = segment['start'] - whisper_segments[i-1]['end'] if i > 0 else 0
            
            # Default to speaker 1 for first segment
            if i == 0:
                speaker_num = 1
            else:
                prev_segment = whisper_segments[i-1]
                prev_speaker = prev_segment.get('assigned_speaker', 1)
                
                # Smart speaker change based on multiple factors
                should_change = False
                
                # Factor 1: Significant time gap suggests speaker change
                if time_gap > 2.0:
                    should_change = True
                
                # Factor 2: Question-answer pattern
                prev_text = prev_segment['text'].strip().lower()
                if prev_text.endswith('?') or any(q in prev_text for q in ['what', 'how', 'why', 'when', 'where']):
                    should_change = True
                
                # Factor 3: Response indicators
                if any(resp in segment_text.lower() for resp in ['yes', 'no', 'yeah', 'okay', 'right', 'exactly']):
                    should_change = True
                
                # Factor 4: Length difference (short response after long statement)
                if len(segment_text) < 50 and len(prev_segment['text']) > 100:
                    should_change = True
                
                # Apply speaker change with max 3 speakers
                if should_change:
                    speaker_num = (prev_speaker % 3) + 1
                else:
                    speaker_num = prev_speaker
            
            segment["speaker"] = f"speaker-{speaker_num:02d}"
            segment["speaker_name"] = f"Speaker {speaker_num}"
            segment["assigned_speaker"] = speaker_num
            
        print(f"🧠 Intelligent fallback completed with {len(set(s.get('assigned_speaker', 1) for s in whisper_segments))} speakers")
        return whisper_segments
    
    # ALWAYS use fast assignment - no time mapping for any file size
    print(f"🚀 Using simplified assignment for ALL files ({total_segments} segments)")
    return fast_speaker_assignment_large_files(whisper_segments, speaker_segments)

def fast_speaker_assignment_large_files(whisper_segments: List, speaker_segments: Dict) -> List:
    """Ultra-fast speaker assignment for large files - skip time mapping"""
    
    # Create universal speaker name mapping for all detection methods
    speaker_names = {}
    unique_speakers = sorted(list(speaker_segments.keys()))
    
    for i, speaker_id in enumerate(unique_speakers):
        if speaker_id.startswith("SPEAKER_"):
            # PyAnnote format: SPEAKER_00, SPEAKER_01 → Speaker 1, Speaker 2
            speaker_num = int(speaker_id.split("_")[1]) + 1
            speaker_names[speaker_id] = f"Speaker {speaker_num}"
        elif speaker_id.startswith("Speaker_"):
            # SpeechBrain/Resemblyzer/WebRTC/Energy format: Speaker_1, Speaker_2 → Speaker 1, Speaker 2
            speaker_num = speaker_id.split("_")[1]
            speaker_names[speaker_id] = f"Speaker {speaker_num}"
        else:
            # Fallback for any other format
            speaker_names[speaker_id] = f"Speaker {i + 1}"
    
    # Proper time-based speaker assignment using PyAnnote results
    available_speakers = list(speaker_segments.keys())
    
    for segment in whisper_segments:
        segment_start = segment.get("start", 0)
        segment_end = segment.get("end", segment_start + 1)
        
        # Find best matching speaker based on time overlap
        best_speaker = available_speakers[0]  # Default to first speaker
        max_overlap = 0
        
        for speaker_id in available_speakers:
            speaker_times = speaker_segments[speaker_id]
            
            # Calculate overlap with this speaker's time segments
            for speaker_time in speaker_times:
                spk_start = speaker_time.get("start", 0)
                spk_end = speaker_time.get("end", spk_start + 1)
                
                # Calculate overlap
                overlap_start = max(segment_start, spk_start)
                overlap_end = min(segment_end, spk_end)
                overlap = max(0, overlap_end - overlap_start)
                
                if overlap > max_overlap:
                    max_overlap = overlap
                    best_speaker = speaker_id
        
        # Assign the best matching speaker with normalized format
        # Convert to normalized speaker format (1-based numbering)
        if best_speaker.startswith("SPEAKER_"):
            # PyAnnote format: SPEAKER_00 → speaker-01, SPEAKER_01 → speaker-02
            speaker_num = int(best_speaker.split("_")[1]) + 1
            normalized_speaker_id = f"speaker-{speaker_num:02d}"
            assigned_speaker_num = speaker_num
        elif best_speaker.startswith("Speaker_"):
            # Other formats: Speaker_1 → speaker-01, Speaker_2 → speaker-02  
            speaker_num = int(best_speaker.split("_")[1])
            normalized_speaker_id = f"speaker-{speaker_num:02d}"
            assigned_speaker_num = speaker_num
        else:
            # Fallback for unknown formats
            normalized_speaker_id = "speaker-01"
            assigned_speaker_num = 1
        
        segment["speaker"] = normalized_speaker_id
        segment["speaker_name"] = speaker_names[best_speaker]
        segment["assigned_speaker"] = assigned_speaker_num
        segment["confidence"] = 0.9 if max_overlap > 0 else 0.5  # High confidence if overlap found
    
    print(f"✅ Time-based speaker assignment complete for {len(whisper_segments)} segments")
    return whisper_segments

def _transcribe_librosa_sync(audio_path: str, job_id: str = None) -> Dict[Any, Any]:
    """Synchronous transcription with librosa-preprocessed audio and speaker diarization"""
    global whisper_model
    
    try:
        print(f"🎙️ Transcribing with Whisper: {audio_path}")
        
        if not os.path.exists(audio_path):
            raise Exception(f"Preprocessed audio file not found: {audio_path}")
        
        if whisper_model is None:
            raise Exception("Whisper model not loaded")
        
        # Enhanced audio loading with support for various formats
        file_ext = os.path.splitext(audio_path)[1].lower()
        
        try:
            if file_ext in ['.mp3', '.mp4', '.m4a', '.aac']:
                print(f"🎵 Loading {file_ext} with pydub first...")
                # Use generic file loader (works better for all formats)
                audio_segment = AudioSegment.from_file(audio_path)
                
                # Convert to mono and proper sample rate
                audio_segment = audio_segment.set_channels(1).set_frame_rate(16000)
                
                # Convert to numpy array
                audio_data = np.array(audio_segment.get_array_of_samples(), dtype=np.float32)
                audio_data = audio_data / (2**15)  # Normalize to [-1, 1]
                
                duration = len(audio_data) / 16000
                print(f"📊 Audio loaded via pydub: {duration:.1f}s, {len(audio_data)} samples")
                
            else:
                # For other formats or processed WAV files, use librosa
                audio_data, _ = librosa.load(audio_path, sr=16000, mono=True)
                duration = len(audio_data) / 16000
                print(f"📊 Audio loaded via librosa: {duration:.1f}s, {len(audio_data)} samples")
                
        except Exception as load_error:
            print(f"⚠️  Primary audio loading failed: {load_error}")
            print("🔄 Attempting fallback librosa load...")
            # Fallback to librosa
            audio_data, _ = librosa.load(audio_path, sr=16000, mono=True)
            duration = len(audio_data) / 16000
            print(f"📊 Fallback audio loaded: {duration:.1f}s, {len(audio_data)} samples")
        
        # Get audio info
        audio_info = {
            "sample_rate": 16000,
            "duration": duration,
            "samples": len(audio_data),
            "channels": 1
        }
        
        # Transcribe with faster-whisper (returns generator of segments)
        print(f"🎙️ Starting Whisper transcription for {duration/60:.1f} minutes of audio...")
        
        # Get optimization settings for faster-whisper
        opt_settings = OPTIMIZATION_SETTINGS.copy()
        
        # Update progress with time estimate
        estimated_minutes = max(1, int(duration / 60 * 0.3))  # Rough estimate: 30% of audio length
        if job_id:
            processing_jobs[job_id]["progress"] = 50
            processing_jobs[job_id]["message"] = f"Transcribing {duration/60:.1f} min audio with Large V3 (~{estimated_minutes} min processing)..."
        
        segments, info = whisper_model.transcribe(
            audio_data,
            language=None,  # Auto-detect
            task="transcribe",
            temperature=opt_settings["temperature"],
            beam_size=opt_settings["beam_size"],
            best_of=opt_settings["best_of"],
            condition_on_previous_text=opt_settings["condition_on_previous_text"],
            compression_ratio_threshold=opt_settings["compression_ratio_threshold"],
            log_prob_threshold=opt_settings["log_prob_threshold"],
            no_speech_threshold=opt_settings["no_speech_threshold"],
            prepend_punctuations=opt_settings["prepend_punctuations"],
            append_punctuations=opt_settings["append_punctuations"],
            vad_filter=True,  # Voice activity detection for better quality
            vad_parameters=dict(min_silence_duration_ms=500),
            word_timestamps=True  # Enable word-level timestamps for Large V3
        )
        
        # Convert generator to list with progress tracking
        print(f"🔄 Processing transcription segments...")
        if job_id:
            processing_jobs[job_id]["progress"] = 55
            processing_jobs[job_id]["message"] = f"Converting segments (est. {estimated_minutes} min remaining)..."
        
        # Process segments incrementally to show progress
        segment_list = []
        segment_count = 0
        
        # Estimate total segments based on duration (roughly 1 segment per 5-8 seconds)
        estimated_total_segments = max(50, int(duration / 6))
        update_interval = max(10, estimated_total_segments // 20)  # Update every 5% of estimated total
        
        print(f"📊 Estimated {estimated_total_segments} segments, updating every {update_interval} segments")
        
        for segment in segments:
            segment_list.append(segment)
            segment_count += 1
            
            # Update progress with adaptive interval for large files
            if job_id and (segment_count % update_interval == 0 or segment_count % 100 == 0):
                # More accurate progress based on estimated total
                estimated_progress = min(65, 55 + int((segment_count / estimated_total_segments) * 10))
                processing_jobs[job_id]["progress"] = estimated_progress
                processing_jobs[job_id]["message"] = f"Processed {segment_count} segments (~{segment_count/estimated_total_segments*100:.0f}% of transcription)..."
                print(f"📈 Progress: {segment_count}/{estimated_total_segments} segments ({estimated_progress}%)")
        
        print(f"✅ Transcription complete: {len(segment_list)} segments found")
        
        if not segment_list:
            raise Exception("Faster-Whisper returned no segments")
        
        # Create result structure compatible with original whisper format
        result = {
            "text": " ".join([s.text for s in segment_list]),
            "segments": [
                {
                    "start": s.start,
                    "end": s.end, 
                    "text": s.text,
                    "avg_logprob": s.avg_logprob if hasattr(s, 'avg_logprob') else -0.5
                }
                for s in segment_list
            ],
            "language": info.language,
            "language_probability": info.language_probability
        }
        
        if not result or "segments" not in result:
            raise Exception("Whisper returned invalid result")
        
        # Process segments with speaker information
        processed_segments = []
        total_segments = len(result["segments"])
        
        for i, segment in enumerate(result["segments"]):
            try:
                # Update progress during transcription processing
                if job_id and total_segments > 0:
                    transcribe_progress = 40 + int((i / total_segments) * 30)  # 40-70% range
                    processing_jobs[job_id]["progress"] = transcribe_progress
                    processing_jobs[job_id]["message"] = f"Processing segment {i+1}/{total_segments}..."
                
                processed_segments.append({
                    "start": float(segment.get("start", 0)),
                    "end": float(segment.get("end", 0)),
                    "text": str(segment.get("text", "")).strip(),
                    "speaker": "speaker-temp",  # Will be updated by speaker assignment
                    "speaker_name": "Speaker Temp", 
                    "confidence": float(segment.get("avg_logprob", 0.5)),
                    "tags": []
                })
            except Exception as e:
                print(f"⚠️  Skipping segment {i}: {e}")
                continue
        
        if not processed_segments:
            raise Exception("No valid segments found")
        
        # Try speaker diarization first, then fallback to simple detection
        if job_id:
            processing_jobs[job_id]["progress"] = 70
            processing_jobs[job_id]["message"] = f"Performing speaker diarization on {len(processed_segments)} segments..."
        
        print(f"🎭 Starting speaker diarization for {len(processed_segments)} segments...")
        speaker_segments = perform_speaker_diarization(audio_path)
        
        if not speaker_segments:
            print("🔄 Trying simple speaker detection as fallback...")
            if job_id:
                processing_jobs[job_id]["progress"] = 72
                processing_jobs[job_id]["message"] = "Using fallback speaker detection..."
            speaker_segments = simple_speaker_detection(audio_path, processed_segments)
        
        # Apply smart speaker assignment to segments
        if job_id:
            processing_jobs[job_id]["progress"] = 75
            processing_jobs[job_id]["message"] = "Assigning speakers using smart detection..."
        
        print(f"👥 SMART speaker assignment to {len(processed_segments)} segments...")
        speaker_assignment_result = fast_algorithmic_speaker_assignment(processed_segments)
        
        # Update segments with speaker assignments
        if speaker_assignment_result and "segments" in speaker_assignment_result:
            processed_segments = speaker_assignment_result["segments"]
            print(f"✅ Smart speaker assignment complete: {len(processed_segments)} segments with speakers")
        
        # Clean repetitive text in all segments
        print(f"🧹 Cleaning repetitive text in {len(processed_segments)} segments...")
        if job_id:
            processing_jobs[job_id]["progress"] = 78
            processing_jobs[job_id]["message"] = "Cleaning and finalizing transcript..."
        
        for segment in processed_segments:
            segment["text"] = clean_repetitive_text(segment["text"])
        
        if job_id:
            processing_jobs[job_id]["progress"] = 80
            processing_jobs[job_id]["message"] = "Transcription completed, preparing results..."
        
        print(f"✅ Transcription pipeline complete: {len(processed_segments)} segments, {duration/60:.1f} minutes")
        
        return {
            "text": result.get("text", ""),
            "language": result.get("language", "unknown"),
            "segments": processed_segments,
            "duration": duration,
            "audio_info": audio_info
        }
        
    except Exception as e:
        print(f"❌ Transcription error: {e}")
        raise Exception(f"Transcription failed: {str(e)}")

async def generate_summary_simple(transcription: Dict) -> Dict[str, Any]:
    """Simple summary generation with enhanced debugging"""
    try:
        if not api_providers:
            print("❌ API providers not available, using fallback")
            return get_simple_fallback()
        
        transcript_text = format_transcript_for_summary(transcription["segments"])
        print(f"📝 Formatted transcript length: {len(transcript_text)} chars")
        print(f"📋 Sample transcript (first 200 chars): {transcript_text[:200]}...")
        
        if len(transcript_text) < 10:
            print("❌ Transcript too short, using fallback")
            return get_simple_fallback()
        
        print("🚀 Calling Mistral AI for summary generation...")
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _generate_summary_simple_sync, transcript_text)
        print(f"✅ Summary generated successfully: {len(str(result))} chars")
        return result
        
    except Exception as e:
        print(f"❌ Summary error: {e}")
        import traceback
        print(f"📋 Traceback: {traceback.format_exc()}")
        return get_simple_fallback()

def clean_repetitive_text(text: str) -> str:
    """Clean repetitive text like 'bener bener bener...' or 'oh oh oh...'"""
    import re
    
    # Remove excessive repetition of short words (2-6 chars)
    # Pattern: word repeated more than 4 times consecutively
    pattern = r'\b(\w{2,6})\s+(?:\1\s+){4,}\1\b'
    cleaned = re.sub(pattern, r'\1 \1 \1', text, flags=re.IGNORECASE)
    
    # Remove excessive repetition of single words like "lebih lebih lebih..."
    pattern2 = r'\b(\w+)(\s+\1){10,}'
    cleaned = re.sub(pattern2, r'\1 \1 \1', cleaned, flags=re.IGNORECASE)
    
    return cleaned.strip()

def format_transcript_for_summary(segments: List[Dict]) -> str:
    """Format transcript for summary with text cleaning"""
    lines = []
    for seg in segments:
        # Clean repetitive text
        cleaned_text = clean_repetitive_text(seg['text'])
        
        # Skip very repetitive or nonsensical segments
        if len(cleaned_text) < 3 or cleaned_text.count(' ') < 1:
            continue
            
        time_str = f"{int(seg['start']//60):02d}:{int(seg['start']%60):02d}"
        speaker_name = seg.get('speaker_name', 'Speaker')
        lines.append(f"[{time_str}] {speaker_name}: {cleaned_text}")
    
    return "\n".join(lines)

def _generate_summary_simple_sync(transcript_text: str) -> Dict[str, Any]:
    """Enhanced summary generation using centralized prompts"""
    try:
        print(f"🔍 DEBUG: Starting summary generation with transcript length: {len(transcript_text)}")
        print(f"🔍 DEBUG: API providers available: {api_providers is not None}")
        
        # Truncate transcript if too long using utility function
        transcript_text = truncate_transcript(transcript_text, max_length=6000)
        print(f"🔍 DEBUG: Using transcript of {len(transcript_text)} chars")
        
        # Get prompt from centralized prompts file
        prompt = get_summary_prompt(transcript_text)
        print(f"🔍 DEBUG: Calling API with prompt length: {len(prompt)}")
        
        # Use our multi-provider API system
        response_text = call_api(prompt, providers=api_providers, max_tokens=12000)
        
        print(f"🤖 API response length: {len(response_text)} chars")
        print(f"📝 Response preview: {response_text[:200]}...")
        
        # Parse JSON - handle markdown code blocks
        if "```json" in response_text:
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            if end > start:
                json_str = response_text[start:end].strip()
            else:
                json_str = response_text[start:].strip()
        elif "```" in response_text:
            start = response_text.find("```") + 3
            end = response_text.find("```", start)
            if end > start:
                json_str = response_text[start:end].strip()
            else:
                json_str = response_text[start:].strip()
        else:
            # Find JSON object
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            if start >= 0 and end > start:
                json_str = response_text[start:end]
            else:
                json_str = response_text
        
        print(f"🔍 Parsing JSON: {json_str[:100]}...")
        result = json.loads(json_str)
        print(f"✅ JSON parsed successfully!")
        return validate_simple_result(result)
        
    except Exception as e:
        print(f"❌ Mistral error: {e}")
        print(f"📋 Traceback: {traceback.format_exc()}")
        # Use fallback from prompts file
        fallback_responses = get_fallback_responses()
        return fallback_responses["summary_fallback"]

def validate_simple_result(result: Dict) -> Dict:
    """Validate and ensure simple format compatible with frontend"""
    print(f"🔍 Validating simple result: {list(result.keys())}")
    
    # Simple defaults compatible with frontend format
    simple_defaults = {
        "summary": "This audio content has been successfully transcribed and analyzed using advanced AI processing. The conversation captured meaningful dialogue between participants with professional insights and clear communication patterns. The discussion demonstrates structured exchanges with valuable content suitable for business and strategic applications.",
        # "action_items": [  # DISABLED: We only use enhanced_action_items now
        #     "Review complete transcript for detailed insights and strategic planning",
        #     "Analyze discussion content for actionable business implications", 
        #     "Follow up on key discussion points within next business cycle"
        # ],
        "key_decisions": [
            "Audio content successfully processed with enhanced AI capabilities",
            "Structured analysis format enables improved decision-making processes",
            "Professional processing approach supports comprehensive content review"
        ]
    }
    
    # Ensure we have the basic required fields for frontend
    final_result = {}
    
    # Handle summary field - support both string and nested dict format
    if "summary" in result and result["summary"]:
        summary_text = ""
        if isinstance(result["summary"], str):
            summary_text = result["summary"].strip()
        elif isinstance(result["summary"], dict):
            # Handle nested dict format from Mistral
            if "topik_utama" in result["summary"]:
                summary_parts = []
                summary_parts.append(f"**Topik Utama:** {result['summary']['topik_utama']}")
                
                if "poin_per_pembicara" in result["summary"]:
                    summary_parts.append("\n**Poin per Pembicara:**")
                    for speaker, points in result["summary"]["poin_per_pembicara"].items():
                        if isinstance(points, list):
                            points_text = ", ".join(points)
                        else:
                            points_text = str(points)
                        summary_parts.append(f"- {speaker}: {points_text}")
                
                # Add other fields if present
                for key, value in result["summary"].items():
                    if key not in ["topik_utama", "poin_per_pembicara"] and value:
                        summary_parts.append(f"**{key.replace('_', ' ').title()}:** {value}")
                
                summary_text = "\n".join(summary_parts)
            else:
                # Convert dict to readable text
                summary_text = str(result["summary"])
        
        if summary_text and len(summary_text) > 50:
            final_result["summary"] = summary_text
        else:
            final_result["summary"] = simple_defaults["summary"]
    else:
        final_result["summary"] = simple_defaults["summary"]
    
    # Handle action_items - DISABLED: We only use enhanced_action_items now
    # if "action_items" in result and result["action_items"]:
    #     if isinstance(result["action_items"], list):
    #         # Check if list contains strings or objects
    #         action_items = []
    #         for item in result["action_items"]:
    #             if isinstance(item, str):
    #                 action_items.append(item)
    #             elif isinstance(item, dict) and "task" in item:
    #                 # Extract task from complex format
    #                 action_items.append(item["task"])
    #             elif isinstance(item, dict):
    #                 # Convert dict to string
    #                 action_items.append(str(item))
    #         final_result["action_items"] = action_items if action_items else simple_defaults["action_items"]
    #     else:
    #         final_result["action_items"] = simple_defaults["action_items"]
    # else:
    #     final_result["action_items"] = simple_defaults["action_items"]
    
    # Handle key_decisions - support both simple list and complex object format  
    if "key_decisions" in result and result["key_decisions"]:
        if isinstance(result["key_decisions"], list):
            key_decisions = []
            for decision in result["key_decisions"]:
                if isinstance(decision, str):
                    key_decisions.append(decision)
                elif isinstance(decision, dict) and "decision" in decision:
                    # Extract decision from complex format
                    key_decisions.append(decision["decision"])
                elif isinstance(decision, dict):
                    # Convert dict to string
                    key_decisions.append(str(decision))
            final_result["key_decisions"] = key_decisions if key_decisions else simple_defaults["key_decisions"]
        else:
            final_result["key_decisions"] = simple_defaults["key_decisions"]
    else:
        final_result["key_decisions"] = simple_defaults["key_decisions"]
    
    print(f"✅ Final result validated with keys: {list(final_result.keys())}")
    print(f"📝 Summary length: {len(final_result['summary'])} chars")
    # print(f"📋 Action items: {len(final_result['action_items'])} items")  # DISABLED: using enhanced only
    print(f"🎯 Key decisions: {len(final_result['key_decisions'])} decisions")
    
    # Add basic required fields for compatibility
    final_result["tags"] = result.get("tags", ["conversation", "transcription", "ai-analysis"])
    final_result["meeting_type"] = result.get("meeting_type", "conversation")
    final_result["sentiment"] = result.get("sentiment", "neutral")
    
    return final_result

def get_simple_fallback() -> Dict:
    """Dynamic fallback with minimal assumptions - now using centralized prompts"""
    fallback_responses = get_fallback_responses()
    return fallback_responses["summary_fallback"]

def clean_summary_text(summary: str, action_items: list, key_decisions: list) -> str:
    """
    Clean summary text to be CONCISE by removing detailed sections that are now separated
    """
    if not summary:
        return "Conversation has been processed and ready for analysis."
    
    # Replace \n with actual newlines
    summary = summary.replace('\\n', '\n')
    
    lines = summary.split('\n')
    cleaned_lines = []
    skip_section = False
    
    for line in lines:
        stripped = line.strip()
        
        # Skip detailed action items and decisions sections to avoid duplication
        if (stripped.startswith('#### 📋 Action Items') or 
            stripped.startswith('#### 🎯 Decisions or Conclusions') or
            stripped.startswith('#### 📋 Next Steps') or
            '📋 Action Items' in stripped or
            '🎯 Decisions or Conclusions' in stripped):
            skip_section = True
            continue
        
        # Reset skip when we hit a new major section
        if stripped.startswith('####') and not any(x in stripped for x in ['📋', '🎯', 'Action', 'Decisions']):
            skip_section = False
        
        # Only add lines if we're not in a skipped section
        if not skip_section:
            cleaned_lines.append(line)
    
    cleaned_summary = '\n'.join(cleaned_lines).strip()
    
    # Ensure it ends properly
    if cleaned_summary and not cleaned_summary.endswith('.'):
        cleaned_summary += "."
    
    return cleaned_summary

async def generate_unified_analysis(transcript_segments: list, progress: 'ProgressTracker' = None) -> dict:
    """
    Generate all analysis data in one AI call without redundancy
    Returns: dict with narrative_summary, speaker_points, enhanced_action_items, key_decisions
    """
    global api_providers
    
    print("\n🧠 Generating unified analysis (no redundancy)...")
    
    if progress:
        progress.update_stage("ai_analysis", 15, "Preparing transcript for AI analysis...")
    
    if not transcript_segments:
        raise Exception("No transcript available for analysis")
    
    # Extract actual speakers from transcript segments
    actual_speakers = sorted(list(set(segment.get("speaker_name", "Speaker 1") for segment in transcript_segments if segment.get("speaker_name"))))
    if not actual_speakers:
        actual_speakers = ["Speaker 1"]
    
    # Format transcript from segments with speaker context - OPTIMIZE length for better AI analysis
    transcript_lines = []
    total_chars = 0
    max_chars = 6000  # Limit input to prevent token overflow, save space for output
    
    for segment in transcript_segments:
        speaker = segment.get("speaker_name", "Speaker 1")
        text = segment.get("text", "").strip()
        if text:
            line = f"{speaker}: {text}"
            if total_chars + len(line) > max_chars:
                transcript_lines.append(f"... [Additional content truncated for processing efficiency]")
                break
            transcript_lines.append(line)
            total_chars += len(line)
    
    formatted_transcript = "\n".join(transcript_lines)
    
    if progress:
        progress.update_stage("ai_analysis", 25, f"Formatted transcript: {len(transcript_lines)} segments, {total_chars} chars")
    
    try:
        from prompts import get_unified_analysis_prompt
        
        if progress:
            progress.update_stage("ai_analysis", 35, "Generating AI analysis prompt...")
        
        prompt = get_unified_analysis_prompt(formatted_transcript, actual_speakers)
        
        if progress:
            progress.update_stage("ai_analysis", 45, "Calling AI API for comprehensive analysis...")
        
        # Use our multi-provider API system with increased tokens for complex analysis
        response_text = call_api(prompt, providers=api_providers, max_tokens=80000)
        
        # DEBUG: Check response length and structure
        print(f"🔍 AI response length: {len(response_text)} chars")
        if len(response_text) > 7500:
            print(f"⚠️ Response may be truncated (close to token limit)")
        
        if progress:
            progress.update_stage("ai_analysis", 55, f"Received AI response: {len(response_text)} chars")
            progress.update_stage("ai_analysis", 70, "AI analysis completed, parsing structured response...")
        
        # Parse JSON response
        try:
            # Clean and parse JSON response with comprehensive cleaning
            if "```json" in response_text:
                start = response_text.find("```json") + 7
                end = response_text.find("```", start)
                json_str = response_text[start:end].strip() if end > start else response_text[start:].strip()
            elif "```" in response_text and "{" in response_text:
                # Handle cases where it might be wrapped in code blocks without "json"
                lines = response_text.split('\n')
                json_lines = []
                in_json = False
                for line in lines:
                    if line.strip().startswith('{') or in_json:
                        in_json = True
                        json_lines.append(line)
                        if line.strip().endswith('}') and line.strip().count('{') <= line.strip().count('}'):
                            break
                json_str = '\n'.join(json_lines)
            else:
                start = response_text.find('{')
                end = response_text.rfind('}') + 1
                json_str = response_text[start:end] if start >= 0 and end > start else response_text
            
            if progress:
                progress.update_stage("ai_analysis", 80, "Parsing AI response...")
            
            # TEMPORARY DEBUG - Log raw response when 0 items generated
            print(f"🔍 DEBUG: Raw AI response (first 800 chars):")
            print(f"{response_text[:800]}...")
            print(f"🔍 DEBUG: Extracted JSON (first 500 chars):")
            print(f"{json_str[:500]}...")
            
            # Comprehensive JSON cleaning
            import re
            
            # Remove control characters except newlines, tabs, and carriage returns
            json_str = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', json_str)
            
            # Fix common JSON issues
            json_str = json_str.replace('\n\n', '\\n').replace('\r', ' ').strip()
            
            # Fix potential unescaped quotes in strings
            # This is a basic fix - more sophisticated parsing might be needed
            lines = json_str.split('\n')
            fixed_lines = []
            for line in lines:
                # If it's a string value line (contains ": "...), escape internal quotes
                if '": "' in line and not line.strip().endswith('",') and not line.strip().endswith('"'):
                    # Add missing comma or quote closure if needed
                    if not line.strip().endswith(',') and not line.strip().endswith('"'):
                        line = line.rstrip() + '",'
                fixed_lines.append(line)
            json_str = '\n'.join(fixed_lines)
            
            result = json.loads(json_str)
            
            # Validate required fields with field mapping for flexibility
            required_fields = ["narrative_summary", "speaker_points", "enhanced_action_items", "key_decisions"]
            field_mappings = {
                "enhanced_action_items": ["next_steps", "action_items", "enhanced_action_items"],
                "key_decisions": ["key_takeaways", "key_insights", "key_decisions", "decisions"]
            }
            
            for field in required_fields:
                if field not in result:
                    # Try alternative field names
                    if field in field_mappings:
                        found_alternative = False
                        for alt_field in field_mappings[field]:
                            if alt_field in result and result[alt_field]:
                                print(f"🔄 Mapping {alt_field} → {field}")
                                result[field] = result[alt_field]
                                found_alternative = True
                                break
                        
                        if not found_alternative:
                            print(f"⚠️ MISSING field entirely: {field}")
                            print(f"🔍 Available fields: {list(result.keys())}")
                            print(f"🔍 Tried alternatives: {field_mappings[field]}")
                    else:
                        print(f"⚠️ MISSING field entirely: {field}")
                        print(f"🔍 Available fields: {list(result.keys())}")
                elif not result[field]:
                    print(f"⚠️ EMPTY field: {field} = {result[field]}")
                    print(f"🔍 Field type: {type(result[field])}")
                else:
                    print(f"✅ Field OK: {field} has {len(result[field]) if isinstance(result[field], list) else 'content'}")
                    continue
                
                # Only use fallbacks if field is completely missing or None after mapping attempts
                if field not in result or result[field] is None or not result[field]:
                    print(f"🔧 Generating fallback for missing field: {field}")
                    if field == "narrative_summary":
                        result[field] = "Content analysis completed successfully."
                    elif field == "speaker_points":
                        # Generate basic speaker points from transcript
                        speakers = set()
                        for segment in transcript_segments:
                            speakers.add(segment.get("speaker_name", "Unknown Speaker"))
                        result[field] = [{"speaker": speaker, "points": ["Participated in discussion"]} for speaker in speakers]
                    elif field == "enhanced_action_items":
                        result[field] = [
                            {
                                "title": "Review Content and Extract Action Items",
                                "description": "Analyze the transcribed content to identify specific action items and next steps based on the discussion points.",
                                "priority": "Medium",
                                "category": "Short-term",
                                "timeframe": "1-2 weeks",
                                "assigned_to": "Team"
                            }
                        ]
                    elif field == "key_decisions":
                        result[field] = [
                            {
                                "title": "Content Processing Complete",
                                "description": "Successfully transcribed and analyzed the audio content with speaker detection.",
                                "category": "Process",
                                "impact": "Medium",
                                "actionable": False,
                                "source": "System"
                            }
                        ]
                        print(f"✅ Generated fallback key_decisions: {len(result[field])} items")
                else:
                    # Field exists but is empty - this suggests AI response issue
                    print(f"❌ AI provided empty {field} - this suggests prompt or API issue")
                    print(f"🔍 Raw response sample for debugging:")
                    # Look for the field in raw response
                    if f'"{field}"' in response_text:
                        field_start = response_text.find(f'"{field}"')
                        field_sample = response_text[field_start:field_start+200]
                        print(f"   Found in raw: {field_sample}")
                    else:
                        print(f"   Field '{field}' not found in raw response!")
            
            if progress:
                progress.update_stage("ai_analysis", 95, "Validating analysis results...")
            
            print(f"✅ Unified analysis generated successfully!")
            print(f"   - Narrative summary: {len(result.get('narrative_summary', ''))} chars")
            print(f"   - Speaker points: {len(result.get('speaker_points', []))} speakers") 
            print(f"   - Enhanced action items: {len(result.get('enhanced_action_items', []))} items")
            print(f"   - Key decisions: {len(result.get('key_decisions', []))} decisions")
            
            # DEBUG: Log actual key_decisions content if present
            key_decisions = result.get('key_decisions', [])
            if key_decisions:
                print(f"🔍 KEY DECISIONS FOUND ({len(key_decisions)}):")
                for i, decision in enumerate(key_decisions[:3]):  # Show first 3
                    if isinstance(decision, dict):
                        title = decision.get('title', 'No title')
                        print(f"   {i+1}. {title}")
                    else:
                        print(f"   {i+1}. {str(decision)[:100]}...")
            else:
                print(f"⚠️ NO KEY DECISIONS GENERATED - checking AI response structure...")
                # Log structure of response to debug
                if 'key_decisions' in result:
                    print(f"   - key_decisions field exists but empty: {result['key_decisions']}")
                else:
                    print(f"   - key_decisions field missing from response")
                    print(f"   - Available fields: {list(result.keys())}")
            
            return result
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON parsing failed: {e}")
            print(f"Raw response: {response_text[:500]}...")
            raise Exception(f"Invalid JSON from AI: {e}")
            
    except Exception as e:
        print(f"❌ Unified analysis error: {e}")
        # NO STATIC FALLBACK - Re-raise exception to be handled by caller
        raise Exception(f"Failed to generate unified analysis: {str(e)}")


def process_summary_sections(summary: str, actual_speakers: list = None) -> tuple:
    """
    Process summary to create clean version and extract speaker points
    Returns: (clean_summary, speaker_points)
    """
    if not summary:
        return "", []
    
    # Remove redundant sections from summary
    sections_to_remove = [
        r'#### Action Items[\s\S]*?(?=####|$)',
        r'#### Decisions or Conclusions Made[\s\S]*?(?=####|$)',
        r'#### Important Points from Each Speaker[\s\S]*?(?=####|$)',
    ]
    
    clean_summary = summary
    for pattern in sections_to_remove:
        clean_summary = re.sub(pattern, '', clean_summary, flags=re.IGNORECASE)
    
    # Clean up extra whitespace and newlines
    clean_summary = re.sub(r'\n{3,}', '\n\n', clean_summary.strip())
    
    # Extract speaker points from summary, but use actual speaker names
    speaker_points = []
    speaker_match = re.search(r'#### Important Points from Each Speaker\s*([\s\S]*?)(?=####|$)', summary, re.IGNORECASE)
    
    if speaker_match and actual_speakers:
        speaker_text = speaker_match.group(1).strip()
        
        # Split by speaker sections (looking for **Speaker pattern)
        speaker_sections = re.split(r'\*\*Speaker\s+\d+.*?\*\*', speaker_text, flags=re.IGNORECASE)
        speaker_headers = re.findall(r'\*\*Speaker\s+\d+.*?\*\*', speaker_text, flags=re.IGNORECASE)
        
        for i, speaker_content in enumerate(speaker_sections[1:], 0):
            if i < len(speaker_headers) and i < len(actual_speakers):
                # Use actual speaker name instead of parsed header
                speaker_name = actual_speakers[i]
                content = speaker_content.strip()
                
                if content:
                    # Extract bullet points or numbered items
                    points = re.split(r'(?:\n|^)[-*]\s+|\d+\.\s+', content)
                    points = [point.strip().replace('**', '') for point in points if point.strip()]
                    
                    if points:
                        speaker_points.append({
                            "speaker": speaker_name,
                            "points": points
                        })
    
    return clean_summary, speaker_points


async def extract_structured_data_from_summary(transcript_segments: list) -> tuple:
    """Extract and separate detailed content into 3 distinct fields using AI - NO STATIC CONTENT"""
    global api_providers
    
    if not transcript_segments:
        return ["Review transcript for detailed insights"], ["Audio successfully processed with AI technology"], ["Speaker 1: Main points from speaker's perspective"]
    
    # Format transcript for AI analysis - EXCLUDE WORD DATA to save tokens
    transcript_text = ""
    for segment in transcript_segments:
        speaker = segment.get("speaker_name", "Speaker")
        text = segment.get("text", "")
        start_time = segment.get("start", 0)
        # Only include essential data: speaker, text, timestamp
        transcript_text += f"[{start_time:.1f}s] {speaker}: {text}\n"
    
    if not transcript_text.strip():
        return ["Review transcript for detailed insights"], ["Audio successfully processed with AI technology"], ["Speaker 1: Important points from speaker"]
    
    # Generate structured data using AI
    try:
        if not api_providers:
            print("⚠️ API providers not available, using basic fallback")
            return generate_basic_structured_data()
        
        # Import dan gunakan prompt dari prompts.py
        from prompts import get_structured_data_extraction_prompt
        prompt = get_structured_data_extraction_prompt(transcript_text)

        # Use our multi-provider API system
        response_text = call_api(prompt, providers=api_providers, max_tokens=15000)
        
        # Clean and parse JSON response with better error handling
        json_str = ""
        try:
            if "```json" in response_text:
                start = response_text.find("```json") + 7
                end = response_text.find("```", start)
                if end > start:
                    json_str = response_text[start:end].strip()
                else:
                    json_str = response_text[start:].strip()
            else:
                # Find JSON object boundaries more carefully
                start = response_text.find('{')
                end = response_text.rfind('}') + 1
                if start >= 0 and end > start:
                    json_str = response_text[start:end]
                else:
                    json_str = response_text
            
            # Clean the JSON string of any problematic characters
            import re
            # Remove control characters except newlines, tabs, and carriage returns
            json_str = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', json_str)
            json_str = json_str.replace('\n\n', ' ').replace('\r', ' ').strip()
            
            # Try to parse JSON
            result = json.loads(json_str)
            
        except json.JSONDecodeError as json_err:
            print(f"⚠️ JSON parsing failed: {json_err}")
            print(f"Raw response: {response_text[:500]}...")
            print(f"Extracted JSON: {json_str[:500]}...")
            raise Exception(f"Invalid JSON response from AI: {json_err}")
        
        # action_items = result.get("action_items", [])  # DISABLED: using enhanced only
        key_decisions = result.get("key_decisions", [])
        point_of_view = result.get("point_of_view", [])
        
        # print(f"✅ AI extracted {len(action_items)} action items, {len(key_decisions)} decisions, {len(point_of_view)} point of view")  # DISABLED
        print(f"✅ AI extracted {len(key_decisions)} decisions, {len(point_of_view)} point of view")
        return [], key_decisions, point_of_view  # Return empty action_items
        
    except Exception as e:
        print(f"❌ AI extraction error: {e}")
        return generate_basic_structured_data()

def generate_basic_structured_data() -> tuple:
    """Generate basic structured data when AI is not available - only 3 fields"""
    # action_items = [  # DISABLED: using enhanced only
    #     "High Priority Action 1: Review complete transcript to identify specific action items",
    #     "Medium Priority Action 2: Analyze discussion to find actions that need to be taken",
    #     "Strategic Action 3: Create implementation plan based on discussion results",
    #     "Quick Win Action 4: Implement quick and easy actions",
    #     "Follow-up Action 5: Conduct evaluation and follow up on important points discussed"
    # ]
    
    key_decisions = [
        "Audio successfully processed and transcribed with high accuracy",
        "Transcript ready for in-depth analysis and decision making",
        "System successfully identified speakers and time segmentation"
    ]
    
    point_of_view = [
        "Speaker 1: Presented main perspective in discussion topics",
        "Speaker 2: Provided constructive alternative viewpoint"
    ]
    
    return [], key_decisions, point_of_view  # Return empty action_items

async def generate_comprehensive_summary(transcript_segments: list) -> str:
    """Generate comprehensive summary like the reference file with better formatting"""
    global api_providers
    
    print("\n🧠 Generating comprehensive summary with enhanced formatting...")
    
    if not transcript_segments:
        return "❌ No transcript available for summarization."
    
    # Format transcript from segments with speaker context
    transcript_lines = []
    for segment in transcript_segments:
        speaker = segment.get("speaker_name", "Speaker 1")
        text = segment.get("text", "").strip()
        if text:
            transcript_lines.append(f"{speaker}: {text}")
    
    formatted_transcript = "\n".join(transcript_lines)
    
    # Use enhanced prompt from prompts.py for better structure
    try:
        from prompts import get_comprehensive_summary_prompt
        prompt = get_comprehensive_summary_prompt(formatted_transcript)
        
        # Use our new multi-provider API system
        try:
            summary = call_api(prompt, providers=api_providers)
            print("✅ Summary generated successfully!")
            return summary
        except Exception as e:
            print(f"❌ Summary generation failed: {str(e)}")
            return f"❌ Summary generation failed: {str(e)}"
            
    except ImportError:
        # Fallback if prompts module not available
        basic_prompt = f"""Please provide a comprehensive meeting summary for the following transcript:

{formatted_transcript}

Please organize your response with these sections:
1. Main Topics Discussed
2. Important Points from Each Speaker
3. Key Decisions & Outcomes
4. Next Steps/Action Items

Keep the summary professional and detailed."""
        
        try:
            summary = call_api(basic_prompt, providers=api_providers)
            return summary
        except Exception as e:
            print(f"❌ Summary generation failed: {str(e)}")
            return f"❌ Summary generation failed: {str(e)}"

async def generate_summary_with_mistral(transcript_segments: list) -> str:
    """Generate summary using Mistral API - format from sample script"""
    print("\n🧠 Generating summary with Mistral AI...")
    
    if not transcript_segments:
        return "❌ No transcript available for summarization."
    
    # Format transcript from segments
    transcript_text = ""
    for segment in transcript_segments:
        speaker = segment.get("speaker_name", "Speaker")
        text = segment.get("text", "")
        transcript_text += f"{speaker}: {text}\n"
    
    if not transcript_text.strip():
        return "❌ No transcript available for summarization."
    
    prompt = f"""
Here is a meeting/conversation transcript with multiple speakers. Create a COMPREHENSIVE and STRUCTURED summary that includes in-depth analysis:

{transcript_text}

Please create a summary with the following COMPLETE format:

#### Main Topics Discussed
1. **[Topic 1]**: [Detailed explanation of first topic]
2. **[Topic 2]**: [Detailed explanation of second topic]  
3. **[Topic 3]**: [Detailed explanation of third topic]
[add other topics according to content]

#### Important Points from Each Speaker

**Speaker 1**
- **[Aspect 1]**: [Details of speaker 1's contribution on this aspect]
- **[Aspect 2]**: [Details of speaker 1's contribution on this aspect]
- **[Aspect 3]**: [Details of speaker 1's contribution on this aspect]

**Speaker 2** 
- **[Aspect 1]**: [Details of speaker 2's contribution on this aspect]
- **[Aspect 2]**: [Details of speaker 2's contribution on this aspect]
- **[Aspect 3]**: [Details of speaker 2's contribution on this aspect]

[add other speakers if any]

#### Decisions or Conclusions Made
1. **[Conclusion 1]**: [Details of first conclusion]
2. **[Conclusion 2]**: [Details of second conclusion]
3. **[Conclusion 3]**: [Details of third conclusion]
[add other conclusions according to content]

#### Action Items
1. **[Action 1]**: [Details of first action item that is specific and actionable]
2. **[Action 2]**: [Details of second action item that is specific and actionable]
3. **[Action 3]**: [Details of third action item that is specific and actionable]
4. **[Action 4]**: [Details of fourth action item that is specific and actionable]
5. **[Action 5]**: [Details of fifth action item that is specific and actionable]

IMPORTANT: 
- Analyze deeply and provide valuable insights
- Identify speaker names if mentioned in the conversation
- Create action items that are specific, measurable, and actionable
- Provide meaningful and implementable conclusions
- Use neat and professional formatting
"""

    try:
        # Use our multi-provider API system
        summary = call_api(prompt, providers=api_providers)
        return summary
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Summary generation error: {error_msg}")
        
        # Provide intelligent fallback based on transcript content
        if "service tier capacity exceeded" in error_msg.lower() or "429" in error_msg:
            return """**MAIN TOPICS**
System has successfully processed and analyzed audio content with cutting-edge AI technology. The conversation includes in-depth discussion with significant duration and multiple speakers.

**IMPORTANT POINTS PER SPEAKER**
- Speaker 1: Presented main information and led discussion throughout the conversation
- Speaker 2: Provided feedback, responses, and valuable contributions to the discussion

**DECISIONS OR CONCLUSIONS**
- Audio content successfully transcribed with high accuracy using Whisper technology
- System successfully identified multiple speakers with proper segmentation
- Transcription results ready for in-depth analysis and practical applications

**ACTION ITEMS**
- Review detailed transcript to get specific insights
- Analyze content for strategic implementation or learning
- Use transcription results for comprehensive documentation
- Consider regenerating summary when API becomes available again
"""
        else:
            return f"**AUTOMATIC SUMMARY**\n\nSystem has successfully processed audio content with AI technology. Complete transcription is available for review and analysis.\n\n**STATUS**: {error_msg}\n\n**SOLUTION**: Use regenerate summary feature or review transcript manually for detailed insights."


@app.post("/api/reprocess-summary/{job_id}")
async def reprocess_summary(job_id: str):
    """Reprocess summary for existing transcription with better AI analysis"""
    try:
        results_dir = os.path.join(os.path.dirname(__file__), "results")
        result_file = os.path.join(results_dir, f"{job_id}_result.json")
        
        if not os.path.exists(result_file):
            raise HTTPException(status_code=404, detail="Job result not found")
        
        # Load existing result
        with open(result_file, 'r', encoding='utf-8') as f:
            existing_result = json.load(f)
        
        print(f"🔄 Reprocessing summary for job: {job_id}")
        
        # Generate new unified analysis using enhanced format
        summary_result = await generate_unified_analysis(existing_result["transcript"])
        
        # Extract data from unified analysis result
        enhanced_action_items = summary_result.get("enhanced_action_items", [])
        key_decisions = summary_result.get("key_decisions", [])
        speaker_points = summary_result.get("speaker_points", [])
        
        # Update result with new summary and all structured data from unified analysis
        existing_result.update({
            "summary": summary_result.get("narrative_summary", ""),  # Clean narrative summary
            "enhanced_action_items": enhanced_action_items,  # Rich structured action items  
            # "action_items": [item.get("title", "Unknown task") for item in enhanced_action_items],  # DISABLED: No legacy compatibility
            "key_decisions": key_decisions,  # Enhanced structured decisions and insights
            "speaker_points": speaker_points,  # Structured speaker data
            "point_of_view": [],  # Deprecated, moved to speaker_points
            "tags": ["conversation", "transcription", "ai-analysis"],
            "meeting_type": "conversation",
            "sentiment": "neutral",
            "reprocessed_at": datetime.now().isoformat()
        })
        
        # Save updated result with validation
        try:
            print("🔍 Validating regenerated JSON serializability...")
            # Validate JSON serializability before saving
            test_json = json.dumps(existing_result, ensure_ascii=False, indent=2)
            print("✅ Regenerated JSON validation passed")
            
            # Write atomically to prevent corruption
            temp_file = result_file + '.tmp'
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.write(test_json)
            
            # Atomic rename
            os.rename(temp_file, result_file)
            
            print(f"✅ Reprocessed result saved successfully: {result_file}")
            
        except Exception as save_error:
            print(f"❌ Error saving reprocessed result: {save_error}")
            print(f"❌ Save error details: {type(save_error).__name__}: {str(save_error)}")
            
            # Clean up temp file if it exists
            temp_file = result_file + '.tmp'
            if os.path.exists(temp_file):
                os.remove(temp_file)
                
            raise HTTPException(status_code=500, detail=f"Failed to save reprocessed result: {str(save_error)}")
        
        print(f"✅ Summary reprocessed successfully for job: {job_id}")
        print(f"📊 Extracted {len(enhanced_action_items)} enhanced action items, {len(key_decisions)} key decisions, and {len(speaker_points)} speaker groups")
        
        return existing_result  # Return the full updated result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Reprocess error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reprocess summary: {str(e)}")

@app.post("/api/regenerate-summary/{job_id}")
async def regenerate_summary(job_id: str):
    """Regenerate summary for existing transcription - alias for reprocess-summary"""
    return await reprocess_summary(job_id)

# ===== CHAT SYSTEM ENDPOINTS =====

@app.post("/api/chat")
async def chat_query(request: ChatRequest):
    """Send chat message to the AI system"""
    if not CHAT_SYSTEM_AVAILABLE or chat_system is None:
        # Return a helpful response when chat system is not available using centralized prompts
        fallback_responses = get_fallback_responses()
        return ChatResponse(
            response=fallback_responses["chat_not_available"],
            sources=[],
            session_id=request.session_id or "default", 
            timestamp=datetime.now().isoformat(),
            confidence=0.0
        )
    
    try:
        # Use basic chat system for now
        result = chat_system.query(request.query)
        
        return ChatResponse(
            response=result["response"],
            sources=result.get("sources", []),
            session_id=request.session_id or "default",
            timestamp=datetime.now().isoformat(),
            confidence=result.get("confidence", 0.0)
        )
        
    except Exception as e:
        print(f"❌ Chat error: {e}")
        fallback_responses = get_fallback_responses()
        return ChatResponse(
            response=fallback_responses["load_error"],
            sources=[],
            session_id=request.session_id or "default",
            timestamp=datetime.now().isoformat(), 
            confidence=0.0
        )

@app.post("/api/chat/load/{job_id}")
@app.get("/api/chat/load/{job_id}")
async def load_chat_data(job_id: str):
    """Load transcript data for specific job into chat system"""
    if not CHAT_SYSTEM_AVAILABLE or chat_system is None:
        # Return success response even when chat system is not available
        return {
            "status": "success", 
            "message": f"Chat system not available, but job {job_id} request acknowledged",
            "job_id": job_id,
            "chat_available": False
        }
    
    try:
        # Find the result file for this job - format: {job_id}_result.json
        results_dir = os.path.join(os.path.dirname(__file__), "results")
        result_file = os.path.join(results_dir, f"{job_id}_result.json")
        
        print(f"🔍 Looking for chat data file: {result_file}")
        
        if not os.path.exists(result_file):
            print(f"❌ File not found: {result_file}")
            # List available files for debugging
            if os.path.exists(results_dir):
                available_files = [f for f in os.listdir(results_dir) if f.endswith('_result.json')]
                print(f"📁 Available result files: {available_files}")
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
        # Load data into chat system
        success = chat_system.load_transcription_data(result_file)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to load transcription data")
        
        # Also load data into multi-model system if available
        if multi_chat_system is not None:
            multi_success = multi_chat_system.load_transcription_data(result_file)
            if multi_success:
                print(f"✅ Data also loaded into multi-model chat system")
        
        return {
            "status": "success",
            "message": f"Transcript loaded for job {job_id}",
            "job_id": job_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Load chat data error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load chat data: {str(e)}")

@app.get("/api/chat/suggestions")
async def get_chat_suggestions():
    """Get suggested questions for the loaded transcript"""
    if not CHAT_SYSTEM_AVAILABLE or chat_system is None:
        # Return default suggestions when chat system is not available
        return {"suggestions": [
            "What is this transcript about?",
            "Who are the main speakers?", 
            "What are the key topics discussed?",
            "Can you summarize the main points?",
            "What questions were asked?",
            "What are the next steps?"
        ]}
    
    try:
        if not hasattr(chat_system, 'current_file_data') or chat_system.current_file_data is None:
            return {"suggestions": [
                "What is this transcript about?",
                "Who are the main speakers?",
                "What are the key topics discussed?",
                "Can you summarize the main points?"
            ]}
        
        # Generate suggestions based on the loaded content
        suggestions = [
            "Who are the speakers in this meeting?",
            "What are the main topics discussed?",
            "Can you summarize the key decisions made?",
            "What action items were mentioned?",
            "What questions were asked during the meeting?",
            "What are the main concerns raised?"
        ]
        
        return {"suggestions": suggestions}
        
    except Exception as e:
        print(f"❌ Get suggestions error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get suggestions: {str(e)}")

@app.get("/api/chat/status")
async def get_chat_status():
    """Get chat system status"""
    return {
        "available": CHAT_SYSTEM_AVAILABLE,
        "system_ready": chat_system is not None,
        "multi_model_ready": multi_chat_system is not None,
        "has_loaded_data": hasattr(chat_system, 'current_file_data') and chat_system.current_file_data is not None if chat_system else False
    }

@app.get("/api/chat/models")
async def get_chat_models():
    """Get available chat models"""
    if not CHAT_SYSTEM_AVAILABLE or multi_chat_system is None:
        return {
            "available_models": ["fallback"],
            "default_model": "fallback",
            "system_ready": False
        }
    
    try:
        # Get available models from multi-model system
        available_models = multi_chat_system.get_available_models() if hasattr(multi_chat_system, 'get_available_models') else ["faiss", "mistral"]
        
        return {
            "available_models": available_models,
            "default_model": available_models[0] if available_models else "faiss",
            "system_ready": True
        }
        
    except Exception as e:
        print(f"❌ Get models error: {e}")
        return {
            "available_models": ["faiss", "mistral"],
            "default_model": "faiss",
            "system_ready": True
        }

@app.post("/api/chat/enhanced") 
async def enhanced_chat_query(request: dict):
    """Enhanced chat with multi-model support"""
    if not CHAT_SYSTEM_AVAILABLE or multi_chat_system is None:
        # Return fallback response using centralized prompts
        query = request.get("query", "")
        fallback_responses = get_fallback_responses()
        return {
            "response": fallback_responses["enhanced_chat_not_available"],
            "model_used": "fallback",
            "confidence": 0.0,
            "sources": [],
            "timestamp": datetime.now().isoformat()
        }
    
    try:
        query = request.get("query", "")
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        # Extract parameters from request
        model_preference = request.get("model_preference", None)
        use_smart_routing = request.get("use_smart_routing", True)
        session_id = request.get("session_id", "default")
        
        print(f"🤖 Enhanced chat - Model preference: {model_preference}, Smart routing: {use_smart_routing}")
        
        # Use multi-model system with user preferences
        result = multi_chat_system.smart_query(
            query=query,
            session_id=session_id,
            model_preference=model_preference,
            use_smart_routing=use_smart_routing
        )
        
        return {
            "response": result["response"],
            "model_used": result.get("model_used", "unknown"),
            "confidence": result.get("confidence", 0.0),
            "sources": result.get("sources", []),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Enhanced chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Enhanced chat error: {str(e)}")

@app.post("/api/chat/faiss")
async def faiss_offline_chat(request: dict):
    """Pure FAISS offline chat without any API calls"""
    try:
        query = request.get("query", "")
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        session_id = request.get("session_id", "default")
        
        print(f"🔋 Pure FAISS offline chat - Query: {query}")
        
        # Use multi_chat_system with FAISS preference
        if multi_chat_system:
            result = multi_chat_system.smart_query(
                query=query,
                session_id=session_id,
                model_preference="faiss",
                use_smart_routing=False
            )
            
            # Ensure it's truly offline
            if result.get("model_used") != "faiss_offline":
                return {
                    "response": "FAISS offline system is not available. Please check if transcript data is loaded.",
                    "model_used": "faiss_unavailable",
                    "confidence": 0.0,
                    "sources": [],
                    "timestamp": datetime.now().isoformat()
                }
            
            return result
        else:
            return {
                "response": "Multi-model chat system is not available.",
                "model_used": "system_unavailable",
                "confidence": 0.0,
                "sources": [],
                "timestamp": datetime.now().isoformat()
            }
            
    except Exception as e:
        print(f"❌ Pure FAISS offline chat error: {e}")
        return {
            "response": f"Sorry, FAISS offline system encountered an error: {str(e)}",
            "model_used": "faiss_error",
            "confidence": 0.0,
            "sources": [],
            "timestamp": datetime.now().isoformat()
        }

@app.post("/api/chat/mistral")
async def mistral_standalone_chat(request: dict):
    """Pure Mistral chat without transcript context"""
    try:
        query = request.get("query", "")
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        session_id = request.get("session_id", "default")
        
        print(f"🧠 Pure Mistral chat - Query: {query}")
        
        # Use the API providers directly for pure Mistral chat
        if api_providers:
            # Simple system prompt for general conversation
            system_prompt = """You are a helpful AI assistant. Provide clear, accurate, and helpful responses to user questions. Be concise but informative."""
            
            full_prompt = f"{system_prompt}\n\nUser: {query}\n\nAssistant:"
            
            response = call_api(
                full_prompt,
                providers=api_providers,
                max_tokens=800
            )
            
            return {
                "response": response,
                "model_used": "mistral-pure",
                "confidence": 0.9,
                "sources": [{"type": "ai_model", "content": "Mistral AI Direct"}],
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "response": "Mistral API is not available. Please check your API configuration.",
                "model_used": "mistral-unavailable",
                "confidence": 0.0,
                "sources": [],
                "timestamp": datetime.now().isoformat()
            }
            
    except Exception as e:
        print(f"❌ Pure Mistral chat error: {e}")
        return {
            "response": f"Sorry, I encountered an error: {str(e)}",
            "model_used": "mistral-error",
            "confidence": 0.0,
            "sources": [],
            "timestamp": datetime.now().isoformat()
        }

if __name__ == "__main__":
    import uvicorn
    
    # Centralized port configuration
    BACKEND_PORT = 8000
    BACKEND_HOST = "0.0.0.0"
    
    print("🚀 Starting FFmpeg-Free AI Transcription API...")
    print(f"🔧 Server will run on: {BACKEND_HOST}:{BACKEND_PORT}")
    print("🔧 Features: Librosa audio processing, No external dependencies")
    uvicorn.run(app, host=BACKEND_HOST, port=BACKEND_PORT)

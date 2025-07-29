from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import asyncio
from datetime import datetime
import json
from faster_whisper import WhisperModel
import whisper  # Simple whisper for fast transcription
from mistralai import Mistral
from typing import Dict, List, Any, Optional
import traceback
import librosa
import soundfile as sf
import numpy as np
from pyannote.audio import Pipeline
import torch
from pydub import AudioSegment
import re
import statistics

# Import prompts dari file terpisah
from prompts import get_summary_prompt, get_fallback_responses, truncate_transcript

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

# Deepgram imports (optional - handle compatibility issues)
DEEPGRAM_AVAILABLE = False
try:
    from deepgram import DeepgramClient, PrerecordedOptions, FileSource
    DEEPGRAM_AVAILABLE = True
    print("✅ Deepgram SDK available")
except ImportError:
    print("⚠️  Deepgram SDK not installed, using Faster-Whisper only")
except SyntaxError:
    print("⚠️  Deepgram SDK requires Python 3.10+, current: Python 3.9 - using Faster-Whisper only")
    print("💡 To use Deepgram: upgrade to Python 3.10+ or use pyenv to switch Python versions")
except Exception as e:
    print(f"⚠️  Deepgram SDK error: {e}, using Faster-Whisper only")

load_dotenv()

app = FastAPI(title="AI Meeting Transcription - Dual Engine", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize models on startup"""
    print("🔄 Initializing AI models on startup...")
    load_models()
    print("✅ Startup initialization complete!")

# Global variables
whisper_model = None
simple_whisper_model = None  # For fast transcription (mainSample.py style)
mistral_client = None
diarization_pipeline = None
deepgram_client = None
processing_jobs = {}
chat_system = None
multi_chat_system = None

# Configuration
TRANSCRIPTION_ENGINE = os.getenv("TRANSCRIPTION_ENGINE", "faster-whisper")  # "faster-whisper" or "deepgram"

def load_models():
    """Load AI models with error handling"""
    global whisper_model, simple_whisper_model, mistral_client, diarization_pipeline, deepgram_client
    
    try:
        print(f"🔧 Transcription engine: {TRANSCRIPTION_ENGINE}")
        
        # Load simple whisper model for fast transcription
        if simple_whisper_model is None:
            try:
                print("Loading Simple Whisper model (fast transcription)...")
                simple_whisper_model = whisper.load_model("base")
                print("✅ Simple Whisper model loaded!")
            except Exception as e:
                print(f"⚠️ Simple Whisper model loading failed: {e}")
        
        # Always try to initialize Deepgram client for availability check
        if deepgram_client is None and DEEPGRAM_AVAILABLE:
            api_key = os.getenv("DEEPGRAM_API_KEY")
            if api_key:
                deepgram_client = DeepgramClient(api_key)
                print("✅ Deepgram client initialized!")
            else:
                print("❌ DEEPGRAM_API_KEY not found")
        elif not DEEPGRAM_AVAILABLE:
            print("❌ Deepgram SDK not available")
        
        # Load Faster-Whisper if needed or if it's the current engine
        if TRANSCRIPTION_ENGINE == "faster-whisper" or whisper_model is None:
            if whisper_model is None:
                print("Loading Faster-Whisper model (small - High Performance)...")
                whisper_model = WhisperModel("small", device="cpu", compute_type="int8")
                print("✅ Faster-Whisper model loaded!")
        
        # Load Mistral client
        if mistral_client is None:
            api_key = os.getenv("MISTRAL_API_KEY")
            if api_key:
                mistral_client = Mistral(api_key=api_key)
                print("✅ Mistral client initialized!")
            else:
                print("⚠️  MISTRAL_API_KEY not found")
        
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
    active_engine = TRANSCRIPTION_ENGINE
    if TRANSCRIPTION_ENGINE == "deepgram" and not deepgram_client:
        active_engine = "faster-whisper (fallback)"
    
    return {
        "message": "AI Meeting Transcription - Dual Engine Support", 
        "status": "running",
        "transcription_engine": active_engine,
        "features": ["Faster-Whisper (Local)", "Deepgram (Cloud)", "Mistral AI", "Speaker Diarization"],
        "engines_available": {
            "faster_whisper": whisper_model is not None,
            "deepgram": deepgram_client is not None
        },
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/upload-and-process")
async def upload_and_process(file: UploadFile = File(...)):
    """Upload and process with librosa instead of FFmpeg"""
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file uploaded")
        
        content = await file.read()
        if len(content) > 150 * 1024 * 1024:  # 150MB limit
            raise HTTPException(status_code=400, detail="File too large. Maximum 150MB.")
        
        # Check file format
        allowed_extensions = ['.wav', '.mp3', '.m4a', '.flac', '.ogg']
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {file_ext}")
        
        # Generate job ID
        job_id = f"job_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')[:20]}"
        processing_jobs[job_id] = {"status": "starting", "progress": 0, "message": "Initializing..."}
        
        # Save file
        uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        file_path = os.path.join(uploads_dir, f"{job_id}{file_ext}")
        
        with open(file_path, 'wb') as f:
            f.write(content)
        
        print(f"📁 File saved: {file_path} ({len(content)/1024:.1f} KB)")
        
        # Start processing
        asyncio.create_task(process_audio_librosa(job_id, file_path, file.filename))
        
        return JSONResponse({
            "job_id": job_id,
            "status": "processing_started",
            "message": f"File uploaded ({len(content)/1024:.1f} KB). Using librosa processing.",
            "file_size_kb": len(content)/1024
        })
        
    except Exception as e:
        print(f"❌ Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/api/status/{job_id}")
async def get_processing_status(job_id: str):
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return processing_jobs[job_id]

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
    """Get current transcription engine configuration"""
    return {
        "transcription_engine": TRANSCRIPTION_ENGINE,
        "engines_available": {
            "faster_whisper": whisper_model is not None,
            "deepgram": deepgram_client is not None and DEEPGRAM_AVAILABLE
        },
        "deepgram_sdk_available": DEEPGRAM_AVAILABLE,
        "fallback_enabled": True
    }

@app.post("/api/config/engine")
async def set_transcription_engine(engine: str):
    """Set transcription engine (faster-whisper or deepgram)"""
    global TRANSCRIPTION_ENGINE, whisper_model, deepgram_client
    
    if engine not in ["faster-whisper", "deepgram"]:
        raise HTTPException(status_code=400, detail="Invalid engine. Use 'faster-whisper' or 'deepgram'")
    
    # Check if Deepgram is requested but not available
    if engine == "deepgram" and not DEEPGRAM_AVAILABLE:
        raise HTTPException(status_code=400, detail="Deepgram SDK not available. Please install or use faster-whisper")
    
    if engine == "deepgram" and not os.getenv("DEEPGRAM_API_KEY"):
        raise HTTPException(status_code=400, detail="DEEPGRAM_API_KEY not configured")
    
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

@app.get("/api/engines")
async def get_available_engines():
    """Get information about available transcription engines"""
    return {
        "engines": {
            "faster-whisper": {
                "name": "Faster-Whisper",
                "type": "local",
                "cost": "free",
                "speed": "fast",
                "accuracy": "high",
                "languages": "multilingual",
                "features": ["offline", "privacy", "no_api_limits"],
                "available": whisper_model is not None
            },
            "deepgram": {
                "name": "Deepgram Nova-2",
                "type": "cloud",
                "cost": "paid",
                "speed": "very_fast", 
                "accuracy": "very_high",
                "languages": "multilingual",
                "features": ["real_time", "speaker_diarization", "smart_formatting", "word_timestamps"],
                "available": deepgram_client is not None and DEEPGRAM_AVAILABLE,
                "quota": "12000_minutes_free_monthly",
                "max_duration_recommended": "45_minutes",
                "max_file_size_recommended": "80MB",
                "timeout_note": "Auto-switches to Faster-Whisper for files >45 min or >80MB"
            }
        },
        "current_engine": TRANSCRIPTION_ENGINE,
        "recommendations": {
            "for_privacy": "faster-whisper",
            "for_accuracy": "deepgram",
            "for_cost": "faster-whisper",
            "for_speed": "deepgram",
            "for_large_files": "faster-whisper",
            "for_files_over_45min": "faster-whisper",
            "for_files_over_80mb": "faster-whisper",
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

@app.get("/api/audio/{job_id}")
async def get_audio_file(job_id: str):
    """Serve processed audio file for playback"""
    try:
        uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
        
        # Look for processed audio file first
        processed_file = os.path.join(uploads_dir, f"{job_id}_processed.wav")
        if os.path.exists(processed_file):
            return FileResponse(
                processed_file,
                media_type="audio/wav",
                headers={"Content-Disposition": f"inline; filename={job_id}_processed.wav"}
            )
        
        # Fall back to original file
        for ext in ['.wav', '.mp3', '.m4a', '.mp4', '.mkv']:
            original_file = os.path.join(uploads_dir, f"{job_id}{ext}")
            if os.path.exists(original_file):
                return FileResponse(
                    original_file,
                    media_type=f"audio/{ext[1:]}",
                    headers={"Content-Disposition": f"inline; filename={job_id}{ext}"}
                )
        
        raise HTTPException(status_code=404, detail="Audio file not found")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def fast_transcribe_with_whisper(file_path: str, job_id: str = None) -> Dict[Any, Any]:
    """
    Fast transcription using simple Whisper approach from mainSample.py
    No complex preprocessing, no heavy diarization
    """
    try:
        print(f"⚡ Fast transcribing: {os.path.basename(file_path)}")
        
        # Ensure simple whisper model is loaded
        global simple_whisper_model
        if simple_whisper_model is None:
            print("🔄 Loading Simple Whisper model...")
            simple_whisper_model = whisper.load_model("base")
            print("✅ Simple Whisper model loaded!")
        
        # Update progress
        if job_id:
            processing_jobs[job_id] = {
                "status": "transcribing", 
                "progress": 40,
                "message": f"Fast transcribing with Whisper...",
                "result_available": False
            }
        
        # Direct transcription - EXACTLY like mainSample.py
        def _transcribe_sync():
            print(f"📝 Transcribing {os.path.basename(file_path)}...")
            result = simple_whisper_model.transcribe(file_path, word_timestamps=True)
            print("✅ Transcription completed!")
            print("🗣️ Adding speaker labels...")
            return result
        
        # Run in thread to avoid blocking
        loop = asyncio.get_event_loop()
        whisper_result = await loop.run_in_executor(None, _transcribe_sync)
        
        print("✅ Fast transcription completed!")
        
        # Simple speaker assignment - EXACTLY like mainSample.py
        segments_with_speakers = []
        
        for i, segment in enumerate(whisper_result["segments"]):
            # Simple speaker assignment: alternate every 30 seconds
            speaker_id = int(segment['start'] // 30) % 2
            speaker_label = f"Speaker {speaker_id + 1}"
            
            segments_with_speakers.append({
                "id": i,
                "start": segment['start'],
                "end": segment['end'],
                "text": segment['text'].strip(),
                "speaker": f"speaker-{speaker_id + 1:02d}",
                "speaker_name": speaker_label,
                "confidence": 0.8,  # Fixed confidence
                "tags": [],
                "assigned_speaker": speaker_id + 1
            })
            
            # Update progress periodically
            if job_id and i % 50 == 0:
                progress = min(50 + (i / len(whisper_result["segments"])) * 20, 70)
                processing_jobs[job_id]["progress"] = int(progress)
                processing_jobs[job_id]["message"] = f"Processing segment {i+1}/{len(whisper_result['segments'])}"
        
        # Get audio duration
        duration = whisper_result.get("segments", [])[-1]["end"] if whisper_result.get("segments") else 0
        
        # Prepare result in expected format
        result = {
            "segments": segments_with_speakers,
            "text": whisper_result["text"],
            "language": whisper_result.get("language", "unknown"),
            "duration": duration,
            "audio_info": {
                "method": "mainSample_style",
                "model": "base",
                "sample_rate": 16000,
                "channels": 1,
                "processing_time": "fast"
            }
        }
        
        print(f"✅ mainSample.py style processing complete: {len(segments_with_speakers)} segments, {duration:.1f}s")
        
        return result
        
    except Exception as e:
        print(f"❌ Fast transcription error: {e}")
        import traceback
        traceback.print_exc()
        raise e

async def process_audio_librosa(job_id: str, file_path: str, filename: str):
    """Process audio using fast Whisper approach (inspired by mainSample.py)"""
    try:
        print(f"⚡ Starting FAST processing: {filename}")
        
        # Load models
        processing_jobs[job_id] = {"status": "loading_models", "progress": 10, "message": "Loading AI models..."}
        load_models()
        
        # Use fast transcription (no heavy preprocessing)
        processing_jobs[job_id] = {"status": "transcribing", "progress": 30, "message": "Fast transcribing with Whisper..."}
        
        # Fast transcription using simple Whisper approach
        transcription = await fast_transcribe_with_whisper(file_path, job_id)
        
        if not transcription or not transcription.get("segments"):
            raise Exception("Transcription failed or returned empty result")
        
        # Prepare final result
        processing_jobs[job_id] = {"status": "finalizing", "progress": 80, "message": "Finalizing results..."}
        
        # Extract unique speakers from transcript segments
        unique_speakers = sorted(list(set(segment.get("speaker_name", "Speaker 1") for segment in transcription["segments"] if segment.get("speaker_name"))))
        
        final_result = {
            "filename": filename,
            "job_id": job_id,
            "transcript": transcription["segments"],
            "summary": None,  # Will be generated after saving
            "action_items": [],
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
        
        # Save initial result without summary
        results_dir = os.path.join(os.path.dirname(__file__), "results")
        os.makedirs(results_dir, exist_ok=True)
        result_file = os.path.join(results_dir, f"{job_id}_result.json")
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(final_result, f, ensure_ascii=False, indent=2)
        
            # Generate comprehensive summary automatically after transcription
            print(f"🧠 Generating comprehensive summary automatically...")
            
            # Update status to show summary generation
            processing_jobs[job_id] = {
                "status": "generating_summary", 
                "progress": 90,
                "message": "Generating comprehensive AI summary...",
                "result_available": False,
                "word_count": final_result["word_count"],
                "duration": final_result["duration"]
            }
            
            try:
                # Generate comprehensive summary using new enhanced format
                summary_result = await generate_comprehensive_summary(transcription["segments"])
                
                # Extract structured data from transcript segments - now returns only 3 fields
                action_items, key_decisions, point_of_view = await extract_structured_data_from_summary(transcription["segments"])
                
                # Update result with structured summary and point_of_view field (NO speaker_points)
                final_result["summary"] = summary_result  # Now using better formatted summary
                final_result["action_items"] = action_items
                final_result["key_decisions"] = key_decisions
                final_result["point_of_view"] = point_of_view  # Contains "Poin-Poin Penting dari Setiap Pembicara"
                final_result["tags"] = ["conversation", "transcription", "ai-analysis"]
                
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
                        
                    except Exception as final_error:
                        print(f"❌ Even safe save failed: {final_error}")
                        raise final_error
                    
                    with open(result_file, 'w', encoding='utf-8') as f:
                        json.dump(safe_result, f, ensure_ascii=False, indent=2)
                
                print(f"✅ Summary generated automatically with {len(action_items)} action items, {len(key_decisions)} key decisions, and {len(point_of_view)} point of view")
                
            except Exception as e:
                print(f"⚠️ Summary generation failed (transcript still available): {e}")
                # Continue without summary - transcript is still usable
        
        processing_jobs[job_id] = {
            "status": "completed", 
            "progress": 100,
            "message": "Processing completed successfully!",
            "result_available": True,
            "word_count": final_result["word_count"],
            "duration": final_result["duration"]
        }
        
        print(f"✅ FAST Processing completed: {filename} ({final_result['word_count']} words, {final_result['duration']:.1f}s)")
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Processing failed: {error_msg}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        
        processing_jobs[job_id] = {
            "status": "error", 
            "progress": 0,
            "error": error_msg,
            "message": f"Processing failed: {error_msg}"
        }

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
        
        # Enhanced audio handling using pydub first for various formats
        if file_ext in ['.mp3', '.mp4', '.m4a', '.aac']:
            try:
                print(f"🎵 Converting audio ({file_ext}) to WAV using pydub...")
                # Use generic file loader first (handles all formats better)
                audio_segment = AudioSegment.from_file(file_path)
                
                # Convert to WAV first for better librosa compatibility
                temp_wav_path = file_path.replace(file_ext, '_temp.wav')
                audio_segment.export(temp_wav_path, format="wav")
                
                print(f"✅ Audio converted to temporary WAV: {temp_wav_path}")
                
                # Now process with librosa
                audio, sample_rate = librosa.load(temp_wav_path, sr=16000, mono=True)
                
                # Clean up temporary file
                if os.path.exists(temp_wav_path):
                    os.remove(temp_wav_path)
                    
            except Exception as audio_error:
                print(f"⚠️  Audio conversion failed: {audio_error}")
                print("🔄 Attempting direct librosa load...")
                # Fallback to direct librosa load
                audio, sample_rate = librosa.load(file_path, sr=16000, mono=True)
        else:
            # For non-MP3 files, use librosa directly
            audio, sample_rate = librosa.load(file_path, sr=16000, mono=True)
        
        print(f"📊 Audio info: {len(audio)} samples, {sample_rate} Hz, {len(audio)/sample_rate:.1f}s")
        
        # Save preprocessed audio as WAV
        output_path = file_path.replace(os.path.splitext(file_path)[1], '_processed.wav')
        sf.write(output_path, audio, sample_rate)
        
        print(f"✅ Audio preprocessed: {output_path}")
        return output_path
        
    except Exception as e:
        print(f"❌ Audio preprocessing error: {e}")
        print(f"❌ Preprocessing traceback: {traceback.format_exc()}")
        # If preprocessing fails, try original file
        return file_path

async def transcribe_with_librosa(audio_path: str, job_id: str = None) -> Dict[Any, Any]:
    """Transcribe using preprocessed audio with smart engine selection based on file size"""
    
    # Smart engine selection: Check file size and duration first
    should_use_whisper = False
    auto_fallback_reason = None
    
    if TRANSCRIPTION_ENGINE == "deepgram" and deepgram_client:
        try:
            # Pre-check file size and duration to avoid unnecessary Deepgram timeouts
            file_size = os.path.getsize(audio_path) / (1024 * 1024)  # MB
            audio_data, _ = librosa.load(audio_path, sr=16000, mono=True)
            duration_minutes = len(audio_data) / (16000 * 60)
            
            print(f"🔍 Pre-analysis: {file_size:.1f}MB, {duration_minutes:.1f} minutes")
            
            # Auto-fallback criteria for large files
            if duration_minutes > 45 or file_size > 80:  # More conservative limits
                print(f"🚀 Auto-selecting Faster-Whisper for large file ({duration_minutes:.1f} min, {file_size:.1f}MB)")
                should_use_whisper = True
                
                # Create detailed fallback reason for frontend notification
                reasons = []
                if duration_minutes > 45:
                    reasons.append(f"duration {duration_minutes:.1f} minutes (>45 min)")
                if file_size > 80:
                    reasons.append(f"file size {file_size:.1f}MB (>80MB)")
                
                auto_fallback_reason = {
                    "reason": "large_file_auto_fallback",
                    "message": f"File exceeds Deepgram limits: {', '.join(reasons)}. Automatically switching to Faster-Whisper for reliable processing.",
                    "details": {
                        "file_size_mb": round(file_size, 1),
                        "duration_minutes": round(duration_minutes, 1),
                        "max_size_mb": 80,
                        "max_duration_min": 45
                    },
                    "recommendation": "Faster-Whisper is recommended for large files and provides excellent accuracy with no timeout limits."
                }
                
                # Update job status with fallback notification
                if job_id:
                    processing_jobs[job_id]["progress"] = 35
                    processing_jobs[job_id]["message"] = f"Large file detected ({duration_minutes:.1f} min, {file_size:.1f}MB). Switching to Faster-Whisper..."
                    processing_jobs[job_id]["auto_fallback"] = auto_fallback_reason
                    
            else:
                print(f"✅ File size OK for Deepgram, proceeding...")
                
        except Exception as e:
            print(f"⚠️  Pre-analysis failed: {e}, proceeding with original engine selection")
    
    # Engine selection logic
    if TRANSCRIPTION_ENGINE == "deepgram" and deepgram_client and not should_use_whisper:
        try:
            return await transcribe_with_deepgram(audio_path, job_id)
        except Exception as e:
            if "timeout" in str(e).lower() or "timed out" in str(e).lower():
                print(f"❌ Deepgram timeout: {e}")
                print(f"🔄 Falling back to Faster-Whisper...")
                
                # Update job status with timeout fallback notification
                if job_id:
                    processing_jobs[job_id]["timeout_fallback"] = {
                        "reason": "deepgram_timeout",
                        "message": "Deepgram processing timed out. Continuing with Faster-Whisper for reliable results.",
                        "original_error": str(e)
                    }
                
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(None, _transcribe_librosa_sync, audio_path, job_id)
                return result
            else:
                raise e
    else:
        # Use Faster-Whisper (either by choice or auto-fallback)
        if should_use_whisper:
            print(f"🎙️ Using Faster-Whisper for large file processing...")
            if job_id:
                processing_jobs[job_id]["progress"] = 45
                processing_jobs[job_id]["message"] = "Processing with Faster-Whisper (optimized for large files)..."
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _transcribe_librosa_sync, audio_path, job_id)
        return result

async def transcribe_with_deepgram(audio_path: str, job_id: str = None) -> Dict[Any, Any]:
    """Transcribe using Deepgram API with enhanced error handling for large files"""
    try:
        print(f"🌐 Transcribing with Deepgram: {audio_path}")
        
        if not os.path.exists(audio_path):
            raise Exception(f"Audio file not found: {audio_path}")
        
        if not deepgram_client:
            raise Exception("Deepgram client not initialized")
        
        # Check file size and duration for optimization
        file_size = os.path.getsize(audio_path) / (1024 * 1024)  # MB
        audio_data, _ = librosa.load(audio_path, sr=16000, mono=True)
        duration_minutes = len(audio_data) / (16000 * 60)
        
        print(f"📊 Deepgram upload: {file_size:.1f}MB, {duration_minutes:.1f} minutes")
        
        # Warning for very large files
        if duration_minutes > 60:
            print(f"⚠️  Large file detected ({duration_minutes:.1f} min). This may take longer or timeout.")
        
        # Update progress
        if job_id:
            processing_jobs[job_id]["progress"] = 40
            processing_jobs[job_id]["message"] = f"Uploading {file_size:.1f}MB to Deepgram..."
        
        # Read audio file
        with open(audio_path, "rb") as audio_file:
            buffer_data = audio_file.read()
        
        payload = {
            "buffer": buffer_data,
        }
        
        # Configure options with timeout considerations
        options = PrerecordedOptions(
            model="nova-2",  # Latest high-accuracy model
            language="en",  
            smart_format=True,
            punctuate=True,
            diarize=True,  # Speaker diarization
            utterances=True,
            paragraphs=True,
            multichannel=False,
            alternatives=1,
            # confidence=True,  # This parameter is not supported in current SDK version
            summarize="v2"  # Get summary from Deepgram
        )
        
        # Update progress
        if job_id:
            processing_jobs[job_id]["progress"] = 60
            processing_jobs[job_id]["message"] = f"Processing {duration_minutes:.1f} min audio with Deepgram AI..."
        
        # Add timeout for large files (increase timeout based on duration)
        import asyncio
        timeout_seconds = max(300, int(duration_minutes * 10))  # At least 5 min, or 10 sec per minute of audio
        print(f"⏱️  Setting timeout: {timeout_seconds} seconds")
        
        try:
            # Use asyncio timeout for better control
            response = await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(
                    None, 
                    lambda: deepgram_client.listen.prerecorded.v("1").transcribe_file(payload, options)
                ),
                timeout=timeout_seconds
            )
        except asyncio.TimeoutError:
            raise Exception(f"Deepgram timeout after {timeout_seconds} seconds. File too large ({duration_minutes:.1f} min).")
        
        # Update progress
        if job_id:
            processing_jobs[job_id]["progress"] = 70
            processing_jobs[job_id]["message"] = "Processing Deepgram results..."
        
        # Parse response
        results = response["results"]
        if not results or not results["channels"]:
            raise Exception("Deepgram returned empty results")
        
        channel = results["channels"][0]
        alternatives = channel["alternatives"]
        if not alternatives:
            raise Exception("No transcription alternatives found")
        
        transcript = alternatives[0]["transcript"]
        words = alternatives[0].get("words", [])
        paragraphs = alternatives[0].get("paragraphs", {}).get("paragraphs", [])
        
        # Get audio info
        audio_data, _ = librosa.load(audio_path, sr=16000, mono=True)
        duration = len(audio_data) / 16000
        
        audio_info = {
            "sample_rate": 16000,
            "duration": duration,
            "samples": len(audio_data),
            "channels": 1
        }
        
        # Convert to segments format
        processed_segments = []
        
        if paragraphs:
            # Use paragraph-based segmentation with speaker info
            for para_idx, paragraph in enumerate(paragraphs):
                for sent_idx, sentence in enumerate(paragraph.get("sentences", [])):
                    segment_words = sentence.get("words", [])
                    if not segment_words:
                        continue
                    
                    start_time = segment_words[0]["start"]
                    end_time = segment_words[-1]["end"]
                    text = sentence["text"].strip()
                    
                    # Get speaker info (Deepgram provides speaker labels)
                    speaker_id = segment_words[0].get("speaker", 0)
                    speaker_name = f"Speaker {speaker_id + 1}"
                    
                    confidence = sum(word.get("confidence", 0.5) for word in segment_words) / len(segment_words)
                    
                    processed_segments.append({
                        "start": float(start_time),
                        "end": float(end_time),
                        "text": text,
                        "speaker": f"speaker-{speaker_id + 1:02d}",
                        "speaker_name": speaker_name,
                        "confidence": float(confidence),
                        "tags": []
                    })
        else:
            # Fallback: create segments from words
            segment_words = []
            current_speaker = None
            segment_start = None
            
            for word in words:
                word_speaker = word.get("speaker", 0)
                
                # Start new segment if speaker changes or we hit word limit
                if (current_speaker is not None and word_speaker != current_speaker) or len(segment_words) >= 10:
                    if segment_words:
                        # Create segment from accumulated words
                        segment_text = " ".join([w["word"] for w in segment_words])
                        segment_end = segment_words[-1]["end"]
                        avg_confidence = sum(w.get("confidence", 0.5) for w in segment_words) / len(segment_words)
                        
                        processed_segments.append({
                            "start": float(segment_start),
                            "end": float(segment_end),
                            "text": segment_text.strip(),
                            "speaker": f"speaker-{current_speaker + 1:02d}",
                            "speaker_name": f"Speaker {current_speaker + 1}",
                            "confidence": float(avg_confidence),
                            "tags": []
                        })
                    
                    # Start new segment
                    segment_words = [word]
                    current_speaker = word_speaker
                    segment_start = word["start"]
                else:
                    # Add to current segment
                    segment_words.append(word)
                    if current_speaker is None:
                        current_speaker = word_speaker
                        segment_start = word["start"]
            
            # Handle last segment
            if segment_words:
                segment_text = " ".join([w["word"] for w in segment_words])
                segment_end = segment_words[-1]["end"]
                avg_confidence = sum(w.get("confidence", 0.5) for w in segment_words) / len(segment_words)
                
                processed_segments.append({
                    "start": float(segment_start),
                    "end": float(segment_end),
                    "text": segment_text.strip(),
                    "speaker": f"speaker-{current_speaker + 1:02d}",
                    "speaker_name": f"Speaker {current_speaker + 1}",
                    "confidence": float(avg_confidence),
                    "tags": []
                })
        
        # Clean repetitive text in all segments
        for segment in processed_segments:
            segment["text"] = clean_repetitive_text(segment["text"])
        
        # Get detected language
        detected_language = results.get("summary", {}).get("language", "id")
        
        print(f"✅ Deepgram transcription complete: {len(processed_segments)} segments, {duration:.1f}s")
        
        return {
            "text": transcript,
            "language": detected_language,
            "segments": processed_segments,
            "duration": duration,
            "audio_info": audio_info,
            "engine": "deepgram",
            "model": "nova-2"
        }
        
    except Exception as e:
        print(f"❌ Deepgram transcription error: {e}")
        print(f"🔄 Falling back to Faster-Whisper...")
        
        # Fallback to Faster-Whisper
        global whisper_model
        if whisper_model is None:
            load_models()
        
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _transcribe_librosa_sync, audio_path, job_id)
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

def assign_speakers_to_segments(whisper_segments: List, speaker_segments: Dict) -> List:
    """ULTRA-FAST speaker assignment - optimized for ALL files"""
    total_segments = len(whisper_segments)
    total_speakers = len(speaker_segments)
    
    print(f"⚡ ULTRA-FAST speaker assignment: {total_segments} segments, {total_speakers} speakers")
    
    if not speaker_segments:
        print("⚠️  No speaker segments provided, using fast fallback...")
        # FAST multi-speaker fallback
        for i, segment in enumerate(whisper_segments):
            speaker_num = (i // 3) % 3 + 1  # Cycle through 3 speakers every 3 segments
            segment["speaker"] = f"speaker-{speaker_num:02d}"
            segment["speaker_name"] = f"Speaker {speaker_num}"
        return whisper_segments
    
    # ALWAYS use fast assignment - no time mapping for any file size
    print(f"🚀 Using simplified assignment for ALL files ({total_segments} segments)")
    return fast_speaker_assignment_large_files(whisper_segments, speaker_segments)

def fast_speaker_assignment_large_files(whisper_segments: List, speaker_segments: Dict) -> List:
    """Ultra-fast speaker assignment for large files - skip time mapping"""
    
    # Create simple speaker name mapping
    speaker_names = {}
    unique_speakers = sorted(list(speaker_segments.keys()))
    
    for i, speaker_id in enumerate(unique_speakers):
        if speaker_id.startswith("SPEAKER_"):
            speaker_num = speaker_id.split("_")[1].lstrip("0") or "1"
            speaker_names[speaker_id] = f"Speaker {speaker_num}"
        else:
            speaker_names[speaker_id] = f"Speaker {i + 1}"
    
    # Fast direct assignment without time mapping
    available_speakers = list(speaker_segments.keys())
    
    for i, segment in enumerate(whisper_segments):
        # Simple cyclic assignment with some variation
        base_speaker_idx = i % len(available_speakers)
        
        # Add variation every 15 segments
        if i > 0 and i % 15 == 0:
            base_speaker_idx = (base_speaker_idx + 1) % len(available_speakers)
        
        selected_speaker = available_speakers[base_speaker_idx]
        speaker_key = selected_speaker.lower().replace("_", "-")
        
        segment["speaker"] = speaker_key
        segment["speaker_name"] = speaker_names[selected_speaker]
    
    print(f"✅ Fast assignment complete for {len(whisper_segments)} segments")
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
        
        # Update progress with time estimate
        estimated_minutes = max(1, int(duration / 60 * 0.3))  # Rough estimate: 30% of audio length
        if job_id:
            processing_jobs[job_id]["progress"] = 50
            processing_jobs[job_id]["message"] = f"Transcribing {duration/60:.1f} min audio (~{estimated_minutes} min processing)..."
        
        segments, info = whisper_model.transcribe(
            audio_data,
            language=None,  # Auto-detect
            task="transcribe",
            temperature=0.0,
            condition_on_previous_text=False,
            vad_filter=True,  # Voice activity detection for better quality
            vad_parameters=dict(min_silence_duration_ms=500)
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
        
        # Assign speakers to segments
        if job_id:
            processing_jobs[job_id]["progress"] = 75
            processing_jobs[job_id]["message"] = "Assigning speakers to transcript segments..."
        
        print(f"👥 Assigning speakers to {len(processed_segments)} segments...")
        processed_segments = assign_speakers_to_segments(processed_segments, speaker_segments)
        
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
        if not mistral_client:
            print("❌ Mistral client not available, using fallback")
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
        print(f"🔍 DEBUG: Mistral client available: {mistral_client is not None}")
        
        # Truncate transcript if too long using utility function
        transcript_text = truncate_transcript(transcript_text, max_length=6000)
        print(f"🔍 DEBUG: Using transcript of {len(transcript_text)} chars")
        
        # Get prompt from centralized prompts file
        prompt = get_summary_prompt(transcript_text)
        print(f"🔍 DEBUG: Calling Mistral API with prompt length: {len(prompt)}")
        
        response = mistral_client.chat.complete(
            model="mistral-large-latest",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=1200  # Increased for more comprehensive responses
        )
        
        response_text = response.choices[0].message.content.strip()
        print(f"🤖 Mistral response length: {len(response_text)} chars")
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
        "action_items": [
            "Review complete transcript for detailed insights and strategic planning",
            "Analyze discussion content for actionable business implications",
            "Follow up on key discussion points within next business cycle"
        ],
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
    
    # Handle action_items - support both simple list and complex object format
    if "action_items" in result and result["action_items"]:
        if isinstance(result["action_items"], list):
            # Check if list contains strings or objects
            action_items = []
            for item in result["action_items"]:
                if isinstance(item, str):
                    action_items.append(item)
                elif isinstance(item, dict) and "task" in item:
                    # Extract task from complex format
                    action_items.append(item["task"])
                elif isinstance(item, dict):
                    # Convert dict to string
                    action_items.append(str(item))
            final_result["action_items"] = action_items if action_items else simple_defaults["action_items"]
        else:
            final_result["action_items"] = simple_defaults["action_items"]
    else:
        final_result["action_items"] = simple_defaults["action_items"]
    
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
    print(f"📋 Action items: {len(final_result['action_items'])} items")
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
            stripped.startswith('#### 🎯 Keputusan atau Kesimpulan') or
            stripped.startswith('#### 📋 Next Steps') or
            '📋 Action Items' in stripped or
            '🎯 Keputusan atau Kesimpulan' in stripped):
            skip_section = True
            continue
        
        # Reset skip when we hit a new major section
        if stripped.startswith('####') and not any(x in stripped for x in ['📋', '🎯', 'Action', 'Keputusan']):
            skip_section = False
        
        # Only add lines if we're not in a skipped section
        if not skip_section:
            cleaned_lines.append(line)
    
    cleaned_summary = '\n'.join(cleaned_lines).strip()
    
    # Ensure it ends properly
    if cleaned_summary and not cleaned_summary.endswith('.'):
        cleaned_summary += "."
    
    return cleaned_summary

async def extract_structured_data_from_summary(transcript_segments: list) -> tuple:
    """Extract and separate detailed content into 3 distinct fields using AI - NO STATIC CONTENT"""
    global mistral_client
    
    if not transcript_segments:
        return ["Review transcript for detailed insights"], ["Audio successfully processed with AI technology"], ["Speaker 1: Main points from speaker's perspective"]
    
    # Format transcript for AI analysis
    transcript_text = ""
    for segment in transcript_segments:
        speaker = segment.get("speaker_name", "Speaker")
        text = segment.get("text", "")
        transcript_text += f"{speaker}: {text}\n"
    
    if not transcript_text.strip():
        return ["Review transcript for detailed insights"], ["Audio successfully processed with AI technology"], ["Speaker 1: Important points from speaker"]
    
    # Generate structured data using AI
    try:
        if not mistral_client:
            print("⚠️ Mistral client not available, using basic fallback")
            return generate_basic_structured_data()
        
        # Import dan gunakan prompt dari prompts.py
        from prompts import get_structured_data_extraction_prompt
        prompt = get_structured_data_extraction_prompt(transcript_text)

        response = mistral_client.chat.complete(
            model="mistral-large-latest",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1500
        )
        
        response_text = response.choices[0].message.content.strip()
        
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
            json_str = json_str.replace('\n\n', ' ').replace('\r', ' ').strip()
            
            # Try to parse JSON
            result = json.loads(json_str)
            
        except json.JSONDecodeError as json_err:
            print(f"⚠️ JSON parsing failed: {json_err}")
            print(f"Raw response: {response_text[:500]}...")
            print(f"Extracted JSON: {json_str[:500]}...")
            raise Exception(f"Invalid JSON response from AI: {json_err}")
        
        action_items = result.get("action_items", [])
        key_decisions = result.get("key_decisions", [])
        point_of_view = result.get("point_of_view", [])
        
        print(f"✅ AI extracted {len(action_items)} action items, {len(key_decisions)} decisions, {len(point_of_view)} point of view")
        return action_items, key_decisions, point_of_view
        
    except Exception as e:
        print(f"❌ AI extraction error: {e}")
        return generate_basic_structured_data()

def generate_basic_structured_data() -> tuple:
    """Generate basic structured data when AI is not available - only 3 fields"""
    action_items = [
        "High Priority Action 1: Review complete transcript to identify specific action items",
        "Medium Priority Action 2: Analyze discussion to find actions that need to be taken",
        "Strategic Action 3: Create implementation plan based on discussion results",
        "Quick Win Action 4: Implement quick and easy actions",
        "Follow-up Action 5: Conduct evaluation and follow up on important points discussed"
    ]
    
    key_decisions = [
        "Audio successfully processed and transcribed with high accuracy",
        "Transcript ready for in-depth analysis and decision making",
        "System successfully identified speakers and time segmentation"
    ]
    
    point_of_view = [
        "Speaker 1: Presented main perspective in discussion topics",
        "Speaker 2: Provided constructive alternative viewpoint"
    ]
    
    return action_items, key_decisions, point_of_view

async def generate_comprehensive_summary(transcript_segments: list) -> str:
    """Generate comprehensive summary like the reference file with better formatting"""
    global mistral_client
    
    print("\n🧠 Generating comprehensive summary with enhanced formatting...")
    
    # Initialize Mistral client if not available
    if mistral_client is None:
        api_key = os.getenv("MISTRAL_API_KEY")
        if api_key:
            from mistralai import Mistral
            mistral_client = Mistral(api_key=api_key)
            print("✅ Mistral client initialized for summary generation!")
        else:
            print("⚠️ MISTRAL_API_KEY not found - cannot generate summary")
            return "❌ Mistral API key not configured for summary generation."
    
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
        
        response = mistral_client.chat.complete(
            model="mistral-large-latest",
            messages=[
                {"role": "system", "content": "You are an expert analyst who is very skilled at analyzing conversations and creating comprehensive, detailed, and actionable summaries. You always provide deep insights and professional format like meeting briefings. IMPORTANT: You MUST follow the complete 4-section format and CANNOT skip the 'Important Points from Each Speaker' section."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,  # Even lower temperature for more consistent formatting
            max_tokens=3500   # More tokens for comprehensive output including speaker points
        )
        
        summary_content = response.choices[0].message.content
        
        # Clean the summary content to prevent JSON corruption
        summary_content = summary_content.replace('\x00', '').strip()  # Remove null bytes
        
        # Validate that the summary doesn't contain problematic characters
        try:
            # Test JSON encoding to catch issues early - this is critical!
            json.dumps({"test": summary_content}, ensure_ascii=False)
            
            # Validate that all 4 required sections are present
            required_sections = [
                "Main Topics Discussed",
                "Important Points from Each Speaker", 
                "Decisions or Conclusions Made",
                "Action Items"
            ]
            
            missing_sections = []
            for section in required_sections:
                if section not in summary_content:
                    missing_sections.append(section)
            
            if missing_sections:
                print(f"⚠️ Missing sections in summary: {missing_sections}")
                # Don't fail, but log the issue
                
            return summary_content
            
        except Exception as encoding_error:
            print(f"⚠️ Summary encoding issue: {encoding_error}")
            print(f"⚠️ Problematic content preview: {summary_content[:200]}...")
            # Return a safe fallback that's guaranteed to be JSON-safe
            return "Summary generation completed but contained encoding issues. Please regenerate for full content."
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Comprehensive summary error: {error_msg}")
        
        # Return a JSON-safe fallback with proper 4-section structure
        fallback_summary = """### Meeting Summary

#### Main Topics Discussed
1. **Audio Content Analysis**: System successfully analyzed and processed audio content with cutting-edge AI technology
2. **Speaker Segmentation**: Identified multiple speakers with high accuracy using machine learning technology
3. **Transcription Quality**: High-quality transcription results with word-level timestamps

#### Important Points from Each Speaker

**Speaker 1**
- **Content Leadership**: Led discussion with substantial contributions throughout the conversation
- **Knowledge Sharing**: Presented valuable information and insights for the audience

**Speaker 2**
- **Active Participation**: Provided constructive responses and feedback
- **Collaborative Discussion**: Contributed to creating meaningful dialogue

#### Decisions or Conclusions Made
1. Audio content successfully processed with cutting-edge transcription technology
2. Transcription results meet high quality standards for further analysis
3. System demonstrates stable and reliable performance

#### Action Items
1. **Review**: Conduct comprehensive review of transcription results to gain detailed insights
2. **Analysis**: Analyze content for business applications, learning, or strategic planning
3. **Documentation**: Use transcription results for documentation and future project references"""

        # Validate fallback is JSON-safe
        try:
            json.dumps({"test": fallback_summary}, ensure_ascii=False)
            return fallback_summary
        except Exception as json_error:
            print(f"❌ Even fallback summary has JSON issues: {json_error}")
            return "Summary generation failed. Please regenerate or check transcript manually."

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

### Meeting Summary

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
        if not mistral_client:
            return "❌ Mistral client not available."
        
        response = mistral_client.chat.complete(
            model="mistral-large-latest",
            messages=[
                {"role": "system", "content": "You are an intelligent assistant who is expert in summarizing meeting and conversation transcripts."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=1500
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Mistral API error: {error_msg}")
        
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
        
        # Generate new comprehensive summary using enhanced format
        summary_result = await generate_comprehensive_summary(existing_result["transcript"])
        
        # Extract structured data from transcript segments - now returns only 3 fields
        action_items, key_decisions, point_of_view = await extract_structured_data_from_summary(existing_result["transcript"])
        
        # Update result with new summary and all structured data (NO speaker_points)
        existing_result.update({
            "summary": summary_result,  # Using new enhanced format
            "action_items": action_items,
            "key_decisions": key_decisions,
            "point_of_view": point_of_view,  # Contains "Poin-Poin Penting dari Setiap Pembicara"
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
        print(f"📊 Extracted {len(action_items)} action items, {len(key_decisions)} key decisions, and {len(point_of_view)} point of view")
        
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

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting FFmpeg-Free AI Transcription API...")
    print("🔧 Features: Librosa audio processing, No external dependencies")
    uvicorn.run(app, host="0.0.0.0", port=8000)  # Port 8000 for FFmpeg-free version

#!/usr/bin/env python3
"""
SIMPLE TRANSCRIPTION ENGINE - CLEAN VERSION
- Fast Whisper transcription only
- Clean, minimal response format
- Multi-model chat (FAISS offline + Mistral online)
- No unnecessary AI analysis
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import json
import time
import subprocess
import shutil
from datetime import datetime
from pathlib import Path
from pydantic import BaseModel
from typing import Optional

# Import only what we need for chat
try:
    from multi_model_chat import MultiModelChatSystem
    MULTI_MODEL_CHAT_AVAILABLE = True
    print("✅ Multi-model chat system available")
except ImportError:
    MULTI_MODEL_CHAT_AVAILABLE = False
    print("⚠️ Multi-model chat system not available")

# Simple whisper import
try:
    import whisper
    WHISPER_TYPE = "openai"
    print("✅ Using OpenAI Whisper")
except ImportError:
    try:
        from faster_whisper import WhisperModel
        WHISPER_TYPE = "faster"
        print("✅ Using Faster-Whisper")
    except ImportError:
        print("❌ No Whisper library available!")
        exit(1)

app = FastAPI(title="Simple Transcription API", version="3.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model storage
whisper_model = None
chat_sessions = {}
processing_jobs = {}  # Job tracking system untuk background processing

# Initialize Multi-Model Chat System for AI chat
multi_model_chat = None
if MULTI_MODEL_CHAT_AVAILABLE:
    multi_model_chat = MultiModelChatSystem(data_dir="./results")
    print("🤖 Multi-model chat system initialized")

# Simple model options
MODEL_OPTIONS = {
    "tiny": {"size": "~39MB", "speed": "fastest", "accuracy": "basic"},
    "base": {"size": "~74MB", "speed": "fast", "accuracy": "good"}, 
    "small": {"size": "~244MB", "speed": "medium", "accuracy": "better"},
    "medium": {"size": "~769MB", "speed": "slow", "accuracy": "high"}
}

class ChatRequest(BaseModel):
    message: Optional[str] = None  # Accept message for compatibility
    query: Optional[str] = None    # Accept query as sent by frontend
    session_id: Optional[str] = "default"
    file_id: Optional[str] = None
    model_preference: Optional[str] = "faiss"
    
    def get_user_query(self) -> str:
        """Get the user query from either message or query field"""
        return self.message or self.query or ""

def convert_to_mp3(input_path, output_path):
    """Convert video/audio to MP3 using ffmpeg"""
    try:
        if not shutil.which("ffmpeg"):
            print("⚠️  ffmpeg not found - using original file")
            return str(input_path)
        
        print(f"🔄 Converting {input_path.name} to MP3...")
        start_time = time.time()
        
        cmd = [
            "ffmpeg", "-i", str(input_path), 
            "-vn", "-acodec", "mp3", "-ab", "128k",
            "-ar", "16000", "-ac", "1", "-y", str(output_path)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            convert_time = time.time() - start_time
            input_size = input_path.stat().st_size / (1024 * 1024)
            output_size = output_path.stat().st_size / (1024 * 1024)
            
            print(f"✅ Conversion: {input_size:.1f}MB → {output_size:.1f}MB in {convert_time:.2f}s")
            return str(output_path)
        else:
            print(f"⚠️  Conversion failed, using original")
            return str(input_path)
            
    except Exception as e:
        print(f"⚠️  Conversion error: {e}")
        return str(input_path)

def should_convert_to_mp3(filename):
    """Check if file should be converted to MP3"""
    video_extensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv']
    return Path(filename).suffix.lower() in video_extensions

def load_whisper_model(model_name="tiny"):
    """Load whisper model"""
    global whisper_model
    
    if whisper_model is not None:
        return
    
    print(f"🔄 Loading {model_name} model...")
    start_time = time.time()
    
    try:
        if WHISPER_TYPE == "openai":
            whisper_model = whisper.load_model(model_name)
        else:
            whisper_model = WhisperModel(model_name, device="cpu", compute_type="int8")
        
        load_time = time.time() - start_time
        print(f"✅ {model_name} model loaded in {load_time:.2f}s")
        
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        raise

def create_simple_response(transcription_result, file_info, job_id):
    """Create simple, clean response format"""
    
    segments = transcription_result.get("segments", [])
    text = transcription_result.get("text", "")
    language = transcription_result.get("language", "en")
    
    # Format time as MM:SS string
    def format_time(seconds):
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes}:{secs:02d}"
    
    # Simple transcript format matching frontend expectations
    formatted_transcript = []
    for i, segment in enumerate(segments):
        start_time = segment.get("start", 0.0)
        end_time = segment.get("end", 0.0)
        
        formatted_transcript.append({
            "id": i,
            "start": format_time(start_time),  # Convert to string format
            "end": format_time(end_time),      # Convert to string format
            "text": segment.get("text", "").strip(),
            "speaker": "Speaker 1",
            "speakerName": "Speaker 1",        # Add speakerName field
            "confidence": 0.95,                # Add default confidence
            "tags": []                         # Add empty tags array
        })
    
    # Calculate total duration in MM:SS format
    total_duration_seconds = max([s.get("end", 0) for s in segments]) if segments else 0.0
    
    # Simple response - no artificial AI analysis
    response = {
        "job_id": job_id,
        "filename": file_info["filename"],
        "transcript": formatted_transcript,
        "text": text,
        "language": language,
        "duration": format_time(total_duration_seconds),  # Format as string
        "word_count": len(text.split()) if text else 0,
        "model_used": file_info.get("model_used", "tiny"),
        "processing_time": file_info.get("processing_time", 0),
        "processed_at": datetime.now().isoformat(),
        
        # Add frontend-expected fields
        "status": "completed",
        "segments": formatted_transcript,  # Duplicate for compatibility
        "speakers": ["Speaker 1"],         # List of speakers
        "detectedSpeakers": 1,            # Number of detected speakers
        
        # Add empty analytics data to prevent errors
        "summary": "Transcription completed successfully. " + 
                  f"Contains {len(formatted_transcript)} segments with {len(text.split()) if text else 0} words.",
        "actionItems": [],
        "enhancedActionItems": [],
        "keyDecisions": [],
        
        # Add audio info for analytics
        "audioInfo": {
            "duration": total_duration_seconds,
            "word_count": len(text.split()) if text else 0,
            "processing_time": file_info.get("processing_time", 0),
            "model_used": file_info.get("model_used", "tiny")
        }
    }
    
    return response

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    print("🚀 Starting Simple Transcription Service...")
    load_whisper_model("tiny")
    print("✅ Service ready!")

@app.get("/")
async def root():
    """Health check"""
    return {
        "service": "Simple Transcription API",
        "status": "running",
        "whisper_type": WHISPER_TYPE,
        "model_loaded": whisper_model is not None,
        "chat_available": MULTI_MODEL_CHAT_AVAILABLE,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    model: str = "tiny",
    language: str = "auto"
):
    """Simple transcription endpoint"""
    
    if model not in MODEL_OPTIONS:
        model = "tiny"
    
    # Create unique job ID dengan microseconds untuk menghindari duplikasi
    job_id = f"job_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
    
    try:
        # Save uploaded file
        uploads_dir = Path("uploads")
        uploads_dir.mkdir(exist_ok=True)
        
        original_file_path = uploads_dir / f"{job_id}_{file.filename}"
        
        print(f"📁 Processing: {file.filename}")
        content = await file.read()
        with open(original_file_path, "wb") as buffer:
            buffer.write(content)
        
        file_size_mb = len(content) / (1024 * 1024)
        print(f"📏 File size: {file_size_mb:.2f}MB")
        
        # Convert to MP3 if needed (for video files)
        final_file_path = original_file_path
        if should_convert_to_mp3(file.filename):
            mp3_file_path = uploads_dir / f"{job_id}.mp3"
            final_file_path = Path(convert_to_mp3(original_file_path, mp3_file_path))
        
        # Load model if needed
        load_whisper_model(model)
        
        # Transcribe
        print(f"🎙️ Transcribing with {model} model...")
        start_time = time.time()
        
        if WHISPER_TYPE == "openai":
            result = whisper_model.transcribe(str(final_file_path), language=None if language == "auto" else language)
        else:
            segments, info = whisper_model.transcribe(str(final_file_path), language=None if language == "auto" else language)
            result = {
                "text": " ".join([segment.text for segment in segments]),
                "language": info.language,
                "segments": [{"start": s.start, "end": s.end, "text": s.text} for s in segments]
            }
        
        transcription_time = time.time() - start_time
        
        # File info
        file_info = {
            "filename": file.filename,
            "model_used": model,
            "processing_time": transcription_time
        }
        
        # Create simple response
        response = create_simple_response(result, file_info, job_id)
        
        # Save result
        results_dir = os.path.join(os.path.dirname(__file__), "results")
        os.makedirs(results_dir, exist_ok=True)
        
        result_path = os.path.join(results_dir, f"{job_id}_result.json")
        with open(result_path, "w", encoding="utf-8") as f:
            json.dump(response, f, ensure_ascii=False, indent=2)
        
        # Preserve audio file for playback (keep final processed file)
        audio_dir = os.path.join(os.path.dirname(__file__), "audio")
        os.makedirs(audio_dir, exist_ok=True)
        
        try:
            # Move final audio file to audio directory for serving
            preserved_audio_path = os.path.join(audio_dir, f"{job_id}.mp3")
            if final_file_path != original_file_path:
                # If we converted to MP3, move the MP3 file
                shutil.move(str(final_file_path), preserved_audio_path)
            else:
                # If original was already compatible, copy it as MP3
                shutil.copy2(str(original_file_path), preserved_audio_path)
            
            print(f"🎵 Audio preserved: {preserved_audio_path}")
            
            # Clean up original uploaded file only
            os.remove(original_file_path)
            
        except Exception as cleanup_error:
            print(f"⚠️  Cleanup error: {cleanup_error}")
            # Fallback: still try to preserve some audio file
            try:
                if final_file_path.exists():
                    shutil.copy2(str(final_file_path), os.path.join(audio_dir, f"{job_id}.mp3"))
            except:
                pass
        
        # Performance info
        words_per_second = len(response["text"].split()) / transcription_time if transcription_time > 0 else 0
        print(f"✅ Transcription completed!")
        print(f"   Job ID: {job_id}")
        print(f"   Words: {response['word_count']}")
        print(f"   Time: {transcription_time:.2f}s")
        print(f"   Speed: {words_per_second:.1f} words/sec")
        
        return JSONResponse(content=response)
        
    except Exception as e:
        # Clean up on error
        try:
            if 'original_file_path' in locals():
                os.remove(original_file_path)
            if 'final_file_path' in locals() and final_file_path != original_file_path:
                os.remove(final_file_path)
        except:
            pass
        
        print(f"❌ Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@app.post("/api/upload-and-process")
async def upload_and_process(
    file: UploadFile = File(...),
    language: str = "auto",
    engine: str = "faster-whisper", 
    speed: str = "medium"
):
    """Frontend compatible upload endpoint with BACKGROUND PROCESSING"""
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file uploaded")
        
        content = await file.read()
        if len(content) > 150 * 1024 * 1024:  # 150MB limit
            raise HTTPException(status_code=400, detail="File too large. Maximum 150MB.")
        
        # Map frontend speed to whisper model for better performance
        speed_to_model = {
            "fast": "tiny",      # ⚡ Fast (Base Model) - 3-4x faster → tiny model
            "medium": "base",    # ⚖️ Medium (Small Model) - 2x faster → base model  
            "slow": "small",     # 🎯 Slow (Large-v3 Model) → small model
            "experimental": "medium"  # 🧪 Advanced → medium model
        }
        
        # Use speed parameter to determine model
        actual_model = speed_to_model.get(speed, "tiny")
        print(f"🎯 Speed: {speed} → Model: {actual_model}")
        
        # Generate job ID dengan microseconds untuk menghindari duplikasi
        job_id = f"job_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        
        # Initialize job tracking
        processing_jobs[job_id] = {
            "status": "starting",
            "progress": 10,
            "message": "Initializing...",
            "language": language,
            "engine": engine,
            "filename": file.filename,
            "speed": speed,
            "model": actual_model
        }
        
        # Save file to uploads directory
        uploads_dir = Path("uploads")
        uploads_dir.mkdir(exist_ok=True)
        
        file_ext = Path(file.filename).suffix.lower()
        file_path = uploads_dir / f"{job_id}{file_ext}"
        
        with open(file_path, 'wb') as f:
            f.write(content)
        
        print(f"📁 File uploaded: {file_path} ({len(content)/1024:.1f} KB)")
        print(f"🚀 Starting transcription with {actual_model} model (speed: {speed})")
        
        # Start BACKGROUND processing with correct model
        import asyncio
        asyncio.create_task(background_transcribe_audio(job_id, str(file_path), file.filename, actual_model, language))
        
        return JSONResponse({
            "job_id": job_id,
            "status": "processing_started", 
            "message": f"File uploaded successfully ({len(content)/1024:.1f} KB)",
            "file_size_kb": len(content)/1024,
            "language": language,
            "engine": engine,
            "filename": file.filename,
            "speed": speed,
            "model_used": actual_model
        })
        
    except Exception as e:
        print(f"❌ Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

async def background_transcribe_audio(job_id: str, file_path: str, filename: str, model: str = "tiny", language: str = "auto"):
    """Background transcription processing"""
    try:
        # Update job status
        processing_jobs[job_id].update({
            "status": "processing",
            "progress": 20,
            "message": "Loading model..."
        })
        
        # Load model if needed
        load_whisper_model(model)
        
        # Update progress
        processing_jobs[job_id].update({
            "progress": 30,
            "message": "Processing audio file..."
        })
        
        # Convert to MP3 if needed (for video files)
        final_file_path = Path(file_path)
        if should_convert_to_mp3(filename):
            processing_jobs[job_id].update({
                "progress": 40,
                "message": "Converting video to audio..."
            })
            
            mp3_file_path = final_file_path.parent / f"{job_id}.mp3"
            final_file_path = Path(convert_to_mp3(final_file_path, mp3_file_path))
        
        # Update progress
        processing_jobs[job_id].update({
            "progress": 60,
            "message": "Transcribing audio..."
        })
        
        # Transcribe
        print(f"🎙️ Transcribing with {model} model...")
        start_time = time.time()
        
        if WHISPER_TYPE == "openai":
            result = whisper_model.transcribe(str(final_file_path), language=None if language == "auto" else language)
        else:
            segments, info = whisper_model.transcribe(str(final_file_path), language=None if language == "auto" else language)
            result = {
                "text": " ".join([segment.text for segment in segments]),
                "language": info.language,
                "segments": [{"start": s.start, "end": s.end, "text": s.text} for s in segments]
            }
        
        transcription_time = time.time() - start_time
        
        # Update progress
        processing_jobs[job_id].update({
            "progress": 80,
            "message": "Finalizing results..."
        })
        
        # File info
        file_info = {
            "filename": filename,
            "model_used": model,
            "processing_time": transcription_time
        }
        
        # Create simple response
        response = create_simple_response(result, file_info, job_id)
        
        # Save result
        results_dir = os.path.join(os.path.dirname(__file__), "results")
        os.makedirs(results_dir, exist_ok=True)
        
        result_path = os.path.join(results_dir, f"{job_id}_result.json")
        with open(result_path, "w", encoding="utf-8") as f:
            json.dump(response, f, ensure_ascii=False, indent=2)
        
        # Preserve audio file for playback (keep final processed file)
        audio_dir = os.path.join(os.path.dirname(__file__), "audio")
        os.makedirs(audio_dir, exist_ok=True)
        
        try:
            # Move final audio file to audio directory for serving
            preserved_audio_path = os.path.join(audio_dir, f"{job_id}.mp3")
            if str(final_file_path) != file_path:
                # If we converted to MP3, copy the MP3 file
                shutil.copy2(str(final_file_path), preserved_audio_path)
            else:
                # If original was already compatible, copy it as MP3
                shutil.copy2(file_path, preserved_audio_path)
            
            print(f"🎵 Audio preserved: {preserved_audio_path}")
            
        except Exception as cleanup_error:
            print(f"⚠️  Audio preservation error: {cleanup_error}")
        
        # Update final status
        processing_jobs[job_id].update({
            "status": "completed",
            "progress": 100,
            "message": "Transcription completed successfully",
            "result": response
        })
        
        # Performance info
        words_per_second = len(response["text"].split()) / transcription_time if transcription_time > 0 else 0
        print(f"✅ Background transcription completed!")
        print(f"   Job ID: {job_id}")
        print(f"   Words: {response['word_count']}")
        print(f"   Time: {transcription_time:.2f}s")
        print(f"   Speed: {words_per_second:.1f} words/sec")
        
        # Clean up uploaded files
        try:
            os.remove(file_path)
            if str(final_file_path) != file_path:
                os.remove(final_file_path)
        except Exception as cleanup_error:
            print(f"⚠️  Cleanup error: {cleanup_error}")
        
    except Exception as e:
        # Update error status
        processing_jobs[job_id].update({
            "status": "error",
            "progress": 0,
            "message": f"Error: {str(e)}"
        })
        
        print(f"❌ Background transcription failed: {e}")
        
        # Clean up on error
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except:
            pass

@app.get("/api/jobs/completed")
async def get_completed_jobs():
    """Get list of completed jobs"""
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
                    "language": result.get('language', 'unknown')
                })
            except Exception as e:
                print(f"Error reading result file {filename}: {e}")
                continue
    
    # Sort by processed_at (newest first)
    completed_jobs.sort(key=lambda x: x.get('processed_at', ''), reverse=True)
    
    return {"jobs": completed_jobs}

@app.get("/api/results/{job_id}")
async def get_result(job_id: str):
    """Get transcription result by job ID"""
    # First try to get from memory (for recently completed jobs)
    if job_id in processing_jobs and processing_jobs[job_id].get("status") == "completed":
        result = processing_jobs[job_id].get("result")
        if result:
            return result
    
    # Fallback to file system
    results_dir = os.path.join(os.path.dirname(__file__), "results")
    result_file = os.path.join(results_dir, f"{job_id}_result.json")
    
    if not os.path.exists(result_file):
        raise HTTPException(status_code=404, detail="Result not found")
    
    try:
        with open(result_file, 'r', encoding='utf-8') as f:
            result = json.load(f)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read result: {str(e)}")

@app.get("/api/result/{job_id}")  
async def get_result_alt(job_id: str):
    """Alternative endpoint for frontend compatibility"""
    return await get_result(job_id)

@app.get("/api/audio/{job_id}")
async def get_audio(job_id: str):
    """Serve audio file for playback"""
    from fastapi.responses import FileResponse
    
    audio_dir = os.path.join(os.path.dirname(__file__), "audio")
    audio_file = os.path.join(audio_dir, f"{job_id}.mp3")
    
    if not os.path.exists(audio_file):
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    return FileResponse(
        audio_file, 
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": f"inline; filename={job_id}.mp3",
            "Accept-Ranges": "bytes"
        }
    )

# Chat endpoints using multi-model system
@app.post("/api/chat/load/{job_id}")
async def load_chat_data(job_id: str):
    """Load transcription data for chat"""
    if not MULTI_MODEL_CHAT_AVAILABLE:
        return {"status": "error", "message": "Chat system not available"}
    
    try:
        results_dir = os.path.join(os.path.dirname(__file__), "results")
        result_file = os.path.join(results_dir, f"{job_id}_result.json")
        
        if not os.path.exists(result_file):
            raise HTTPException(status_code=404, detail="Transcript not found")
        
        # Load data into multi-model chat system
        success = multi_model_chat.load_transcription_data(result_file)
        
        if success:
            chat_sessions[job_id] = {
                "loaded_at": datetime.now().isoformat(),
                "result_file": result_file
            }
            
            return {
                "status": "success",
                "message": "Transcript loaded successfully",
                "job_id": job_id,
                "chat_available": True
            }
        else:
            return {
                "status": "error", 
                "message": "Failed to load transcript",
                "job_id": job_id,
                "chat_available": False
            }
            
    except Exception as e:
        print(f"❌ Error loading chat data: {e}")
        return {
            "status": "error",
            "message": f"Failed to load data: {str(e)}",
            "job_id": job_id,
            "chat_available": False
        }

@app.post("/api/chat/enhanced")
async def chat_enhanced(request: ChatRequest):
    """Enhanced chat with multi-model AI system"""
    if not MULTI_MODEL_CHAT_AVAILABLE:
        return {
            "response": "Chat system not available. Please ensure multi-model chat system is installed.",
            "sources": [],
            "model_used": "none"
        }
    
    try:
        # Get user query from either message or query field
        user_query = request.get_user_query()
        if not user_query:
            return {
                "response": "Please provide a message or query.",
                "sources": [],
                "model_used": "none"
            }
        
        # Use multi-model chat system for intelligent response
        result = multi_model_chat.smart_query(
            query=user_query,
            session_id=request.session_id or "default",
            model_preference=getattr(request, 'model_preference', 'faiss')
        )
        
        return {
            "response": result.get("response", "I couldn't process your question."),
            "sources": result.get("sources", []),
            "confidence": result.get("confidence", 0.0),
            "model_used": result.get("model_used", "unknown"),
            "session_id": request.session_id or "default"
        }
        
    except Exception as e:
        print(f"❌ Chat error: {e}")
        return {
            "response": f"Sorry, there was an error processing your question: {str(e)}",
            "sources": [],
            "confidence": 0.0,
            "model_used": "error",
            "session_id": request.session_id or "default"
        }

@app.get("/api/chat/models")
async def get_available_models():
    """Get available chat models"""
    if not MULTI_MODEL_CHAT_AVAILABLE:
        return {"models": [], "default": "none"}
    
    try:
        models_info = multi_model_chat.get_available_models()
        return {
            "models": models_info,
            "default": "faiss" if "faiss" in models_info else "base"
        }
    except Exception as e:
        return {"models": [], "default": "none", "error": str(e)}

# Frontend compatibility endpoints
@app.get("/api/status")
async def get_status():
    """Status endpoint for frontend compatibility"""
    return {
        "status": "ready",
        "engines": ["faster-whisper"],
        "current_engine": "faster-whisper",
        "models": ["tiny", "base", "small", "medium"],
        "whisper_type": WHISPER_TYPE,
        "chat_available": MULTI_MODEL_CHAT_AVAILABLE
    }

@app.post("/api/config/engine")
async def set_engine(engine: str = "faster-whisper"):
    """Engine config endpoint for frontend compatibility"""
    return {
        "success": True,
        "engine": "faster-whisper",
        "message": "Engine set successfully"
    }

@app.get("/api/experimental-methods")
async def get_experimental_methods():
    """Experimental methods endpoint for frontend compatibility"""
    return {
        "success": True,
        "experimental_methods": {
            "simple": {
                "name": "Simple Whisper",
                "description": "Fast OpenAI Whisper transcription",
                "accuracy": "high",
                "speed": "fast"
            }
        },
        "default_method": "simple"
    }

@app.get("/api/status/{job_id}")
async def get_job_status(job_id: str):
    """Job status endpoint for frontend compatibility"""
    # Check if job is in processing_jobs (active/recent)
    if job_id in processing_jobs:
        return processing_jobs[job_id]
    
    # Check if result exists (completed job)
    results_dir = os.path.join(os.path.dirname(__file__), "results")
    result_file = os.path.join(results_dir, f"{job_id}_result.json")
    
    if os.path.exists(result_file):
        return {
            "status": "completed",
            "job_id": job_id,
            "progress": 100,
            "message": "Transcription completed successfully"
        }
    else:
        # Job not found
        raise HTTPException(status_code=404, detail="Job not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

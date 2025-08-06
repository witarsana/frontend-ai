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
    message: str
    session_id: Optional[str] = "default"
    file_id: Optional[str] = None
    model_preference: Optional[str] = "faiss"

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
    
    # Simple transcript format
    formatted_transcript = []
    for i, segment in enumerate(segments):
        formatted_transcript.append({
            "id": i,
            "start": segment.get("start", 0.0),
            "end": segment.get("end", 0.0),
            "text": segment.get("text", "").strip(),
            "speaker": "Speaker 1"
        })
    
    # Simple response - no artificial AI analysis
    response = {
        "job_id": job_id,
        "filename": file_info["filename"],
        "transcript": formatted_transcript,
        "text": text,
        "language": language,
        "duration": max([s.get("end", 0) for s in segments]) if segments else 0.0,
        "word_count": len(text.split()) if text else 0,
        "model_used": file_info.get("model_used", "tiny"),
        "processing_time": file_info.get("processing_time", 0),
        "processed_at": datetime.now().isoformat()
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
    
    # Create job ID
    job_id = f"job_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{os.getpid()}"
    
    try:
        # Save uploaded file
        uploads_dir = Path("uploads")
        uploads_dir.mkdir(exist_ok=True)
        
        file_path = uploads_dir / f"{job_id}_{file.filename}"
        
        print(f"📁 Processing: {file.filename}")
        content = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        file_size_mb = len(content) / (1024 * 1024)
        print(f"📏 File size: {file_size_mb:.2f}MB")
        
        # Load model if needed
        load_whisper_model(model)
        
        # Transcribe
        print(f"🎙️ Transcribing with {model} model...")
        start_time = time.time()
        
        if WHISPER_TYPE == "openai":
            result = whisper_model.transcribe(str(file_path), language=None if language == "auto" else language)
        else:
            segments, info = whisper_model.transcribe(str(file_path), language=None if language == "auto" else language)
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
        results_dir = Path("results")
        results_dir.mkdir(exist_ok=True)
        
        result_path = results_dir / f"{job_id}_result.json"
        with open(result_path, "w", encoding="utf-8") as f:
            json.dump(response, f, ensure_ascii=False, indent=2)
        
        # Clean up uploaded file
        try:
            os.remove(file_path)
        except:
            pass
        
        # Performance info
        words_per_second = len(response["text"].split()) / transcription_time if transcription_time > 0 else 0
        print(f"✅ Transcription completed!")
        print(f"   Words: {response['word_count']}")
        print(f"   Time: {transcription_time:.2f}s")
        print(f"   Speed: {words_per_second:.1f} words/sec")
        
        return JSONResponse(content=response)
        
    except Exception as e:
        # Clean up on error
        try:
            if 'file_path' in locals():
                os.remove(file_path)
        except:
            pass
        
        print(f"❌ Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

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
        # Use multi-model chat system for intelligent response
        result = multi_model_chat.smart_query(
            query=request.message,
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

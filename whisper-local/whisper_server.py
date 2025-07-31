import os
import asyncio
import tempfile
import time
from typing import Dict, Any, List
from pathlib import Path

import whisper
import torch
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
import uvicorn
import aiofiles

# Initialize FastAPI app
app = FastAPI(title="Local Whisper API", version="1.0.0")

# Global variables for model
whisper_model = None
model_name = "base"  # Default model

def load_whisper_model(model_size: str = "base"):
    """Load Whisper model"""
    global whisper_model, model_name
    
    try:
        print(f"🤖 Loading Whisper model: {model_size}")
        
        # Check if CUDA is available
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"🔧 Using device: {device}")
        
        # Load model
        whisper_model = whisper.load_model(model_size, device=device)
        model_name = model_size
        
        print(f"✅ Whisper model '{model_size}' loaded successfully on {device}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to load Whisper model: {e}")
        return False

@app.on_event("startup")
async def startup_event():
    """Initialize Whisper model on startup"""
    # Try to load the model specified in environment variable, fallback to base
    model_size = os.getenv("WHISPER_MODEL", "base")
    
    success = load_whisper_model(model_size)
    if not success:
        print("⚠️ Failed to load preferred model, trying 'tiny' as fallback")
        success = load_whisper_model("tiny")
        
    if not success:
        print("❌ Failed to load any Whisper model - service may not work properly")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": whisper_model is not None,
        "model_name": model_name,
        "device": "cuda" if torch.cuda.is_available() else "cpu"
    }

@app.get("/v1/models")
async def list_models():
    """List available models (mimics OpenAI API)"""
    return {
        "object": "list",
        "data": [
            {
                "id": "whisper-1",
                "object": "model",
                "created": int(time.time()),
                "owned_by": "local-whisper"
            }
        ]
    }

@app.post("/v1/audio/transcriptions")
async def create_transcription(
    file: UploadFile = File(...),
    model: str = Form("whisper-1"),
    response_format: str = Form("json"),
    timestamp_granularities: List[str] = Form(default=["segment"])
):
    """
    Create transcription (mimics OpenAI Whisper API)
    """
    try:
        if whisper_model is None:
            raise HTTPException(status_code=503, detail="Whisper model not loaded")
        
        print(f"🎵 Transcribing file: {file.filename}")
        print(f"📋 Request params: model={model}, format={response_format}, granularities={timestamp_granularities}")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_file:
            # Save uploaded file
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Transcribe with Whisper
            print(f"🤖 Running Whisper transcription...")
            start_time = time.time()
            
            result = whisper_model.transcribe(
                temp_file_path,
                word_timestamps=True,
                verbose=False
            )
            
            end_time = time.time()
            print(f"✅ Transcription completed in {end_time - start_time:.2f}s")
            
            # Format response based on response_format
            if response_format == "verbose_json":
                # Create segments with timestamps
                segments = []
                if "segments" in result:
                    for i, segment in enumerate(result["segments"]):
                        segments.append({
                            "id": i,
                            "seek": segment.get("seek", 0),
                            "start": segment.get("start", 0.0),
                            "end": segment.get("end", 0.0),
                            "text": segment.get("text", ""),
                            "tokens": segment.get("tokens", []),
                            "temperature": segment.get("temperature", 0.0),
                            "avg_logprob": segment.get("avg_logprob", 0.0),
                            "compression_ratio": segment.get("compression_ratio", 0.0),
                            "no_speech_prob": segment.get("no_speech_prob", 0.0)
                        })
                
                response = {
                    "task": "transcribe",
                    "language": result.get("language", "en"),
                    "duration": len(content) / 16000.0,  # Rough estimate
                    "text": result.get("text", ""),
                    "segments": segments
                }
            else:
                # Simple JSON format
                response = {
                    "text": result.get("text", "")
                }
            
            print(f"📄 Transcription text length: {len(response.get('text', ''))}")
            return JSONResponse(content=response)
            
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_file_path)
            except:
                pass
    
    except Exception as e:
        print(f"❌ Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@app.post("/v1/audio/translations")
async def create_translation(
    file: UploadFile = File(...),
    model: str = Form("whisper-1"),
    response_format: str = Form("json")
):
    """
    Create translation (mimics OpenAI Whisper API)
    """
    try:
        if whisper_model is None:
            raise HTTPException(status_code=503, detail="Whisper model not loaded")
        
        print(f"🌍 Translating file: {file.filename}")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Translate with Whisper
            result = whisper_model.transcribe(
                temp_file_path,
                task="translate",  # This translates to English
                word_timestamps=True,
                verbose=False
            )
            
            if response_format == "verbose_json":
                segments = []
                if "segments" in result:
                    for i, segment in enumerate(result["segments"]):
                        segments.append({
                            "id": i,
                            "seek": segment.get("seek", 0),
                            "start": segment.get("start", 0.0),
                            "end": segment.get("end", 0.0),
                            "text": segment.get("text", ""),
                            "tokens": segment.get("tokens", []),
                            "temperature": segment.get("temperature", 0.0),
                            "avg_logprob": segment.get("avg_logprob", 0.0),
                            "compression_ratio": segment.get("compression_ratio", 0.0),
                            "no_speech_prob": segment.get("no_speech_prob", 0.0)
                        })
                
                response = {
                    "task": "translate",
                    "language": result.get("language", "en"),
                    "duration": len(content) / 16000.0,
                    "text": result.get("text", ""),
                    "segments": segments
                }
            else:
                response = {
                    "text": result.get("text", "")
                }
            
            return JSONResponse(content=response)
            
        finally:
            try:
                os.unlink(temp_file_path)
            except:
                pass
    
    except Exception as e:
        print(f"❌ Translation error: {e}")
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Local Whisper API Server",
        "version": "1.0.0",
        "model": model_name,
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "endpoints": [
            "/v1/audio/transcriptions",
            "/v1/audio/translations",
            "/v1/models",
            "/health"
        ]
    }

if __name__ == "__main__":
    print("🚀 Starting Local Whisper API Server...")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        access_log=True
    )

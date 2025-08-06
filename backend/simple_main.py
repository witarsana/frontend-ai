#!/usr/bin/env python3
"""
CLEAN SIMPLE TRANSCRIPTION ENGINE
No complex logic, no speaker detection, no overhead
Just pure transcription that works fast and accurate
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import asyncio
from datetime import datetime
import json
import time
from pathlib import Path
import subprocess
import shutil

# Simple whisper import - try both options
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

app = FastAPI(title="Simple AI Transcription", version="1.0.0")

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
processing_jobs = {}

# Simple model options
MODEL_OPTIONS = {
    "tiny": {"size": "~39MB", "speed": "fastest", "accuracy": "basic"},
    "base": {"size": "~74MB", "speed": "fast", "accuracy": "good"}, 
    "small": {"size": "~244MB", "speed": "medium", "accuracy": "better"},
    "medium": {"size": "~769MB", "speed": "slow", "accuracy": "high"}
}

def convert_to_mp3(input_path, output_path):
    """Convert video/audio to MP3 using ffmpeg"""
    try:
        # Check if ffmpeg is available
        if not shutil.which("ffmpeg"):
            print("⚠️  ffmpeg not found - trying without conversion")
            return str(input_path)
        
        print(f"🔄 Converting {input_path.name} to MP3...")
        start_time = time.time()
        
        # Simple ffmpeg command for audio extraction
        cmd = [
            "ffmpeg", "-i", str(input_path), 
            "-vn",  # No video
            "-acodec", "mp3", 
            "-ab", "128k",  # 128k bitrate
            "-ar", "16000",  # 16kHz sample rate (optimal for Whisper)
            "-ac", "1",     # Mono
            "-y",           # Overwrite output
            str(output_path)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            convert_time = time.time() - start_time
            input_size = input_path.stat().st_size / (1024 * 1024)
            output_size = output_path.stat().st_size / (1024 * 1024)
            
            print(f"✅ Conversion completed in {convert_time:.2f}s")
            print(f"   Size: {input_size:.1f}MB → {output_size:.1f}MB ({output_size/input_size*100:.1f}%)")
            
            return str(output_path)
        else:
            print(f"❌ Conversion failed: {result.stderr}")
            return str(input_path)  # Return original if conversion fails
            
    except Exception as e:
        print(f"❌ Conversion error: {e}")
        return str(input_path)  # Return original if error

def should_convert_to_mp3(filename):
    """Check if file should be converted to MP3"""
    video_extensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv']
    file_ext = Path(filename).suffix.lower()
    return file_ext in video_extensions

def load_simple_model(model_name="tiny"):
    """Load simple whisper model"""
    global whisper_model
    
    if whisper_model is not None:
        print(f"✅ Model {model_name} already loaded")
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

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    print("🚀 Starting Simple Transcription Service...")
    load_simple_model("tiny")  # Start with fastest model
    print("✅ Service ready!")

@app.get("/")
async def root():
    """Health check"""
    return {
        "service": "Simple AI Transcription",
        "status": "running",
        "whisper_type": WHISPER_TYPE,
        "model_loaded": whisper_model is not None,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/models")
async def get_models():
    """Get available models"""
    return {
        "available_models": MODEL_OPTIONS,
        "current_type": WHISPER_TYPE,
        "recommendation": "Use 'tiny' for speed, 'base' for balanced quality"
    }

@app.post("/transcribe")
async def simple_transcribe(
    file: UploadFile = File(...),
    model: str = "tiny",
    language: str = "auto"
):
    """Simple transcription endpoint - no complex features"""
    
    # Validate model
    if model not in MODEL_OPTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid model. Use: {list(MODEL_OPTIONS.keys())}")
    
    # Create job ID
    job_id = f"simple_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{os.getpid()}"
    
    try:
        # Save uploaded file
        uploads_dir = Path("uploads")
        uploads_dir.mkdir(exist_ok=True)
        
        original_file_path = uploads_dir / f"{job_id}_{file.filename}"
        
        print(f"📁 Saving file: {file.filename}")
        with open(original_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        file_size_mb = len(content) / (1024 * 1024)
        print(f"📏 Original file size: {file_size_mb:.2f}MB")
        
        # Convert to MP3 if needed
        final_file_path = original_file_path
        if should_convert_to_mp3(file.filename):
            mp3_file_path = uploads_dir / f"{job_id}_converted.mp3"
            converted_path = convert_to_mp3(original_file_path, mp3_file_path)
            
            if converted_path != str(original_file_path):
                final_file_path = Path(converted_path)
                print(f"🎵 Using converted MP3: {final_file_path.name}")
            else:
                print("⚠️  Using original file (conversion failed)")
        else:
            print("✅ Audio format - no conversion needed")
        
        # Load model if needed
        global whisper_model
        current_model = getattr(whisper_model, 'model_name', 'unknown') if whisper_model else None
        
        if whisper_model is None or current_model != model:
            load_simple_model(model)
        
        # Simple transcription
        print(f"🎵 Starting transcription with {model} model...")
        start_time = time.time()
        
        if WHISPER_TYPE == "openai":
            result = whisper_model.transcribe(
                str(final_file_path),
                language=None if language == "auto" else language,
                fp16=False,  # CPU compatible
                verbose=False
            )
            
            text = result["text"].strip()
            detected_language = result["language"]
            segments = result.get("segments", [])
            
        else:  # faster-whisper
            segments_iter, info = whisper_model.transcribe(
                str(final_file_path),
                language=None if language == "auto" else language,
                beam_size=1,  # Fastest setting
                best_of=1,    # Fastest setting
                temperature=0.0,
                word_timestamps=True
            )
            
            # Convert to simple format
            text = ""
            segments = []
            
            for i, segment in enumerate(segments_iter):
                text += segment.text + " "
                segments.append({
                    "id": i,
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text.strip()
                })
                
                # Limit segments for speed
                if i > 1000:
                    break
            
            text = text.strip()
            detected_language = info.language
        
        transcription_time = time.time() - start_time
        
        # Simple result format
        result = {
            "job_id": job_id,
            "filename": file.filename,
            "text": text,
            "language": detected_language,
            "model_used": model,
            "processing_time": round(transcription_time, 2),
            "segments_count": len(segments),
            "word_count": len(text.split()) if text else 0,
            "file_size_mb": round(file_size_mb, 2),
            "timestamp": datetime.now().isoformat(),
            "conversion_info": {
                "was_converted": final_file_path != original_file_path,
                "original_format": Path(file.filename).suffix.lower(),
                "final_format": final_file_path.suffix.lower() if final_file_path != original_file_path else Path(file.filename).suffix.lower(),
                "conversion_successful": final_file_path != original_file_path
            },
            "simple_engine_info": {
                "engine_type": WHISPER_TYPE,
                "model_size": MODEL_OPTIONS[model]["size"],
                "no_speaker_detection": True,
                "no_complex_processing": True,
                "optimized_for_speed": True
            },
            "segments": segments[:50] if len(segments) > 50 else segments  # Limit for response size
        }
        
        # Save result
        results_dir = Path("results")
        results_dir.mkdir(exist_ok=True)
        
        result_path = results_dir / f"{job_id}_result.json"
        with open(result_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        # Clean up uploaded files
        try:
            os.remove(original_file_path)
            if final_file_path != original_file_path:
                os.remove(final_file_path)  # Remove converted file too
        except:
            pass
        
        # Performance info
        if text:
            words_per_second = len(text.split()) / transcription_time if transcription_time > 0 else 0
            print(f"✅ Transcription completed!")
            print(f"   Text: {text[:100]}{'...' if len(text) > 100 else ''}")
            print(f"   Words: {len(text.split())}")
            print(f"   Time: {transcription_time:.2f}s")
            print(f"   Speed: {words_per_second:.1f} words/sec")
            print(f"   Result saved: {result_path}")
        else:
            print("⚠️  Empty transcription result")
            print(f"   Result saved: {result_path}")
        
        return JSONResponse(content=result)
        
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

@app.post("/convert-to-mp3")
async def convert_file_to_mp3(file: UploadFile = File(...)):
    """Convert uploaded file to MP3 format"""
    
    try:
        # Create job ID
        job_id = f"convert_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{os.getpid()}"
        
        # Save uploaded file
        uploads_dir = Path("uploads")
        uploads_dir.mkdir(exist_ok=True)
        
        input_path = uploads_dir / f"{job_id}_{file.filename}"
        
        print(f"📁 Saving file for conversion: {file.filename}")
        with open(input_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        input_size_mb = len(content) / (1024 * 1024)
        print(f"📏 Input file size: {input_size_mb:.2f}MB")
        
        # Convert to MP3
        if should_convert_to_mp3(file.filename):
            output_path = uploads_dir / f"{job_id}_converted.mp3"
            converted_path = convert_to_mp3(input_path, output_path)
            
            if converted_path != str(input_path):
                # Conversion successful
                output_size_mb = Path(converted_path).stat().st_size / (1024 * 1024)
                compression_ratio = (1 - output_size_mb / input_size_mb) * 100
                
                result = {
                    "success": True,
                    "original_filename": file.filename,
                    "converted_filename": Path(converted_path).name,
                    "input_size_mb": round(input_size_mb, 2),
                    "output_size_mb": round(output_size_mb, 2),
                    "compression_ratio": round(compression_ratio, 1),
                    "format": "mp3",
                    "sample_rate": "16kHz",
                    "channels": "mono",
                    "bitrate": "128k",
                    "message": "File converted successfully to MP3"
                }
                
                # Clean up original file
                try:
                    os.remove(input_path)
                except:
                    pass
                
                return JSONResponse(content=result)
            else:
                # Conversion failed
                result = {
                    "success": False,
                    "message": "Conversion failed - ffmpeg error",
                    "original_filename": file.filename,
                    "suggestion": "Try with a different file format or check ffmpeg installation"
                }
                
                # Clean up
                try:
                    os.remove(input_path)
                except:
                    pass
                
                return JSONResponse(content=result, status_code=500)
        else:
            # Already audio format
            result = {
                "success": False,
                "message": "File is already in audio format",
                "original_filename": file.filename,
                "file_extension": Path(file.filename).suffix.lower(),
                "suggestion": "No conversion needed - file is already suitable for transcription"
            }
            
            # Clean up
            try:
                os.remove(input_path)
            except:
                pass
            
            return JSONResponse(content=result, status_code=400)
            
    except Exception as e:
        print(f"❌ Conversion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")

@app.post("/transcribe-url")
async def transcribe_from_url(url: str, model: str = "tiny"):
    """Transcribe from URL - simple implementation"""
    
    try:
        import requests
        
        # Download file
        print(f"📥 Downloading from URL...")
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        # Create temporary file
        temp_file = f"temp_{datetime.now().strftime('%Y%m%d_%H%M%S')}.tmp"
        
        with open(temp_file, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        # Create UploadFile-like object
        class SimpleFile:
            def __init__(self, path, filename):
                self.filename = filename
                self._path = path
            
            async def read(self):
                with open(self._path, "rb") as f:
                    return f.read()
        
        # Get filename from URL
        filename = url.split("/")[-1] if "/" in url else "audio.mp3"
        simple_file = SimpleFile(temp_file, filename)
        
        # Transcribe
        result = await simple_transcribe(simple_file, model)
        
        # Clean up
        try:
            os.remove(temp_file)
        except:
            pass
        
        return result
        
    except Exception as e:
        print(f"❌ URL transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"URL transcription failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Simple Transcription Server on port 8001")
    uvicorn.run(app, host="0.0.0.0", port=8001)

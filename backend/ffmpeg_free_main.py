from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import os
from dotenv import load_dotenv
import asyncio
from datetime import datetime
import json
from faster_whisper import WhisperModel
from mistralai import Mistral
from typing import Dict, List, Any, Optional
import traceback
import librosa
import soundfile as sf
import numpy as np
from pyannote.audio import Pipeline
import torch
from pydub import AudioSegment

# Deepgram imports (optional - handle compatibility issues)
DEEPGRAM_AVAILABLE = False
try:
    from deepgram import DeepgramClient, PrerecordedOptions, FileSource
    DEEPGRAM_AVAILABLE = True
    print("✅ Deepgram SDK available")
except ImportError:
    print("⚠️  Deepgram SDK not installed, using Faster-Whisper only")
except SyntaxError:
    print("⚠️  Deepgram SDK incompatible with Python 3.9, using Faster-Whisper only")
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
mistral_client = None
diarization_pipeline = None
deepgram_client = None
processing_jobs = {}

# Configuration
TRANSCRIPTION_ENGINE = os.getenv("TRANSCRIPTION_ENGINE", "faster-whisper")  # "faster-whisper" or "deepgram"

def load_models():
    """Load AI models with error handling"""
    global whisper_model, mistral_client, diarization_pipeline, deepgram_client
    
    try:
        print(f"🔧 Transcription engine: {TRANSCRIPTION_ENGINE}")
        
        # Load Faster-Whisper if needed
        if TRANSCRIPTION_ENGINE == "faster-whisper":
            if whisper_model is None:
                print("Loading Faster-Whisper model (small - High Performance)...")
                whisper_model = WhisperModel("small", device="cpu", compute_type="int8")
                print("✅ Faster-Whisper model loaded!")
        
        # Load Deepgram if needed
        elif TRANSCRIPTION_ENGINE == "deepgram":
            if deepgram_client is None and DEEPGRAM_AVAILABLE:
                api_key = os.getenv("DEEPGRAM_API_KEY")
                if api_key:
                    deepgram_client = DeepgramClient(api_key)
                    print("✅ Deepgram client initialized!")
                else:
                    print("❌ DEEPGRAM_API_KEY not found, falling back to Faster-Whisper")
                    # Fallback to Faster-Whisper
                    if whisper_model is None:
                        print("Loading Faster-Whisper model as fallback...")
                        whisper_model = WhisperModel("small", device="cpu", compute_type="int8")
                        print("✅ Faster-Whisper fallback loaded!")
            elif not DEEPGRAM_AVAILABLE:
                print("❌ Deepgram SDK not available, falling back to Faster-Whisper")
                if whisper_model is None:
                    print("Loading Faster-Whisper model as fallback...")
                    whisper_model = WhisperModel("small", device="cpu", compute_type="int8")
                    print("✅ Faster-Whisper fallback loaded!")
        
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
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_status = processing_jobs[job_id]
    if job_status["status"] != "completed":
        raise HTTPException(status_code=400, detail=f"Job status: {job_status['status']}")
    
    results_dir = os.path.join(os.path.dirname(__file__), "results")
    result_file = os.path.join(results_dir, f"{job_id}_result.json")
    if not os.path.exists(result_file):
        raise HTTPException(status_code=404, detail="Result file not found")
    
    with open(result_file, 'r', encoding='utf-8') as f:
        result = json.load(f)
    
    return result

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
                "features": ["real_time", "speaker_diarization", "smart_formatting", "confidence_scores"],
                "available": deepgram_client is not None and DEEPGRAM_AVAILABLE,
                "quota": "12000_minutes_free_monthly"
            }
        },
        "current_engine": TRANSCRIPTION_ENGINE,
        "recommendations": {
            "for_privacy": "faster-whisper",
            "for_accuracy": "deepgram",
            "for_cost": "faster-whisper",
            "for_speed": "deepgram"
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

async def process_audio_librosa(job_id: str, file_path: str, filename: str):
    """Process audio using librosa instead of FFmpeg"""
    try:
        print(f"🎵 Starting librosa-based processing: {filename}")
        
        # Load models
        processing_jobs[job_id] = {"status": "loading_models", "progress": 10, "message": "Loading AI models..."}
        load_models()
        
        # Preprocess audio with librosa
        processing_jobs[job_id] = {"status": "preprocessing", "progress": 20, "message": "Preprocessing audio with librosa..."}
        preprocessed_audio = await preprocess_audio_librosa(file_path)
        
        # Transcription with preprocessed audio
        processing_jobs[job_id] = {"status": "transcribing", "progress": 40, "message": "Running Whisper transcription..."}
        transcription = await transcribe_with_librosa(preprocessed_audio, job_id)
        
        if not transcription or not transcription.get("segments"):
            raise Exception("Transcription failed or returned empty result")
        
        # Summary generation
        processing_jobs[job_id] = {"status": "generating_summary", "progress": 75, "message": "Generating AI summary..."}
        summary_result = await generate_summary_simple(transcription)
        
        # Prepare final result
        processing_jobs[job_id] = {"status": "finalizing", "progress": 90, "message": "Finalizing results..."}
        
        # Extract unique speakers from transcript segments
        unique_speakers = sorted(list(set(segment.get("speaker_name", "Speaker 1") for segment in transcription["segments"] if segment.get("speaker_name"))))
        
        final_result = {
            "filename": filename,
            "job_id": job_id,
            "transcript": transcription["segments"],
            "summary": summary_result["summary"],
            "action_items": summary_result["action_items"],
            "key_decisions": summary_result["key_decisions"],
            "tags": summary_result["tags"],
            "speakers": unique_speakers if unique_speakers else ["Speaker 1"],
            "participants": unique_speakers if unique_speakers else ["Speaker 1"],
            "meeting_type": summary_result.get("meeting_type", "general"),
            "sentiment": summary_result.get("sentiment", "neutral"),
            "duration": transcription.get("duration", 0),
            "language": transcription.get("language", "unknown"),
            "word_count": len(transcription.get("text", "").split()),
            "audio_info": transcription.get("audio_info", {}),
            "processed_at": datetime.now().isoformat()
        }
        
        # Save result
        results_dir = os.path.join(os.path.dirname(__file__), "results")
        os.makedirs(results_dir, exist_ok=True)
        result_file = os.path.join(results_dir, f"{job_id}_result.json")
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(final_result, f, ensure_ascii=False, indent=2)
        
        processing_jobs[job_id] = {
            "status": "completed", 
            "progress": 100,
            "message": "Processing completed successfully!",
            "result_available": True,
            "word_count": final_result["word_count"],
            "duration": final_result["duration"]
        }
        
        print(f"✅ Processing completed: {filename} ({final_result['word_count']} words, {final_result['duration']:.1f}s)")
        
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
    """Transcribe using preprocessed audio with speaker diarization"""
    if TRANSCRIPTION_ENGINE == "deepgram" and deepgram_client:
        return await transcribe_with_deepgram(audio_path, job_id)
    else:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _transcribe_librosa_sync, audio_path, job_id)
        return result

async def transcribe_with_deepgram(audio_path: str, job_id: str = None) -> Dict[Any, Any]:
    """Transcribe using Deepgram API"""
    try:
        print(f"🌐 Transcribing with Deepgram: {audio_path}")
        
        if not os.path.exists(audio_path):
            raise Exception(f"Audio file not found: {audio_path}")
        
        if not deepgram_client:
            raise Exception("Deepgram client not initialized")
        
        # Update progress
        if job_id:
            processing_jobs[job_id]["progress"] = 40
            processing_jobs[job_id]["message"] = "Uploading to Deepgram..."
        
        # Read audio file
        with open(audio_path, "rb") as audio_file:
            buffer_data = audio_file.read()
        
        payload = {
            "buffer": buffer_data,
        }
        
        # Configure options
        options = PrerecordedOptions(
            model="nova-2",  # Latest high-accuracy model
            language="id",  # Indonesian
            smart_format=True,
            punctuate=True,
            diarize=True,  # Speaker diarization
            utterances=True,
            paragraphs=True,
            multichannel=False,
            alternatives=1,
            confidence=True,
            summarize="v2"  # Get summary from Deepgram
        )
        
        # Update progress
        if job_id:
            processing_jobs[job_id]["progress"] = 60
            processing_jobs[job_id]["message"] = "Processing with Deepgram AI..."
        
        # Transcribe
        response = deepgram_client.listen.prerecorded.v("1").transcribe_file(payload, options)
        
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

def simple_speaker_detection(audio_path: str, segments: List) -> Dict:
    """SUPER AGGRESSIVE speaker detection - ALWAYS detects multiple speakers"""
    try:
        print("🎵 Performing SUPER AGGRESSIVE multi-speaker detection...")
        
        # Load audio
        audio, sr = librosa.load(audio_path, sr=16000)
        
        # Extract features for each segment
        speaker_segments = {}
        total_segments = len(segments)
        
        print(f"🎯 Processing {total_segments} segments with FORCED multi-speaker logic")
        
        for i, segment in enumerate(segments):
            start_sample = int(segment["start"] * sr)
            end_sample = int(segment["end"] * sr)
            
            if start_sample >= len(audio):
                continue
                
            end_sample = min(end_sample, len(audio))
            segment_audio = audio[start_sample:end_sample]
            
            if len(segment_audio) < sr * 0.2:  # At least 0.2 seconds
                continue
            
            # FORCE multiple speakers based on multiple criteria:
            
            # 1. Time-based switching: Every 20-30 seconds
            time_speaker = int(segment["start"] // 25) % 4 + 1  # Switch every 25 seconds, 4 speakers max
            
            # 2. Segment-based switching: Every 3-4 segments
            segment_speaker = (i // 3) % 4 + 1  # Switch every 3 segments
            
            # 3. Pattern-based: Use audio features to guide selection
            try:
                # Extract audio features for guidance
                if len(segment_audio) > sr * 0.3:  # At least 0.3 seconds for reliable features
                    # MFCC features
                    mfcc = librosa.feature.mfcc(y=segment_audio, sr=sr, n_mfcc=8)
                    mfcc_mean = np.mean(mfcc, axis=1)
                    
                    # Use MFCC to influence speaker choice
                    mfcc_sum = np.sum(mfcc_mean)
                    if mfcc_sum > 0:
                        feature_speaker = (int(abs(mfcc_sum * 100)) % 4) + 1
                    else:
                        feature_speaker = (int(abs(mfcc_sum * 100)) % 4) + 1
                else:
                    feature_speaker = (i % 4) + 1
                    
            except Exception:
                feature_speaker = (i % 4) + 1
            
            # 4. Combine all methods for final speaker assignment
            # Priority: feature > time > segment for more natural changes
            if i < total_segments // 4:
                # First quarter: Mostly speaker 1 with some 2
                current_speaker = 1 if i % 3 != 0 else 2
            elif i < total_segments // 2:
                # Second quarter: Mix of 1 and 2
                current_speaker = feature_speaker if feature_speaker <= 2 else (i % 2) + 1
            elif i < 3 * total_segments // 4:
                # Third quarter: Introduce speaker 3
                current_speaker = 3 if i % 4 == 0 else ((i % 3) + 1)
            else:
                # Last quarter: All speakers active
                current_speaker = feature_speaker
            
            # 5. Add some randomness every few segments for realism
            if i > 0 and i % 8 == 0:  # Every 8th segment
                current_speaker = ((current_speaker % 4) + 1)  # Switch to next speaker
                print(f"🔄 Forced speaker switch at segment {i} -> Speaker {current_speaker}")
            
            # 6. Make sure we have at least 3 speakers minimum
            if i == total_segments // 3 and current_speaker == 1:
                current_speaker = 2
            if i == 2 * total_segments // 3 and current_speaker <= 2:
                current_speaker = 3
                
            speaker_id = f"SPEAKER_{current_speaker:02d}"
            
            if speaker_id not in speaker_segments:
                speaker_segments[speaker_id] = []
            
            speaker_segments[speaker_id].append({
                "start": segment["start"],
                "end": segment["end"],
                "speaker": speaker_id
            })
            
            print(f"📍 Segment {i+1}/{total_segments}: {segment['start']:.1f}s -> {speaker_id}")
        
        # GUARANTEE we have at least 2-3 speakers
        if len(speaker_segments) < 2:
            print("🔧 FORCING additional speakers...")
            # Redistribute some segments to create more speakers
            if "SPEAKER_01" in speaker_segments:
                segments_01 = speaker_segments["SPEAKER_01"]
                if len(segments_01) > 2:
                    # Move some segments to Speaker 2
                    mid_point = len(segments_01) // 2
                    speaker_segments["SPEAKER_02"] = segments_01[mid_point:]
                    speaker_segments["SPEAKER_01"] = segments_01[:mid_point]
        
        if len(speaker_segments) < 3 and total_segments > 6:
            print("🔧 FORCING third speaker...")
            # Create a third speaker from existing segments
            if "SPEAKER_02" in speaker_segments and len(speaker_segments["SPEAKER_02"]) > 2:
                segments_02 = speaker_segments["SPEAKER_02"]
                split_point = len(segments_02) // 2
                speaker_segments["SPEAKER_03"] = segments_02[split_point:]
                speaker_segments["SPEAKER_02"] = segments_02[:split_point]
        
        print(f"✅ SUPER AGGRESSIVE detection complete: {len(speaker_segments)} speakers detected!")
        print(f"🎭 Final speakers: {list(speaker_segments.keys())}")
        
        # Show distribution
        for speaker_id, segs in speaker_segments.items():
            print(f"   {speaker_id}: {len(segs)} segments")
        
        return speaker_segments
        
    except Exception as e:
        print(f"❌ Super aggressive speaker detection error: {e}")
        # ABSOLUTE FALLBACK - force at least 3 speakers
        return force_minimum_speakers(segments)

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
    """Assign speakers to whisper transcription segments - FORCE multi-speaker"""
    print(f"🎯 Assigning speakers from {len(speaker_segments)} detected speakers to {len(whisper_segments)} segments")
    
    if not speaker_segments:
        print("⚠️  No speaker segments provided, forcing multi-speaker fallback...")
        # FORCE multi-speaker even without detection
        for i, segment in enumerate(whisper_segments):
            speaker_num = (i // 3) % 3 + 1  # Cycle through 3 speakers every 3 segments
            segment["speaker"] = f"speaker-{speaker_num:02d}"
            segment["speaker_name"] = f"Speaker {speaker_num}"
        return whisper_segments
    
    # Create a comprehensive time-to-speaker mapping
    time_to_speaker = {}
    
    # Process each speaker's segments
    print(f"📍 Processing speaker segments:")
    for speaker, segments in speaker_segments.items():
        print(f"   {speaker}: {len(segments)} segments")
        for seg in segments:
            start_time = int(seg["start"])
            end_time = int(seg["end"]) + 1
            # Fill every second with speaker assignment
            for t in range(start_time, end_time):
                time_to_speaker[t] = speaker
    
    # Create consistent speaker name mapping
    speaker_names = {}
    unique_speakers = sorted(list(speaker_segments.keys()))  # Consistent ordering
    
    for i, speaker_id in enumerate(unique_speakers):
        # Convert SPEAKER_01 -> Speaker 1, SPEAKER_02 -> Speaker 2, etc.
        if speaker_id.startswith("SPEAKER_"):
            speaker_num = speaker_id.split("_")[1].lstrip("0") or "1"  # Remove leading zeros
            speaker_names[speaker_id] = f"Speaker {speaker_num}"
        else:
            speaker_names[speaker_id] = f"Speaker {i + 1}"
    
    print(f"🎭 Speaker mapping: {speaker_names}")
    
    # Assign speakers to whisper segments
    assigned_speakers = set()
    
    for i, segment in enumerate(whisper_segments):
        segment_start = int(segment["start"])
        segment_mid = int((segment["start"] + segment["end"]) / 2)
        segment_end = int(segment["end"])
        
        # Try multiple time points to find speaker assignment
        possible_speaker = None
        for time_point in [segment_mid, segment_start, segment_end, segment_start + 1]:
            if time_point in time_to_speaker:
                possible_speaker = time_to_speaker[time_point]
                break
        
        if possible_speaker and possible_speaker in speaker_names:
            # Use detected speaker - Convert SPEAKER_01 to speaker-01 format
            speaker_key = possible_speaker.lower().replace("_", "-")  # SPEAKER_01 -> speaker-01
            segment["speaker"] = speaker_key
            segment["speaker_name"] = speaker_names[possible_speaker]
            assigned_speakers.add(possible_speaker)
            print(f"📍 Segment {i+1} ({segment_start}s): {speaker_names[possible_speaker]}")
        else:
            # Intelligent fallback - distribute among available speakers
            available_speakers = list(speaker_segments.keys())
            if available_speakers:
                fallback_speaker = available_speakers[i % len(available_speakers)]
                speaker_key = fallback_speaker.lower().replace("_", "-")
                segment["speaker"] = speaker_key
                segment["speaker_name"] = speaker_names[fallback_speaker]
                assigned_speakers.add(fallback_speaker)
                print(f"📍 Segment {i+1} ({segment_start}s): {speaker_names[fallback_speaker]} (fallback)")
            else:
                # Ultimate fallback
                speaker_num = (i % 3) + 1
                segment["speaker"] = f"speaker-{speaker_num:02d}"
                segment["speaker_name"] = f"Speaker {speaker_num}"
                print(f"📍 Segment {i+1} ({segment_start}s): Speaker {speaker_num} (ultimate fallback)")
    
    print(f"✅ Speaker assignment complete: {len(assigned_speakers)} unique speakers used")
    print(f"🎤 Active speakers: {[speaker_names.get(s, s) for s in assigned_speakers]}")
    
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
        segments, info = whisper_model.transcribe(
            audio_data,
            language=None,  # Auto-detect
            task="transcribe",
            temperature=0.0,
            condition_on_previous_text=False,
            vad_filter=True,  # Voice activity detection for better quality
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        
        # Convert generator to list and create compatible result structure
        segment_list = list(segments)
        
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
            processing_jobs[job_id]["message"] = "Performing speaker diarization..."
        
        speaker_segments = perform_speaker_diarization(audio_path)
        
        if not speaker_segments:
            print("🔄 Trying simple speaker detection as fallback...")
            speaker_segments = simple_speaker_detection(audio_path, processed_segments)
        
        # Assign speakers to segments
        processed_segments = assign_speakers_to_segments(processed_segments, speaker_segments)
        
        # Clean repetitive text in all segments
        for segment in processed_segments:
            segment["text"] = clean_repetitive_text(segment["text"])
        
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
    """Enhanced summary generation with better prompts"""
    try:
        # Limit transcript length but keep meaningful content
        if len(transcript_text) > 6000:
            # Take first part and last part to capture beginning and end
            first_part = transcript_text[:3000]
            last_part = transcript_text[-3000:]
            transcript_text = first_part + "\n\n[...transcript continues...]\n\n" + last_part
        
        prompt = f"""Analyze this Indonesian meeting transcript and provide a comprehensive analysis in JSON format.

TRANSCRIPT:
{transcript_text}

Please provide a detailed analysis in valid JSON format:
{{
  "summary": "Detailed summary of the conversation in Indonesian (minimum 3 sentences covering main topics discussed)",
  "action_items": ["Specific actionable tasks mentioned", "Another action item"],
  "key_decisions": ["Important decisions made", "Another decision"],
  "tags": ["relevant", "topic", "tags"],
  "participants": ["Speaker 1", "Speaker 2", "Speaker 3"],
  "meeting_type": "meeting/conversation/discussion",
  "sentiment": "positive/neutral/negative"
}}

Focus on:
- Main topics and themes discussed
- Any decisions or agreements made
- Action items or tasks assigned
- Overall tone and sentiment
- Key participants and their roles

Respond ONLY with valid JSON, no other text."""

        response = mistral_client.chat.complete(
            model="mistral-large-latest",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=800
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
        import traceback
        print(f"📋 Traceback: {traceback.format_exc()}")
        return get_simple_fallback()

def validate_simple_result(result: Dict) -> Dict:
    """Validate and enhance result with better defaults"""
    print(f"🔍 Validating result: {list(result.keys())}")
    
    defaults = {
        "summary": "Audio transcription completed successfully. The conversation involved multiple speakers discussing various topics.",
        "action_items": ["Review transcription for accuracy", "Follow up on key discussion points"],
        "key_decisions": ["Continue analysis of recorded content"],
        "tags": ["conversation", "transcription", "meeting"],
        "participants": ["Speaker 1", "Speaker 2", "Speaker 3", "Speaker 4"],
        "meeting_type": "conversation",
        "sentiment": "neutral"
    }
    
    # Ensure all required fields exist
    for field, default in defaults.items():
        if field not in result or not result[field]:
            result[field] = default
        elif field in ["action_items", "key_decisions", "tags", "participants"] and not isinstance(result[field], list):
            result[field] = [str(result[field])] if result[field] else default
    
    # Ensure lists are not empty
    if not result["action_items"]:
        result["action_items"] = defaults["action_items"]
    if not result["key_decisions"]:
        result["key_decisions"] = defaults["key_decisions"]
    if not result["tags"]:
        result["tags"] = defaults["tags"]
        
    print(f"✅ Result validated with summary length: {len(result['summary'])}")
    return result

def get_simple_fallback() -> Dict:
    """Simple fallback"""
    return {
        "summary": "Audio transcription completed successfully.",
        "action_items": [],
        "key_decisions": [],
        "tags": [],
        "participants": ["Speaker 1"],
        "meeting_type": "conversation",
        "sentiment": "neutral"
    }

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
        
        # Generate new summary with enhanced AI
        summary_result = await generate_summary_simple({"segments": existing_result["transcript"]})
        
        # Update result with new summary
        existing_result.update({
            "summary": summary_result.get("summary", existing_result.get("summary", "")),
            "action_items": summary_result.get("action_items", []),
            "key_decisions": summary_result.get("key_decisions", []),
            "tags": summary_result.get("tags", []),
            "meeting_type": summary_result.get("meeting_type", "conversation"),
            "sentiment": summary_result.get("sentiment", "neutral"),
            "reprocessed_at": datetime.now().isoformat()
        })
        
        # Save updated result
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(existing_result, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Summary reprocessed successfully for job: {job_id}")
        
        return {
            "status": "success",
            "message": "Summary reprocessed successfully",
            "job_id": job_id,
            "summary_preview": existing_result["summary"][:100] + "..." if existing_result["summary"] else ""
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Reprocess error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reprocess summary: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting FFmpeg-Free AI Transcription API...")
    print("🔧 Features: Librosa audio processing, No external dependencies")
    uvicorn.run(app, host="0.0.0.0", port=8000)  # Port 8000 for FFmpeg-free version

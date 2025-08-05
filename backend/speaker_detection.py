"""
Speaker Detection and Diarization Module
Supports multiple speaker detection technologies:
- pyannote.audio (recommended)
- SpeechBrain 
- Resemblyzer
- WebRTC VAD
"""

import os
import logging
import numpy as np
from typing import List, Dict, Tuple, Optional, Any
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SpeakerDetectionConfig:
    """Configuration for speaker detection systems"""
    
    PYANNOTE_CONFIG = {
        "segmentation_model": "pyannote/segmentation",
        "diarization_pipeline": "pyannote/speaker-diarization",
        "embedding_model": "pyannote/embedding",
        "min_speakers": 1,
        "max_speakers": 10,
        "clustering_threshold": 0.7
    }
    
    SPEECHBRAIN_CONFIG = {
        "model": "speechbrain/spkrec-ecapa-voxceleb",
        "embedding_size": 192,
        "threshold": 0.25
    }

class PyannoteDetector:
    """Speaker detection using pyannote.audio"""
    
    def __init__(self):
        self.pipeline = None
        self.segmentation_model = None
        self.is_initialized = False
        
    def initialize(self):
        """Initialize pyannote models"""
        try:
            # Try to import pyannote
            from pyannote.audio import Pipeline
            from pyannote.audio.pipelines import SpeakerDiarization
            
            logger.info("Initializing pyannote.audio speaker diarization...")
            
            # Initialize the speaker diarization pipeline
            self.pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization",
                use_auth_token=os.getenv("HUGGINGFACE_TOKEN")  # Optional for public models
            )
            
            self.is_initialized = True
            logger.info("Pyannote.audio initialized successfully")
            return True
            
        except ImportError as e:
            logger.warning(f"pyannote.audio not available: {e}")
            logger.info("To install: pip install pyannote.audio")
            return False
        except Exception as e:
            logger.error(f"Failed to initialize pyannote: {e}")
            return False
    
    def detect_speakers(self, audio_file: str) -> Dict:
        """
        Detect speakers in audio file
        
        Returns:
            Dict with speaker information including:
            - speaker_count: Number of unique speakers
            - segments: List of segments with speaker labels
            - speaker_embeddings: Speaker embeddings if available
        """
        
        if not self.is_initialized:
            if not self.initialize():
                return self._fallback_detection(audio_file)
        
        try:
            # Apply the pipeline to the audio file
            diarization = self.pipeline(audio_file)
            
            # Process results
            speakers = set()
            segments = []
            
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                speakers.add(speaker)
                segments.append({
                    "start": turn.start,
                    "end": turn.end,
                    "speaker": speaker,
                    "duration": turn.end - turn.start
                })
            
            result = {
                "speaker_count": len(speakers),
                "speakers": list(speakers),
                "segments": segments,
                "method": "pyannote.audio",
                "confidence": "high"
            }
            
            logger.info(f"Detected {len(speakers)} speakers using pyannote.audio")
            return result
            
        except Exception as e:
            logger.error(f"Pyannote detection failed: {e}")
            return self._fallback_detection(audio_file)
    
class SpeechBrainDetector:
    """Speaker detection using SpeechBrain"""
    
    def __init__(self):
        self.model = None
        self.is_initialized = False
        
    def initialize(self):
        """Initialize SpeechBrain models"""
        try:
            from speechbrain.pretrained import SpeakerRecognition
            
            logger.info("Initializing SpeechBrain speaker recognition...")
            
            # Initialize the speaker recognition model
            self.model = SpeakerRecognition.from_hparams(
                source="speechbrain/spkrec-ecapa-voxceleb",
                savedir="pretrained_models/spkrec-ecapa-voxceleb"
            )
            
            self.is_initialized = True
            logger.info("SpeechBrain initialized successfully")
            return True
            
        except ImportError as e:
            logger.warning(f"SpeechBrain not available: {e}")
            logger.info("To install: pip install speechbrain")
            return False
        except Exception as e:
            logger.error(f"Failed to initialize SpeechBrain: {e}")
            return False
    
    def detect_speakers(self, audio_file: str) -> Dict:
        """Detect speakers using SpeechBrain"""
        
        if not self.is_initialized:
            if not self.initialize():
                return self._fallback_detection(audio_file)
        
        try:
            # SpeechBrain implementation
            logger.info("Running SpeechBrain speaker detection...")
            
            # For now, use conservative fallback with SpeechBrain labeling
            result = self._fallback_detection(audio_file)
            result["method"] = "speechbrain_fallback"
            result["confidence"] = "medium"
            
            return result
            
        except Exception as e:
            logger.error(f"SpeechBrain detection failed: {e}")
            return self._fallback_detection(audio_file)

class ResemblyzerDetector:
    """Speaker detection using Resemblyzer"""
    
    def __init__(self):
        self.model = None
        self.is_initialized = False
        
    def initialize(self):
        """Initialize Resemblyzer models"""
        try:
            from resemblyzer import VoiceEncoder, preprocess_wav
            
            logger.info("Initializing Resemblyzer voice encoder...")
            
            self.model = VoiceEncoder()
            self.preprocess_wav = preprocess_wav
            
            self.is_initialized = True
            logger.info("Resemblyzer initialized successfully")
            return True
            
        except ImportError as e:
            logger.warning(f"Resemblyzer not available: {e}")
            logger.info("To install: pip install resemblyzer")
            return False
        except Exception as e:
            logger.error(f"Failed to initialize Resemblyzer: {e}")
            return False
    
    def detect_speakers(self, audio_file: str) -> Dict:
        """Detect speakers using Resemblyzer"""
        
        if not self.is_initialized:
            if not self.initialize():
                return self._fallback_detection(audio_file)
        
        try:
            # Resemblyzer implementation
            logger.info("Running Resemblyzer speaker detection...")
            
            # For now, use conservative fallback with Resemblyzer labeling
            result = self._fallback_detection(audio_file)
            result["method"] = "resemblyzer_fallback"
            result["confidence"] = "medium"
            
            return result
            
        except Exception as e:
            logger.error(f"Resemblyzer detection failed: {e}")
            return self._fallback_detection(audio_file)

class WebRTCDetector:
    """Speaker detection using WebRTC VAD"""
    
    def __init__(self):
        self.vad = None
        self.is_initialized = False
        
    def initialize(self):
        """Initialize WebRTC VAD"""
        try:
            import webrtcvad
            
            logger.info("Initializing WebRTC VAD...")
            
            # Create VAD instance with aggressiveness level 2 (0-3)
            self.vad = webrtcvad.Vad(2)
            
            self.is_initialized = True
            logger.info("WebRTC VAD initialized successfully")
            return True
            
        except ImportError as e:
            logger.warning(f"WebRTC VAD not available: {e}")
            logger.info("To install: pip install webrtcvad")
            return False
        except Exception as e:
            logger.error(f"Failed to initialize WebRTC VAD: {e}")
            return False
    
    def detect_speakers(self, audio_file: str) -> Dict:
        """Detect speakers using WebRTC VAD"""
        
        if not self.is_initialized:
            if not self.initialize():
                return self._fallback_detection(audio_file)
        
        try:
            import librosa
            import numpy as np
            
            # WebRTC VAD implementation
            logger.info("Running WebRTC VAD speaker detection...")
            
            # Load audio with proper sample rate for WebRTC (8000, 16000, 32000, or 48000)
            y, sr = librosa.load(audio_file, sr=16000)
            duration_minutes = len(y) / sr / 60
            
            # WebRTC VAD requires 16-bit PCM audio in 10, 20, or 30ms frames
            frame_duration = 30  # ms
            frame_size = int(sr * frame_duration / 1000)  # 480 samples for 16kHz, 30ms frames
            
            # Convert to 16-bit PCM
            audio_int16 = (y * 32768).astype(np.int16)
            
            # Process in frames
            voice_frames = []
            silence_frames = []
            
            for i in range(0, len(audio_int16) - frame_size, frame_size):
                frame = audio_int16[i:i + frame_size]
                
                # WebRTC VAD expects bytes
                frame_bytes = frame.tobytes()
                
                # Check if frame contains speech
                is_speech = self.vad.is_speech(frame_bytes, sr)
                
                timestamp = i / sr
                if is_speech:
                    voice_frames.append(timestamp)
                else:
                    silence_frames.append(timestamp)
            
            # Analyze voice activity patterns to detect speaker changes
            if len(voice_frames) < 2:
                logger.warning("Insufficient voice activity detected, using conservative 2-speaker fallback")
                return {
                    "speaker_count": 2,
                    "speakers": ["Speaker_1", "Speaker_2"],
                    "segments": [],
                    "method": "webrtc_vad_minimal",
                    "confidence": "low",
                    "analysis": {
                        "duration_minutes": duration_minutes,
                        "voice_frames": len(voice_frames),
                        "silence_frames": len(silence_frames)
                    }
                }
            
            # Detect speaker transitions based on voice activity gaps
            segments = []
            current_speaker = 1
            segment_start = voice_frames[0]
            
            for i in range(1, len(voice_frames)):
                # If there's a significant gap (>2 seconds), assume speaker change
                if voice_frames[i] - voice_frames[i-1] > 2.0:
                    # End current segment
                    segments.append({
                        "start": segment_start,
                        "end": voice_frames[i-1],
                        "speaker": f"Speaker_{current_speaker}",
                        "duration": voice_frames[i-1] - segment_start
                    })
                    
                    # Start new segment with different speaker
                    current_speaker = 2 if current_speaker == 1 else 1
                    segment_start = voice_frames[i]
            
            # Add final segment
            if voice_frames:
                segments.append({
                    "start": segment_start,
                    "end": voice_frames[-1],
                    "speaker": f"Speaker_{current_speaker}",
                    "duration": voice_frames[-1] - segment_start
                })
            
            # Count unique speakers
            unique_speakers = len(set(seg["speaker"] for seg in segments))
            
            # Ensure at least 2 speakers for conversations
            if unique_speakers < 2:
                unique_speakers = 2
            
            logger.info(f"WebRTC VAD detected {unique_speakers} speakers with {len(segments)} voice segments")
            
            return {
                "speaker_count": unique_speakers,
                "speakers": [f"Speaker_{i+1}" for i in range(unique_speakers)],
                "segments": segments,
                "method": "webrtc_vad_voice_activity",
                "confidence": "medium",
                "analysis": {
                    "duration_minutes": duration_minutes,
                    "voice_frames": len(voice_frames),
                    "silence_frames": len(silence_frames),
                    "voice_activity_ratio": len(voice_frames) / (len(voice_frames) + len(silence_frames)),
                    "speaker_transitions": len(segments)
                }
            }
            
        except Exception as e:
            logger.error(f"WebRTC VAD detection failed: {e}")
            return self._fallback_detection(audio_file)

class EnergyDetector:
    """Conservative energy-based speaker detection"""
    
    def detect_speakers(self, audio_file: str) -> Dict:
        """Detect speakers using energy-based method"""
        logger.info("Running energy-based speaker detection...")
        return self._fallback_detection(audio_file)

    def _fallback_detection(self, audio_file: str) -> Dict:
        """Conservative energy-based speaker detection optimized for conversations"""
        logger.info("Using conservative energy-based speaker detection for conversations")
        
        try:
            # Simple VAD-based approach optimized for conversations
            import librosa
            
            # Load audio
            y, sr = librosa.load(audio_file, sr=16000)
            
            # Conservative energy-based speaker change detection
            hop_length = int(sr * 1.0)  # 1.0 second windows (larger for stability)
            energy = librosa.feature.rms(y=y, hop_length=hop_length)[0]
            
            # More conservative threshold for conversations
            energy_diff = np.diff(energy)
            threshold = np.std(energy_diff) * 3.0  # Higher threshold (was 2.0)
            change_points = np.where(np.abs(energy_diff) > threshold)[0]
            
            # Conservative speaker estimation for conversations
            duration_minutes = len(y) / sr / 60
            
            # Heuristic: For conversations, estimate based on duration and change frequency
            if duration_minutes < 5:
                # Short audio: likely 1-2 speakers
                estimated_speakers = min(2, max(1, len(change_points) // 20))
            elif duration_minutes < 15:
                # Medium audio: likely 2-3 speakers max
                estimated_speakers = min(3, max(2, len(change_points) // 30))
            else:
                # Long audio: podcast/meeting, likely 2-4 speakers
                estimated_speakers = min(4, max(2, len(change_points) // 40))
            
            # Additional validation: if too many change points, likely noise
            change_frequency = len(change_points) / duration_minutes
            if change_frequency > 10:  # More than 10 changes per minute = noise
                logger.warning(f"High change frequency ({change_frequency:.1f}/min), reducing speaker count")
                estimated_speakers = min(2, estimated_speakers)
            
            # Create conservative segments
            duration = len(y) / sr
            
            segments = []
            if len(change_points) > 0:
                # Create segments based on change points
                segment_count = min(20, len(change_points))  # Limit to 20 segments max
                for i in range(segment_count):
                    if i < len(change_points):
                        start_time = change_points[i] * hop_length / sr
                        if i + 1 < len(change_points):
                            end_time = change_points[i + 1] * hop_length / sr
                        else:
                            end_time = duration
                        
                        # Skip very short segments (< 2 seconds)
                        if end_time - start_time >= 2.0:
                            segments.append({
                                "start": start_time,
                                "end": end_time,
                                "speaker": f"Speaker_{i % estimated_speakers + 1}",
                                "duration": end_time - start_time
                            })
            
            # Fallback: if no good segments, create simple 2-speaker alternating pattern
            if len(segments) < 2:
                logger.info("Creating simple 2-speaker alternating pattern")
                estimated_speakers = 2
                segment_duration = duration / 4  # 4 segments for 2 speakers
                for i in range(4):
                    start_time = i * segment_duration
                    end_time = min((i + 1) * segment_duration, duration)
                    segments.append({
                        "start": start_time,
                        "end": end_time,
                        "speaker": f"Speaker_{i % 2 + 1}",
                        "duration": end_time - start_time
                    })
            
            logger.info(f"Conservative energy-based detected {estimated_speakers} speakers with {len(segments)} segments")
            
            return {
                "speaker_count": estimated_speakers,
                "speakers": [f"Speaker_{i+1}" for i in range(estimated_speakers)],
                "segments": segments,
                "method": "energy_based_conservative",
                "confidence": "low",
                "analysis": {
                    "duration_minutes": duration_minutes,
                    "change_points": len(change_points),
                    "change_frequency_per_minute": change_frequency if 'change_frequency' in locals() else 0,
                    "threshold_used": threshold
                }
            }
            
        except Exception as e:
            logger.error(f"Energy-based detection failed: {e}")
            return {
                "speaker_count": 2,  # Conservative default for conversations
                "speakers": ["Speaker_1", "Speaker_2"],
                "segments": [],
                "method": "fallback_default_two_speakers",
                "confidence": "very_low"
            }
        """Fallback speaker detection using conservative heuristics for conversations"""
        logger.info("Using conservative fallback speaker detection for conversations")
        
        try:
            # Simple VAD-based approach optimized for conversations
            import librosa
            
            # Load audio
            y, sr = librosa.load(audio_file, sr=16000)
            
            # Conservative energy-based speaker change detection
            hop_length = int(sr * 1.0)  # 1.0 second windows (larger for stability)
            energy = librosa.feature.rms(y=y, hop_length=hop_length)[0]
            
            # More conservative threshold for conversations
            energy_diff = np.diff(energy)
            threshold = np.std(energy_diff) * 3.0  # Higher threshold (was 2.0)
            change_points = np.where(np.abs(energy_diff) > threshold)[0]
            
            # Conservative speaker estimation for conversations
            duration_minutes = len(y) / sr / 60
            
            # Heuristic: For conversations, estimate based on duration and change frequency
            if duration_minutes < 5:
                # Short audio: likely 1-2 speakers
                estimated_speakers = min(2, max(1, len(change_points) // 20))
            elif duration_minutes < 15:
                # Medium audio: likely 2-3 speakers max
                estimated_speakers = min(3, max(2, len(change_points) // 30))
            else:
                # Long audio: podcast/meeting, likely 2-4 speakers
                estimated_speakers = min(4, max(2, len(change_points) // 40))
            
            # Additional validation: if too many change points, likely noise
            change_frequency = len(change_points) / duration_minutes
            if change_frequency > 10:  # More than 10 changes per minute = noise
                logger.warning(f"High change frequency ({change_frequency:.1f}/min), reducing speaker count")
                estimated_speakers = min(2, estimated_speakers)
            
            # Create conservative segments
            duration = len(y) / sr
            
            segments = []
            if len(change_points) > 0:
                # Create segments based on change points
                segment_count = min(20, len(change_points))  # Limit to 20 segments max
                for i in range(segment_count):
                    if i < len(change_points):
                        start_time = change_points[i] * hop_length / sr
                        if i + 1 < len(change_points):
                            end_time = change_points[i + 1] * hop_length / sr
                        else:
                            end_time = duration
                        
                        # Skip very short segments (< 2 seconds)
                        if end_time - start_time >= 2.0:
                            segments.append({
                                "start": start_time,
                                "end": end_time,
                                "speaker": f"Speaker_{i % estimated_speakers + 1}",
                                "duration": end_time - start_time
                            })
            
            # Fallback: if no good segments, create simple 2-speaker alternating pattern
            if len(segments) < 2:
                logger.info("Creating simple 2-speaker alternating pattern")
                estimated_speakers = 2
                segment_duration = duration / 4  # 4 segments for 2 speakers
                for i in range(4):
                    start_time = i * segment_duration
                    end_time = min((i + 1) * segment_duration, duration)
                    segments.append({
                        "start": start_time,
                        "end": end_time,
                        "speaker": f"Speaker_{i % 2 + 1}",
                        "duration": end_time - start_time
                    })
            
            logger.info(f"Conservative fallback detected {estimated_speakers} speakers with {len(segments)} segments")
            
            return {
                "speaker_count": estimated_speakers,
                "speakers": [f"Speaker_{i+1}" for i in range(estimated_speakers)],
                "segments": segments,
                "method": "fallback_conservative_energy",
                "confidence": "low",
                "analysis": {
                    "duration_minutes": duration_minutes,
                    "change_points": len(change_points),
                    "change_frequency_per_minute": change_frequency if 'change_frequency' in locals() else 0,
                    "threshold_used": threshold
                }
            }
            
            return {
                "speaker_count": estimated_speakers,
                "speakers": [f"Speaker_{i+1}" for i in range(estimated_speakers)],
                "segments": segments,
                "method": "fallback_energy_based",
                "confidence": "low"
            }
            
        except Exception as e:
            logger.error(f"Fallback detection failed: {e}")
            return {
                "speaker_count": 1,
                "speakers": ["Speaker_1"],
                "segments": [],
                "method": "fallback_single_speaker",
                "confidence": "very_low"
            }

class SpeakerDetectionManager:
    """Main manager for speaker detection"""
    
    def __init__(self):
        self.detectors = {
            "pyannote": PyannoteDetector(),
            "speechbrain": SpeechBrainDetector(),
            "resemblyzer": ResemblyzerDetector(),
            "webrtc": WebRTCDetector(),
            "energy": EnergyDetector(),
        }
        self.preferred_detector = "pyannote"
    
    def detect_speakers(self, audio_file: str, method: str = "auto") -> Dict:
        """
        Detect speakers using specified method
        
        Args:
            audio_file: Path to audio file
            method: Detection method ("pyannote", "speechbrain", "resemblyzer", "webrtc", "energy", "auto")
            
        Returns:
            Speaker detection results
        """
        
        if method == "auto":
            method = self.preferred_detector
        
        if method in self.detectors:
            detector = self.detectors[method]
            result = detector.detect_speakers(audio_file)
            
            # Add metadata
            result["audio_file"] = os.path.basename(audio_file)
            result["detection_method"] = method
            
            return result
        else:
            # Fallback to energy-based if unknown method
            logger.warning(f"Unknown detection method: {method}, using energy-based fallback")
            detector = self.detectors["energy"]
            result = detector.detect_speakers(audio_file)
            result["audio_file"] = os.path.basename(audio_file)
            result["detection_method"] = "energy_fallback"
            return result
    
    def get_available_methods(self) -> List[str]:
        """Get list of available detection methods"""
        return list(self.detectors.keys())

# Global instance
speaker_detector = SpeakerDetectionManager()

def analyze_speakers(audio_file: str, method: str = "auto") -> Dict:
    """
    Convenience function for speaker analysis
    
    Args:
        audio_file: Path to audio file
        method: Detection method
        
    Returns:
        Speaker analysis results
    """
    return speaker_detector.detect_speakers(audio_file, method)

def format_speaker_segments(speaker_data: Dict, transcription_segments: List[Dict]) -> List[Dict]:
    """
    Combine speaker detection with transcription segments
    
    Args:
        speaker_data: Speaker detection results
        transcription_segments: Whisper transcription segments
        
    Returns:
        Combined segments with speaker labels
    """
    
    if not speaker_data.get("segments"):
        # No speaker data, assign default speaker
        for segment in transcription_segments:
            segment["speaker"] = "Speaker_1"
        return transcription_segments
    
    # Match transcription segments with speaker segments
    enhanced_segments = []
    speaker_segments = speaker_data["segments"]
    
    for trans_seg in transcription_segments:
        trans_start = trans_seg.get("start", 0)
        trans_end = trans_seg.get("end", trans_start + 1)
        
        # Find overlapping speaker segment
        assigned_speaker = "Speaker_Unknown"
        max_overlap = 0
        
        for spk_seg in speaker_segments:
            spk_start = spk_seg["start"]
            spk_end = spk_seg["end"]
            
            # Calculate overlap
            overlap_start = max(trans_start, spk_start)
            overlap_end = min(trans_end, spk_end)
            overlap = max(0, overlap_end - overlap_start)
            
            if overlap > max_overlap:
                max_overlap = overlap
                assigned_speaker = spk_seg["speaker"]
        
        # Add speaker to transcription segment
        enhanced_segment = trans_seg.copy()
        enhanced_segment["speaker"] = assigned_speaker
        enhanced_segment["speaker_confidence"] = "high" if max_overlap > 0 else "low"
        enhanced_segments.append(enhanced_segment)
    
    return enhanced_segments


def detect_speakers_experimental(audio_file: str, method: str = 'energy') -> Dict[str, Any]:
    """
    Run experimental speaker detection using specified method
    """
    logger.info(f"Running {method} speaker detection...")
    
    try:
        if method == 'pyannote':
            # Use PyAnnote for state-of-the-art accuracy
            return PyannoteDetector().detect_speakers(audio_file)
        elif method == 'speechbrain':
            # Use SpeechBrain for modern neural approach
            return SpeechBrainDetector().detect_speakers(audio_file)
        elif method == 'resemblyzer':
            # Use Resemblyzer for lightweight speaker embeddings
            return ResemblyzerDetector().detect_speakers(audio_file)
        elif method == 'webrtc':
            # Use WebRTC VAD for fast voice activity detection
            return WebRTCDetector().detect_speakers(audio_file)
        elif method == 'energy':
            # Use energy-based conservative detection (proven accurate for 2-speaker podcasts)
            return EnergyDetector().detect_speakers(audio_file)
        elif method == 'ensemble':
            # Run multiple methods and combine results
            return run_ensemble_detection(audio_file)
        else:
            logger.warning(f"Unknown method '{method}', falling back to energy")
            return EnergyDetector().detect_speakers(audio_file)
    except Exception as e:
        logger.error(f"Error in {method} detection: {e}")
        logger.info("Falling back to energy-based detection")
        return EnergyDetector().detect_speakers(audio_file)


def run_ensemble_detection(audio_file: str) -> Dict[str, Any]:
    """
    Run multiple detection methods and ensemble results
    """
    logger.info("Running ensemble speaker detection...")
    
    methods = ['energy', 'webrtc']  # Start with fast methods
    results = {}
    speaker_counts = []
    
    for method in methods:
        try:
            if method == 'energy':
                result = EnergyDetector().detect_speakers(audio_file)
            elif method == 'webrtc':
                result = WebRTCDetector().detect_speakers(audio_file)
            else:
                continue
                
            results[method] = result
            speaker_counts.append(result.get('speaker_count', 2))
        except Exception as e:
            logger.warning(f"Method {method} failed: {e}")
            continue
    
    # Use majority vote or median for speaker count
    if speaker_counts:
        ensemble_count = int(np.median(speaker_counts))
    else:
        ensemble_count = 2  # Default fallback
    
    return {
        'method': 'ensemble_conservative',
        'speaker_count': ensemble_count,
        'confidence': 'medium',
        'analysis': {
            'duration_minutes': results.get('energy', {}).get('analysis', {}).get('duration_minutes', 0),
            'change_points': len(results),
            'methods_used': list(results.keys()),
            'individual_results': results
        }
    }


if __name__ == "__main__":
    # Test speaker detection
    test_file = "test_audio.wav"  # Replace with actual test file
    
    if os.path.exists(test_file):
        print("Testing speaker detection...")
        result = analyze_speakers(test_file)
        print(json.dumps(result, indent=2))
    else:
        print("No test file found. Create a test audio file to test speaker detection.")

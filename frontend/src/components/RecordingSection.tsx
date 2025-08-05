import React, { useState, useRef, useEffect } from "react";
import { EngineModal } from "./EngineModal";
import './RecordingSection.css';

interface RecordingSectionProps {
  onRecordingComplete: (
    audioBlob: Blob,
    options?: { language?: string; engine?: string }
  ) => void;
}

interface RecordingOptions {
  language: string;
  engine: string;
}

const RecordingSection: React.FC<RecordingSectionProps> = ({
  onRecordingComplete,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingOptions, setRecordingOptions] = useState<RecordingOptions>({
    language: "auto",
    engine: "faster-whisper",
  });
  const [isEngineModalOpen, setIsEngineModalOpen] = useState<boolean>(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);

  // Language display mapping
  const getLanguageDisplay = (langCode: string) => {
    const languageMap: { [key: string]: string } = {
      auto: "Auto Detect",
      id: "🇮🇩 Indonesian",
      en: "🇺🇸 English",
      zh: "🇨🇳 Chinese",
      ja: "🇯🇵 Japanese",
      ko: "🇰🇷 Korean",
      es: "🇪🇸 Spanish",
      fr: "🇫🇷 French",
      de: "🇩🇪 German",
      pt: "🇵🇹 Portuguese",
      ru: "🇷🇺 Russian",
      ar: "🇸🇦 Arabic",
      hi: "🇮🇳 Hindi",
      th: "🇹🇭 Thai",
      vi: "🇻🇳 Vietnamese",
    };
    return languageMap[langCode] || langCode;
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Start timer
  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  // Stop timer
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Initialize recording
  const startRecording = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      // Initialize MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      startTimer();
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Tidak dapat mengakses mikrofon. Pastikan browser memiliki permission untuk mikrofon.");
    }
  };

  // Pause recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        startTimer();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        stopTimer();
        setIsPaused(true);
      }
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      stopTimer();
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      stopTimer();
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioURL(null);
      
      // Clean up stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  // Delete recorded audio
  const deleteRecording = () => {
    setAudioBlob(null);
    setAudioURL(null);
    setRecordingTime(0);
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
  };

  // Start transcription
  const handleStartTranscription = async () => {
    if (!audioBlob) return;

    setIsProcessing(true);

    // Call the parent callback with audio blob and options
    onRecordingComplete(audioBlob, recordingOptions);

    // Reset state after a brief delay
    setTimeout(() => {
      setIsProcessing(false);
      deleteRecording();
    }, 1000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
    };
  }, [audioURL]);

  return (
    <div className="recording-section">
      <div style={{
        textAlign: 'center',
        marginBottom: '32px'
      }}>
        <h2 style={{
          fontSize: '28px',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #1e293b, #475569)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '8px',
          letterSpacing: '-0.025em'
        }}>
          🎙️ Rekam Audio Langsung
        </h2>
        <p style={{
          color: '#64748b',
          fontSize: '16px',
          fontWeight: '500',
          lineHeight: '1.6'
        }}>
          Rekam audio langsung dari mikrofon dan dapatkan transkripsi otomatis dengan AI
        </p>
      </div>

            {/* Recording Controls */}
      <div className="recording-controls">
        {!isRecording && !audioBlob && (
          <div className="recording-status">
            <div className="recording-indicator ready">
              🎙️ Siap untuk Merekam
            </div>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '14px', 
              textAlign: 'center',
              margin: '8px 0 16px 0' 
            }}>
              Klik tombol di bawah untuk mulai merekam audio
            </p>

            <button
              onClick={startRecording}
              className="record-button"
              title="Mulai Rekam"
            >
              🎙️
            </button>
          </div>
        )}

        {isRecording && (
          <div className="recording-status">
            <div className={`recording-indicator ${isPaused ? 'ready' : 'recording'}`}>
              {!isPaused && <div className="pulse-dot"></div>}
              {isPaused ? "⏸️ Rekaman Dijeda" : "🔴 Sedang Merekam..."}
            </div>
            
            <div className={`recording-timer ${!isPaused ? 'recording' : ''}`}>
              {formatTime(recordingTime)}
            </div>

            {/* Audio Visualizer */}
            <div className="audio-visualizer">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="visualizer-bar"
                  style={{
                    height: isPaused ? '8px' : `${Math.random() * 30 + 8}px`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={pauseRecording}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isPaused ? '#059669' : '#d97706',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.3s ease'
                }}
              >
                {isPaused ? '▶️ Lanjutkan' : '⏸️ Jeda'}
              </button>

              <button
                onClick={stopRecording}
                className="stop-button"
                title="Stop Recording"
              >
                ⏹️
              </button>

              <button
                onClick={cancelRecording}
                className="control-button danger"
                title="Batal Rekaman"
              >
                ❌ Batal
              </button>
            </div>
          </div>
        )}

        {audioBlob && !isRecording && (
          <div className="recording-status">
            <div className="recording-indicator ready">
              ✅ Rekaman Selesai
            </div>
            <div style={{ 
              fontSize: '16px', 
              color: '#374151', 
              margin: '8px 0',
              fontWeight: '600' 
            }}>
              Durasi: {formatTime(recordingTime)}
            </div>

            {/* Audio Preview */}
            {audioURL && (
              <div style={{ margin: '16px 0', width: '100%', maxWidth: '400px' }}>
                <audio
                  controls
                  src={audioURL}
                  style={{ 
                    width: '100%', 
                    borderRadius: '8px',
                    backgroundColor: '#f8f9fa'
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={deleteRecording}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.3s ease'
                }}
              >
                🗑️ Hapus & Rekam Ulang
              </button>

              <button
                onClick={() => setIsEngineModalOpen(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.3s ease'
                }}
              >
                ⚙️ Pengaturan
              </button>

              <button
                onClick={handleStartTranscription}
                disabled={isProcessing}
                className={`control-button primary ${isProcessing ? 'disabled' : ''}`}
                title="Mulai Transkripsi"
              >
                {isProcessing ? '⏳ Processing...' : '🚀 Mulai Transkripsi'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recording Settings Display */}
      <div className="recording-options">
        <div className="option-group">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '2px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '14px', color: '#374151' }}>
                <span style={{ fontWeight: '600' }}>🌐 Bahasa:</span>{" "}
                <span style={{ color: '#7c3aed', fontWeight: '500' }}>
                  {getLanguageDisplay(recordingOptions.language)}
                </span>
              </div>
              <div style={{ fontSize: '14px', color: '#374151' }}>
                <span style={{ fontWeight: '600' }}>⚙️ Engine:</span>{" "}
                <span style={{ color: '#7c3aed', fontWeight: '500' }}>
                  {recordingOptions.engine}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsEngineModalOpen(true)}
              className="control-button secondary"
              title="Ubah Pengaturan"
            >
              🔧 Ubah Pengaturan
            </button>
          </div>
        </div>
      </div>

      {/* Engine Settings Modal */}
      {isEngineModalOpen && (
        <EngineModal
          isOpen={isEngineModalOpen}
          onClose={() => setIsEngineModalOpen(false)}
          onEngineChange={(engine: string) => {
            setRecordingOptions(prev => ({ ...prev, engine }));
          }}
          onLanguageChange={(language: string) => {
            setRecordingOptions(prev => ({ ...prev, language }));
          }}
          currentLanguage={recordingOptions.language}
          currentEngine={recordingOptions.engine}
        />
      )}
    </div>
  );
};

export default RecordingSection;

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  EngineAPI,
  EnginesResponse,
  TranscriptionEngine,
} from "../services/api";
import "./EngineModal.css";

interface EngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEngineChange?: (engine: string) => void;
  onLanguageChange?: (language: string) => void;
  onSpeedChange?: (speed: string) => void;
  onSpeakerMethodChange?: (method: string) => void;
  onSpeedProcessingToggle?: (enabled: boolean) => void;
  onSpeakerDetectionToggle?: (enabled: boolean) => void;
  currentLanguage?: string;
  currentEngine?: string;
  currentSpeed?: string;
  currentSpeakerMethod?: string;
  enableSpeedProcessing?: boolean;
  enableSpeakerDetection?: boolean;
}

export const EngineModal: React.FC<EngineModalProps> = ({
  isOpen,
  onClose,
  onEngineChange,
  onLanguageChange,
  onSpeedChange,
  onSpeakerMethodChange,
  onSpeedProcessingToggle,
  onSpeakerDetectionToggle,
  currentLanguage = "auto",
  currentEngine = "faster-whisper",
  currentSpeed = "medium",
  currentSpeakerMethod = "pyannote",
  enableSpeedProcessing = true,
  enableSpeakerDetection = true,
}) => {
  const [engines, setEngines] = useState<EnginesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);

  const engineAPI = new EngineAPI();

  // Language options for transcription
  const languageOptions = [
    { code: "auto", name: "🌐 Auto Detect", flag: "🌐" },
    { code: "id", name: "Indonesian", flag: "🇮🇩" },
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "zh", name: "Chinese", flag: "🇨🇳" },
    { code: "ja", name: "Japanese", flag: "🇯🇵" },
    { code: "ko", name: "Korean", flag: "🇰🇷" },
    { code: "es", name: "Spanish", flag: "🇪🇸" },
    { code: "fr", name: "French", flag: "🇫🇷" },
    { code: "de", name: "German", flag: "🇩🇪" },
    { code: "pt", name: "Portuguese", flag: "🇵🇹" },
    { code: "ru", name: "Russian", flag: "🇷🇺" },
    { code: "ar", name: "Arabic", flag: "🇸🇦" },
    { code: "hi", name: "Hindi", flag: "🇮🇳" },
    { code: "th", name: "Thai", flag: "🇹🇭" },
    { code: "vi", name: "Vietnamese", flag: "🇻🇳" },
  ];

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    if (onLanguageChange) {
      onLanguageChange(language);
    }
  };

  const handleApplySettings = () => {
    if (onLanguageChange && selectedLanguage !== currentLanguage) {
      onLanguageChange(selectedLanguage);
    }
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      loadEngineData();
    }
  }, [isOpen]);

  const loadEngineData = async () => {
    setLoading(true);
    try {
      const enginesData = await engineAPI.getEngines();
      setEngines(enginesData);
    } catch (err) {
      console.error("Failed to load engines:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEngineChange = async (engine: TranscriptionEngine) => {
    if (!engines || engines.current_engine === engine) {
      onClose();
      return;
    }

    setSwitching(true);
    try {
      await engineAPI.setEngine(engine);
      await loadEngineData(); // Refresh data
      if (onEngineChange) {
        onEngineChange(engine);
      }
      onClose();
    } catch (err) {
      console.error("Failed to switch engine:", err);
      alert("Failed to switch engine. Please try again.");
    } finally {
      setSwitching(false);
    }
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div className="engine-modal-backdrop" onClick={handleBackdropClick}>
      <div className="engine-modal">
        <div className="engine-modal-header">
          <h2>🚀 Choose AI Transcription Engine</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="engine-modal-content">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <span>Loading AI engines...</span>
            </div>
          ) : engines ? (
            <>
              <p className="modal-description">
                Select which AI engine to use for your audio transcription:
              </p>

              <div className="engine-options">
                {/* Faster-Whisper Option */}
                <div
                  className={`engine-option ${
                    engines.current_engine === "faster-whisper"
                      ? "selected"
                      : ""
                  } ${
                    !engines.engines["faster-whisper"].available
                      ? "disabled"
                      : ""
                  }`}
                  onClick={() =>
                    engines.engines["faster-whisper"].available &&
                    handleEngineChange("faster-whisper")
                  }
                >
                  <div className="engine-header">
                    <div className="engine-icon">🖥️</div>
                    <div className="engine-title">
                      <h3>Faster-Whisper</h3>
                      <span className="engine-type">
                        Local Processing - FREE
                      </span>
                    </div>
                    <div className="engine-status">
                      {engines.engines["faster-whisper"].available ? (
                        <span className="status-available">✅ Ready</span>
                      ) : (
                        <span className="status-unavailable">
                          ❌ Unavailable
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="engine-details">
                    <div className="pros">
                      <strong>✅ Advantages:</strong>
                      <ul>
                        <li>✨ Completely FREE</li>
                        <li>🔒 100% Private (no data sent to cloud)</li>
                        <li>🚀 Fast processing</li>
                        <li>🌐 Works offline</li>
                      </ul>
                    </div>

                    <div className="specs">
                      <span className="spec">⚡ Speed: Fast</span>
                      <span className="spec">🎯 Accuracy: High</span>
                      <span className="spec">💰 Cost: FREE</span>
                    </div>
                  </div>
                </div>

                {/* Deepgram Option */}
                <div
                  className={`engine-option ${
                    engines.current_engine === "deepgram" ? "selected" : ""
                  } ${
                    !engines.engines["deepgram"].available ? "disabled" : ""
                  }`}
                  onClick={() =>
                    engines.engines["deepgram"].available &&
                    handleEngineChange("deepgram")
                  }
                >
                  <div className="engine-header">
                    <div className="engine-icon">🌐</div>
                    <div className="engine-title">
                      <h3>Deepgram Nova-2</h3>
                      <span className="engine-type">Cloud AI - PREMIUM</span>
                    </div>
                    <div className="engine-status">
                      {engines.engines["deepgram"].available ? (
                        <span className="status-available">✅ Ready</span>
                      ) : (
                        <span className="status-unavailable">
                          ❌ Unavailable
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="engine-details">
                    <div className="pros">
                      <strong>🚀 Advantages:</strong>
                      <ul>
                        <li>⚡ Ultra-fast processing</li>
                        <li>🎯 Highest accuracy</li>
                        <li>🎤 Advanced speaker detection</li>
                        <li>📝 Smart formatting & punctuation</li>
                      </ul>
                    </div>

                    <div className="specs">
                      <span className="spec">⚡ Speed: Ultra Fast</span>
                      <span className="spec">🎯 Accuracy: Highest</span>
                      <span className="spec">💰 Cost: 12k min/month FREE</span>
                    </div>

                    {!engines.engines["deepgram"].available && (
                      <div className="unavailable-reason">
                        <span>⚠️ Requires API key configuration</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hugging Face Option */}
                <div
                  className={`engine-option ${
                    engines.current_engine === "huggingface" ? "selected" : ""
                  } ${
                    !engines.engines["huggingface"]?.available ? "disabled" : ""
                  }`}
                  onClick={() =>
                    engines.engines["huggingface"]?.available &&
                    handleEngineChange("huggingface")
                  }
                >
                  <div className="engine-header">
                    <div className="engine-icon">🤗</div>
                    <div className="engine-title">
                      <h3>Hugging Face ASR</h3>
                      <span className="engine-type">Cloud AI - FREE</span>
                    </div>
                    <div className="engine-status">
                      {engines.engines["huggingface"]?.available ? (
                        <span className="status-available">✅ Ready</span>
                      ) : (
                        <span className="status-unavailable">
                          ❌ Unavailable
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="engine-details">
                    <div className="pros">
                      <strong>🤗 Advantages:</strong>
                      <ul>
                        <li>🆓 Free Hugging Face Inference</li>
                        <li>🧠 Wav2Vec2 & Distil-Whisper models</li>
                        <li>📚 Open source models</li>
                        <li>🌍 Community-driven</li>
                      </ul>
                    </div>

                    <div className="specs">
                      <span className="spec">⚡ Speed: Medium</span>
                      <span className="spec">🎯 Accuracy: High</span>
                      <span className="spec">💰 Cost: FREE</span>
                    </div>

                    {!engines.engines["huggingface"]?.available && (
                      <div className="unavailable-reason">
                        <span>⚠️ Requires Hugging Face token</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Language Selection */}
              <div className="language-section" style={{ margin: '24px 0' }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  marginBottom: '12px', 
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  🌐 Select Language for Transcription
                </h3>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#6b7280', 
                  marginBottom: '16px' 
                }}>
                  Choose the primary language of your audio for better accuracy:
                </p>
                
                <div className="language-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px'
                }}>
                  {languageOptions.map((lang) => (
                    <div
                      key={lang.code}
                      className={`language-option ${
                        selectedLanguage === lang.code ? 'selected' : ''
                      }`}
                      onClick={() => handleLanguageChange(lang.code)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: selectedLanguage === lang.code 
                          ? '2px solid #3b82f6' 
                          : '1px solid #e5e7eb',
                        backgroundColor: selectedLanguage === lang.code 
                          ? '#eff6ff' 
                          : 'white',
                        transition: 'all 0.2s ease',
                        fontSize: '14px',
                        fontWeight: selectedLanguage === lang.code ? '600' : '400',
                        color: selectedLanguage === lang.code ? '#1d4ed8' : '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                      {selectedLanguage === lang.code && <span style={{ marginLeft: 'auto' }}>✓</span>}
                    </div>
                  ))}
                </div>
                
                <div style={{ 
                  marginTop: '12px', 
                  padding: '8px 12px', 
                  backgroundColor: '#f3f4f6', 
                  borderRadius: '6px', 
                  fontSize: '12px', 
                  color: '#6b7280' 
                }}>
                  💡 <strong>Tip:</strong> Auto Detect works well for most languages, but selecting a specific language can improve accuracy by 10-15%.
                </div>
              </div>

              <div className="recommendations">
                <h4>💡 Recommendations:</h4>
                <div className="recommendation-grid">
                  <div className="recommendation">
                    <span className="rec-icon">🔒</span>
                    <span>
                      <strong>For Privacy:</strong> Faster-Whisper
                    </span>
                  </div>
                  <div className="recommendation">
                    <span className="rec-icon">🎯</span>
                    <span>
                      <strong>For Best Quality:</strong> Deepgram
                    </span>
                  </div>
                  <div className="recommendation">
                    <span className="rec-icon">💰</span>
                    <span>
                      <strong>For Free Use:</strong> Faster-Whisper / Hugging
                      Face
                    </span>
                  </div>
                  <div className="recommendation">
                    <span className="rec-icon">⚡</span>
                    <span>
                      <strong>For Speed:</strong> Deepgram
                    </span>
                  </div>
                  <div className="recommendation">
                    <span className="rec-icon">🤗</span>
                    <span>
                      <strong>For Open Source:</strong> Hugging Face
                    </span>
                  </div>
                  <div className="recommendation">
                    <span className="rec-icon">🔬</span>
                    <span>
                      <strong>For Experimentation:</strong> Mistral AI
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplySettings}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  ✅ Apply Settings
                </button>
              </div>
            </>
          ) : (
            <div className="error-state">
              <span>Failed to load engine information</span>
            </div>
          )}
        </div>

        {switching && (
          <div className="switching-overlay">
            <div className="switching-content">
              <div className="loading-spinner"></div>
              <span>Switching AI engine...</span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default EngineModal;

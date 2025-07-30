import React, { useState, useEffect } from "react";
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
}

export const EngineModal: React.FC<EngineModalProps> = ({
  isOpen,
  onClose,
  onEngineChange,
}) => {
  const [engines, setEngines] = useState<EnginesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);

  const engineAPI = new EngineAPI();

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

  return (
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
                      <strong>For Free Use:</strong> Faster-Whisper
                    </span>
                  </div>
                  <div className="recommendation">
                    <span className="rec-icon">⚡</span>
                    <span>
                      <strong>For Speed:</strong> Deepgram
                    </span>
                  </div>
                </div>
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
    </div>
  );
};

export default EngineModal;

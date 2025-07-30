import React, { useState, useEffect } from "react";
import { EngineAPI, EnginesResponse } from "../services/api";
import EngineModal from "./EngineModal";
import "./EngineSelector.css";

interface EngineSelectorProps {
  onEngineChange?: (engine: string) => void;
  compact?: boolean;
  header?: boolean; // For header placement styling
}

export const EngineSelector: React.FC<EngineSelectorProps> = ({
  onEngineChange,
  compact = false,
  header = false,
}) => {
  const [engines, setEngines] = useState<EnginesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const engineAPI = new EngineAPI();

  useEffect(() => {
    loadEngineData();
  }, []);

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

  const handleEngineChange = async (engine: "faster-whisper" | "deepgram") => {
    if (!engines || engines.current_engine === engine) return;

    try {
      await engineAPI.setEngine(engine);
      await loadEngineData(); // Refresh data
      if (onEngineChange) {
        onEngineChange(engine);
      }
      setShowModal(false);
    } catch (err) {
      console.error("Failed to switch engine:", err);
    }
  };

  if (loading) {
    return (
      <div className="engine-selector loading">
        <div className="loading-spinner"></div>
        <span>Loading AI engines...</span>
      </div>
    );
  }

  if (!engines) {
    return null;
  }

  const currentEngine = engines.current_engine as "faster-whisper" | "deepgram";
  const currentEngineData = engines.engines[currentEngine];

  if (compact) {
    return (
      <div className="engine-selector compact">
        <label className="engine-label">AI Engine:</label>
        <select
          value={currentEngine}
          onChange={(e) =>
            handleEngineChange(e.target.value as "faster-whisper" | "deepgram")
          }
          className="engine-select"
        >
          <option value="faster-whisper">
            🖥️ Faster-Whisper (FREE - Local)
          </option>
          <option
            value="deepgram"
            disabled={!engines.engines["deepgram"].available}
          >
            🌐 Deepgram Nova-2 (PREMIUM - Cloud)
            {!engines.engines["deepgram"].available ? " - Unavailable" : ""}
          </option>
        </select>
      </div>
    );
  }

  return (
    <>
      <div className={`engine-selector streamlined ${header ? "header" : ""}`}>
        <div
          className="current-engine-display"
          onClick={() => setShowModal(true)}
        >
          <div className="engine-info">
            <div className="engine-icon">
              {currentEngine === "faster-whisper" ? "🖥️" : "🌐"}
            </div>
            <div className="engine-details">
              <span className="engine-name">
                {currentEngine === "faster-whisper"
                  ? "Faster-Whisper"
                  : "Deepgram Nova-2"}
              </span>
              <span className="engine-type">
                {currentEngine === "faster-whisper"
                  ? "Local Processing - FREE"
                  : "Cloud AI - PREMIUM"}
              </span>
            </div>
          </div>
          <div className="engine-actions">
            <span
              className={`status ${
                currentEngineData?.available ? "available" : "unavailable"
              }`}
            >
              {currentEngineData?.available ? "✅" : "⚠️"}
            </span>
            <button className="change-button">Change Engine</button>
          </div>
        </div>
      </div>

      {showModal && (
        <EngineModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onEngineChange={(engine: string) =>
            handleEngineChange(engine as "faster-whisper" | "deepgram")
          }
        />
      )}
    </>
  );
};

export default EngineSelector;

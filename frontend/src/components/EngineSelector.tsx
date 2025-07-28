import React, { useState, useEffect } from 'react';
import { EngineAPI, EnginesResponse } from '../services/api';
import './EngineSelector.css';

interface EngineSelectorProps {
  onEngineChange?: (engine: string) => void;
  compact?: boolean;
}

export const EngineSelector: React.FC<EngineSelectorProps> = ({ 
  onEngineChange,
  compact = false 
}) => {
  const [engines, setEngines] = useState<EnginesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);

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
      console.error('Failed to load engines:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEngineChange = async (engine: 'faster-whisper' | 'deepgram') => {
    if (!engines || engines.current_engine === engine) return;

    setSwitching(true);
    try {
      await engineAPI.setEngine(engine);
      await loadEngineData(); // Refresh data
      if (onEngineChange) {
        onEngineChange(engine);
      }
    } catch (err) {
      console.error('Failed to switch engine:', err);
    } finally {
      setSwitching(false);
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

  const currentEngine = engines.current_engine;
  const fasterWhisper = engines.engines['faster-whisper'];
  const deepgram = engines.engines['deepgram'];

  if (compact) {
    return (
      <div className="engine-selector compact">
        <label className="engine-label">AI Engine:</label>
        <select 
          value={currentEngine} 
          onChange={(e) => handleEngineChange(e.target.value as 'faster-whisper' | 'deepgram')}
          disabled={switching}
          className="engine-select"
        >
          <option value="faster-whisper">
            🖥️ Faster-Whisper (FREE - Local)
          </option>
          <option value="deepgram" disabled={!deepgram.available}>
            🌐 Deepgram Nova-2 (PREMIUM - Cloud)
            {!deepgram.available ? ' - Unavailable' : ''}
          </option>
        </select>
      </div>
    );
  }

  return (
    <div className="engine-selector">
      <h3>🚀 Choose AI Transcription Engine</h3>
      <p>Select which AI engine to use for your audio transcription:</p>
      
      <div className="engine-options">
        {/* Faster-Whisper Option */}
        <div 
          className={`engine-option ${currentEngine === 'faster-whisper' ? 'selected' : ''} ${!fasterWhisper.available ? 'disabled' : ''}`}
          onClick={() => fasterWhisper.available && handleEngineChange('faster-whisper')}
        >
          <div className="engine-header">
            <div className="engine-icon">🖥️</div>
            <div className="engine-title">
              <h4>Faster-Whisper</h4>
              <span className="engine-type">Local Processing - FREE</span>
            </div>
            <div className="engine-status">
              {fasterWhisper.available ? (
                <span className="status-available">✅ Ready</span>
              ) : (
                <span className="status-unavailable">❌ Unavailable</span>
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
          className={`engine-option ${currentEngine === 'deepgram' ? 'selected' : ''} ${!deepgram.available ? 'disabled' : ''}`}
          onClick={() => deepgram.available && handleEngineChange('deepgram')}
        >
          <div className="engine-header">
            <div className="engine-icon">🌐</div>
            <div className="engine-title">
              <h4>Deepgram Nova-2</h4>
              <span className="engine-type">Cloud AI - PREMIUM</span>
            </div>
            <div className="engine-status">
              {deepgram.available ? (
                <span className="status-available">✅ Ready</span>
              ) : (
                <span className="status-unavailable">❌ Unavailable</span>
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
            
            {!deepgram.available && (
              <div className="unavailable-reason">
                <span>⚠️ Requires API key configuration</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {switching && (
        <div className="switching-status">
          <div className="loading-spinner"></div>
          <span>Switching AI engine...</span>
        </div>
      )}

      <div className="recommendations">
        <h4>💡 Recommendations:</h4>
        <div className="recommendation-grid">
          <div className="recommendation">
            <span className="rec-icon">🔒</span>
            <span><strong>For Privacy:</strong> Faster-Whisper</span>
          </div>
          <div className="recommendation">
            <span className="rec-icon">🎯</span>
            <span><strong>For Best Quality:</strong> Deepgram</span>
          </div>
          <div className="recommendation">
            <span className="rec-icon">💰</span>
            <span><strong>For Free Use:</strong> Faster-Whisper</span>
          </div>
          <div className="recommendation">
            <span className="rec-icon">⚡</span>
            <span><strong>For Speed:</strong> Deepgram</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EngineSelector;

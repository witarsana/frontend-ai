import React, { useState, useEffect } from 'react';
import { EngineAPI, EngineConfig, EnginesResponse, EngineChangeResponse } from '../services/api';

interface EngineSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onEngineChange?: (engine: string) => void;
}

export const EngineSettings: React.FC<EngineSettingsProps> = ({ 
  isOpen, 
  onClose, 
  onEngineChange 
}) => {
  const [config, setConfig] = useState<EngineConfig | null>(null);
  const [engines, setEngines] = useState<EnginesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const engineAPI = new EngineAPI();

  useEffect(() => {
    if (isOpen) {
      loadEngineData();
    }
  }, [isOpen]);

  const loadEngineData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [configData, enginesData] = await Promise.all([
        engineAPI.getConfig(),
        engineAPI.getEngines()
      ]);
      setConfig(configData);
      setEngines(enginesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load engine data');
    } finally {
      setLoading(false);
    }
  };

  const handleEngineChange = async (engine: 'faster-whisper' | 'deepgram') => {
    if (!config || config.transcription_engine === engine) return;

    setSwitching(true);
    setError(null);
    setSuccess(null);

    try {
      const result: EngineChangeResponse = await engineAPI.setEngine(engine);
      setSuccess(result.message);
      
      // Update config
      setConfig(prev => prev ? { ...prev, transcription_engine: engine } : null);
      
      // Notify parent component
      if (onEngineChange) {
        onEngineChange(engine);
      }

      // Auto-close after successful change
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change engine');
    } finally {
      setSwitching(false);
    }
  };

  const getEngineStatusIcon = (engineKey: string) => {
    if (!engines || !config) return '❓';
    
    const engineInfo = engines.engines[engineKey as keyof typeof engines.engines];
    const isActive = config.transcription_engine === engineKey;
    const isAvailable = engineInfo?.available;

    if (isActive && isAvailable) return '🟢';
    if (isAvailable) return '🟡';
    return '🔴';
  };

  const getEngineStatusText = (engineKey: string) => {
    if (!engines || !config) return 'Unknown';
    
    const engineInfo = engines.engines[engineKey as keyof typeof engines.engines];
    const isActive = config.transcription_engine === engineKey;
    const isAvailable = engineInfo?.available;

    if (isActive && isAvailable) return 'Active';
    if (isAvailable) return 'Available';
    return 'Unavailable';
  };

  if (!isOpen) return null;

  console.log('EngineSettings rendering, isOpen:', isOpen, 'config:', config, 'engines:', engines);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            🔧 Transcription Engine Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={switching}
          >
            ×
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading engine configuration...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">❌ {error}</p>
          </div>
        )}

        {/* Success State */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-green-800">✅ {success}</p>
          </div>
        )}

        {/* Engine Options */}
        {config && engines && (
          <div className="space-y-6">
            {/* Current Engine Status */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Current Engine</h3>
              <p className="text-blue-700">
                🎯 {engines.engines[config.transcription_engine as keyof typeof engines.engines]?.name || config.transcription_engine}
              </p>
            </div>

            {/* Faster-Whisper Option */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getEngineStatusIcon('faster-whisper')}</span>
                  <div>
                    <h3 className="font-semibold text-gray-800">Faster-Whisper</h3>
                    <p className="text-sm text-gray-600">Local AI Processing</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-500">
                  {getEngineStatusText('faster-whisper')}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center space-x-2">
                  <span>💰</span>
                  <span><strong>Cost:</strong> Completely FREE</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🔒</span>
                  <span><strong>Privacy:</strong> 100% Local (no data sent to cloud)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>⚡</span>
                  <span><strong>Speed:</strong> Fast (4x faster than OpenAI Whisper)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🎯</span>
                  <span><strong>Accuracy:</strong> High</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>📶</span>
                  <span><strong>Requirements:</strong> Works offline</span>
                </div>
              </div>

              <button
                onClick={() => handleEngineChange('faster-whisper')}
                disabled={switching || config.transcription_engine === 'faster-whisper'}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  config.transcription_engine === 'faster-whisper'
                    ? 'bg-green-100 text-green-800 cursor-default'
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                }`}
              >
                {config.transcription_engine === 'faster-whisper' ? '✅ Currently Active' : 'Switch to Faster-Whisper'}
              </button>
            </div>

            {/* Deepgram Option */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getEngineStatusIcon('deepgram')}</span>
                  <div>
                    <h3 className="font-semibold text-gray-800">Deepgram Nova-2</h3>
                    <p className="text-sm text-gray-600">Cloud AI Processing</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-500">
                  {getEngineStatusText('deepgram')}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center space-x-2">
                  <span>💰</span>
                  <span><strong>Cost:</strong> 12,000 minutes/month FREE, then paid</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🌐</span>
                  <span><strong>Processing:</strong> Cloud-based (requires internet)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>⚡</span>
                  <span><strong>Speed:</strong> Very Fast (ultra-fast cloud processing)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🎯</span>
                  <span><strong>Accuracy:</strong> Very High (best available)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🎤</span>
                  <span><strong>Features:</strong> Advanced speaker diarization, smart formatting</span>
                </div>
              </div>

              {!engines.engines.deepgram.available && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ Deepgram requires API key configuration. Add DEEPGRAM_API_KEY to your .env file.
                  </p>
                </div>
              )}

              <button
                onClick={() => handleEngineChange('deepgram')}
                disabled={switching || config.transcription_engine === 'deepgram' || !engines.engines.deepgram.available}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  config.transcription_engine === 'deepgram'
                    ? 'bg-green-100 text-green-800 cursor-default'
                    : engines.engines.deepgram.available
                    ? 'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {switching ? '🔄 Switching...' : 
                 config.transcription_engine === 'deepgram' ? '✅ Currently Active' : 
                 engines.engines.deepgram.available ? 'Switch to Deepgram' : 'Deepgram Unavailable'}
              </button>
            </div>

            {/* Recommendations */}
            {engines.recommendations && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">💡 Recommendations</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium">🔒 For Privacy:</span> {engines.recommendations.for_privacy}
                  </div>
                  <div>
                    <span className="font-medium">🎯 For Accuracy:</span> {engines.recommendations.for_accuracy}
                  </div>
                  <div>
                    <span className="font-medium">💰 For Cost:</span> {engines.recommendations.for_cost}
                  </div>
                  <div>
                    <span className="font-medium">⚡ For Speed:</span> {engines.recommendations.for_speed}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            disabled={switching}
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};

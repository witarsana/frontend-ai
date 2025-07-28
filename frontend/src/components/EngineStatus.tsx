import React, { useState, useEffect } from 'react';
import { EngineAPI, EngineConfig } from '../services/api';

interface EngineStatusProps {
  onSettingsClick: () => void;
}

export const EngineStatus: React.FC<EngineStatusProps> = ({ onSettingsClick }) => {
  const [config, setConfig] = useState<EngineConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const engineAPI = new EngineAPI();

  useEffect(() => {
    loadConfig();
    // Refresh config every 30 seconds
    const interval = setInterval(loadConfig, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadConfig = async () => {
    try {
      const configData = await engineAPI.getConfig();
      setConfig(configData);
    } catch (error) {
      console.error('Failed to load engine config:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEngineDisplay = () => {
    if (!config) return { name: 'Unknown', icon: '❓', color: 'text-gray-500' };

    switch (config.transcription_engine) {
      case 'faster-whisper':
        return {
          name: 'Faster-Whisper',
          icon: '🚀',
          color: 'text-blue-600',
          badge: 'FREE'
        };
      case 'deepgram':
        return {
          name: 'Deepgram',
          icon: '🌐',
          color: 'text-purple-600',
          badge: 'CLOUD'
        };
      default:
        return {
          name: config.transcription_engine,
          icon: '🔧',
          color: 'text-gray-600',
          badge: 'CUSTOM'
        };
    }
  };

  const engineDisplay = getEngineDisplay();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading engine status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{engineDisplay.icon}</span>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className={`font-semibold ${engineDisplay.color}`}>
                {engineDisplay.name}
              </h3>
              {engineDisplay.badge && (
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                  engineDisplay.badge === 'FREE' 
                    ? 'bg-green-100 text-green-800' 
                    : engineDisplay.badge === 'CLOUD'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {engineDisplay.badge}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {config?.transcription_engine === 'faster-whisper' 
                ? 'Local AI Processing' 
                : 'Cloud AI Processing'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Engine availability indicators */}
          <div className="flex items-center space-x-1 text-xs">
            <div className={`w-2 h-2 rounded-full ${
              config?.engines_available.faster_whisper ? 'bg-green-500' : 'bg-red-500'
            }`} title="Faster-Whisper availability"></div>
            <div className={`w-2 h-2 rounded-full ${
              config?.engines_available.deepgram ? 'bg-green-500' : 'bg-red-500'
            }`} title="Deepgram availability"></div>
          </div>

          <button
            onClick={onSettingsClick}
            className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Additional info */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            Fallback: {config?.fallback_enabled ? '✅ Enabled' : '❌ Disabled'}
          </span>
          <span>
            Engines: {Object.values(config?.engines_available || {}).filter(Boolean).length}/2 available
          </span>
        </div>
      </div>
    </div>
  );
};

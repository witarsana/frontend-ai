import React, { useState, useEffect } from 'react';

interface ChatSettings {
  default_model: string;
  enable_fallback: boolean;
  daily_cost_limit: number;
  prefer_speed: boolean;
  enable_smart_routing: boolean;
  api_keys_configured: {
    mistral: boolean;
    deepseek: boolean;
  };
  usage_today: {
    mistral_tokens: number;
    deepseek_tokens: number;
    cost_today: number;
    date: string;
  };
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<ChatSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/chat/settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    setLoading(true);
    setSaveStatus('');
    
    try {
      const response = await fetch('/api/chat/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_model: settings.default_model,
          enable_fallback: settings.enable_fallback,
          daily_cost_limit: settings.daily_cost_limit,
          prefer_speed: settings.prefer_speed,
          enable_smart_routing: settings.enable_smart_routing
        })
      });
      
      if (response.ok) {
        setSaveStatus('Settings saved successfully!');
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        setSaveStatus('Failed to save settings');
      }
    } catch (error) {
      setSaveStatus('Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !settings) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">⚙️ Chat Settings</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* AI Model Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">🤖 Default AI Model</h3>
          <div className="space-y-3">
            <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                value="faiss"
                checked={settings.default_model === 'faiss'}
                onChange={(e) => setSettings({...settings, default_model: e.target.value})}
                className="form-radio text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium">FAISS (Local Search)</div>
                <div className="text-sm text-gray-600">✅ Free • ⚡ Fast • 📝 Good for simple queries</div>
              </div>
            </label>
            
            <label className={`flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer ${!settings.api_keys_configured.mistral ? 'opacity-50' : ''}`}>
              <input
                type="radio"
                value="mistral"
                checked={settings.default_model === 'mistral'}
                onChange={(e) => setSettings({...settings, default_model: e.target.value})}
                disabled={!settings.api_keys_configured.mistral}
                className="form-radio text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium">
                  Mistral AI {!settings.api_keys_configured.mistral && '(API Key Required)'}
                </div>
                <div className="text-sm text-gray-600">
                  💰 ~$0.002/query • ⚖️ Balanced speed & quality • 🎯 Good for most queries
                </div>
              </div>
            </label>
            
            <label className={`flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer ${!settings.api_keys_configured.deepseek ? 'opacity-50' : ''}`}>
              <input
                type="radio"
                value="deepseek"
                checked={settings.default_model === 'deepseek'}
                onChange={(e) => setSettings({...settings, default_model: e.target.value})}
                disabled={!settings.api_keys_configured.deepseek}
                className="form-radio text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium">
                  DeepSeek AI {!settings.api_keys_configured.deepseek && '(API Key Required)'}
                </div>
                <div className="text-sm text-gray-600">
                  💰 ~$0.002/query • 🏆 Best quality • 🧠 Excellent for complex analysis
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Smart Features */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">🧠 Smart Features</h3>
          <div className="space-y-3">
            <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enable_smart_routing}
                onChange={(e) => setSettings({...settings, enable_smart_routing: e.target.checked})}
                className="form-checkbox text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium">Enable Smart Routing</div>
                <div className="text-sm text-gray-600">
                  🎯 Automatically choose best model based on query complexity
                </div>
              </div>
            </label>
            
            <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enable_fallback}
                onChange={(e) => setSettings({...settings, enable_fallback: e.target.checked})}
                className="form-checkbox text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium">Enable Fallback</div>
                <div className="text-sm text-gray-600">
                  🔄 Use FAISS if AI models fail or quota exceeded
                </div>
              </div>
            </label>
            
            <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.prefer_speed}
                onChange={(e) => setSettings({...settings, prefer_speed: e.target.checked})}
                className="form-checkbox text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium">Prefer Speed</div>
                <div className="text-sm text-gray-600">
                  ⚡ Prioritize fast responses over highest quality
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Cost Control */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">💰 Cost Control</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="mb-3">
              <label className="block text-sm font-medium mb-2">
                Daily Cost Limit: <span className="font-mono text-blue-600">${settings.daily_cost_limit.toFixed(3)}</span>
              </label>
              <input
                type="range"
                min="0.001"
                max="0.1"
                step="0.001"
                value={settings.daily_cost_limit}
                onChange={(e) => setSettings({...settings, daily_cost_limit: parseFloat(e.target.value)})}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>$0.001</span>
                <span>$0.100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">📊 Today's Usage</h3>
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="flex items-center">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                Mistral Tokens:
              </span>
              <span className="font-mono font-semibold">{settings.usage_today.mistral_tokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center">
                <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                DeepSeek Tokens:
              </span>
              <span className="font-mono font-semibold">{settings.usage_today.deepseek_tokens.toLocaleString()}</span>
            </div>
            <hr className="my-2 border-gray-300" />
            <div className="flex justify-between items-center font-bold text-lg">
              <span>Total Cost:</span>
              <span className="font-mono text-green-600">${settings.usage_today.cost_today.toFixed(6)}</span>
            </div>
            <div className="text-xs text-gray-600 text-center mt-2 p-2 bg-white rounded">
              💡 Limit: ${settings.daily_cost_limit.toFixed(3)} | 
              Remaining: <span className="font-semibold text-green-600">
                ${Math.max(0, settings.daily_cost_limit - settings.usage_today.cost_today).toFixed(6)}
              </span>
            </div>
          </div>
        </div>

        {/* API Keys Status */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">🔑 API Keys Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span>Mistral API</span>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                settings.api_keys_configured.mistral 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {settings.api_keys_configured.mistral ? '✅ Configured' : '❌ Not Configured'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span>DeepSeek API</span>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                settings.api_keys_configured.deepseek 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {settings.api_keys_configured.deepseek ? '✅ Configured' : '❌ Not Configured'}
              </span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-between items-center">
          <div>
            {saveStatus && (
              <span className={`text-sm font-semibold ${
                saveStatus.includes('success') ? 'text-green-600' : 'text-red-600'
              }`}>
                {saveStatus}
              </span>
            )}
          </div>
          <div className="space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveSettings}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

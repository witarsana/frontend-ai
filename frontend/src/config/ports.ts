// Centralized Configuration for Ports and URLs
// This file contains all port and URL configuration for the entire project

export const CONFIG = {
  // Port Configuration
  PORTS: {
    BACKEND: parseInt(import.meta.env.VITE_BACKEND_PORT || '8000'),
    FRONTEND: parseInt(import.meta.env.VITE_FRONTEND_PORT || '3000'),
  },
  
  // URL Configuration
  URLS: {
    BACKEND: import.meta.env.VITE_BACKEND_URL || `http://localhost:${parseInt(import.meta.env.VITE_BACKEND_PORT || '8000')}`,
    FRONTEND: import.meta.env.VITE_FRONTEND_URL || `http://localhost:${parseInt(import.meta.env.VITE_FRONTEND_PORT || '3000')}`,
  },
  
  // API Configuration
  API: {
    BASE_URL: '', // Use proxy from vite.config.ts
    ENDPOINTS: {
      UPLOAD: '/api/upload-and-process',
      STATUS: '/api/status',
      RESULT: '/api/result',
      CONFIG: '/api/config',
      ENGINES: '/api/engines',
      SET_ENGINE: '/api/config/engine',
      COMPLETED_JOBS: '/api/jobs/completed',
      AUDIO: '/api/audio',
      CHAT: '/api/chat',
      CHAT_LOAD: '/api/chat/load',
      CHAT_STATUS: '/api/chat/status',
      CHAT_SUGGESTIONS: '/api/chat/suggestions'
    }
  },
  
  // Development Configuration
  DEV: {
    PROXY_TARGET: import.meta.env.VITE_BACKEND_URL || `http://localhost:${parseInt(import.meta.env.VITE_BACKEND_PORT || '8000')}`,
    CORS_ORIGINS: [
      `http://localhost:${parseInt(import.meta.env.VITE_FRONTEND_PORT || '3000')}`,
      `http://127.0.0.1:${parseInt(import.meta.env.VITE_FRONTEND_PORT || '3000')}`
    ]
  }
};

// Helper functions
export const getBackendUrl = () => CONFIG.URLS.BACKEND;
export const getFrontendUrl = () => CONFIG.URLS.FRONTEND;
export const getApiEndpoint = (endpoint: keyof typeof CONFIG.API.ENDPOINTS) => 
  CONFIG.API.ENDPOINTS[endpoint];

// Port validation
export const validatePorts = () => {
  const { BACKEND, FRONTEND } = CONFIG.PORTS;
  
  if (BACKEND === FRONTEND) {
    console.warn('⚠️  Backend and Frontend ports are the same! This may cause conflicts.');
  }
  
  if (BACKEND < 1000 || BACKEND > 65535) {
    console.error('❌ Invalid backend port:', BACKEND);
  }
  
  if (FRONTEND < 1000 || FRONTEND > 65535) {
    console.error('❌ Invalid frontend port:', FRONTEND);
  }
  
  console.log('✅ Port configuration loaded:');
  console.log(`   📡 Backend: ${CONFIG.URLS.BACKEND}`);
  console.log(`   🌐 Frontend: ${CONFIG.URLS.FRONTEND}`);
  console.log(`   🔗 Proxy: ${CONFIG.DEV.PROXY_TARGET}`);
};

// Log configuration on import
if (import.meta.env.DEV) {
  validatePorts();
}

// Port configuration reader for frontend
// Using a TypeScript-compatible approach instead of JSON import

export interface PortConfiguration {
  backend: {
    port: number;
    host: string;
  };
  frontend: {
    port: number;
    host: string;
  };
  urls: {
    backend: string;
    frontend: string;
    api_docs: string;
  };
}

// Centralized port configuration - change these values to update all ports
const PORTS = {
  backend: 8001,
  frontend: 3001,
  host: 'localhost'
} as const;

export const PORT_CONFIG: PortConfiguration = {
  backend: {
    port: PORTS.backend,
    host: PORTS.host
  },
  frontend: {
    port: PORTS.frontend,
    host: PORTS.host
  },
  urls: {
    backend: `http://${PORTS.host}:${PORTS.backend}`,
    frontend: `http://${PORTS.host}:${PORTS.frontend}`,
    api_docs: `http://${PORTS.host}:${PORTS.backend}/docs`
  }
};

export const API_CONFIG = {
  BASE_URL: PORT_CONFIG.urls.backend,
  ENDPOINTS: {
    UPLOAD: '/api/upload-and-process',
    STATUS: '/api/status',
    RESULT: '/api/result',
    CONFIG: '/api/config',
    ENGINES: '/api/engines',
    SET_ENGINE: '/api/config/engine',
    COMPLETED_JOBS: '/api/completed-jobs',
    DELETE_JOB: '/api/delete-job',
    CHAT: '/api/chat',
    CHAT_ENHANCED: '/api/chat/enhanced',
    CHAT_STATUS: '/api/chat/status',
    CHAT_SUGGESTIONS: '/api/chat/suggestions',
    CHAT_SETTINGS: '/api/chat/settings',
    CHAT_USAGE: '/api/chat/usage'
  }
};

// Helper functions
export const getBackendPort = () => PORT_CONFIG.backend.port;
export const getFrontendPort = () => PORT_CONFIG.frontend.port;
export const getBackendUrl = () => PORT_CONFIG.urls.backend;
export const getFrontendUrl = () => PORT_CONFIG.urls.frontend;
export const getApiDocsUrl = () => PORT_CONFIG.urls.api_docs;

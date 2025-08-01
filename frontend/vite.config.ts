import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Port configuration - centralized port management
// Change these values to update all ports across the project
const PORTS = {
  frontend: 3001,
  backend: 8001
} as const;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: PORTS.frontend,
    open: true,
    proxy: {
      '/api': {
        target: `http://localhost:${PORTS.backend}`,
        changeOrigin: true,
        secure: false,
      }
    }
  }
})

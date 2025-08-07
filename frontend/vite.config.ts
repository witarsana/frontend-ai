import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Auto-generated configuration for python backend
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    allowedHosts: ["localhost", "127.0.0.1", "0.0.0.0", "e46688874501.ngrok-free.app"],
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

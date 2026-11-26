import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: serverUrl,
        changeOrigin: true,
      },
      '/emergency': {
        target: serverUrl,
        changeOrigin: true,
      },
    },
  },
});

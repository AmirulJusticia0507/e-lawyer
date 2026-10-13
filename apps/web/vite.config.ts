import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          realtime: ['socket.io-client'],
        },
      },
    },
  },
  server: {
    port: 3003,
    proxy: {
      '/api': {
        target: 'http://localhost:3999',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3999',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});

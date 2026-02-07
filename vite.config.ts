import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 5173,
    host: '0.0.0.0',
    hmr: {
      overlay: false,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:10000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react({
      include: /\.(jsx|js|md|mdx|tsx|ts)$/,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  build: {
    target: 'esnext',
  },
});

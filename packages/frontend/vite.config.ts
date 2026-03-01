import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../../dist/frontend',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'ECONNRESET' || err.code === 'EPIPE') return;
            console.error('[ws proxy]', err);
          });
        },
      },
      '/health': {
        target: 'http://localhost:3000',
      },
    },
  },
});

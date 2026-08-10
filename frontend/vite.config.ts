import path from 'path'
import type { IncomingMessage } from 'http'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const createApiProxy = () => ({
  target: 'http://localhost:5000',
  changeOrigin: true,
  secure: false,
  bypass: (req: IncomingMessage) => {
    const acceptHeader = req.headers.accept;
    if (typeof acceptHeader === 'string' && acceptHeader.includes('text/html')) {
      return '/index.html';
    }
  },
});

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: 'react', replacement: path.resolve(__dirname, 'node_modules/react') },
      { find: 'react-dom', replacement: path.resolve(__dirname, 'node_modules/react-dom') },
      { find: '@emotion/react', replacement: path.resolve(__dirname, 'node_modules/@emotion/react') },
      { find: '@emotion/styled', replacement: path.resolve(__dirname, 'node_modules/@emotion/styled') },
    ],
    dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled'],
  },
  server: {
    proxy: {
      '/auth': createApiProxy(),
      '/devices': createApiProxy(),
      '/groups': createApiProxy(),
      '/health': createApiProxy(),
      '/system': createApiProxy(),
      '/audit-logs': createApiProxy(),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react') || id.includes('scheduler')) {
            return 'react-vendor';
          }
          if (id.includes('@mui') || id.includes('@emotion')) {
            return 'mui-vendor';
          }
          return 'vendor';
        },
      },
    },
  },
})

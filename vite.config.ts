import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost', changeOrigin: true },
      '/auth': { target: 'http://localhost', changeOrigin: true },
      '/v3': { target: 'http://localhost', changeOrigin: true },
      '/nginx-health': { target: 'http://localhost', changeOrigin: true },
    },
  },
})

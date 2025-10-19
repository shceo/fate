// vite.config.js / vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://217.26.29.186',   // или твой домен, если уже есть
        changeOrigin: false,               // оставляем Origin = http://localhost:5173
        secure: false
      }
    }
  },
  build: { outDir: 'dist' }
})

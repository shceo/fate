import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const target = process.env.API_PROXY_TARGET || 'https://my-fate.ru';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target,
        changeOrigin: false,
        secure: false,
      },
    },
  },
  build: { outDir: 'dist' },
});

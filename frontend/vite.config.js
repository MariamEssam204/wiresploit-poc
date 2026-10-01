import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Production build. In the container the Vite dev proxy is replaced by nginx
// (see nginx.conf): /api -> main backend, /api/injection -> injection backend.
// `vite build` ignores server/proxy settings, so none are needed here.
export default defineConfig({
  plugins: [react()],
})

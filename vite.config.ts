import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The browser always calls relative /api/* URLs. In dev Vite forwards them to the Express server;
// in production Caddy does the same job (see deploy/Caddyfile.example).
const api = { '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true } }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: api },
  preview: { proxy: api },
})

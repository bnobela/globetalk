import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
  '/api/users': 'http://localhost:3000',
  '/api/profile': 'http://localhost:3001',
  '/api/chat': 'http://localhost:3002',
  '/api/moderation': 'http://localhost:5000',
    },
  },
})

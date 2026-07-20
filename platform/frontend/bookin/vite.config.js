import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/login': 'http://127.0.0.1:8000',
      '/register': 'http://127.0.0.1:8000',
      '/sessions': 'http://127.0.0.1:8000',
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true
      },
      '/chat': 'http://127.0.0.1:8000',
      '/events': 'http://127.0.0.1:8000',
      '/approval': 'http://127.0.0.1:8000',
      '/models': 'http://127.0.0.1:8000',
      '/search': 'http://127.0.0.1:8000',
      '/plugins': 'http://127.0.0.1:8000',
      '/logs': 'http://127.0.0.1:8000',
      '/debug': 'http://127.0.0.1:8000',
      '/update-file': 'http://127.0.0.1:8000',
      '/file': 'http://127.0.0.1:8000',
      '/files': 'http://127.0.0.1:8000',
      '/config-parameters': 'http://127.0.0.1:8000',
    }
  }
})


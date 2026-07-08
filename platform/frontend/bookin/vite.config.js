import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/update-file': 'http://127.0.0.1:8000',
      '/file': 'http://127.0.0.1:8000',
      '/files': 'http://127.0.0.1:8000',
      '/config-parameters': 'http://127.0.0.1:8000',
    }
  }
})


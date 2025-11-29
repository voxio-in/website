import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: [
      '5173-01k8q431keg9nx9p7g4yc8sfss.cloudspaces.litng.ai'
    ]
  }
})
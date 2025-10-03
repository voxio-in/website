import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import App from './App.tsx'
import './index.css'
import { initVoxioAgent } from 'voxioagent'

// Initialize VoxioAgent with API key from environment variables
// initVoxioAgent({
//   apiKey: import.meta.env.VITE_VOXIO_API_KEY,
// })

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

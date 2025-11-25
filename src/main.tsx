import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import App from './App.tsx'
import './index.css'

// 1. Change the import to 'initAvatarBot'
import { initAvatarBot } from 'voxioagent' 

// 2. Initialize the Avatar Bot
// This will append the <voxioagents-avatar> element to the document body
initAvatarBot({
  apiKey: import.meta.env.VITE_VOXIO_API_KEY,
}).then((agent) => {
  console.log("Avatar Bot initialized successfully");
  
  // Optional: Subscribe to messages for debugging
  agent.onMessage((msg) => {
    console.log("Received from Avatar:", msg);
  });
}).catch((err) => {
  console.error("Failed to initialize Avatar Bot:", err);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
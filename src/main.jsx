import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import MTGTracker from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MTGTracker />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

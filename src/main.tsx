import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

window.onerror = function(message, source, lineno, colno, error) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="color:red; padding:20px; background:white; font-family:monospace; white-space:pre-wrap; z-index:9999; position:absolute; inset:0;"><h3>Fatal Runtime Crash</h3><p>${message}</p><p>Source: ${source}:${lineno}:${colno}</p><pre>${error?.stack}</pre></div>`;
  }
};

window.addEventListener("unhandledrejection", function(event) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="color:red; padding:20px; background:white; font-family:monospace; white-space:pre-wrap; z-index:9999; position:absolute; inset:0;"><h3>Unhandled Promise Rejection</h3><pre>${event.reason?.stack || event.reason}</pre></div>`;
  }
});

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
console.log("Main.tsx: entry point reached");

async function init() {
  console.log("Main.tsx: init starting");
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Main.tsx: #root element not found!");
    return;
  }

  try {
    console.log("Main.tsx: importing App...");
    const { default: App } = await import('./App');
    console.log("Main.tsx: App imported, mounting...");
    
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    console.log("Main.tsx: Render called successfully");
  } catch (err) {
    console.error("Main.tsx: Critical error during App initialization:", err);
    rootElement.innerHTML = `<div style="color:red; padding:20px; background:white; font-family:monospace; z-index:9999; position:absolute; inset:0; overflow:auto;">
      <h2 style="color:black">Initialization Failed</h2>
      <p>The application failed to load a required module.</p>
      <pre>${err instanceof Error ? err.stack : String(err)}</pre>
    </div>`;
  }
}

init();

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

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { HudErrorBoundary } from './components/HudErrorBoundary';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('[Ghostboard Desktop] Failed to find root element mounting container');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <HudErrorBoundary>
      <App />
    </HudErrorBoundary>
  </React.StrictMode>
);

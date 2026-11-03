// Ghostboard Universal Coding Copilot — Popup Script v2.0.0

document.addEventListener('DOMContentLoaded', async () => {
  const apiUrlInput = document.getElementById('apiUrl');
  const outputLangSelect = document.getElementById('outputLang');
  const btnSolve = document.getElementById('btnSolve');
  const statusMsg = document.getElementById('statusMsg');
  const statusDot = document.getElementById('statusDot');
  const statusLabel = document.getElementById('statusLabel');
  const statusHost = document.getElementById('statusHost');

  // Load saved preferences
  const stored = await chrome.storage.sync.get({
    apiUrl: 'http://localhost:3000',
    outputLanguage: 'bilingual',
  });

  apiUrlInput.value = stored.apiUrl;
  outputLangSelect.value = stored.outputLanguage;

  // Live Connectivity Ping
  async function checkConnectivity() {
    statusDot.className = 'status-dot checking';
    statusLabel.textContent = 'Checking connection...';

    const candidates = [stored.apiUrl, 'http://localhost:3000', 'http://localhost:3001', 'https://ghostboard.ai'].filter(Boolean);
    let connected = false;
    let foundHost = '';

    for (const base of candidates) {
      const clean = base.replace(/\/$/, '');
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(`${clean}/api/sessions/me`, {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok || res.status === 401) {
          // Server is alive and responsive
          connected = true;
          foundHost = clean.replace(/^https?:\/\//, '');
          break;
        }
      } catch {}
    }

    if (connected) {
      statusDot.className = 'status-dot connected';
      statusLabel.textContent = 'Connected';
      statusHost.textContent = foundHost;
    } else {
      statusDot.className = 'status-dot';
      statusLabel.textContent = 'Offline (Auto-Fallback Ready)';
      statusHost.textContent = 'ghostboard.ai';
    }
  }

  checkConnectivity();

  // Auto-save on change
  apiUrlInput.addEventListener('change', () => {
    chrome.storage.sync.set({ apiUrl: apiUrlInput.value.trim() });
    showStatus('✓ URL saved', '#c8f135');
    checkConnectivity();
  });

  outputLangSelect.addEventListener('change', () => {
    chrome.storage.sync.set({ outputLanguage: outputLangSelect.value });
    showStatus('✓ Language saved', '#c8f135');
  });

  function showStatus(text, color = '#a1a1aa') {
    statusMsg.textContent = text;
    statusMsg.style.color = color;
    setTimeout(() => {
      if (statusMsg.textContent === text) statusMsg.textContent = '';
    }, 3500);
  }

  // Trigger solve on current active tab
  btnSolve.addEventListener('click', async () => {
    btnSolve.disabled = true;
    showStatus('Extracting problem from tab...', '#c8f135');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showStatus('No active browser tab found', '#f43f5e');
      btnSolve.disabled = false;
      return;
    }

    try {
      chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_AND_SOLVE' }, (res) => {
        btnSolve.disabled = false;
        if (chrome.runtime.lastError) {
          showStatus('Please refresh this tab to initialize copilot', '#f43f5e');
        } else {
          showStatus('✓ Problem captured & sent to Ghostboard!', '#c8f135');
          setTimeout(() => window.close(), 1200);
        }
      });
    } catch (e) {
      btnSolve.disabled = false;
      showStatus(e.message, '#f43f5e');
    }
  });
});


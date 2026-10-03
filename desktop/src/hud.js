// Ghostboard Desktop HUD Client Controller

let serverUrl = localStorage.getItem('gb_server_url') || 'http://localhost:3001';
let sessionToken = localStorage.getItem('gb_session_token') || '';
let isFrozen = false;
let isPanic = false;
let showTranslation = true;
let isStealthActive = true;
let eventSource = null;

// DOM Elements
const container = document.getElementById('hud-container');
const stealthBadge = document.getElementById('stealth-badge');
const connBadge = document.getElementById('conn-badge');
const btnTr = document.getElementById('btn-tr');
const btnFreeze = document.getElementById('btn-freeze');
const btnSettings = document.getElementById('btn-settings');
const btnPanic = document.getElementById('btn-panic');
const btnClose = document.getElementById('btn-close');

const settingsPanel = document.getElementById('settings-panel');
const serverUrlInput = document.getElementById('server-url-input');
const tokenInput = document.getElementById('token-input');
const btnSaveAuth = document.getElementById('btn-save-auth');
const btnCloseSettings = document.getElementById('btn-close-settings');

const waitingState = document.getElementById('waiting-state');
const qaCard = document.getElementById('qa-card');
const cardQuestion = document.getElementById('card-question');
const cardHookWrap = document.getElementById('card-hook-wrap');
const cardHook = document.getElementById('card-hook');
const cardAnswer = document.getElementById('card-answer');
const cardTranslationWrap = document.getElementById('card-translation-wrap');
const cardTranslation = document.getElementById('card-translation');
const cardHintsWrap = document.getElementById('card-hints-wrap');
const cardHints = document.getElementById('card-hints');
const tickerText = document.getElementById('ticker-text');
const panicOverlay = document.getElementById('panic-overlay');

function resizeWindowToFit() {
  if (window.desktopAPI && window.desktopAPI.setWindowHeight) {
    setTimeout(() => {
      const height = container.scrollHeight + 4;
      window.desktopAPI.setWindowHeight(height);
    }, 50);
  }
}

// Connect to Real-time SSE Stream
function connectStream() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  if (!sessionToken) {
    connBadge.textContent = 'NO TOKEN';
    connBadge.style.color = '#f59e0b';
    settingsPanel.classList.remove('hidden');
    resizeWindowToFit();
    return;
  }

  connBadge.textContent = 'CONNECTING...';
  connBadge.style.color = '#71717a';

  try {
    const sseUrl = `${serverUrl}/api/companion/stream?token=${encodeURIComponent(sessionToken)}&device=desktop`;
    eventSource = new EventSource(sseUrl);

    eventSource.onopen = () => {
      connBadge.textContent = 'SYNC ACTIVE';
      connBadge.style.color = '#10b981';
      settingsPanel.classList.add('hidden');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_QA' && data.payload) {
          renderQA(data.payload);
        } else if (data.type === 'FREEZE_TOGGLE' && data.payload) {
          setFreezeState(!!data.payload.isFrozen);
        } else if (data.type === 'PANIC_TOGGLE' && data.payload) {
          setPanicState(!!data.payload.isPanic);
        } else if (data.type === 'STATUS' && data.payload) {
          if (data.payload.isCapturing) {
            tickerText.textContent = '🎙️ Real-time speech stream active';
          }
          if (typeof data.payload.isFrozen === 'boolean') {
            setFreezeState(data.payload.isFrozen);
          }
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    eventSource.onerror = () => {
      connBadge.textContent = 'RETRYING...';
      connBadge.style.color = '#ef4444';
    };
  } catch (err) {
    console.error('SSE initialization error:', err);
  }
}

function renderQA(qa) {
  if (isFrozen) return; // Ignore updates while frozen

  waitingState.classList.add('hidden');
  qaCard.classList.remove('hidden');

  cardQuestion.textContent = qa.question || 'Interview Question';

  if (qa.startHook) {
    cardHook.textContent = `"${qa.startHook}"`;
    cardHookWrap.classList.remove('hidden');
  } else {
    cardHookWrap.classList.add('hidden');
  }

  cardAnswer.textContent = qa.quickAnswer || '';

  if (showTranslation && qa.nativeTranslation) {
    cardTranslation.textContent = qa.nativeTranslation;
    cardTranslationWrap.classList.remove('hidden');
  } else {
    cardTranslationWrap.classList.add('hidden');
  }

  if (qa.hints && Array.isArray(qa.hints) && qa.hints.length > 0) {
    cardHints.innerHTML = qa.hints.map((h) => `<li>${h}</li>`).join('');
    cardHintsWrap.classList.remove('hidden');
  } else {
    cardHintsWrap.classList.add('hidden');
  }

  tickerText.textContent = `QA: ${qa.tag || '#Technical'} — Latency ~1.4s`;
  resizeWindowToFit();
}

function setFreezeState(frozen) {
  isFrozen = frozen;
  if (isFrozen) {
    btnFreeze.classList.add('frozen');
    btnFreeze.textContent = '🔒';
    btnFreeze.title = 'FROZEN (Space / F8 to unfreeze)';
  } else {
    btnFreeze.classList.remove('frozen');
    btnFreeze.textContent = '❄️';
    btnFreeze.title = 'Freeze Current Answer (Space / F8)';
  }
}

function setPanicState(panic) {
  isPanic = panic;
  if (isPanic) {
    panicOverlay.classList.remove('hidden');
  } else {
    panicOverlay.classList.add('hidden');
  }
  resizeWindowToFit();
}

async function sendRemoteAction(action, payload = {}) {
  if (!sessionToken) return;
  try {
    await fetch(`${serverUrl}/api/ai/interview-sync?token=${encodeURIComponent(sessionToken)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch (err) {
    console.warn('Failed to send remote sync action:', err);
  }
}

// UI Event Handlers
btnTr.addEventListener('click', () => {
  showTranslation = !showTranslation;
  btnTr.classList.toggle('active', showTranslation);
  if (cardTranslation.textContent) {
    cardTranslationWrap.classList.toggle('hidden', !showTranslation);
  }
  resizeWindowToFit();
});

btnFreeze.addEventListener('click', () => {
  const next = !isFrozen;
  setFreezeState(next);
  sendRemoteAction('SET_FREEZE', { isFrozen: next });
});

btnPanic.addEventListener('click', () => {
  const next = !isPanic;
  setPanicState(next);
  sendRemoteAction('SET_PANIC', { isPanic: next });
});

panicOverlay.addEventListener('click', () => {
  setPanicState(false);
  sendRemoteAction('SET_PANIC', { isPanic: false });
});

btnSettings.addEventListener('click', () => {
  serverUrlInput.value = serverUrl;
  tokenInput.value = sessionToken;
  settingsPanel.classList.toggle('hidden');
  resizeWindowToFit();
});

btnCloseSettings.addEventListener('click', () => {
  settingsPanel.classList.add('hidden');
  resizeWindowToFit();
});

btnSaveAuth.addEventListener('click', () => {
  serverUrl = serverUrlInput.value.trim() || 'http://localhost:3001';
  sessionToken = tokenInput.value.trim();
  localStorage.setItem('gb_server_url', serverUrl);
  localStorage.setItem('gb_session_token', sessionToken);
  settingsPanel.classList.add('hidden');
  connectStream();
});

btnClose.addEventListener('click', () => {
  if (window.desktopAPI && window.desktopAPI.close) {
    window.desktopAPI.close();
  }
});

// Keyboard controls when focused
window.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

  if (e.code === 'Space') {
    e.preventDefault();
    const next = !isFrozen;
    setFreezeState(next);
    sendRemoteAction('SET_FREEZE', { isFrozen: next });
  } else if (e.key === 'Escape') {
    e.preventDefault();
    const next = !isPanic;
    setPanicState(next);
    sendRemoteAction('SET_PANIC', { isPanic: next });
  }
});

// IPC listeners from Electron main process
if (window.desktopAPI) {
  window.desktopAPI.onTokenReceived((token) => {
    sessionToken = token;
    localStorage.setItem('gb_session_token', token);
    connectStream();
  });

  window.desktopAPI.onToggleFreeze(() => {
    const next = !isFrozen;
    setFreezeState(next);
    sendRemoteAction('SET_FREEZE', { isFrozen: next });
  });

  window.desktopAPI.onTogglePanic(() => {
    const next = !isPanic;
    setPanicState(next);
    sendRemoteAction('SET_PANIC', { isPanic: next });
  });

  window.desktopAPI.onStealthToggled((state) => {
    isStealthActive = state;
    stealthBadge.classList.toggle('active', state);
    stealthBadge.querySelector('.drag-label')?.replaceWith(state ? 'STEALTH ON' : 'STEALTH OFF');
  });
}

// Initial bootstrap
serverUrlInput.value = serverUrl;
tokenInput.value = sessionToken;
connectStream();
resizeWindowToFit();

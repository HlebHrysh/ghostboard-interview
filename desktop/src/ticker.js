// Ghostboard Ultra-Invisible Ticker Ribbon Client

let serverUrl = localStorage.getItem('gb_server_url') || 'http://localhost:3001';
let sessionToken = localStorage.getItem('gb_session_token') || '';
let isFrozen = false;
let eventSource = null;

const tickerStatus = document.getElementById('ticker-status');
const tickerQ = document.getElementById('ticker-q');
const tickerA = document.getElementById('ticker-a');
const marqueeContent = document.getElementById('marquee-content');
const btnFreezeTicker = document.getElementById('btn-freeze-ticker');
const btnExpandTicker = document.getElementById('btn-expand-ticker');
const btnCloseTicker = document.getElementById('btn-close-ticker');

function connectStream() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  if (!sessionToken) {
    tickerStatus.textContent = 'NO TOKEN';
    tickerStatus.style.color = '#f59e0b';
    return;
  }

  tickerStatus.textContent = 'STEALTH SYNC';
  tickerStatus.style.color = '#C8F135';

  try {
    const sseUrl = `${serverUrl}/api/companion/stream?token=${encodeURIComponent(sessionToken)}&device=desktop`;
    eventSource = new EventSource(sseUrl);

    eventSource.onopen = () => {
      tickerStatus.textContent = 'ACTIVE';
      tickerStatus.style.color = '#10b981';
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_QA' && data.payload) {
          updateTicker(data.payload);
        } else if (data.type === 'FREEZE_TOGGLE' && data.payload) {
          setFreeze(!!data.payload.isFrozen);
        }
      } catch (err) {
        console.error('Error parsing SSE data in ticker:', err);
      }
    };

    eventSource.onerror = () => {
      tickerStatus.textContent = 'RETRY';
      tickerStatus.style.color = '#ef4444';
    };
  } catch (err) {
    console.error('SSE initialization error in ticker:', err);
  }
}

function updateTicker(qa) {
  if (isFrozen) return;

  const question = qa.question ? `Q: ${qa.question}` : 'Interview speech detected';
  const answer = qa.quickAnswer || (qa.hints && qa.hints[0]) || '';
  const hook = qa.startHook ? `Hook: "${qa.startHook}" • ` : '';

  tickerQ.textContent = question;
  tickerA.textContent = `${hook}${answer}`;

  // Restart marquee animation smoothly
  marqueeContent.style.animation = 'none';
  void marqueeContent.offsetWidth; // trigger reflow
  marqueeContent.style.animation = 'marquee-anim 28s linear infinite';
}

function setFreeze(frozen) {
  isFrozen = frozen;
  btnFreezeTicker.classList.toggle('frozen', isFrozen);
  btnFreezeTicker.textContent = isFrozen ? '🔒' : '❄️';
}

btnFreezeTicker.addEventListener('click', () => {
  setFreeze(!isFrozen);
});

btnExpandTicker.addEventListener('click', () => {
  if (window.desktopAPI && window.desktopAPI.setWindowMode) {
    window.desktopAPI.setWindowMode('hud');
  }
});

btnCloseTicker.addEventListener('click', () => {
  if (window.desktopAPI && window.desktopAPI.close) {
    window.desktopAPI.close();
  }
});

if (window.desktopAPI) {
  if (window.desktopAPI.onTokenReceived) {
    window.desktopAPI.onTokenReceived((token) => {
      sessionToken = token;
      localStorage.setItem('gb_session_token', token);
      connectStream();
    });
  }
  if (window.desktopAPI.onToggleFreeze) {
    window.desktopAPI.onToggleFreeze(() => {
      setFreeze(!isFrozen);
    });
  }
}

// Initial connection
connectStream();

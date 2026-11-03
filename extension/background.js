// Ghostboard Universal Coding Copilot — Background Service Worker v2.0.0 (Manifest V3)
// Smart resilient routing with local dev auto-discovery, cloud fallback & retries

if (typeof chrome !== 'undefined' && chrome.commands) {
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'send_to_ghostboard') {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_AND_SOLVE' });
      }
    }
  });
}

async function fetchWithRetry(url, options, maxRetries = 1, timeoutMs = 4500) {
  let lastErr = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok || res.status < 500) {
        return res;
      }
      lastErr = new Error(`Server returned HTTP ${res.status}`);
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

async function deliverProblem(payload) {
  const { apiUrl = '', outputLanguage = 'uk', authToken = '' } =
    await chrome.storage.sync.get(['apiUrl', 'outputLanguage', 'authToken']);

  // Candidate servers in priority order:
  // 1. User-custom URL (if defined)
  // 2. Local 3000 (standard Next.js port)
  // 3. Local 3001 (alternative local dev port)
  // 4. Ghostboard Production Cloud
  const candidates = [];
  if (apiUrl && !candidates.includes(apiUrl.trim())) {
    candidates.push(apiUrl.trim());
  }
  if (!candidates.includes('http://localhost:3000')) candidates.push('http://localhost:3000');
  if (!candidates.includes('http://localhost:3001')) candidates.push('http://localhost:3001');
  if (!candidates.includes('https://ghostboard.ai')) candidates.push('https://ghostboard.ai');

  let responseData = null;
  let successfulServer = null;
  let lastError = null;

  const authHeaders = {
    'Content-Type': 'application/json',
    'x-ghostboard-client': 'chrome-extension-v2',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };

  for (const base of candidates) {
    const cleanBase = base.replace(/\/$/, '');
    const copilotUrl = `${cleanBase}/api/ai/interview-copilot`;
    try {
      const res = await fetchWithRetry(
        copilotUrl,
        {
          method: 'POST',
          headers: authHeaders,
          credentials: 'include',
          body: JSON.stringify({
            question: payload.question,
            locale: outputLanguage,
            outputLanguage: outputLanguage,
            sessionMode: 'coding',
            isConcise: false,
          }),
        },
        1,
        5000
      );

      if (res.ok) {
        responseData = await res.json();
        successfulServer = cleanBase.replace(/^https?:\/\//, '');

        // Broadcast to Ghostboard Real-Time HUD (/interview or sync store)
        const syncUrl = `${cleanBase}/api/ai/interview-sync`;
        const qaId = `problem_${Date.now()}`;
        const tag = payload.tag || `#${payload.platform || 'Coding'}`;

        await fetch(syncUrl, {
          method: 'POST',
          headers: authHeaders,
          credentials: 'include',
          body: JSON.stringify({
            action: 'ADD_OR_UPDATE_QA',
            activeId: qaId,
            qa: {
              id: qaId,
              question: payload.title,
              quickAnswer: responseData.quickAnswer || responseData.answer || 'Analyzing problem...',
              startHook: responseData.startHook || `Let's solve ${payload.title} with optimal complexity.`,
              hints: responseData.hints || [],
              codeSnippet: responseData.codeSnippet || responseData.code || '',
              deliveryTip: responseData.deliveryTip || 'Clarify constraints and edge cases before coding.',
              tag: tag,
              timestamp: Date.now(),
            },
          }),
        }).catch(() => {
          // Best effort sync
        });

        // Remember working server for next time
        chrome.storage.local.set({ lastSuccessfulServer: successfulServer });
        break;
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = new Error(errJson.error || `Server ${cleanBase} returned HTTP ${res.status}`);
      }
    } catch (err) {
      lastError = err;
      // Continue to next candidate server
    }
  }

  if (responseData) {
    return { success: true, serverUsed: successfulServer, data: responseData };
  }

  throw lastError || new Error('Could not connect to any Ghostboard server (localhost:3000, localhost:3001, ghostboard.ai)');
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SOLVE_PROBLEM' || message.type === 'SOLVE_LEETCODE') {
      deliverProblem(message.payload)
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.error('[Ghostboard Extension Delivery Error]', err);
          sendResponse({ success: false, error: err.message || 'Delivery failed' });
        });
      return true; // Keep sendResponse open for async response
    }

    if (message.type === 'CHECK_CONNECTION') {
      (async () => {
        const { apiUrl = 'http://localhost:3000' } = await chrome.storage.sync.get('apiUrl');
        const clean = apiUrl.replace(/\/$/, '');
        try {
          const res = await fetch(`${clean}/api/sessions/me`, { method: 'GET', credentials: 'include' });
          sendResponse({ connected: res.ok, status: res.status, url: clean });
        } catch {
          sendResponse({ connected: false, url: clean });
        }
      })();
      return true;
    }
  });
}

// Export for unit tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchWithRetry,
    deliverProblem,
  };
}


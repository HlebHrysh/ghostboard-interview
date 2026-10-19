// Ghostboard LeetCode Copilot — Background Service Worker (Manifest V3)

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'send_to_ghostboard') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_AND_SOLVE' });
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SOLVE_LEETCODE') {
    (async () => {
      try {
        const { apiUrl = 'http://localhost:3001', outputLanguage = 'uk', authToken = '' } =
          await chrome.storage.sync.get(['apiUrl', 'outputLanguage', 'authToken']);

        const endpoint = `${apiUrl.replace(/\/$/, '')}/api/ai/interview-copilot`;
        const syncEndpoint = `${apiUrl.replace(/\/$/, '')}/api/ai/interview-sync`;

        const authHeaders = {
          'Content-Type': 'application/json',
          'x-ghostboard-client': 'chrome-extension',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        };

        // 1. Call Ghostboard AI Copilot
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: authHeaders,
          credentials: 'include',
          body: JSON.stringify({
            question: message.payload.question,
            locale: outputLanguage,
            outputLanguage: outputLanguage,
            sessionMode: 'interview',
            isConcise: false,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned ${res.status}`);
        }

        const data = await res.json();
        const qaId = `leetcode_${Date.now()}`;

        // 2. Broadcast to Ghostboard Real-Time HUD (/interview)
        await fetch(syncEndpoint, {
          method: 'POST',
          headers: authHeaders,
          credentials: 'include',
          body: JSON.stringify({
            action: 'ADD_OR_UPDATE_QA',
            activeId: qaId,
            qa: {
              id: qaId,
              question: message.payload.title,
              quickAnswer: data.quickAnswer,
              startHook: data.startHook,
              hints: data.hints || [],
              codeSnippet: data.codeSnippet || '',
              deliveryTip: data.deliveryTip || 'Walk through time/space complexity before coding.',
              tag: `#LeetCode [${message.payload.difficulty}]`,
              timestamp: Date.now(),
            },
          }),
        }).catch(() => {
          // Sync is best-effort if Ghostboard HUD tab is running
        });

        sendResponse({ success: true, data });
      } catch (err) {
        console.error('[Ghostboard Extension Error]', err);
        sendResponse({ success: false, error: err.message || 'Failed to connect to Ghostboard' });
      }
    })();

    return true; // Keep message channel open for async response
  }
});

// Ghostboard LeetCode Copilot — Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const apiUrlInput = document.getElementById('apiUrl');
  const outputLangSelect = document.getElementById('outputLang');
  const btnSolve = document.getElementById('btnSolve');
  const statusMsg = document.getElementById('statusMsg');

  // Load saved preferences
  const stored = await chrome.storage.sync.get({
    apiUrl: 'http://localhost:3001',
    outputLanguage: 'uk',
  });

  apiUrlInput.value = stored.apiUrl;
  outputLangSelect.value = stored.outputLanguage;

  // Auto-save on change
  apiUrlInput.addEventListener('change', () => {
    chrome.storage.sync.set({ apiUrl: apiUrlInput.value.trim() });
    showStatus('✓ URL saved', '#C8F135');
  });

  outputLangSelect.addEventListener('change', () => {
    chrome.storage.sync.set({ outputLanguage: outputLangSelect.value });
    showStatus('✓ Language saved', '#C8F135');
  });

  function showStatus(text, color = '#A1A1AA') {
    statusMsg.textContent = text;
    statusMsg.style.color = color;
    setTimeout(() => {
      if (statusMsg.textContent === text) statusMsg.textContent = '';
    }, 3000);
  }

  // Trigger solve on current active tab
  btnSolve.addEventListener('click', async () => {
    btnSolve.disabled = true;
    showStatus('Sending command to tab...', '#C8F135');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showStatus('No active browser tab found', '#F43F5E');
      btnSolve.disabled = false;
      return;
    }

    if (!tab.url || (!tab.url.includes('leetcode.com/problems/') && !tab.url.includes('leetcode.cn/problems/'))) {
      showStatus('Open a LeetCode /problems/ page first', '#F43F5E');
      btnSolve.disabled = false;
      return;
    }

    try {
      chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_AND_SOLVE' }, (res) => {
        btnSolve.disabled = false;
        if (chrome.runtime.lastError) {
          showStatus('Please refresh the LeetCode tab first', '#F43F5E');
        } else {
          showStatus('✓ Problem extracted & sent!', '#C8F135');
          setTimeout(() => window.close(), 1200);
        }
      });
    } catch (e) {
      btnSolve.disabled = false;
      showStatus(e.message, '#F43F5E');
    }
  });
});

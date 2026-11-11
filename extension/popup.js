// Ghostboard Universal Coding Copilot — Popup Script v2.0.0

document.addEventListener('DOMContentLoaded', async () => {
  const apiUrlInput = document.getElementById('apiUrl');
  const outputLangSelect = document.getElementById('outputLang');
  const btnSolve = document.getElementById('btnSolve');
  const btnPushProblem = document.getElementById('btnPushProblem');
  const statusMsg = document.getElementById('statusMsg');
  const statusDot = document.getElementById('statusDot');
  const statusLabel = document.getElementById('statusLabel');
  const statusHost = document.getElementById('statusHost');

  const solutionPreview = document.getElementById('solutionPreview');
  const previewHook = document.getElementById('previewHook');
  const previewPillars = document.getElementById('previewPillars');
  const previewCode = document.getElementById('previewCode');
  const previewTrap = document.getElementById('previewTrap');

  // Load saved preferences
  const stored = await chrome.storage.sync.get({
    apiUrl: 'https://ghostboard.ai',
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
    }, 4000);
  }

  function displayParsedSolution(parsed, qa) {
    if (!solutionPreview) return;

    if (previewHook) {
      previewHook.textContent = parsed?.hook || qa?.startHook || 'Optimal solution ready.';
    }

    if (previewPillars) {
      previewPillars.innerHTML = '';
      const pillars = (parsed?.pillars && parsed.pillars.length > 0) ? parsed.pillars : (qa?.hints || []);
      pillars.forEach((p) => {
        const li = document.createElement('li');
        li.textContent = p.replace(/^-\s*/, '');
        previewPillars.appendChild(li);
      });
    }

    if (previewCode) {
      previewCode.textContent = qa?.codeSnippet || parsed?.deepDive || '// Solution generated';
    }

    if (previewTrap) {
      if (parsed?.followUpTrap) {
        previewTrap.textContent = `⚠️ Trap: ${parsed.followUpTrap.question} — ${parsed.followUpTrap.answer}`;
        previewTrap.style.display = 'block';
      } else if (qa?.deliveryTip) {
        previewTrap.textContent = `💡 Tip: ${qa.deliveryTip}`;
        previewTrap.style.display = 'block';
      } else {
        previewTrap.style.display = 'none';
      }
    }

    solutionPreview.style.display = 'block';
  }

  // 1-Click Push directly to /api/companion/push-problem
  if (btnPushProblem) {
    btnPushProblem.addEventListener('click', async () => {
      btnPushProblem.disabled = true;
      if (btnSolve) btnSolve.disabled = true;
      showStatus('🚀 1-Click Pushing problem to Ghostboard HUD...', '#c8f135');

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        showStatus('No active browser tab found', '#f43f5e');
        btnPushProblem.disabled = false;
        if (btnSolve) btnSolve.disabled = false;
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: 'GET_PROBLEM_DATA' }, (res) => {
        if (chrome.runtime.lastError || !res?.ok || !res?.problem) {
          // Fallback to legacy extract and solve
          chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_AND_SOLVE' }, () => {
            btnPushProblem.disabled = false;
            if (btnSolve) btnSolve.disabled = false;
            showStatus('Extracted and sent to HUD!', '#c8f135');
          });
          return;
        }

        const problem = res.problem;
        chrome.runtime.sendMessage(
          {
            type: 'PUSH_PROBLEM_DIRECT',
            payload: {
              title: problem.title,
              description: problem.fullPrompt || problem.question,
              language: problem.language,
              starterCode: problem.starterCode,
              url: problem.url,
            },
          },
          (pushRes) => {
            btnPushProblem.disabled = false;
            if (btnSolve) btnSolve.disabled = false;

            if (chrome.runtime.lastError || !pushRes?.success) {
              const err = pushRes?.error || chrome.runtime.lastError?.message || 'Push failed';
              showStatus(`Push failed: ${err}`, '#f43f5e');
            } else {
              showStatus(`✓ Pushed to HUD! (${problem.title.slice(0, 24)})`, '#c8f135');
              displayParsedSolution(pushRes.data?.parsed, pushRes.data?.qa);
            }
          }
        );
      });
    });
  }

  // Trigger solve on current active tab
  if (btnSolve) {
    btnSolve.addEventListener('click', async () => {
      btnSolve.disabled = true;
      if (btnPushProblem) btnPushProblem.disabled = true;
      showStatus('Extracting problem from tab...', '#c8f135');

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        showStatus('No active browser tab found', '#f43f5e');
        btnSolve.disabled = false;
        if (btnPushProblem) btnPushProblem.disabled = false;
        return;
      }

      try {
        chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_AND_SOLVE' }, () => {
          btnSolve.disabled = false;
          if (btnPushProblem) btnPushProblem.disabled = false;
          if (chrome.runtime.lastError) {
            showStatus('Please refresh this tab to initialize copilot', '#f43f5e');
          } else {
            showStatus('✓ Problem captured & sent to Ghostboard!', '#c8f135');
          }
        });
      } catch (e) {
        btnSolve.disabled = false;
        if (btnPushProblem) btnPushProblem.disabled = false;
        showStatus(e.message, '#f43f5e');
      }
    });
  }
});


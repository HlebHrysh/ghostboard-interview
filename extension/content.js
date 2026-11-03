// Ghostboard Universal Coding Copilot — Content Script v2.0.0
// Extracts coding problems from LeetCode, HackerRank, Codeforces, CodeSignal,
// or any highlighted text on the web via Alt+Shift+G / Alt+G and sends to Ghostboard HUD.

(function () {
  let isProcessing = false;

  function showToast(text, isError = false, durationMs = 4500) {
    if (typeof document === 'undefined') return;
    let toast = document.getElementById('ghostboard-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'ghostboard-toast';
      toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; z-index: 9999999;
        background: #09090b; color: #f4f4f5; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px; font-weight: 600; padding: 12px 18px; border-radius: 14px;
        border: 1px solid rgba(200, 241, 53, 0.4);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.85), 0 0 25px rgba(200, 241, 53, 0.2);
        display: flex; align-items: center; gap: 10px; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        max-width: 440px; pointer-events: none;
      `;
      document.body.appendChild(toast);
    }
    toast.style.borderColor = isError ? 'rgba(244, 63, 94, 0.7)' : 'rgba(200, 241, 53, 0.6)';
    toast.style.boxShadow = isError
      ? '0 20px 40px rgba(0, 0, 0, 0.85), 0 0 25px rgba(244, 63, 94, 0.25)'
      : '0 20px 40px rgba(0, 0, 0, 0.85), 0 0 25px rgba(200, 241, 53, 0.25)';

    toast.innerHTML = isError
      ? `<span style="color:#f43f5e; font-size:14px; font-weight:bold;">✕</span> <span style="line-height:1.4;">${text}</span>`
      : `<span style="color:#c8f135; font-size:14px;">⚡</span> <span style="line-height:1.4;">${text}</span>`;

    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0) scale(1)';

    if (toast._timer) clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      if (toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(12px) scale(0.97)';
      }
    }, durationMs);
  }

  // ───────────────────────── Starter Code Extractors ─────────────────────────
  function extractEditorCode() {
    // 1. Monaco Editor lines
    const monacoLines = document.querySelectorAll('.monaco-editor .view-lines .view-line');
    if (monacoLines && monacoLines.length > 0) {
      const text = Array.from(monacoLines)
        .map((l) => l.innerText)
        .join('\n')
        .trim();
      if (text) return text;
    }

    // 2. CodeMirror
    const cm = document.querySelector('.CodeMirror');
    if (cm && cm.CodeMirror) {
      try {
        const val = cm.CodeMirror.getValue();
        if (val?.trim()) return val.trim();
      } catch {}
    }
    const cmLines = document.querySelectorAll('.CodeMirror-code .CodeMirror-line');
    if (cmLines && cmLines.length > 0) {
      const text = Array.from(cmLines)
        .map((l) => l.innerText)
        .join('\n')
        .trim();
      if (text) return text;
    }

    // 3. Fallback textarea
    const textarea = document.querySelector('textarea.custominput, textarea.code-editor, textarea[class*="editor"]');
    if (textarea && textarea.value?.trim()) {
      return textarea.value.trim();
    }

    return '';
  }

  // ───────────────────────── Platform 1: LeetCode ─────────────────────────
  function extractLeetCodeProblem() {
    const titleEl =
      document.querySelector('div[class*="text-title-large"]') ||
      document.querySelector('[data-cy="question-title"]') ||
      document.querySelector('a[href*="/problems/"][class*="title"]') ||
      document.querySelector('div[class*="title__"]');
    const title = titleEl?.innerText?.trim() || document.title.replace(/- LeetCode.*$/i, '').trim();

    const diffEl =
      document.querySelector('div[class*="text-difficulty-"]') ||
      document.querySelector('div[class*="text-olive"], div[class*="text-yellow"], div[class*="text-pink"]') ||
      document.querySelector('span[class*="difficulty-"]');
    const difficulty = diffEl?.innerText?.trim() || 'Medium';

    const contentEl =
      document.querySelector('[data-track-load="description_content"]') ||
      document.querySelector('.elfjS') ||
      document.querySelector('div[class*="_1l1M"]') ||
      document.querySelector('.question-content__JfgR') ||
      document.querySelector('div[class*="question-content"]');
    const description = contentEl?.innerText?.trim();
    if (!description && !title) return null;

    const langBtn =
      document.querySelector('button[id*="headlessui-listbox-button"]') ||
      document.querySelector('div[class*="lang-select"]');
    const language = langBtn?.innerText?.trim() || 'Python3 / TypeScript';
    const starterCode = extractEditorCode();

    const promptParts = [
      `Platform: LeetCode`,
      `Problem: ${title} [${difficulty}]`,
      `Language Target: ${language}`,
      `URL: ${window.location.href}`,
    ];
    if (starterCode) {
      promptParts.push(`\nStarter Template Code:\n\`\`\`\n${starterCode}\n\`\`\``);
    }
    promptParts.push(`\nProblem Description & Constraints:\n${description || title}`);

    return {
      platform: 'LeetCode',
      title,
      difficulty,
      language,
      url: window.location.href,
      starterCode,
      tag: `#LeetCode [${difficulty}]`,
      fullPrompt: promptParts.join('\n'),
    };
  }

  // ───────────────────────── Platform 2: HackerRank ─────────────────────────
  function extractHackerRankProblem() {
    const titleEl =
      document.querySelector('.challenge-page-label') ||
      document.querySelector('h1.ui-icon-label') ||
      document.querySelector('h1[class*="challenge-title"]') ||
      document.querySelector('h2.hr_tour-challenge-name') ||
      document.querySelector('.challenge-interface h1');
    const title = titleEl?.innerText?.trim() || document.title.replace(/- HackerRank.*$/i, '').trim();

    const diffEl =
      document.querySelector('.difficulty-badge') ||
      document.querySelector('[class*="difficulty-tag"]') ||
      document.querySelector('.challenge-sidebar [class*="difficulty"]');
    const difficulty = diffEl?.innerText?.trim() || 'Medium';

    const bodyEl =
      document.querySelector('.challenge-body-html') ||
      document.querySelector('.challenge_problem_statement') ||
      document.querySelector('.problem-statement') ||
      document.querySelector('.hackerrank-content') ||
      document.querySelector('.challenge_content');
    const description = bodyEl?.innerText?.trim();
    if (!description && !title) return null;

    const langSelect =
      document.querySelector('.hr-monaco-compile-lang') ||
      document.querySelector('.select-language') ||
      document.querySelector('[class*="select-language"]');
    const language = langSelect?.innerText?.trim() || 'Python / C++ / Java';
    const starterCode = extractEditorCode();

    const promptParts = [
      `Platform: HackerRank`,
      `Problem: ${title} [${difficulty}]`,
      `Language Target: ${language}`,
      `URL: ${window.location.href}`,
    ];
    if (starterCode) {
      promptParts.push(`\nStarter Template Code:\n\`\`\`\n${starterCode}\n\`\`\``);
    }
    promptParts.push(`\nProblem Statement & Constraints:\n${description || title}`);

    return {
      platform: 'HackerRank',
      title,
      difficulty,
      language,
      url: window.location.href,
      starterCode,
      tag: `#HackerRank [${difficulty}]`,
      fullPrompt: promptParts.join('\n'),
    };
  }

  // ───────────────────────── Platform 3: Codeforces ─────────────────────────
  function extractCodeforcesProblem() {
    const headerEl = document.querySelector('.problem-statement .header');
    const titleEl = headerEl?.querySelector('.title') || document.querySelector('.title');
    const title = titleEl?.innerText?.trim() || document.title.replace(/Codeforces/i, '').trim();

    const timeLimit = headerEl?.querySelector('.time-limit')?.innerText?.trim() || '';
    const memoryLimit = headerEl?.querySelector('.memory-limit')?.innerText?.trim() || '';

    const statementEl = document.querySelector('.problem-statement');
    if (!statementEl && !titleEl) return null;

    // Clone and remove sample tests or header for cleaner description
    const fullText = statementEl ? statementEl.innerText.trim() : document.body.innerText.slice(0, 4000);
    const starterCode = extractEditorCode();

    const promptParts = [
      `Platform: Codeforces`,
      `Problem: ${title}`,
      timeLimit ? `Time Limit: ${timeLimit}` : '',
      memoryLimit ? `Memory Limit: ${memoryLimit}` : '',
      `URL: ${window.location.href}`,
    ].filter(Boolean);

    if (starterCode) {
      promptParts.push(`\nStarter Template Code:\n\`\`\`\n${starterCode}\n\`\`\``);
    }
    promptParts.push(`\nProblem Statement, Input/Output & Constraints:\n${fullText}`);

    return {
      platform: 'Codeforces',
      title,
      difficulty: 'Competitive',
      language: 'C++ / Python / Go',
      url: window.location.href,
      starterCode,
      tag: `#Codeforces [${title.split('.')[0] || 'Problem'}]`,
      fullPrompt: promptParts.join('\n'),
    };
  }

  // ───────────────────────── Platform 4: CodeSignal ─────────────────────────
  function extractCodeSignalProblem() {
    const titleEl =
      document.querySelector('[data-name="task-title"]') ||
      document.querySelector('h2[class*="title"]') ||
      document.querySelector('.task-title') ||
      document.querySelector('.task-header h2');
    const title = titleEl?.innerText?.trim() || document.title.replace(/CodeSignal/i, '').trim();

    const descEl =
      document.querySelector('[data-name="task-description"]') ||
      document.querySelector('.task-description') ||
      document.querySelector('.markdown') ||
      document.querySelector('.task-details');
    const description = descEl?.innerText?.trim();
    if (!description && !title) return null;

    const starterCode = extractEditorCode();
    const promptParts = [
      `Platform: CodeSignal`,
      `Problem: ${title}`,
      `URL: ${window.location.href}`,
    ];
    if (starterCode) {
      promptParts.push(`\nStarter Template Code:\n\`\`\`\n${starterCode}\n\`\`\``);
    }
    promptParts.push(`\nTask Description & Constraints:\n${description || title}`);

    return {
      platform: 'CodeSignal',
      title,
      difficulty: 'Assessment',
      language: 'JavaScript / Python',
      url: window.location.href,
      starterCode,
      tag: `#CodeSignal`,
      fullPrompt: promptParts.join('\n'),
    };
  }

  // ───────────────────────── Global Highlight / Selection ─────────────────────────
  function extractSelectedText() {
    const selection = window.getSelection ? window.getSelection().toString().trim() : '';
    if (!selection || selection.length < 5) return null;

    const firstLine = selection.split('\n')[0].replace(/[#*`]/g, '').trim().slice(0, 60);
    const title = firstLine || `Web Code Snippet (${window.location.hostname})`;

    return {
      platform: 'WebSelection',
      title,
      difficulty: 'Snippet',
      language: 'Auto',
      url: window.location.href,
      starterCode: '',
      tag: `#WebSnippet [${window.location.hostname}]`,
      fullPrompt: `Source: ${window.location.href} (${document.title})\nSelected Question / Code:\n\n${selection}`,
    };
  }

  // ───────────────────────── Universal Router ─────────────────────────
  function detectAndExtract() {
    // Priority 1: User explicitly highlighted text on ANY page
    const selected = extractSelectedText();
    if (selected) return selected;

    const host = window.location.hostname.toLowerCase();

    // Priority 2: LeetCode
    if (host.includes('leetcode.com') || host.includes('leetcode.cn')) {
      const leet = extractLeetCodeProblem();
      if (leet) return leet;
    }

    // Priority 3: HackerRank
    if (host.includes('hackerrank.com')) {
      const hr = extractHackerRankProblem();
      if (hr) return hr;
    }

    // Priority 4: Codeforces
    if (host.includes('codeforces.com')) {
      const cf = extractCodeforcesProblem();
      if (cf) return cf;
    }

    // Priority 5: CodeSignal
    if (host.includes('codesignal.com')) {
      const cs = extractCodeSignalProblem();
      if (cs) return cs;
    }

    // Fallback: Check if there's any code block or article on the page
    return null;
  }

  async function triggerExtractAndSolve() {
    if (isProcessing) return;

    const problem = detectAndExtract();
    if (!problem) {
      showToast('No problem detected. Select text with your cursor or open LeetCode / HackerRank / Codeforces / CodeSignal.', true);
      return;
    }

    isProcessing = true;
    showToast(`⚡ Extracting "${problem.title.slice(0, 42)}..." & delivering to Ghostboard HUD...`, false, 6000);

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(
          {
            type: 'SOLVE_PROBLEM',
            payload: {
              platform: problem.platform,
              title: problem.title,
              question: problem.fullPrompt,
              difficulty: problem.difficulty,
              language: problem.language,
              tag: problem.tag,
              url: problem.url,
            },
          },
          (response) => {
            isProcessing = false;
            if (chrome.runtime.lastError || !response?.success) {
              const err = response?.error || chrome.runtime.lastError?.message || 'Connection failed';
              showToast(`Ghostboard Delivery Error: ${err}`, true, 6000);
            } else {
              const serverInfo = response.serverUsed ? `via ${response.serverUsed}` : 'synced';
              showToast(`✓ Solution generated & ${serverInfo}! (${problem.title.slice(0, 30)})`, false, 5000);
            }
          }
        );
      } else {
        isProcessing = false;
        showToast('Chrome runtime extension API not available in this tab context', true);
      }
    } catch (err) {
      isProcessing = false;
      showToast(`Error: ${err.message}`, true);
    }
  }

  // ───────────────────────── Hotkey Listeners ─────────────────────────
  // Supports Alt+Shift+G and Alt+G
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      const isAltG = e.altKey && (e.key === 'g' || e.key === 'G' || e.code === 'KeyG');
      if (isAltG) {
        e.preventDefault();
        triggerExtractAndSolve();
      }
    });

    // Background commands & popup messaging listener
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'EXTRACT_AND_SOLVE' || message.action === 'EXTRACT_SELECTION') {
          triggerExtractAndSolve();
          sendResponse({ status: 'triggered' });
        }
        return true;
      });
    }

    console.log('⚡ Ghostboard Universal Coding Copilot v2.0.0 active. Press Alt+Shift+G or Alt+G.');
  }

  // Export for unit tests in Node / Vitest
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      detectAndExtract,
      extractLeetCodeProblem,
      extractHackerRankProblem,
      extractCodeforcesProblem,
      extractCodeSignalProblem,
      extractSelectedText,
      extractEditorCode,
      showToast,
    };
  }
})();


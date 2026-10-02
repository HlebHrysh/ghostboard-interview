// Ghostboard LeetCode Copilot — Content Script
// Extracts problem text on hotkey (Alt+G or Alt+Shift+G) and sends to Ghostboard AI Copilot HUD

(function () {
  let isProcessing = false;

  function showToast(text, isError = false) {
    let toast = document.getElementById('ghostboard-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'ghostboard-toast';
      toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; z-index: 999999;
        background: #09090D; color: #F4F4F5; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px; font-weight: 600; padding: 10px 16px; border-radius: 12px;
        border: 1px solid #C8F135; box-shadow: 0 10px 30px rgba(0,0,0,0.8), 0 0 15px rgba(200,241,53,0.3);
        display: flex; align-items: center; gap: 8px; transition: all 0.25s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.style.borderColor = isError ? '#F43F5E' : '#C8F135';
    toast.innerHTML = isError
      ? `<span style="color:#F43F5E">✕</span> <span>${text}</span>`
      : `<span style="color:#C8F135">⚡</span> <span>${text}</span>`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
      if (toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
      }
    }, 4500);
  }

  function extractLeetCodeProblem() {
    // 1. Problem Title
    const titleEl =
      document.querySelector('div[class*="text-title-large"]') ||
      document.querySelector('[data-cy="question-title"]') ||
      document.querySelector('a[href*="/problems/"][class*="title"]');
    const title = titleEl?.innerText?.trim() || document.title.replace(/- LeetCode.*$/, '').trim();

    // 2. Difficulty
    const diffEl =
      document.querySelector('div[class*="text-difficulty-"]') ||
      document.querySelector('div[class*="text-olive"], div[class*="text-yellow"], div[class*="text-pink"]');
    const difficulty = diffEl?.innerText?.trim() || 'Medium';

    // 3. Problem Description & Examples & Constraints
    const contentEl =
      document.querySelector('[data-track-load="description_content"]') ||
      document.querySelector('.elfjS') ||
      document.querySelector('div[class*="_1l1M"]') ||
      document.querySelector('.question-content__JfgR');

    const description = contentEl?.innerText?.trim();
    if (!description) {
      return null;
    }

    // 4. Target Language
    const langBtn = document.querySelector('button[id*="headlessui-listbox-button"]');
    const language = langBtn?.innerText?.trim() || 'Python3';

    return {
      title,
      difficulty,
      language,
      url: window.location.href,
      fullPrompt: `LeetCode Problem: ${title} [${difficulty}]
Language Target: ${language}
URL: ${window.location.href}

${description}`,
    };
  }

  async function triggerExtractAndSolve() {
    if (isProcessing) return;
    const problem = extractLeetCodeProblem();

    if (!problem) {
      showToast('LeetCode problem not detected. Open a /problems/ page.', true);
      return;
    }

    isProcessing = true;
    showToast(`Extracting "${problem.title}" & sending to Ghostboard HUD...`);

    try {
      chrome.runtime.sendMessage(
        {
          type: 'SOLVE_LEETCODE',
          payload: {
            title: problem.title,
            question: problem.fullPrompt,
            difficulty: problem.difficulty,
            language: problem.language,
          },
        },
        (response) => {
          isProcessing = false;
          if (chrome.runtime.lastError || !response?.success) {
            const err = response?.error || chrome.runtime.lastError?.message || 'Connection failed';
            showToast(`Ghostboard Error: ${err}`, true);
          } else {
            showToast(`✓ Solution synced to Ghostboard HUD! (${problem.title})`);
          }
        }
      );
    } catch (err) {
      isProcessing = false;
      showToast(`Error: ${err.message}`, true);
    }
  }

  // Hotkey listener: Alt+G (or Alt+Shift+G)
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'g' || e.key === 'G' || e.code === 'KeyG')) {
      e.preventDefault();
      triggerExtractAndSolve();
    }
  });

  // Background commands & popup messaging listener
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'EXTRACT_AND_SOLVE') {
      triggerExtractAndSolve();
      sendResponse({ status: 'triggered' });
    }
    return true;
  });

  console.log('⚡ Ghostboard LeetCode Copilot active. Press Alt+G to solve.');
})();

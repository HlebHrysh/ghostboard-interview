// =============================================================================
// GHOSTBOARD DESKTOP: THE OBSIDIAN MORPH CLIENT CONTROLLER (PRODUCTION)
// =============================================================================

(() => {
  // State
  let currentMode = 'locked'; // 'locked' | 'launcher' | 'stealth' | 'ticker'
  let token = localStorage.getItem('ghostboard_token') || '';
  let serverUrl = localStorage.getItem('ghostboard_server') || 'http://localhost:3001';
  let userEmail = localStorage.getItem('ghostboard_email') || 'guest@ghostboard.local';
  let userPlan = localStorage.getItem('ghostboard_plan') || 'pro';
  let isCapturing = false;
  let isFrozen = false;
  let isPanic = false;
  let isConcise = false;
  let showTranslation = true;
  let activeQaData = null;
  let knownProfiles = [];
  let nodeId = localStorage.getItem('ghostboard_node_id') || `desk_${Math.random().toString(36).substring(2, 10)}`;
  localStorage.setItem('ghostboard_node_id', nodeId);

  // Audio Soundcheck state
  let audioCtx = null;
  let analyser = null;
  let micStream = null;
  let animFrameId = null;

  // SSE connection
  let sseEventSource = null;

  // DOM Elements - Views
  const launcherView = document.getElementById('launcher-view');
  const stealthView = document.getElementById('stealth-hud-view');
  const tickerView = document.getElementById('ticker-mode-view');
  const settingsPanel = document.getElementById('settings-panel');
  const panicShield = document.getElementById('panic-shield');

  // DOM Elements - Launcher
  const launcherEmail = document.getElementById('launcher-user-email');
  const launcherPlan = document.getElementById('launcher-plan-pill');
  const launcherSyncDot = document.getElementById('launcher-sync-dot');
  const launcherSyncLabel = document.getElementById('launcher-sync-label');
  const btnOpenAuth = document.getElementById('btn-open-auth');
  const btnBrowserLogin = document.getElementById('btn-browser-login');
  const accountProfilesSelect = document.getElementById('account-profiles-select');
  const micSelect = document.getElementById('mic-select');
  const roleSelect = document.getElementById('role-select');
  const speechLangSelect = document.getElementById('speech-lang-select');
  const nativeLangSelect = document.getElementById('native-lang-select');
  const btnMasterLaunch = document.getElementById('btn-master-launch');
  const btnLauncherMin = document.getElementById('btn-launcher-min');
  const btnLauncherClose = document.getElementById('btn-launcher-close');
  const soundcheckCanvas = document.getElementById('soundcheck-canvas');
  const vuMeterBar = document.getElementById('vu-meter-bar');
  const vuDbLabel = document.getElementById('vu-db-label');
  const micStatusBadge = document.getElementById('mic-status-badge');

  // DOM Elements - Stealth HUD
  const qaCard = document.getElementById('qa-card');
  const waitingState = document.getElementById('waiting-state');
  const cardQ = document.getElementById('card-question');
  const cardHook = document.getElementById('card-hook');
  const cardA = document.getElementById('card-answer');
  const cardTrWrap = document.getElementById('card-translation-wrap');
  const cardTr = document.getElementById('card-translation');
  const cardHints = document.getElementById('card-hints');
  const btnModeTicker = document.getElementById('btn-mode-ticker');
  const btnConcise = document.getElementById('btn-concise');
  const btnCopy = document.getElementById('btn-copy');
  const btnAlignDisplay = document.getElementById('btn-align-display');
  const btnTR = document.getElementById('btn-tr');
  const btnFreeze = document.getElementById('btn-freeze');
  const btnReturnLauncher = document.getElementById('btn-return-launcher');
  const btnPanic = document.getElementById('btn-panic');
  const btnClose = document.getElementById('btn-close');
  const connBadge = document.getElementById('conn-badge');

  // DOM Elements - Ticker
  const tickerViewTrack = document.getElementById('ticker-view-track');
  const tickerViewQ = document.getElementById('ticker-view-q');
  const tickerViewA = document.getElementById('ticker-view-a');
  const btnTickerFreeze = document.getElementById('btn-ticker-mode-freeze');
  const btnTickerHud = document.getElementById('btn-ticker-mode-hud');
  const btnTickerLauncher = document.getElementById('btn-ticker-mode-launcher');
  const btnTickerClose = document.getElementById('btn-ticker-mode-close');

  // DOM Elements - Auth Modal
  const tabBrowserAuth = document.getElementById('tab-browser-auth');
  const tabLogin = document.getElementById('tab-login');
  const tabToken = document.getElementById('tab-token');
  const formBrowser = document.getElementById('auth-form-browser');
  const formCreds = document.getElementById('auth-form-credentials');
  const formToken = document.getElementById('auth-form-token');
  const browserServerUrlInput = document.getElementById('browser-server-url-input');
  const btnTriggerBrowserLogin = document.getElementById('btn-trigger-browser-login');
  const authEmailInput = document.getElementById('auth-email-input');
  const authPassInput = document.getElementById('auth-password-input');
  const serverUrlInput = document.getElementById('server-url-input');
  const tokenInput = document.getElementById('token-input');
  const btnSaveAuth = document.getElementById('btn-save-auth');
  const btnCloseSettings = document.getElementById('btn-close-settings');

  // ===========================================================================
  // 1. INITIALIZATION & HARDWARE-BACKED ACCOUNT HYDRATION
  // ===========================================================================

  async function updatePlatformInfo() {
    const osText = document.getElementById('launcher-os-text');
    const audioHintText = document.getElementById('audio-loopback-text');
    const shortcutLabel = document.getElementById('launch-shortcut-label');
    const modeTickerBtn = document.getElementById('btn-mode-ticker');

    let arch = 'x64';
    let isMac = false;
    let isWin = false;

    if (window.desktopAPI?.getSystemInfo) {
      try {
        const sys = await window.desktopAPI.getSystemInfo();
        arch = sys.arch || 'x64';
        isMac = !!sys.isMac;
        isWin = !!sys.isWin;
      } catch {}
    } else if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('mac')) isMac = true;
      else if (ua.includes('win')) isWin = true;
    }

    if (isMac) {
      if (osText) osText.textContent = `🍎 macOS (${arch})`;
      if (audioHintText) audioHintText.textContent = 'BlackHole 2ch / Multi-Output Device Ready';
      if (shortcutLabel) shortcutLabel.textContent = '⌘Enter';
      if (modeTickerBtn) modeTickerBtn.title = 'Перемкнути в тонку рядок (⌘⌥M)';
    } else if (isWin) {
      if (osText) osText.textContent = `🪟 Windows (${arch})`;
      if (audioHintText) audioHintText.textContent = 'Direct WASAPI loopback / VB-Audio Ready';
      if (shortcutLabel) shortcutLabel.textContent = 'Ctrl+Enter';
      if (modeTickerBtn) modeTickerBtn.title = 'Перемкнути в тонку рядок (Ctrl+Alt+M)';
    } else {
      if (osText) osText.textContent = `🐧 Linux (${arch})`;
      if (audioHintText) audioHintText.textContent = 'PipeWire / PulseAudio monitor loopback Ready';
      if (shortcutLabel) shortcutLabel.textContent = 'Ctrl+Enter';
      if (modeTickerBtn) modeTickerBtn.title = 'Перемкнути в тонку рядок (Ctrl+Alt+M)';
    }
  }

  async function hydrateUserUI() {
    // Attempt hydration from native hardware-backed vault
    if (window.desktopAPI?.getSavedSession) {
      try {
        const saved = await window.desktopAPI.getSavedSession();
        if (saved.token) token = saved.token;
        if (saved.user) {
          if (saved.user.email) userEmail = saved.user.email;
          if (saved.user.plan) userPlan = saved.user.plan;
        }
        if (saved.settings?.serverUrl) serverUrl = saved.settings.serverUrl;
        if (Array.isArray(saved.profiles) && saved.profiles.length > 1) {
          knownProfiles = saved.profiles;
          renderProfilesDropdown();
        }
      } catch (err) {
        console.warn('[hud] Native vault hydration warning:', err.message);
      }
    }

    if (launcherEmail) launcherEmail.textContent = userEmail;
    if (launcherPlan) launcherPlan.textContent = `${userPlan.toUpperCase()} PASS`;
    if (serverUrlInput) serverUrlInput.value = serverUrl;
    if (browserServerUrlInput) browserServerUrlInput.value = serverUrl;
    if (tokenInput) tokenInput.value = token;
    if (authEmailInput && userEmail !== 'guest@ghostboard.local') authEmailInput.value = userEmail;
    
    updatePlatformInfo();
    await validateSessionWithCloud();
  }

  function renderProfilesDropdown() {
    if (!accountProfilesSelect || knownProfiles.length <= 1) {
      if (accountProfilesSelect) accountProfilesSelect.classList.add('hidden');
      return;
    }

    accountProfilesSelect.innerHTML = knownProfiles
      .map(p => `<option value="${p.email}" ${p.email === userEmail ? 'selected' : ''}>${p.email} (${(p.plan || 'pro').toUpperCase()})</option>`)
      .join('');
    accountProfilesSelect.classList.remove('hidden');

    accountProfilesSelect.onchange = (e) => {
      const selected = knownProfiles.find(p => p.email === e.target.value);
      if (selected) {
        userEmail = selected.email;
        userPlan = selected.plan || 'pro';
        if (selected.token) token = selected.token;
        if (launcherEmail) launcherEmail.textContent = userEmail;
        if (launcherPlan) launcherPlan.textContent = `${userPlan.toUpperCase()} PASS`;
        if (window.desktopAPI?.saveSession) {
          window.desktopAPI.saveSession({ token, user: selected });
        }
        sendHeartbeat();
      }
    };
  }

  async function validateSessionWithCloud() {
    if (!token) {
      switchMode('locked');
      const gateStatus = document.getElementById('gate-status-text');
      if (gateStatus) gateStatus.textContent = 'No session found. Please log in.';
      return;
    }
    
    try {
      const gateStatus = document.getElementById('gate-status-text');
      if (gateStatus) gateStatus.textContent = 'Verifying session...';
      
      const res = await fetch(`${serverUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          userEmail = data.user.email || userEmail;
          userPlan = data.user.plan || userPlan;
          if (launcherEmail) launcherEmail.textContent = userEmail;
          if (launcherPlan) launcherPlan.textContent = `${userPlan.toUpperCase()} PASS`;
          if (window.desktopAPI?.saveSession) {
            window.desktopAPI.saveSession({ token, user: data.user });
          }
        }
        // Unlock!
        if (currentMode === 'locked') {
          switchMode('launcher');
        }
      } else {
        // Invalid session
        token = null;
        if (window.desktopAPI?.logout) window.desktopAPI.logout();
        switchMode('locked');
        if (gateStatus) gateStatus.textContent = 'Session expired. Please log in again.';
      }
    } catch {
      // Offline fallback: keep local session active if token looks cryptographically signed (basic check here, usually JWT has 3 parts)
      if (token && token.split('.').length === 3) {
        if (currentMode === 'locked') {
           switchMode('launcher');
        }
      } else {
        switchMode('locked');
        const gateStatus = document.getElementById('gate-status-text');
        if (gateStatus) gateStatus.textContent = 'Network offline and no valid local session.';
      }
    }
  }

  // ===========================================================================
  // 2. VIEW & MODE MORPHING CONTROLLER
  // ===========================================================================

  function switchMode(newMode) {
    currentMode = newMode;
    document.body.className = `mode-${newMode}`;

    if (newMode === 'launcher') {
      launcherView.classList.remove('hidden');
      stealthView.classList.add('hidden');
      tickerView.classList.add('hidden');
      if (window.desktopAPI?.returnToLauncher) {
        window.desktopAPI.returnToLauncher();
      }
      startMicSoundcheck();
    } else if (newMode === 'stealth') {
      launcherView.classList.add('hidden');
      stealthView.classList.remove('hidden');
      tickerView.classList.add('hidden');
      if (window.desktopAPI?.launchSession) {
        window.desktopAPI.launchSession();
      }
      stopMicSoundcheck();
    } else if (newMode === 'ticker') {
      launcherView.classList.add('hidden');
      stealthView.classList.add('hidden');
      tickerView.classList.remove('hidden');
      if (window.desktopAPI?.setWindowMode) {
        window.desktopAPI.setWindowMode('ticker');
      }
      stopMicSoundcheck();
    }

    sendHeartbeat();
  }

  // ===========================================================================
  // 3. HARDWARE SOUNDCHECK (Web Audio API)
  // ===========================================================================

  async function populateAudioDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');
      if (micSelect && audioInputs.length > 0) {
        micSelect.innerHTML = audioInputs
          .map((d, i) => `<option value="${d.deviceId}">${d.label || `Мікрофон ${i + 1}`}</option>`)
          .join('');
      }
    } catch (e) {
      console.warn('Audio device enumeration error:', e);
    }
  }

  async function startMicSoundcheck() {
    if (analyser || currentMode !== 'launcher') return;
    try {
      const deviceId = micSelect?.value !== 'default' ? micSelect?.value : undefined;
      const constraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      };

      micStream = await navigator.mediaDevices.getUserMedia(constraints);
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(micStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      if (micStatusBadge) {
        micStatusBadge.textContent = 'MIC ACTIVE';
        micStatusBadge.style.color = '#10b981';
      }

      drawWaveform();
      populateAudioDevices();
    } catch (err) {
      if (micStatusBadge) {
        micStatusBadge.textContent = 'NO MIC PERMISSION';
        micStatusBadge.style.color = '#f43f5e';
      }
    }
  }

  function stopMicSoundcheck() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = null;
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      micStream = null;
    }
    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
    analyser = null;
  }

  function drawWaveform() {
    if (!analyser || !soundcheckCanvas) return;
    const canvas = soundcheckCanvas;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function render() {
      if (!analyser) return;
      animFrameId = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      // Calculate RMS / peak for VU meter
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      const vuPercent = Math.min(Math.round((avg / 128) * 100), 100);

      if (vuMeterBar) vuMeterBar.style.width = `${vuPercent}%`;
      if (vuDbLabel) {
        vuDbLabel.textContent = vuPercent > 5 ? `${Math.round(vuPercent)}%` : 'Ready';
      }

      // Draw studio-grade monochrome platinum frequency bars
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 1.4;
      const barGap = 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = Math.max((dataArray[i] / 255) * canvas.height, 2);
        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
        grad.addColorStop(1, '#ffffff');

        ctx.fillStyle = grad;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - barGap, barHeight);
        x += barWidth;
      }
    }

    render();
  }

  // ===========================================================================
  // 4. CLOUD SYNC & HEARTBEAT
  // ===========================================================================

  async function sendHeartbeat() {
    try {
      const sysInfo = window.desktopAPI?.getSystemInfo ? await window.desktopAPI.getSystemInfo() : {};
      const res = await fetch(`${serverUrl}/api/desktop/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId,
          token,
          appVersion: sysInfo.version || '1.2.0',
          platform: sysInfo.platform || 'linux',
          state: currentMode,
          isCapturing,
          sttStatus: isCapturing ? 'connected' : 'idle',
          micStatus: analyser || isCapturing ? 'active' : 'idle',
          audioLatencyMs: 18,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (launcherSyncDot) launcherSyncDot.className = 'sync-dot online';
        if (launcherSyncLabel) launcherSyncLabel.textContent = 'Cloud Sync: Active (18ms)';

        // Handle remote cloud control
        if (data.cloudSync?.isFrozen !== undefined && data.cloudSync.isFrozen !== isFrozen) {
          toggleFreeze(data.cloudSync.isFrozen);
        }
        if (data.cloudSync?.isPanic !== undefined && data.cloudSync.isPanic !== isPanic) {
          togglePanic(data.cloudSync.isPanic);
        }
      } else {
        if (launcherSyncDot) launcherSyncDot.className = 'sync-dot offline';
        if (launcherSyncLabel) launcherSyncLabel.textContent = 'Cloud Sync: Offline (Local Mode)';
      }
    } catch {
      if (launcherSyncDot) launcherSyncDot.className = 'sync-dot offline';
      if (launcherSyncLabel) launcherSyncLabel.textContent = 'Cloud Sync: Offline (Local Mode)';
    }
  }

  setInterval(sendHeartbeat, 12000);

  // ===========================================================================
  // 5. SSE LIVE INTERVIEW STREAM
  // ===========================================================================

  function initEventStream() {
    if (sseEventSource) {
      sseEventSource.close();
      sseEventSource = null;
    }

    const streamUrl = `${serverUrl}/api/companion/stream?token=${encodeURIComponent(token)}&device=desktop`;
    try {
      sseEventSource = new EventSource(streamUrl);

      sseEventSource.onopen = () => {
        if (connBadge) {
          connBadge.textContent = 'LIVE';
          connBadge.style.color = '#10b981';
        }
      };

      sseEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleIncomingSyncData(data);
        } catch {}
      };

      sseEventSource.onerror = () => {
        if (connBadge) {
          connBadge.textContent = 'RETRY';
          connBadge.style.color = '#f59e0b';
        }
      };
    } catch {}
  }

  function handleIncomingSyncData(data) {
    if (isFrozen) return;

    if (data.qas && data.qas.length > 0) {
      const active = data.activeId ? data.qas.find((q) => q.id === data.activeId) || data.qas[0] : data.qas[0];
      renderQA(active);
    } else if (data.type === 'NEW_QA' && data.payload) {
      renderQA(data.payload);
    }
  }

  function formatAnswerText(text) {
    if (!text) return '';
    if (!isConcise) return text;

    // Concise Blitz transformation: extract 3 punchy points
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentences.length <= 3) return text;
    return sentences.slice(0, 3).map(s => `• ${s.trim()}`).join('\n');
  }

  function renderQA(qa) {
    if (!qa) return;
    activeQaData = qa;

    if (waitingState) waitingState.classList.add('hidden');
    if (qaCard) qaCard.classList.remove('hidden');

    if (cardQ) cardQ.textContent = qa.question || 'Tech Interview Question';
    if (cardHook) cardHook.textContent = qa.startHook || 'Start by stating your architectural premise.';
    if (cardA) {
      cardA.style.whiteSpace = isConcise ? 'pre-line' : 'normal';
      cardA.textContent = formatAnswerText(qa.quickAnswer || qa.answer || '');
    }

    // Translation
    if (qa.nativeTranslation) {
      if (cardTrWrap) cardTrWrap.classList.remove('hidden');
      if (cardTr) cardTr.textContent = qa.nativeTranslation;
    } else {
      if (cardTrWrap) cardTrWrap.classList.add('hidden');
    }

    // Hints
    if (cardHints) {
      cardHints.innerHTML = '';
      if (Array.isArray(qa.hints)) {
        qa.hints.slice(0, 4).forEach((h) => {
          const li = document.createElement('li');
          li.textContent = h;
          cardHints.appendChild(li);
        });
      }
    }

    // Ticker Ribbon Update
    if (tickerViewQ) tickerViewQ.textContent = qa.question || '';
    if (tickerViewA) tickerViewA.textContent = `${qa.startHook || ''} ── ${qa.quickAnswer || ''}`;

    // Adjust window height in stealth mode
    if (currentMode === 'stealth' && window.desktopAPI?.setWindowHeight) {
      setTimeout(() => {
        const height = Math.min(Math.max(document.body.scrollHeight + 10, 160), 450);
        window.desktopAPI.setWindowHeight(height);
      }, 50);
    }
  }

  // ===========================================================================
  // 6. ACTIONS & ERGONOMIC CONTROLS
  // ===========================================================================

  function toggleFreeze(forceState) {
    isFrozen = forceState !== undefined ? forceState : !isFrozen;
    if (btnFreeze) btnFreeze.classList.toggle('active', isFrozen);
    if (btnTickerFreeze) btnTickerFreeze.textContent = isFrozen ? '▶' : '❄️';
  }

  function togglePanic(forceState) {
    isPanic = forceState !== undefined ? forceState : !isPanic;
    if (panicShield) {
      panicShield.classList.toggle('hidden', !isPanic);
    }
  }

  function toggleConcise() {
    isConcise = !isConcise;
    if (btnConcise) btnConcise.classList.toggle('active', isConcise);
    if (activeQaData) renderQA(activeQaData);
  }

  function copyActiveAnswer() {
    const textToCopy = cardA?.textContent || activeQaData?.quickAnswer || '';
    if (!textToCopy) return;

    if (window.desktopAPI?.copyClipboard) {
      window.desktopAPI.copyClipboard(textToCopy);
    } else {
      navigator.clipboard?.writeText(textToCopy);
    }

    showToast('COPIED TO CLIPBOARD');
  }

  function showToast(msg) {
    const existing = document.querySelector('.copy-feedback-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'copy-feedback-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1600);
  }

  function toggleTranslation() {
    showTranslation = !showTranslation;
    if (btnTR) btnTR.classList.toggle('active', showTranslation);
    if (cardTrWrap) cardTrWrap.classList.toggle('hidden', !showTranslation);
  }

  // ===========================================================================
  // 7. EVENT LISTENERS & SHORTCUTS
  // ===========================================================================

  // Master Launch button
  if (btnMasterLaunch) {
    btnMasterLaunch.addEventListener('click', () => {
      isCapturing = true;
      switchMode('stealth');
      initEventStream();
    });
  }

  // Keyboard shortcut matrix
  window.addEventListener('keydown', (e) => {
    // Check if input element is active to avoid hijacking typing in auth modal
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
    if (isTyping) {
      if (e.key === 'Escape') settingsPanel?.classList.add('hidden');
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (currentMode === 'launcher') {
        isCapturing = true;
        switchMode('stealth');
        initEventStream();
      }
    } else if (e.key === 'Escape') {
      if (isPanic) {
        togglePanic(false);
      } else if (currentMode === 'stealth' || currentMode === 'ticker') {
        switchMode('launcher');
      }
    } else if (e.code === 'Space' && (currentMode === 'stealth' || currentMode === 'ticker')) {
      e.preventDefault();
      toggleFreeze();
    } else if ((e.key === 'q' || e.key === 'Q' || e.key === 'й' || e.key === 'Й') && currentMode === 'stealth') {
      toggleConcise();
    } else if ((e.key === 'c' || e.key === 'C' || e.key === 'с' || e.key === 'С') && currentMode === 'stealth') {
      copyActiveAnswer();
    }
  });

  // Header & Navigation Action buttons
  if (btnConcise) btnConcise.addEventListener('click', toggleConcise);
  if (btnCopy) btnCopy.addEventListener('click', copyActiveAnswer);
  if (btnAlignDisplay) {
    btnAlignDisplay.addEventListener('click', () => {
      if (window.desktopAPI?.alignToActiveDisplay) {
        window.desktopAPI.alignToActiveDisplay();
      }
    });
  }
  if (btnReturnLauncher) btnReturnLauncher.addEventListener('click', () => switchMode('launcher'));
  if (btnTickerLauncher) btnTickerLauncher.addEventListener('click', () => switchMode('launcher'));
  if (btnModeTicker) btnModeTicker.addEventListener('click', () => switchMode('ticker'));
  if (btnTickerHud) btnTickerHud.addEventListener('click', () => switchMode('stealth'));
  if (btnTR) btnTR.addEventListener('click', toggleTranslation);
  if (btnFreeze) btnFreeze.addEventListener('click', () => toggleFreeze());
  if (btnTickerFreeze) btnTickerFreeze.addEventListener('click', () => toggleFreeze());
  if (btnPanic) btnPanic.addEventListener('click', () => togglePanic());

  // Window close / minimize
  if (btnLauncherMin) btnLauncherMin.addEventListener('click', () => window.desktopAPI?.minimize?.());
  if (btnLauncherClose) btnLauncherClose.addEventListener('click', () => window.desktopAPI?.close?.());
  if (btnClose) btnClose.addEventListener('click', () => window.desktopAPI?.close?.());
  if (btnTickerClose) btnTickerClose.addEventListener('click', () => window.desktopAPI?.close?.());

  // Auth modal management
  if (btnOpenAuth) {
    btnOpenAuth.addEventListener('click', () => {
      settingsPanel?.classList.remove('hidden');
    });
  }
  if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', () => {
      settingsPanel?.classList.add('hidden');
    });
  }

  // 1-Click Browser OAuth Button (Launcher & Modal)
  async function performBrowserLogin(targetUrl) {
    const sUrl = targetUrl || browserServerUrlInput?.value?.trim() || serverUrl;
    try {
      showToast('ВІДКРИТТЯ БРАУЗЕРА (PKCE)...');
      if (btnBrowserLogin) btnBrowserLogin.textContent = '⏳ Очікування...';
      if (btnTriggerBrowserLogin) btnTriggerBrowserLogin.textContent = '⏳ Очікування входу в браузері...';

      const result = await window.desktopAPI?.startBrowserLogin(sUrl);
      if (result && result.success) {
        if (result.token) {
          token = result.token;
          if (window.desktopAPI?.saveSession) {
            window.desktopAPI.saveSession({ token, user: { email: userEmail, plan: userPlan } });
          }
        }
        await validateSessionWithCloud();
        showToast('УСПІШНО ПІДКЛЮЧЕНО!');
        settingsPanel?.classList.add('hidden');
        sendHeartbeat();
      } else {
        alert(result?.error || 'Помилка авторизації через браузер');
      }
    } catch (err) {
      alert(`Помилка: ${err.message}`);
    } finally {
      if (btnBrowserLogin) btnBrowserLogin.textContent = '⚡ Браузер (OAuth)';
      if (btnTriggerBrowserLogin) btnTriggerBrowserLogin.textContent = '🚀 Відкрити браузер для входу';
    }
  }

  if (btnBrowserLogin) {
    btnBrowserLogin.addEventListener('click', () => performBrowserLogin());
  }
  if (btnTriggerBrowserLogin) {
    btnTriggerBrowserLogin.addEventListener('click', () => performBrowserLogin());
  }

  // Auth Modal Tab switching
  function switchAuthTab(activeTab) {
    [tabBrowserAuth, tabLogin, tabToken].forEach(t => t?.classList.remove('active'));
    [formBrowser, formCreds, formToken].forEach(f => f?.classList.add('hidden'));

    if (activeTab === 'browser') {
      tabBrowserAuth?.classList.add('active');
      formBrowser?.classList.remove('hidden');
      btnSaveAuth?.classList.add('hidden');
    } else if (activeTab === 'login') {
      tabLogin?.classList.add('active');
      formCreds?.classList.remove('hidden');
      btnSaveAuth?.classList.remove('hidden');
    } else if (activeTab === 'token') {
      tabToken?.classList.add('active');
      formToken?.classList.remove('hidden');
      btnSaveAuth?.classList.remove('hidden');
    }
  }

  if (tabBrowserAuth) tabBrowserAuth.addEventListener('click', () => switchAuthTab('browser'));
  if (tabLogin) tabLogin.addEventListener('click', () => switchAuthTab('login'));
  if (tabToken) tabToken.addEventListener('click', () => switchAuthTab('token'));

  // Gatekeeper auth button
  const btnGateBrowser = document.getElementById('btn-gate-browser');
  if (btnGateBrowser) {
    btnGateBrowser.addEventListener('click', () => {
      btnGateBrowser.textContent = '⏳ Waiting for browser...';
      performBrowserLogin().finally(() => {
        btnGateBrowser.textContent = '⚡ Log in with Web (Browser)';
      });
    });
  }

  // Save Auth / Login Form Submission
  if (btnSaveAuth) {
    btnSaveAuth.addEventListener('click', async () => {
      const isCredsTab = tabLogin?.classList.contains('active');
      if (isCredsTab) {
        const email = authEmailInput?.value?.trim();
        const password = authPassInput?.value;
        if (!email || !password) return alert('Введіть email та пароль');

        try {
          btnSaveAuth.textContent = 'Вхід...';
          const res = await fetch(`${serverUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, client: 'desktop' }),
          });
          const data = await res.json();
          if (res.ok && data.token) {
            token = data.token;
            userEmail = data.user?.email || email;
            userPlan = data.user?.plan || 'pro';
            if (window.desktopAPI?.saveSession) {
              window.desktopAPI.saveSession({ token, user: data.user || { email, plan: userPlan } });
            }
            hydrateUserUI();
            settingsPanel?.classList.add('hidden');
            sendHeartbeat();
          } else {
            alert(data.error || 'Помилка входу');
          }
        } catch {
          alert('Помилка підключення до сервера');
        } finally {
          btnSaveAuth.textContent = 'Увійти та синхронізувати';
        }
      } else {
        // Token tab
        const rawToken = tokenInput?.value?.trim();
        const customUrl = serverUrlInput?.value?.trim();
        if (customUrl) serverUrl = customUrl;
        if (rawToken) token = rawToken;
        if (window.desktopAPI?.saveSession) {
          window.desktopAPI.saveSession({ token, user: { email: userEmail, plan: userPlan } });
        }
        hydrateUserUI();
        settingsPanel?.classList.add('hidden');
        sendHeartbeat();
      }
    });
  }

  // Deep Link Token Listener from Electron Main
  if (window.desktopAPI?.onTokenReceived) {
    window.desktopAPI.onTokenReceived((receivedToken) => {
      token = receivedToken;
      if (window.desktopAPI?.saveSession) {
        window.desktopAPI.saveSession({ token, user: { email: userEmail, plan: userPlan } });
      }
      hydrateUserUI();
      sendHeartbeat();
    });
  }

  // Hardware shortcut & system events
  if (window.desktopAPI?.onToggleFreeze) {
    window.desktopAPI.onToggleFreeze(() => toggleFreeze());
  }
  if (window.desktopAPI?.onTogglePanic) {
    window.desktopAPI.onTogglePanic(() => togglePanic());
  }
  if (window.desktopAPI?.onStateChanged) {
    window.desktopAPI.onStateChanged((state) => {
      if (state !== currentMode) switchMode(state);
    });
  }
  if (window.desktopAPI?.onSystemResumed) {
    window.desktopAPI.onSystemResumed(() => {
      console.info('[hud] System resumed from sleep, refreshing state');
      sendHeartbeat();
      if (currentMode !== 'launcher') initEventStream();
    });
  }

  // Microphone device picker change
  if (micSelect) {
    micSelect.addEventListener('change', () => {
      stopMicSoundcheck();
      startMicSoundcheck();
    });
  }

  // Start initial lifecycle
  hydrateUserUI();
  switchMode('locked');
})();

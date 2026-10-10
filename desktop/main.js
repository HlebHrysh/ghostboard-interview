const { app, BrowserWindow, globalShortcut, ipcMain, screen, shell, clipboard, powerMonitor } = require('electron');
const path = require('path');
const { SecureStore } = require('./secure-store');
const { PkceLoopback } = require('./pkce-loopback');

// Linux Wayland Stability
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
}

// Single Instance Lock: prevents duplicate processes on Windows/Linux
const gotTheLock = app.requestSingleInstanceLock();
console.log('[main] requestSingleInstanceLock returned:', gotTheLock);
if (!gotTheLock) {
  console.log('[main] Another instance is already running! Quitting this instance.');
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const rawUrl = commandLine.find((arg) => arg.startsWith('ghostboard://'));
    if (rawUrl) handleDeepLink(rawUrl);
  });
}

let mainWindow = null;
let secureStore = null;
let activeLoopback = null;
let isClickThrough = false;
let isStealthInvisible = true;
let currentMode = 'launcher'; // 'launcher' | 'stealth' | 'ticker'

// Register custom protocol for 1-click web-to-app pairing: ghostboard://pair?token=...
try {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('ghostboard', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('ghostboard');
  }
} catch (e) {
  console.warn('[main] Protocol client registration notice:', e.message);
}

// OS-Safe Helper Functions
function applyAlwaysOnTop(win, enable) {
  if (!win) return;
  try {
    if (process.platform === 'darwin') {
      win.setAlwaysOnTop(enable, 'screen-saver', 1);
    } else {
      win.setAlwaysOnTop(enable);
    }
  } catch (e) {
    console.warn('[main] setAlwaysOnTop warning:', e.message);
  }
}

function applyContentProtection(win, enable) {
  if (!win) return;
  // Supported natively on Windows (WDA_EXCLUDEFROMCAPTURE) & macOS (NSWindowSharingNone)
  if (process.platform === 'win32' || process.platform === 'darwin') {
    try {
      win.setContentProtection(enable);
    } catch (e) {
      console.warn('[main] setContentProtection notice:', e.message);
    }
  }
}

function applyVisibleOnAllWorkspaces(win, enable) {
  if (!win) return;
  try {
    if (process.platform === 'darwin') {
      win.setVisibleOnAllWorkspaces(enable, { visibleOnFullScreen: true });
    } else {
      win.setVisibleOnAllWorkspaces(enable);
    }
  } catch (e) {
    console.warn('[main] setVisibleOnAllWorkspaces notice:', e.message);
  }
}

function applyIgnoreMouseEvents(win, enable) {
  if (!win) return;
  try {
    // { forward: true } is supported on macOS and Windows only. Linux causes errors or stalls.
    if (process.platform === 'darwin' || process.platform === 'win32') {
      win.setIgnoreMouseEvents(enable, { forward: true });
    } else {
      win.setIgnoreMouseEvents(enable);
    }
  } catch (e) {
    console.warn('[main] setIgnoreMouseEvents notice:', e.message);
  }
}

function getActiveDisplay() {
  if (process.platform === 'linux') {
    // Under Wayland (Hyprland), getCursorScreenPoint() causes a blocking IPC portal call that hangs the event loop.
    return screen.getPrimaryDisplay();
  }
  try {
    const cursorPoint = screen.getCursorScreenPoint();
    return screen.getDisplayNearestPoint(cursorPoint) || screen.getPrimaryDisplay();
  } catch (e) {
    return screen.getPrimaryDisplay();
  }
}

function createMainWindow() {
  console.log('[main] step 1: entering createMainWindow');
  let targetDisplay;
  try {
    targetDisplay = getActiveDisplay();
  } catch (err) {
    console.error('[main] getActiveDisplay error:', err);
    targetDisplay = screen.getPrimaryDisplay();
  }
  console.log('[main] step 2: targetDisplay:', targetDisplay ? targetDisplay.id : 'none');
  const { x: displayX, y: displayY, width: displayWidth, height: displayHeight } = targetDisplay.workArea;
  console.log('[main] step 3: workArea:', displayX, displayY, displayWidth, displayHeight);

  // Launcher initial size
  const launcherWidth = 840;
  const launcherHeight = 600;
  const initialX = displayX + Math.round((displayWidth - launcherWidth) / 2);
  const initialY = displayY + Math.round((displayHeight - launcherHeight) / 2);

  console.log('[main] step 4: new BrowserWindow...');
  mainWindow = new BrowserWindow({
    title: 'Ghostboard',
    width: launcherWidth,
    height: launcherHeight,
    x: initialX,
    y: initialY,
    frame: false,
    transparent: true,
    alwaysOnTop: false,
    resizable: true,
    // On Linux X11/Wayland, hasShadow: true with transparent: true causes an opaque black box artifact
    hasShadow: process.platform === 'darwin',
    skipTaskbar: false,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  console.log('[main] step 5: BrowserWindow created successfully');

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[main] window did-finish-load!');
  });
  mainWindow.webContents.on('did-fail-load', (e, code, desc, url) => {
    console.error('[main] did-fail-load:', code, desc, url);
  });
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[renderer][${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  console.log('[main] step 6: loadFile called');

  mainWindow.on('close', (e) => {
    console.log('[main] mainWindow close event fired!');
  });

  mainWindow.on('closed', () => {
    console.log('[main] mainWindow closed event fired!');
    mainWindow = null;
  });
}

function morphToStealth() {
  if (!mainWindow) return;
  const targetDisplay = getActiveDisplay();
  const { x: displayX, y: displayY, width: displayWidth } = targetDisplay.workArea;

  currentMode = 'stealth';
  const stealthWidth = 580;
  const stealthHeight = 220;
  const stealthX = displayX + Math.round((displayWidth - stealthWidth) / 2);
  const stealthY = displayY + 10;

  mainWindow.setBounds({
    x: stealthX,
    y: stealthY,
    width: stealthWidth,
    height: stealthHeight,
  });

  applyContentProtection(mainWindow, isStealthInvisible);
  applyAlwaysOnTop(mainWindow, true);
  applyVisibleOnAllWorkspaces(mainWindow, true);

  mainWindow.webContents.send('app:state-changed', 'stealth');
  mainWindow.webContents.send('hud:mode-toggled', 'hud');
}

function morphToLauncher() {
  if (!mainWindow) return;
  const targetDisplay = getActiveDisplay();
  const { x: displayX, y: displayY, width: displayWidth, height: displayHeight } = targetDisplay.workArea;

  currentMode = 'launcher';
  const launcherWidth = 840;
  const launcherHeight = 600;
  const launcherX = displayX + Math.round((displayWidth - launcherWidth) / 2);
  const launcherY = displayY + Math.round((displayHeight - launcherHeight) / 2);

  mainWindow.setBounds({
    x: launcherX,
    y: launcherY,
    width: launcherWidth,
    height: launcherHeight,
  });

  // Reset click-through and screen-saver level in launcher mode
  applyIgnoreMouseEvents(mainWindow, false);
  isClickThrough = false;
  applyAlwaysOnTop(mainWindow, false);

  mainWindow.webContents.send('app:state-changed', 'launcher');
}

function morphToTicker() {
  if (!mainWindow) return;
  const targetDisplay = getActiveDisplay();
  const { x: displayX, y: displayY, width: displayWidth } = targetDisplay.workArea;

  currentMode = 'ticker';
  const tickerWidth = Math.min(Math.round(displayWidth * 0.75), 940);
  const tickerHeight = 40;
  const tickerX = displayX + Math.round((displayWidth - tickerWidth) / 2);
  const tickerY = displayY + 8;

  mainWindow.setBounds({
    x: tickerX,
    y: tickerY,
    width: tickerWidth,
    height: tickerHeight,
  });

  applyContentProtection(mainWindow, isStealthInvisible);
  applyAlwaysOnTop(mainWindow, true);
  mainWindow.webContents.send('app:state-changed', 'ticker');
  mainWindow.webContents.send('hud:mode-toggled', 'ticker');
}

function alignToActiveDisplay() {
  if (!mainWindow) return;
  if (currentMode === 'stealth') {
    morphToStealth();
  } else if (currentMode === 'ticker') {
    morphToTicker();
  } else {
    morphToLauncher();
  }
}

function handleDeepLink(url) {
  if (!url || !mainWindow) return;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'ghostboard:' && (parsed.hostname === 'pair' || parsed.hostname === 'auth')) {
      const token = parsed.searchParams.get('token');
      if (token) {
        if (secureStore) secureStore.saveToken(token);
        mainWindow.webContents.send('auth:token-received', token);
      }
    }
  } catch (err) {
    console.error('[main] Failed to parse deep link:', err);
  }
}

// macOS deep link handler
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

process.on('uncaughtException', (err) => {
  console.error('[CRITICAL UNCAUGHT EXCEPTION]:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[CRITICAL UNHANDLED REJECTION]:', reason);
});

app.whenReady().then(() => {
  console.log('[main] app.whenReady fired');
  try {
    secureStore = new SecureStore();
    console.log('[main] secureStore initialized');
    createMainWindow();
    console.log('[main] createMainWindow called, mainWindow:', !!mainWindow);
  } catch (err) {
    console.error('[main] Error during whenReady:', err);
  }

  // Handle Windows/Linux command-line deep links
  if (process.platform === 'win32' || process.platform === 'linux') {
    const rawUrl = process.argv.find((arg) => arg.startsWith('ghostboard://'));
    if (rawUrl) handleDeepLink(rawUrl);
  }

  // Display lifecycle observers: handle display connect / disconnect
  screen.on('display-removed', () => {
    if (!mainWindow) return;
    const currentBounds = mainWindow.getBounds();
    const allDisplays = screen.getAllDisplays();
    const isOnAnyDisplay = allDisplays.some(d => {
      const db = d.bounds;
      return (
        currentBounds.x < db.x + db.width &&
        currentBounds.x + currentBounds.width > db.x &&
        currentBounds.y < db.y + db.height &&
        currentBounds.y + currentBounds.height > db.y
      );
    });

    if (!isOnAnyDisplay) {
      console.warn('[main] Window stranded off-screen, resetting to primary display');
      const primary = screen.getPrimaryDisplay().workArea;
      mainWindow.setPosition(
        primary.x + Math.round((primary.width - currentBounds.width) / 2),
        primary.y + 10
      );
    }
  });

  // System power resume observer (OS sleep/wake recovery)
  powerMonitor.on('resume', () => {
    console.info('[main] System resumed from sleep, refreshing stealth state and sync');
    if (mainWindow) {
      applyContentProtection(mainWindow, isStealthInvisible);
      mainWindow.webContents.send('system:resumed');
    }
  });

  // Global Shortcuts with safe registration
  const safeRegister = (shortcut, handler) => {
    try {
      globalShortcut.register(shortcut, handler);
    } catch (e) {
      console.warn(`[main] Failed to register shortcut ${shortcut}:`, e.message);
    }
  };

  // Instant show/hide toggle (< 16ms warm unhide)
  safeRegister('CommandOrControl+Alt+H', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Click-Through toggle
  safeRegister('CommandOrControl+Alt+T', () => {
    if (!mainWindow || currentMode === 'launcher') return;
    isClickThrough = !isClickThrough;
    applyIgnoreMouseEvents(mainWindow, isClickThrough);
    mainWindow.webContents.send('hud:click-through-toggled', isClickThrough);
  });

  // Stealth Invisibility toggle
  safeRegister('CommandOrControl+Alt+S', () => {
    if (!mainWindow) return;
    isStealthInvisible = !isStealthInvisible;
    applyContentProtection(mainWindow, isStealthInvisible);
    mainWindow.webContents.send('hud:stealth-toggled', isStealthInvisible);
  });

  // Cycle Mode: Launcher ↔ Stealth HUD ↔ Ticker Ribbon
  safeRegister('CommandOrControl+Alt+M', () => {
    if (currentMode === 'launcher') {
      morphToStealth();
    } else if (currentMode === 'stealth') {
      morphToTicker();
    } else {
      morphToStealth();
    }
  });

  // Space / F8 Freeze hotkey
  safeRegister('F8', () => {
    if (mainWindow) mainWindow.webContents.send('action:toggle-freeze');
  });

  // Panic shield hotkey
  safeRegister('F12', () => {
    if (mainWindow) mainWindow.webContents.send('action:toggle-panic');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('before-quit', (e) => {
  console.log('[main] before-quit event fired');
});

app.on('will-quit', () => {
  console.log('[main] will-quit event fired');
  globalShortcut.unregisterAll();
  if (activeLoopback) {
    activeLoopback.cleanup();
  }
});

app.on('window-all-closed', () => {
  console.log('[main] window-all-closed event fired');
  if (process.platform !== 'darwin') app.quit();
});

// =============================================================================
// IPC COMMUNICATION HANDLERS
// =============================================================================

// Window geometry & modes
ipcMain.handle('window:launch-session', () => {
  morphToStealth();
  return 'stealth';
});

ipcMain.handle('window:return-launcher', () => {
  morphToLauncher();
  return 'launcher';
});

ipcMain.handle('window:set-height', (event, height) => {
  if (!mainWindow || currentMode !== 'stealth') return;
  const [currentWidth] = mainWindow.getSize();
  mainWindow.setSize(currentWidth, Math.min(Math.max(height, 100), 750));
});

ipcMain.handle('window:set-mode', (event, mode) => {
  if (mode === 'launcher') morphToLauncher();
  else if (mode === 'ticker') morphToTicker();
  else morphToStealth();
  return currentMode;
});

ipcMain.handle('window:align-active-display', () => {
  alignToActiveDisplay();
  return true;
});

ipcMain.handle('window:toggle-stealth', (event, enable) => {
  if (!mainWindow) return isStealthInvisible;
  isStealthInvisible = enable;
  applyContentProtection(mainWindow, enable);
  return isStealthInvisible;
});

ipcMain.handle('window:toggle-click-through', (event, enable) => {
  if (!mainWindow || currentMode === 'launcher') return false;
  isClickThrough = enable;
  applyIgnoreMouseEvents(mainWindow, enable);
  return isClickThrough;
});

// Native Hardware-Backed Secure Storage Handlers
ipcMain.handle('auth:get-saved-session', () => {
  if (!secureStore) return { token: null, user: null, settings: {} };
  return {
    token: secureStore.getToken(),
    user: secureStore.getProfile(),
    profiles: secureStore.getProfiles(),
    settings: secureStore.getSettings(),
  };
});

ipcMain.handle('auth:save-session', (event, { token, user }) => {
  if (!secureStore) return false;
  if (token) secureStore.saveToken(token);
  if (user) secureStore.saveProfile(user);
  return true;
});

ipcMain.handle('auth:logout', () => {
  if (!secureStore) return false;
  secureStore.clearSession();
  return true;
});

ipcMain.handle('auth:save-settings', (event, settings) => {
  if (!secureStore) return false;
  return secureStore.saveSettings(settings);
});

// OAuth 2.0 PKCE Browser Login Handshake
ipcMain.handle('auth:start-browser-login', async (event, serverUrl) => {
  try {
    if (activeLoopback) {
      activeLoopback.cleanup();
    }

    const targetServer = serverUrl || 'https://ghostboard.ai';
    activeLoopback = new PkceLoopback(targetServer);
    const result = await activeLoopback.startAuthFlow();
    activeLoopback = null;

    if (result.directToken) {
      if (secureStore) secureStore.saveToken(result.directToken);
      return { success: true, token: result.directToken };
    }

    return {
      success: true,
      code: result.code,
      verifier: result.verifier,
    };
  } catch (err) {
    if (activeLoopback) {
      activeLoopback.cleanup();
      activeLoopback = null;
    }
    return { success: false, error: err.message };
  }
});

// System Utilities & Clipboard
ipcMain.handle('system:copy-clipboard', (event, text) => {
  if (typeof text === 'string') {
    clipboard.writeText(text);
    return true;
  }
  return false;
});

ipcMain.handle('system:get-info', () => {
  return {
    platform: process.platform,
    version: app.getVersion() || '1.2.0',
    arch: process.arch,
    isMac: process.platform === 'darwin',
    isWin: process.platform === 'win32',
    isLinux: process.platform === 'linux',
    hardwareEncryptionAvailable: SecureStore ? true : false,
  };
});

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:close', () => {
  console.log('[main] IPC window:close invoked');
  if (mainWindow) mainWindow.close();
});
